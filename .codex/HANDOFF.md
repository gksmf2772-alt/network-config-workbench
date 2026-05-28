# Handoff

## 현재 목표

개발 방향을 MVP로 재정렬했다.

제품 목표:
- Nokia Classic -> Nokia MD-CLI migration config를 의미 기준으로 비교한다.
- 실제 누락 설정을 정상으로 판단하지 않는 것이 최우선이다.
- MVP 핵심 section은 Interface, Static-route, BGP neighbor다.

기준 문서:
- `docs/mvp-product-definition.md`
- `docs/mvp-development-priority.md`
- `docs/legacy-core-stability-map.md`

## 이번 커밋에 포함된 작업

문서:
- MVP 제품 정의 추가
- MVP 개발 우선순위 추가
- 집/다른 환경에서 이어받기 위한 구현 handoff 추가

테스트:
- `tests/mvp-core-scope.test.js` 추가
- Interface / Static-route / BGP neighbor 핵심 계약을 테스트로 고정

코드:
- `src/core/comparisonPlan.js`
- visible compare field에 `interface` 추가
- address/prefix로 매칭된 interface에서도 interface name 변경이 fieldSummary에 `changed`로 표시됨
- `src/core/semanticFieldNormalizer.js`
- `src/core/parsers/nokiaClassicParser.js`
- `src/core/parsers/nokiaMdCliParser.js`
- `src/core/matchers/objectMatcher.js`
- Interface identity에 non-Base router/routing context 반영
- Classic direct `configure router ... interface` context 보존
- MD-CLI block/one-line interface context 보존
- context가 다른 같은 IP/prefix interface 자동 매칭 차단
- 실제 fixture `New_interface_1.txt`의 duplicate address service interface 병합 문제 수정
- 같은 service/address라도 interface name이 다르면 별도 객체로 보존
- Static-route identity에 non-Base router/routing context 반영
- Classic direct `configure router ... static-routes route` context 보존
- MD-CLI block/one-line static route context 보존
- context가 다른 같은 prefix/next-hop static-route 자동 매칭 차단
- `src/core/summaryAnalytics.js`
- `src/core/summaryRenderer.js`
- `src/core/reportExport.js`
- `src/core/legacyCore.js`
- `src/components/ConfigInputPanel.jsx`
- MVP section summary cards 추가
- Excel-compatible CSV report export 추가

## 실제 사용 시 변경점

Interface:
- 기존 interface name과 신규 interface name이 달라도 IP/prefix가 같으면 같은 interface로 매칭된다.
- 동시에 interface 이름 변경이 비교 결과에 표시된다.
- 예: `to-Dobong-MNC#1` -> `Te1/1/1` 이 `interface changed`로 남는다.
- 같은 IP/prefix라도 router context가 다르면 같은 interface로 자동 확정하지 않는다.
- MD-CLI block과 one-line 모두 non-Base router context를 identity에 포함한다.
- target fixture의 `To-MNC#2-1` / `To-MNC#2-2`처럼 같은 주소를 가진 service interface도 서로 덮어쓰지 않는다.

Static-route:
- 같은 prefix인데 next-hop이 바뀌면 자동 동일 처리하지 않는다.
- candidate / 검토 필요 경로로 남긴다.
- 같은 prefix/next-hop이라도 router context가 다르면 같은 static-route로 자동 확정하지 않는다.
- MD-CLI block과 one-line 모두 non-Base router context를 static-route identity에 포함한다.

BGP neighbor:
- peer IP 기준으로 같은 neighbor를 매칭한다.
- import/export policy 차이는 changed로 노출된다.
- Classic nested `group "..."` context is applied to child neighbors.
- BGP group reference rename is classified as `structure-converted`, not `changed`.
- Review rows display BGP admin state as `admin-state`, not `state`.
- BGP `structure-converted` group rows and unresolved inherited `peer-as`/`export.policy` rows are suppressed in object grouping, not active issues.
- Actual fixture check:
  - Classic BGP neighbor raw/parsed counts match: 57, 57, 51, 51.
  - New_bgp_1..4 neighbor raw/parsed counts match: 56, 56, 44, 44.
  - Classic child neighbors carry inherited group/peer-as/export fields.
  - Active object grouping has 0 `structure-converted`/`inheritance-unresolved` rows across BGP examples.
  - Suppressed BGP grouping counts: group 56/56/44/44, inheritance 164/164/132/132.

PIM:
- Classic `pim` block interfaces parse as PIM objects.
- MD-CLI `/configure { router "Base" pim interface ... }` parses as PIM, not generic router interface.
- Classic PIM normalized identity is canonical lower-case, so Classic/MD-CLI case differences auto-match.
- Actual fixture raw/parsed counts match:
  - Classic: 15, 55, 49, 48
  - New_PIM_1..4: 50, 50, 44, 44
