# MVP Implementation Handoff

## 현재 상태

구현 목표를 다시 정리하고 MVP 기준으로 개발을 시작했다.

MVP는 다음에 집중한다.

- Nokia Classic -> Nokia MD-CLI
- MD-CLI block config
- MD-CLI full-context one-line config
- Interface
- Static-route
- BGP neighbor

중요 원칙:

- 확실하지 않으면 동일 처리하지 않는다.
- 실제 누락을 정상으로 판단하지 않는다.
- 애매한 항목은 검토 필요로 남긴다.

## 현재까지 구현된 변경

### 문서

- `docs/mvp-product-definition.md`
  - 제품 목표, 상태 정의, MVP 범위, 제외 범위 정의
- `docs/mvp-development-priority.md`
  - 개발 우선순위 정의
- `.codex/HANDOFF.md`
  - 집/다른 환경에서 이어받기 위한 요약
- `.codex/CURRENT_ISSUE.md`
  - 현재 guardrail용 작업 범위와 금지 범위

### 테스트

- `tests/mvp-core-scope.test.js`

테스트로 고정한 계약:

1. Interface는 이름이 바뀌어도 address/prefix가 같으면 매칭된다.
2. Interface 이름 변경은 `changed`로 노출된다.
3. Static-route는 같은 prefix라도 next-hop이 바뀌면 자동 동일 처리하지 않는다.
4. BGP neighbor는 peer IP 기준으로 매칭된다.
5. BGP import/export policy 차이는 `changed`로 노출된다.
6. MD-CLI block interface와 one-line interface는 같은 normalized identity를 만든다.
7. 전체 config 안에 Interface / Static-route / BGP가 섞여 있어도 핵심 객체들이 같이 추출되고 매칭된다.
8. router context가 다른 duplicate address interface는 서로 다른 identity로 보존된다.
9. router context가 다른 같은 IP/prefix interface는 자동 `matched` 처리하지 않는다.
10. MD-CLI block interface도 non-Base router context를 identity에 반영한다.
11. MD-CLI one-line service interface는 같은 service/address라도 interface name이 다르면 별도 객체로 보존한다.
12. router context가 다른 duplicate static-route prefix는 서로 다른 identity로 보존된다.
13. router context가 다른 같은 prefix/next-hop static-route는 자동 `matched` 처리하지 않는다.
14. MD-CLI block static-route도 non-Base router context를 identity에 반영한다.
15. Classic BGP group block 아래 neighbor는 group/peer-as/export context를 상속한다.
16. BGP group reference rename은 `changed`가 아니라 `structure-converted`로 분류한다.
17. Classic/MD-CLI PIM interface는 PIM 객체로 파싱한다.
18. Review row의 BGP admin state 표시는 `state`가 아니라 `admin-state`로 유지한다.
19. BGP `structure-converted` group row와 `inheritance-unresolved` inherited field는 object grouping에서 active가 아니라 suppressed로 유지한다.
20. Compare result의 사용자 표시 status는 MVP 용어 `동일`, `변경`, `검토 필요`, `누락`, `추가`, `미매칭`으로 표시한다.

### 코드

- `src/core/comparisonPlan.js`
- `src/core/semanticFieldNormalizer.js`
- `src/core/parsers/nokiaClassicParser.js`
- `src/core/parsers/nokiaMdCliParser.js`
- `src/core/matchers/objectMatcher.js`
- `src/core/objectReviewGroups.js`
- `src/core/semanticTheme.js`
- `src/core/compareRenderer.js`
- `src/core/summaryAnalytics.js`
- `src/core/summaryRenderer.js`
- `src/core/reportExport.js`
- `src/core/legacyCore.js`
- `src/components/ConfigInputPanel.jsx`

변경:

- visible compare field에 `interface` 추가
- interface canonical identity에 non-Base router/routing context 반영
- Classic direct `configure router ... interface`에서 router context 보존
- MD-CLI block/one-line interface에서 router context 보존
- context가 다른 같은 IP/prefix interface 자동 매칭 차단
- MD-CLI one-line service interface duplicate address 병합 방지
- static-route canonical identity에 non-Base router/routing context 반영
- Classic direct `configure router ... static-routes route`에서 router context 보존
- MD-CLI block/one-line static-route에서 router context 보존
- context가 다른 같은 prefix/next-hop static-route 자동 매칭 차단
- Classic nested BGP `group "..."` context를 child neighbor 초기 필드로 반영
- BGP group reference rename status를 `structure-converted`로 정규화
- Review row에서 `admin-state` 표시 보존
- BGP `structure-converted` / `inheritance-unresolved` row를 active object issue가 아니라 suppressed field issue로 그룹화
- Classic `pim` block interface를 PIM 객체로 파싱
- Classic PIM normalized identity를 canonical lower-case로 저장
- MD-CLI one-line `router ... pim interface`를 generic router interface보다 먼저 PIM으로 파싱
- 내부 status 값은 유지하고 compare 화면 표시 label만 MVP 용어로 정리
- MVP section summary card를 summary dashboard에 표시
- Excel-compatible UTF-8 CSV report export 추가

