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

## 실제 사용 시 변경점

Interface:
- 기존 interface name과 신규 interface name이 달라도 IP/prefix가 같으면 같은 interface로 매칭된다.
- 동시에 interface 이름 변경이 비교 결과에 표시된다.
- 예: `to-Dobong-MNC#1` -> `Te1/1/1` 이 `interface changed`로 남는다.

Static-route:
- 같은 prefix인데 next-hop이 바뀌면 자동 동일 처리하지 않는다.
- candidate / 검토 필요 경로로 남긴다.

BGP neighbor:
- peer IP 기준으로 같은 neighbor를 매칭한다.
- import/export policy 차이는 changed로 노출된다.

MD-CLI:
- block config와 full-context one-line config가 같은 interface identity로 정규화되는 계약을 테스트로 고정했다.

전체 입력:
- 하나의 config 안에 Interface / Static-route / BGP / Port가 섞여 있어도 MVP 핵심 객체 3종이 같이 추출되고 매칭되는 테스트를 추가했다.

## 다음 개발 우선순위

1. MVP 핵심 section별 실제 대형 config 샘플로 parser gap 확인
2. Interface parser 보강
   - VRF/routing context 반영
   - service/router context 보존
   - address/prefix 누락 케이스 확인
3. Static-route parser/matcher 보강
   - routing context + prefix 기준 확정
   - next-hop 변경/증감은 검토 필요로 명확히 표시
4. BGP neighbor parser/matcher 보강
   - peer IP 기준 매칭 유지
   - group inheritance와 import/export 차이 표시 안정화
5. 상태 분류 라벨 정리
   - 동일 / 변경 / 검토 필요 / 누락 / 추가 / 미매칭
6. 이후 section 요약 UI
7. 이후 Excel export

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

- `npm.cmd run guard:legacy-core` pass
- `npm.cmd test` pass: 144 pass, 1 skip
- `npm.cmd run build` pass

## 집에서 이어받는 절차

```powershell
git pull
npm.cmd install
npm.cmd test
npm.cmd run build
```

그 다음 작업은 코드 수정 전에 이 순서로 진행한다.

1. `docs/mvp-product-definition.md` 확인
2. `docs/mvp-development-priority.md` 확인
3. `tests/mvp-core-scope.test.js` 확인
4. Interface / Static-route / BGP 중 하나만 골라 테스트 먼저 추가
5. 테스트 실패 지점을 최소 코드로 수정