- Actual fixture PIM matched counts: 47, 14, 42, 39.

Fixture matrix:
- `scripts/validateCompareFixtures.js --all-cases --scope full` uses the real example directory in sibling `network-config-workbench-home`.
- Case mapping: 027 -> New_*_1, 028 -> New_*_2, 029 -> New_*_3, 030 -> New_*_4.
- Scope support: full, bgp, static, interface, lag, port, pim.
- Override path: `NCW_FIXTURE_DIR` or `--fixture-dir`.

Status labels:
- User-facing compare status labels now use MVP terms:
  - `동일`
  - `변경`
  - `검토 필요`
  - `누락`
  - `추가`
  - `미매칭`
- Internal statuses (`matched`, `candidate`, `old-only`, `new-only`) remain unchanged for matching, policies, CSS classes, and data attributes.

Section summary:
- Summary dashboard now has Interface / Static-route / BGP neighbor cards.
- Cards show total, matched, review-needed, changed, missing, added, and average overlap.
- Card click reuses the existing object type filter.

Excel export:
- Export button now downloads Excel-compatible UTF-8 CSV.
- Fixed columns:
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
- `structure-converted`, `inheritance-unresolved`, ignored/suppressed fields are not exported as active rows by default.
- Actual fixture check:
  - Source: `Gangbu-SEA027H_config.txt`
  - Target: `New_interface_1.txt` + `New_static_1.txt` + `New_bgp_1.txt`
  - Export rows: 1036
  - Status counts: 변경 416, 추가 143, 누락 477
- Smoke contracts:
  - `Excel 저장` is a visible text button.
  - Export click builds CSV rows and writes `text/csv;charset=utf-8`.
  - Section summary cards filter object list and switch to the objects tab.

MD-CLI:
- block config와 full-context one-line config가 같은 interface identity로 정규화되는 계약을 테스트로 고정했다.

전체 입력:
- 하나의 config 안에 Interface / Static-route / BGP / Port가 섞여 있어도 MVP 핵심 객체 3종이 같이 추출되고 매칭되는 테스트를 추가했다.

## 다음 개발 우선순위

1. MVP 핵심 section별 실제 대형 config 샘플로 parser gap 확인
2. Interface parser 보강
   - VRF/routing context 반영: non-Base router 완료
   - service/router context 보존: Classic direct / MD-CLI block/one-line router 완료
   - address/prefix 누락 케이스 확인: `New_interface_1..4` address interface raw/parsed count 일치 확인
3. Static-route parser/matcher 보강
   - routing context + prefix 기준 확정: non-Base router 완료
   - next-hop 변경/증감은 검토 필요로 명확히 표시
4. BGP neighbor parser/matcher 보강
   - peer IP 기준 매칭 유지
   - group inheritance와 import/export 차이 표시 안정화
   - Classic nested group context: done
   - group rename noise: done
   - admin-state display: done
   - unresolved MD-CLI group definitions and active/suppressed row grouping: done
5. 상태 분류 라벨 정리
   - 동일 / 변경 / 검토 필요 / 누락 / 추가 / 미매칭: main compare result labels done
6. section 요약 UI: done
7. Excel export: done, Excel-compatible CSV
8. smoke contracts for section card filtering and CSV download: done
9. Fixture matrix validation: done
10. 다음: decide whether real `.xlsx` multi-sheet export is needed, or continue lowConfidence/matcherIssue drill-down from fixture matrix

## 지금 하지 말 것

- 관계 그래프 고도화
- 라인 연결선/anchor/bridge UI 수정
- 색상/박스 미세 수정
- 수동 매핑 재설계
- 사용자 정의 alias/rule 구현
- Juniper/Cisco/Arista 확장
- C 전환
- legacyCore.js 대규모 수정

## 검증 결과

- branch: `work/mvp-interface-stabilization`
- `npm.cmd run guard:legacy-core` pass
- `npm.cmd test` pass: 167 pass, 1 skip
- `npm.cmd run build` pass
- `node scripts/validateCompareFixtures.js --all-cases --scope full --iterations 1` pass
- `node scripts/validateCompareFixtures.js --all-cases --scope pim --iterations 1` pass

## 집에서 이어받는 절차

```powershell
git pull
git checkout work/mvp-interface-stabilization
npm.cmd install
npm.cmd test
npm.cmd run build
node scripts/validateCompareFixtures.js --all-cases --scope full --iterations 1
```

그 다음 작업은 코드 수정 전에 이 순서로 진행한다.

1. `docs/mvp-product-definition.md` 확인
2. `docs/mvp-development-priority.md` 확인
3. `tests/mvp-core-scope.test.js` 확인
4. Interface / Static-route / BGP 중 하나만 골라 테스트 먼저 추가
5. 테스트 실패 지점을 최소 코드로 수정