효과:

- address/prefix 기반으로 같은 interface라고 매칭된 뒤에도 interface name 변경이 결과에 표시된다.
- 같은 IP가 여러 router context에 중복되어도 interface 객체가 합쳐지지 않는다.
- routing context가 다르면 실제 누락/오매칭을 정상으로 판단하지 않는다.
- 같은 service 안에서 같은 주소를 쓰는 별도 interface도 하나로 덮어쓰지 않는다.
- 같은 prefix가 여러 router context에 중복되어도 static-route 객체가 합쳐지지 않는다.

예:

```text
old interface: to-Dobong-MNC#1
new interface: Te1/1/1
status: changed
field: interface
```

## 실제 사용 시 달라지는 점

이전:

- interface가 IP로 매칭되어도 interface name 변경이 비교 요약에 명확히 안 보일 수 있었다.

현재:

- 같은 IP/prefix라면 같은 interface로 매칭된다.
- 이름이 바뀌면 `interface changed`로 드러난다.
- 같은 IP/prefix라도 router context가 다르면 자동 동일 처리하지 않는다.
- Static-route next-hop 변경은 자동 동일이 아니라 검토 후보로 남는다.
- Static-route도 같은 prefix/next-hop이라도 router context가 다르면 자동 동일 처리하지 않는다.
- BGP neighbor policy 변경은 changed field로 남는다.
- Classic BGP group context가 반영되어 신규 MD-CLI neighbor의 group 필드와 비교된다.
- BGP group 이름 변경은 구조 전환으로 분류되어 변경 noise를 줄인다.
- BGP group 구조 전환과 MD-CLI group inheritance unresolved 값은 active issue가 아니라 suppressed row로 보인다.
- PIM part 파일이 interface 객체로 오분류되지 않는다.
- Summary 첫 화면에서 Interface / Static-route / BGP neighbor count와 검토 필요 count를 바로 본다.
- Section card 클릭 시 기존 object type filter로 상세 목록이 좁혀진다.
- Export 버튼은 Excel에서 열 수 있는 CSV를 저장한다.
- CSV 컬럼은 section / old object / new object / status / field / old value / new value / reason / severity / action needed다.

## 아직 구현하지 않은 것

- 사용자 정의 alias/rule
- 수동 매핑 재정의
- 관계 그래프 고도화
- line connector 시각화 개선
- Juniper/Cisco/Arista
- C 전환

## 다음 작업 우선순위

### 1. Interface 안정화

확인할 것:

- VRF/routing context가 interface identity에 반영되는지
- service/router context가 보존되는지
- Classic interface와 MD-CLI service/router interface가 실제 config에서 정상 매칭되는지
- IP가 없는 interface는 매칭 후보로 남겨야 하는지

진행:

- non-Base router context identity 반영 완료
- Classic direct router interface context 보존 완료
- MD-CLI block/one-line router interface context 보존 완료
- context mismatch 자동 매칭 차단 완료
- 실제 fixture 확인 완료: `New_interface_1..4` address interface raw/parsed count 일치
- `New_interface_1.txt`의 `To-MNC#2-1` / `To-MNC#2-2` duplicate address 병합 문제 수정

### 2. Static-route 안정화

확인할 것:

- routing context + prefix 기준 매칭
- next-hop 변경/증감은 검토 필요
- next-hop별 tag/metric/state 비교
- MD-CLI one-line static route 병합

진행:

- non-Base router context identity 반영 완료
- Classic direct static-route context 보존 완료
- MD-CLI block/one-line static-route context 보존 완료
- context mismatch 자동 매칭 차단 완료

### 3. BGP neighbor 안정화

확인할 것:

- peer IP 기준 매칭
- group inheritance
- import/export policy 차이
- local-address, peer-as, admin-state 비교

진행:

