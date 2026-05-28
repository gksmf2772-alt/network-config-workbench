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

### 코드

- `src/core/comparisonPlan.js`

변경:

- visible compare field에 `interface` 추가

효과:

- address/prefix 기반으로 같은 interface라고 매칭된 뒤에도 interface name 변경이 결과에 표시된다.

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
- Static-route next-hop 변경은 자동 동일이 아니라 검토 후보로 남는다.
- BGP neighbor policy 변경은 changed field로 남는다.

## 아직 구현하지 않은 것

- section tab UI
- Excel export
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

### 2. Static-route 안정화

확인할 것:

- routing context + prefix 기준 매칭
- next-hop 변경/증감은 검토 필요
- next-hop별 tag/metric/state 비교
- MD-CLI one-line static route 병합

### 3. BGP neighbor 안정화

확인할 것:

- peer IP 기준 매칭
- group inheritance
- import/export policy 차이
- local-address, peer-as, admin-state 비교

### 4. 상태 라벨 정리

현재 내부에는 `candidate` 등이 남아 있다.

MVP 사용자 표현은 다음으로 정리해야 한다.

- 동일
- 변경
- 검토 필요
- 누락
- 추가
- 미매칭

### 5. Section 요약 UI

테스트 기반 안정화 이후 진행한다.

첫 화면:

- 전체 요약
- Interface count
- Static-route count
- BGP neighbor count
- 검토 필요 count
- 누락/추가 count

### 6. Excel export

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

- `npm.cmd run guard:legacy-core`: pass
- `npm.cmd test`: pass, 144 pass / 1 skip
- `npm.cmd run build`: pass

## 집에서 이어받는 명령

```powershell
git pull
npm.cmd install
npm.cmd test
npm.cmd run build
```

이후 `docs/mvp-product-definition.md`와 이 문서를 먼저 읽고 이어서 진행한다.