- Classic nested BGP group context 반영 완료
- group rename noise 정리 완료: changed -> structure-converted
- admin-state 표시 정리 완료: state -> admin-state
- unresolved group definition active/suppressed row grouping 완료
- 실제 fixture 확인 완료:
  - Classic BGP neighbor raw/parsed count: 57, 57, 51, 51
  - `New_bgp_1..4` neighbor raw/parsed count: 56, 56, 44, 44
  - Classic child neighbor가 group/peer-as/export 상속 필드를 가진다.
  - object grouping에서 active `structure-converted`/`inheritance-unresolved` row는 0건이다.
  - suppressed BGP grouping count: group 56/56/44/44, inheritance 164/164/132/132.

남은 확인:

- group rename noise: done
- MD-CLI part 파일에 group definition이 없는 경우 unresolved 표시: done
- unresolved group definition의 active/suppressed row grouping: done

### 4. PIM parser gap 정리

진행:

- Classic `pim` block interface 파싱 완료
- MD-CLI one-line `router ... pim interface` 파싱 완료
- 실제 fixture raw/parsed count 일치:
  - Classic: 15, 55, 49, 48
  - `New_PIM_1..4`: 50, 50, 44, 44
- 실제 fixture PIM matched count: 47, 14, 42, 39

### 4-1. 실제 fixture matrix 검증

진행 완료.

- `scripts/validateCompareFixtures.js --all-cases --scope full`
- 실제 sibling fixture directory 자동 탐색: `network-config-workbench-home\예제 및 테스트 설정`
- case mapping: 027 -> New_*_1, 028 -> New_*_2, 029 -> New_*_3, 030 -> New_*_4
- scope 지원: full, bgp, static, interface, lag, port, pim
- path override: `NCW_FIXTURE_DIR`, `--fixture-dir`

### 5. 상태 라벨 정리

내부에는 `candidate` 등이 남아 있지만 사용자 표시 label은 MVP 용어로 정리했다.

MVP 사용자 표현은 다음으로 정리해야 한다.

- 동일
- 변경
- 검토 필요
- 누락
- 추가
- 미매칭

진행:

- main compare result status badge 정리 완료
- summary label 정리 완료
- field/line display status 정리 완료
- 내부 status, policy match, CSS class, data attribute는 유지

### 6. Section 요약 UI

진행 완료.

첫 화면:

- 전체 요약
- Interface count
- Static-route count
- BGP neighbor count
- 검토 필요 count
- 누락/추가 count
- average overlap
- card click object type filter

### 7. Excel export

진행 완료.

기본 컬럼:

- section
- old object
- new object
- status
- field
- old value
- new value
- reason
- severity
- action needed

현재 출력:

- UTF-8 BOM CSV
- Excel에서 바로 열 수 있는 형식
- ignored / structure-converted / inheritance-unresolved row는 active export에서 제외
- `Excel 저장` visible text button
- Export click path contract test 완료
- Section card -> object list filter contract test 완료
- Actual fixture check:
  - Source: `Gangbu-SEA027H_config.txt`
  - Target: `New_interface_1.txt` + `New_static_1.txt` + `New_bgp_1.txt`
  - Export rows: 1036
  - Status counts: 변경 416, 추가 143, 누락 477

## 작업 규칙

다음 작업부터는 반드시 테스트 먼저 추가한다.

순서:

1. 실제 문제를 테스트로 표현
2. 실패 확인
3. 최소 수정
4. guard/test/build 실행
5. handoff 갱신

금지:

- UI 미세 수정부터 시작
- 관계 그래프부터 시작
- line connector부터 시작
- legacyCore.js 대규모 수정
- parser 전체 재작성
- 기존 golden 기대값 임의 변경

## 마지막 검증 결과

- branch: `work/mvp-interface-stabilization`
- `npm.cmd run guard:legacy-core`: pass
- `npm.cmd test`: pass, 167 pass / 1 skip
- `npm.cmd run build`: pass
- `node scripts/validateCompareFixtures.js --all-cases --scope full --iterations 1`: pass
- `node scripts/validateCompareFixtures.js --all-cases --scope pim --iterations 1`: pass

## 집에서 이어받는 명령

```powershell
git pull
git checkout work/mvp-interface-stabilization
npm.cmd install
npm.cmd test
npm.cmd run build
node scripts/validateCompareFixtures.js --all-cases --scope full --iterations 1
```

이후 `docs/mvp-product-definition.md`와 이 문서를 먼저 읽고 이어서 진행한다.
