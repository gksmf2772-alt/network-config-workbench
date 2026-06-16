# Project State

## 1. 프로젝트 개요
- 목적: 기존/신규 네트워크 설정을 객체와 필드 단위로 비교하고, 리포트/프로파일/검증 규칙을 통해 변경 검토를 지원한다.
- 주요 사용자: 네트워크 마이그레이션 또는 설정 검토 담당자.
- 핵심 기능: 설정 파싱, 객체 매핑, 필드 비교, 리포트 검토, 프로파일 기반 예외/필수 규칙 관리.
- 기술 스택: React 18, Vite 7, Node test runner, 브라우저 로컬 저장소 기반 UI.

## 2. 현재 작업
- 작업명: 핵심 리포트 상세 필드에서 접이식 규칙 추가 UI 제공.
- 작업 브랜치: `work/mvp-interface-stabilization`
- 시작일: 2026-06-02
- 현재 상태: 구현 및 자동 검증 완료. 규칙 적용 후 상세 필드 카드의 시각 강조와 `-` 해제 버튼까지 반영했다. `ingress-filter`처럼 중요 필드로 분류되는 항목에서도 규칙 적용/해제가 보이도록 보정했다. 재비교 전 stale 리포트 row에서도 저장된 필드 예외를 찾아 카드에 `-`를 표시한다. 관계 그래프 우측 라벨 토글 텍스트가 세로로 줄바꿈되는 문제를 CSS로 보정했다. 검토 테이블에는 내부 세로 스크롤을 적용했다. 실데이터 화면은 사용자 브라우저 세션 의존성이 있어 검증용 카드 캡처로 UI 형태 확인.
- 관련 파일:
  - `src/core/legacyCore.js`
  - `src/core/fieldPolicy.js`
  - `src/core/comparisonPlan.js`
  - `src/core/policyEvaluator.js`
  - `src/core/summaryAnalytics.js`
  - `src/styles/global-report.css`
  - `src/styles/global-profile.css`
  - `tests/policy-coverage.test.js`
  - `tests/summary-analytics.test.js`
  - `tests/summary-renderer.test.js`

## 3. 요구사항

### 포함 범위
- 핵심 리포트 상세 필드 카드에서 규칙 추가 기능을 사용할 수 있게 한다.
- 규칙 범위는 "이 객체만"과 "프로파일 전체"를 지원한다.
- 처리 유형은 예외/삭제/변경/추가를 지원한다.
- 필수 여부를 별도로 추가할 수 있게 한다.
- 규칙 추가 후 다시 비교할지 확인한다.
- 리포트에서 추가한 규칙이 프로파일 규칙과 요약/검증 결과에 연결되게 한다.
- 규칙 추가 UI는 기본 노출하지 않고 아이콘 클릭 시 펼쳐지게 한다.
- 팝오버가 카드 그리드 높이와 주변 UI 배치를 밀지 않게 한다.
- 드롭다운/버튼 텍스트가 잘리지 않도록 팝오버 내부 폭과 높이를 조정한다.
- 상세 필드 카드의 상태 라벨(`변경`, `동일`, `신규`, `기존`) 위치를 필드명 길이와 무관하게 통일한다.
- 리포트에서 만든 변경/삭제/추가/예외 규칙은 현재 값 조건을 함께 저장해 같은 필드의 다른 값 변화까지 정상 처리하지 않게 한다.
- 규칙이 적용된 상세 필드는 기존 카드와 시각적으로 구분되게 표시한다.
- 적용된 규칙은 가능한 경우 `-` 버튼으로 다시 해제할 수 있게 한다.
- 규칙 적용 후 숨겨진 것처럼 보이지 않도록 적용된 상세 필드도 검토 화면에 남긴다.
- `ingress-filter`, `egress-filter`, `ingress-qos`, `egress-qos` 등 정책/QoS 필드도 리포트 규칙 생성 시 비교 엔진의 중요 필드 판정과 같은 rule id를 사용한다.
- 기존에 잘못 저장된 `field-difference` 규칙도 같은 필드 조건이 있으면 `important-field-change`와 호환 매칭한다.
- 리포트 row가 재비교 전 stale 상태여도, 현재 프로파일에 같은 필드 예외가 저장되어 있으면 상세 카드에서 적용 상태와 `-` 버튼을 표시한다.
- 관계 그래프 우측 `라벨` 토글 텍스트는 좁은 영역에서도 한 줄로 유지한다.
- 검토 테이블은 항목이 늘어나도 페이지 전체를 계속 늘리지 않고 테이블 영역 내부에서 스크롤한다.

### 제외 범위
- 전체 리포트 레이아웃 재설계.
- 새 UI 라이브러리 추가.
- 저장소/인증/라우팅 구조 변경.
- 프로파일 데이터 스키마의 대규모 변경.

### 미정 사항
- 실제 운영 데이터로 리포트 상세 카드에서 최종 육안 확인 필요.

### 사용자 확인 사항
- 현재 접이식 아이콘 방식으로 진행.
- 실데이터 화면에서 팝오버 위치가 카드 우측/하단 경계에 걸리는 케이스가 있으면 추가 조정 필요.

## 4. 결정 사항

| 날짜 | 결정 | 이유 | 영향 범위 |
|---|---|---|---|
| 2026-06-02 | 상세 필드 카드의 규칙 추가 컨트롤을 기본 노출 대신 아이콘 `details` 팝오버로 전환 | 기본 노출 시 상세 필드 가독성과 카드 높이가 나빠짐 | 리포트 상세 필드 UI |
| 2026-06-02 | 객체 범위 필수 규칙은 `scope: object`와 object key를 함께 저장 | "이 객체만" 필수 여부가 프로파일 전체에 번지지 않게 하기 위함 | 프로파일 validationPolicies, 필드 정책 적용 |
| 2026-06-02 | 규칙 저장 후 재비교 여부를 확인 | 저장 즉시 결과가 바뀔 수 있어 사용자 의사 확인 필요 | 리포트/요약 재계산 흐름 |
| 2026-06-02 | 상세 필드 카드 헤더를 3열 그리드로 고정 | 필드명 길이에 따라 상태 라벨 위치가 흔들리지 않게 하기 위함 | 리포트 상세 필드 UI |
| 2026-06-02 | 리포트 생성 규칙에 `valueMode: exact`와 기존/신규 값 패턴 저장 | `A -> B`를 정상 규칙으로 추가했을 때 `A -> C`까지 정상 처리되는 것을 막기 위함 | 프로파일 예외 매칭 |
| 2026-06-02 | 규칙이 적용된 필드는 초록 계열 카드 강조와 `-` 해제 버튼을 사용 | 적용 여부가 눈에 띄지 않고 되돌릴 방법이 없다는 사용자 피드백 반영 | 리포트 상세 필드 UI, 프로파일 예외 제거 흐름 |
| 2026-06-02 | 필드 예외 평가에서는 객체 match 상태보다 필드 change 상태를 우선 | `matched`가 `changed`를 덮어써 fieldSummary 예외가 적용되지 않는 문제 방지 | comparisonPlan fieldSummary 예외 적용 |
| 2026-06-02 | `field-difference`와 `important-field-change`를 같은 필드 조건에서 호환 | 기존에 잘못 저장된 ingress-filter 규칙도 재비교 후 적용되게 하기 위함 | 프로파일 예외 매칭 |
| 2026-06-02 | 리포트 필드 규칙 생성 시 `findingType`도 필드 변경 상태로 저장 | 객체 row 상태 `matched`가 저장되어 실제 필드 예외 매칭이 실패하는 문제 방지 | 리포트 규칙 저장 |
| 2026-06-02 | 상세 카드 렌더링 시 저장된 필드 예외를 한번 더 확인 | 저장 목록에는 보이지만 상세 카드에는 `+`가 남는 stale 렌더링 문제 방지 | 리포트 상세 필드 UI |
| 2026-06-02 | 관계 그래프 라벨 토글에 최소 폭과 nowrap 적용 | `라벨` 텍스트가 `라`/`벨`로 세로 줄바꿈되는 문제 방지 | 리포트 관계 그래프 툴바 |
| 2026-06-02 | 검토 테이블 래퍼에 viewport 기준 최대 높이와 내부 스크롤 적용 | 항목 수 증가 시 리포트 페이지가 과도하게 길어지는 문제 방지 | 리포트 검토 테이블 |

## 5. 변경 이력

| 날짜 | 변경 내용 | 파일 | 이유 |
|---|---|---|---|
| 2026-06-02 | 리포트 상세 필드에서 예외/삭제/변경/추가/필수 규칙 추가 흐름 구현 | `src/core/legacyCore.js` | 리포트에서 직접 규칙을 추가하기 위해 |
| 2026-06-02 | 객체 범위 validation policy 적용 조건 추가 | `src/core/fieldPolicy.js`, `src/core/comparisonPlan.js`, `src/core/policyEvaluator.js` | 객체 단위 필수/필드 정책을 비교와 요약에 반영하기 위해 |
| 2026-06-02 | 프로파일 정책 행에 범위와 객체 key 입력 추가 | `src/core/legacyCore.js`, `src/styles/global-profile.css` | 리포트에서 생성된 객체 범위 규칙 확인/수정 지원 |
| 2026-06-02 | 규칙 추가 UI를 아이콘 팝오버로 변경 | `src/core/legacyCore.js`, `src/styles/global-report.css` | 상세 필드 카드 시인성 유지 |
| 2026-06-02 | 상세 필드 상태 라벨 열 고정 및 상태 title 추가 | `src/core/legacyCore.js`, `src/styles/global-report.css` | `변경`/`동일` 라벨 위치 통일 및 긴 상태 확인 지원 |
| 2026-06-02 | 리포트 규칙 추가 시 값 조건 저장 및 중복 판정에 값 조건 포함 | `src/core/legacyCore.js` | `A -> B`와 `A -> C`를 서로 다른 규칙으로 취급하기 위해 |
| 2026-06-02 | 관련 회귀 테스트 추가 | `tests/policy-coverage.test.js`, `tests/summary-renderer.test.js` | 객체 범위 정책과 리포트 UI 계약 보호 |
| 2026-06-02 | 적용된 상세 필드 카드 강조, `-` 해제 버튼, 적용 마커 추가 | `src/core/legacyCore.js`, `src/styles/global-report.css` | 규칙 적용 여부를 명확히 보여주고 되돌릴 수 있게 하기 위해 |
| 2026-06-02 | 적용된 필드 행을 검토 상세 목록에 유지하고 policy metadata 연결 | `src/core/summaryAnalytics.js` | 규칙 적용 후 항목이 사라져 적용 여부를 알 수 없는 문제 방지 |
| 2026-06-02 | 중요 필드 예외 rule id 목록에 ingress/egress filter와 QoS 계열 추가 | `src/core/legacyCore.js` | 리포트에서 추가한 규칙과 비교 엔진 rule id 불일치 방지 |
| 2026-06-02 | fieldSummary 예외 평가 findingType 덮어쓰기 수정 및 rule id 호환 매칭 추가 | `src/core/comparisonPlan.js`, `src/core/policyEvaluator.js` | 기존/신규 ingress-filter 규칙이 적용 카드와 `-` 버튼으로 표시되게 하기 위해 |
| 2026-06-02 | 리포트 상세 필드 렌더링에서 현재 프로파일의 저장 예외를 fallback으로 매칭 | `src/core/legacyCore.js` | 재비교 전에도 저장된 규칙 해제 버튼을 카드에 표시하기 위해 |
| 2026-06-02 | 관계 그래프 툴바 라벨 토글 폭/줄바꿈 보정 | `src/styles/global-report.css`, `tests/summary-renderer.test.js` | 라벨 토글 텍스트가 세로로 표시되지 않게 하기 위해 |
| 2026-06-02 | 검토 테이블 래퍼에 내부 스크롤 적용 | `src/styles/global-report.css`, `tests/summary-renderer.test.js` | 항목 증가 시 테이블이 페이지 전체 높이를 밀지 않게 하기 위해 |

## 6. 검증 이력

| 날짜 | 검증 항목 | 명령/방법 | 결과 | 비고 |
|---|---|---|---|---|
| 2026-06-02 | 문법 검사 | `node --check src/core/legacyCore.js` | 통과 |  |
| 2026-06-02 | 문법 검사 | `node --check src/core/fieldPolicy.js` | 통과 |  |
| 2026-06-02 | 관련 테스트 | `node --test tests/policy-coverage.test.js tests/summary-renderer.test.js` | 통과 | 44 pass, 1 skip |
| 2026-06-02 | 전체 테스트 | `npm.cmd test` | 통과 | 225 pass, 1 skip |
| 2026-06-02 | 레거시 가드 | `npm.cmd run guard:legacy-core` | 통과 |  |
| 2026-06-02 | 빌드 | `npm.cmd run build` | 통과 | Vite chunk size warning 있음 |
| 2026-06-02 | 상태 라벨 위치 회귀 테스트 | `node --test tests/summary-renderer.test.js` | 통과 | 9 pass |
| 2026-06-02 | 값 조건 예외 회귀 테스트 | `node --test tests/policy-coverage.test.js tests/summary-renderer.test.js` | 통과 | 43 pass, 1 skip |
| 2026-06-02 | 적용 카드/해제 버튼 회귀 테스트 | `node --test tests/summary-renderer.test.js tests/summary-analytics.test.js` | 통과 | 적용 필드 표시와 `-` 버튼 계약 확인 |
| 2026-06-02 | ingress-filter 적용/해제 회귀 테스트 | `node --test tests/policy-coverage.test.js tests/summary-renderer.test.js` | 통과 | 기존 `field-difference` 저장 규칙도 applied/policyId 표시 확인 |
| 2026-06-02 | stale 렌더링 fallback 계약 테스트 | `node --test tests/policy-coverage.test.js tests/summary-renderer.test.js` | 통과 | 저장된 필드 예외를 상세 카드 렌더링에서 재확인 |
| 2026-06-02 | 관계 그래프 라벨 토글 CSS 계약 테스트 | `node --test tests/summary-renderer.test.js` | 통과 | 9 pass |
| 2026-06-02 | 검토 테이블 내부 스크롤 CSS 계약 테스트 | `node --test tests/summary-renderer.test.js` | 통과 | 9 pass |

## 7. UI 검증 자료

| 날짜 | 화면 | 변경 전 캡처 | 변경 후 캡처 | 비고 |
|---|---|---|---|---|
| 2026-06-02 | 리포트 상세 필드 규칙 팝오버, 적용 카드, 해제 버튼, 상태 라벨 정렬 | 사용자 제공 화면 참고 | `docs/verification/screenshots/2026-06-02/report-rule-popover/after-popover-mock.png` | 실데이터 대신 동일 CSS 구조의 검증용 카드 캡처 |
| 2026-06-02 | 관계 그래프 라벨 토글 줄바꿈 | 사용자 제공 화면 참고 | 미수행 | CSS 계약 테스트로 `white-space: nowrap`/최소 폭 확인 |
| 2026-06-02 | 검토 테이블 내부 스크롤 | 사용자 제공 화면 참고 | 미수행 | CSS 계약 테스트로 max-height/overscroll 확인 |

## 8. 남은 작업
- [ ] 사용자 브라우저의 실제 리포트 데이터 화면에서 팝오버 위치와 텍스트 잘림 여부 육안 확인.
- [ ] 팝오버가 화면 우측/하단 경계에서 잘리는 케이스가 나오면 위치 보정 추가.

## 9. 다음 세션 인계 메모
- 현재 브랜치: `work/mvp-interface-stabilization`
- 마지막으로 완료한 작업: 핵심 리포트 상세 필드 규칙 추가 UI를 아이콘 팝오버로 변경하고, 규칙 적용 카드 강조와 `-` 해제 버튼을 추가했다. 이후 `ingress-filter` 규칙이 적용 표시/해제 버튼으로 이어지지 않던 rule id, findingType, fieldSummary 예외 적용, stale 렌더링 문제를 수정했다. 관계 그래프 우측 라벨 토글 줄바꿈과 검토 테이블 내부 스크롤도 보정했다.
- 다음에 해야 할 작업: 실제 데이터 화면에서 UI 확인 후 필요 시 팝오버 위치 보정.
- 주의해야 할 점: 리포트 규칙 추가는 `profileDraft.exceptions`와 `profileDraft.validationPolicies`를 함께 갱신할 수 있으므로 저장 후 재비교 플로우를 유지해야 한다. 리포트에서 생성한 예외/변경/삭제/추가 규칙은 값 조건까지 exact로 저장한다. 적용된 필드는 검토 화면에 남기고, 제거 가능한 profile exception은 `-` 버튼으로 해제한다. 기존에 `semantic-compare.field-difference`로 저장된 ingress/egress filter 규칙도 같은 필드 조건이면 호환 적용된다.
- 실행 명령: `npm.cmd run dev`
- 검증 명령: `npm.cmd test`, `npm.cmd run guard:legacy-core`, `npm.cmd run build`

## Project Commands

### Install
- `npm.cmd install`

### Dev
- `npm.cmd run dev`

### Test
- `npm.cmd test`

### Lint
- 별도 lint script 없음

### Typecheck
- 별도 typecheck script 없음

### Build
- `npm.cmd run build`

### Preview
- `npm.cmd run preview`

## 2026-06-02 Compare Section Filter Correction

### Current work
- Task: restore the compare pane visual style and make each compare section tab render only its own setting type.
- Branch: `work/mvp-interface-stabilization`
- Fix commit: `fb069bf fix: filter compare pane by active section`
- Related files: `src/core/legacyCore.js`, `tests/comparison-exclusion.test.js`

### Root cause
- The previous fix changed the compare pane source from existing line diff rows to semantic object block rows, which changed the visual presentation.
- After reverting that change, the remaining defect was that section tabs changed `state.activeObjectSectionScope` but did not rerender the compare panes from a section-filtered row list.

### Decision
- Keep `report.diffRows` as the existing line diff data.
- Do not introduce `buildSemanticRuntimeDiffRows` or semantic object block replacement for the compare pane.
- Filter rows at render time with `getActiveCompareDiffRows()`, using the visible `oldRow/newRow.objectKey` type.

### Verification
- `node --check src/core/legacyCore.js`: pass.
- `node --test tests/comparison-exclusion.test.js`: 19 pass.
- `npm.cmd run guard:legacy-core`: pass.
- Chrome CDP UI verification with fixture files:
  - `interface`: only `interface`.
  - `static-route`: only `static-route`.
  - `bgp`: only `bgp`, 448 `.diff-line`, 0 `.semantic-object-block-wrapper`.
  - `port-lag`: only `port`, `lag`.
  - `pim`: only `pim`.
- Screenshot: `docs/verification/screenshots/2026-06-02/compare-section-filter/after-bgp-line-diff.png`.
- `npm.cmd test`: pass, 226 pass / 1 skip.
- `npm.cmd run build`: pass, existing Vite chunk size warning remains.

### Next handoff
- Dev server URL: `http://127.0.0.1:5173/`.
- Before changing compare pane rendering again, verify that selected section tabs keep `.diff-line` rendering and do not render semantic object block wrappers.

## 2026-06-12 Report Subscriber Path Table

### Current Work
- Task: add a second report table where one row represents one subscriber/device path and columns show Port, LAG, Interface, Peer/NH, Static Route, BGP, and PIM.
- Branch: `work/mvp-interface-stabilization`
- Scope: keep the existing object-level review table unchanged and add a separate subscriber path table below it.

### Decisions
- The new table derives rows from `graph.viewGraph.views.summary` chain details, so it uses the same canonical relation mapping as the relationship graph.
- One row is side-specific: old config paths and new config paths are separate rows, distinguished by the `구분` column.
- Filters, checklist panels, view mode, count, reset, and auto-save are implemented with `data-report-subscriber-*` selectors and separate localStorage keys.
- The table uses fixed layout, bounded vertical scrolling, and ellipsis cells to prevent long config text from stretching the UI.

### Changed Files
- `src/core/legacyCore.js`
- `src/core/legacyState.js`
- `src/styles/global-report.css`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification Plan
- `node --check src/core/legacyCore.js`
- `node --test tests/summary-renderer.test.js`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run guard:legacy-core`

### Verification Result
- `node --check src/core/legacyCore.js`: pass
- `node --test tests/summary-renderer.test.js`: pass, 11 pass
- `npm.cmd test`: pass, 264 pass / 1 skip
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains
- `npm.cmd run guard:legacy-core`: pass
- Dev server for manual UI check: `http://127.0.0.1:5174/` because port 5173 was already in use

### Remaining Notes
- The current implementation does not pair old/new subscriber paths into a single comparison row. Pairing can be added later if a stable subscriber identity rule is defined.

## 2026-06-12 ECharts Sankey PoC

### Current Work
- Task: implement first-pass ECharts Sankey PoC without removing the existing React Flow relationship graph.
- Branch: `work/mvp-interface-stabilization`
- Scope: show `OLD_PORT -> OLD_LAG -> PATH_ANCHOR -> NEW_LAG -> NEW_PORT` from existing canonical chain details, with a simple selected path card on click.

### Decisions
- Added `echarts` and `echarts-for-react` because the requested PoC explicitly targets ECharts Sankey.

## 2026-06-16 Dependency Graph ServicePath Mock Polish

### Current Work
- Task: keep the current Dependency Graph screen structure and polish the mock graph so it explains a real circuit/service path instead of looking like disconnected object pills.
- Branch: `work/mvp-interface-stabilization`
- Scope: mock Dependency Graph model, compact node/edge visual states, drawer tabs, and tests only. Real parser/canonical graph wiring was not reconnected or changed in this pass.

### Decisions
- The mock graph now has a `ServicePath` anchor for `to-pef1-1 / 14.59.4.65`.
- Main graph nodes remain actual setting object kinds only: port, lag, interface, peer, static, bgp, pim, internal, and system-interface.
- Diff state is represented on compact nodes as low-noise badges: added, removed, changed, unchanged.
- OLD/NEW scope is represented as a small source badge, not as a large summary node.
- Relation evidence is attached to edges with relation kinds such as `PORT_MEMBER_OF_LAG`, `LAG_BINDS_INTERFACE`, `PEER_SAME_SUBNET`, `NEXT_HOP_MATCH`, `BGP_NEIGHBOR_MATCH`, `PIM_ENABLED`, and `INTERNAL_POLICY_REF`.
- Drawer tabs are now `summary`, `evidence`, `path`, `diff`, and `source`, so users can inspect why a relation exists without turning cluster/domain labels into graph nodes.
- Cluster hulls were visually muted so they read as background grouping, not as primary graph cards.

### Changed Files
- `src/components/graph/dependencyGraphModel.js`
- `src/components/graph/DependencyGraphView.jsx`
- `src/styles/global-report.css`
- `tests/dependency-graph-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --test tests/dependency-graph-model.test.js`: pass, 20 pass.
- `node --test tests/summary-renderer.test.js`: pass, 14 pass.
- `npm.cmd test`: pass, 311 pass / 1 skip.
- `npm.cmd run build`: pass, existing Vite chunk size warning remains.
- Browser DOM verification at `http://localhost:5173/`:
  - Dependency Graph root rendered with `data-mock-graph="true"`.
  - 20 compact nodes and 18 graph edges rendered.
  - Diff states rendered: added, changed, removed, unchanged.
  - Source scopes rendered: old, new, both.
  - Relation kinds rendered: `BGP_NEIGHBOR_MATCH`, `INTERNAL_POLICY_REF`, `LAG_BINDS_INTERFACE`, `NEXT_HOP_MATCH`, `PEER_SAME_SUBNET`, `PIM_ENABLED`, `PORT_MEMBER_OF_LAG`.
  - Raw Graph View button remains visible.
  - Node click opens the overlay drawer without shrinking the graph.
  - Drawer tabs show summary, evidence, path, diff, and source/config information.
  - Local app console logs filtered by localhost: no warning/error entries.
- UI capture:
  - `docs/verification/screenshots/2026-06-16/dependency-graph-service-path/after-graph-canvas.png`
  - Note: Browser screenshot capture timed out for some later desktop clips. DOM verification and one canvas/top capture were saved; additional desktop screenshot may need retry in a fresh browser session if required.

### Known Issues
- Clicking an edge that visually overlaps nearby compact nodes can still select the node instead of the edge. The selected node's evidence tab exposes the same relation evidence, but edge hit priority should be improved later.
- Current work remains mock-only by instruction. Real canonical graph/data reconnection should wait until the mock direction is accepted.
- Existing React Flow graph remains rendered below the PoC as `Raw Graph View`.
- VisualPath generation pairs old/new chain details by peer IP first, then interface name fallback.
- If no chain data exists, the PoC renders a small mock path so the ECharts integration can still be visually verified.
- Right detail panel, tree view, KPI cards, and lower charts are intentionally out of scope for this first pass.

### Changed Files
- `package.json`
- `package-lock.json`
- `src/components/graph/SankeyFlowPoc.jsx`
- `src/components/graph/sankeyPocModel.js`
- `src/components/graph/RelationshipGraphBridge.jsx`
- `src/core/legacyCore.js`
- `src/styles/global-report.css`
- `tests/sankey-poc-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification Result
- `node --check src/core/legacyCore.js`: pass
- `node --check src/components/graph/sankeyPocModel.js`: pass
- `node --test tests/sankey-poc-model.test.js`: pass, 2 pass
- `node --test tests/summary-renderer.test.js`: pass, 11 pass
- `npm.cmd test`: pass, 266 pass / 1 skip
- `npm.cmd run build`: pass, Vite chunk-size warning remains and is larger after ECharts integration
- `npm.cmd run guard:legacy-core`: pass
- `git diff --check`: pass, Windows CRLF warnings only

### Known Issues
- ECharts is currently bundled into the main client chunk, increasing `assets/index-*.js` to about 1.8 MB minified. A later pass should lazy-load the Sankey PoC component or split ECharts into a manual chunk.
- VisualPath pairing is a PoC heuristic, not the final subscriber/device pair resolver.
- Aggregate node expansion, side detail panel, tree view, and bottom charts are not implemented in this pass.

## 2026-06-04 Full Config Section Split Fix

### Current work
- Task: fix compare-pane object mapping when full device configs are pasted into old/new inputs.
- Branch: `work/mvp-interface-stabilization`
- Related files:
  - `src/core/legacyCore.js`
  - `tests/comparison-exclusion.test.js`
  - `tests/static-route-object-key.test.js`
  - `docs/verification/full-config-section-split-2026-06-04.md`
  - `docs/verification/screenshots/2026-06-04/full-config-section-split/`

### Root cause
- The legacy compare-pane parser kept any indented line inside the currently open object.
- In full MD-CLI configs, sibling objects such as `port ... {` at the same indentation could be swallowed by the previous object.
- Generic object detection also accepted wrapper/wildcard lines such as `bgp {`, `bgp-peers`, and `neighbor ".*"` as real BGP objects.
- PIM section `interface` lines were detected as generic `interface` objects unless the parser preserved the surrounding PIM context.
- The MD-CLI PIM parser consumed a nested `interface {}` block without updating the surrounding PIM brace depth, so later service `interface`/`sap` blocks could be emitted as PIM raw lines.
- For whole-device configs, the compare pane relied on the lighter legacy row parser even though the project already had vendor-specific structured parsers that understand full Nokia Classic and MD-CLI config hierarchy.

### Decision
- Keep the existing compare-pane line rendering and section tab UI.
- Add parser-side validation for detected object starts.
- Split same-indent sibling object starts before treating indented lines as child settings.
- Reject BGP wildcard/template/header detections.
- Track PIM section context so child `interface` lines become `pim` objects in full-config input.
- Add narrow policy-family starts for `ip-prefix-list`/`prefix-list`, `policy-statement`, and `ip-filter`/`ipv6-filter`/`redirect-policy`.
- For large or multi-section configs, convert normalized parser objects back into the existing legacy compare-row object shape instead of using ad hoc line scanning as the primary parser.
- Rework MD-CLI PIM block parsing to collect `pim { ... }` brace blocks first, then only collect `interface { ... }` blocks inside those PIM blocks.

### Verification
- `node --check src/core/legacyCore.js`: pass.
- `node --check src/core/parsers/nokiaMdCliParser.js`: pass.
- `node --test tests/comparison-exclusion.test.js tests/static-route-object-key.test.js`: pass, 46 tests.
- `npm.cmd run validate:compare:fixtures -- --fixture-dir "..\자료\테스트 config" --md-full-logs --case 1 --iterations 1`: pass.
- Chrome CDP full-config UI verification with:
  - old: `Gangbu-SEA027H_config.txt`
  - new: `2026-05-28_15-13-31_Dobong-SEA027H_전체설정후_MDconfig.log`
- Verified rendered section rows:
  - All comparison: `910` items rendered, both old/new panes had rows.
  - BGP: old `342` / new `342`, only `bgp`, no `bgp:bgp`, no `bgp-peers`, no wildcard `.*`.
  - Static Route: old `589` / new `589`, only `static-route`.
  - Port/LAG: old `5597` / new `5597`, only `port` and `lag`.
  - Service/SAP: old `1985` / new `1985`, only `subscriber-interface` and `sap`.
  - PIM: old `124` / new `124`, only `pim`; suspicious `sap`/`service`/`router` text count `0`.
  - Policy: old `56` / new `56`, only `filter`, `route-policy`, `prefix-list`, and `community`.
  - Interface: old `2496` / new `2496`, only `interface`.
- Screenshots:
  - `docs/verification/screenshots/2026-06-04/full-config-section-split/after-bgp-rows.png`
  - `docs/verification/screenshots/2026-06-04/full-config-section-split/after-pim-rows.png`
  - `docs/verification/screenshots/2026-06-04/full-config-section-split/after-policy-rows.png`
  - `docs/verification/screenshots/2026-06-04/full-config-section-split/after-full-config-bgp-final.png`
- `npm.cmd test`: pass, 229 pass / 1 skip.
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains.

### Remaining notes
- Policy parsing is intentionally narrow. Avoid adding broad `community`, bare `filter`, or `port-list` matching without a focused parser task, because those words can appear in unrelated sections.
- Dev server URL during verification: `http://127.0.0.1:5173/`.

## 2026-06-04 Port/LAG Section Tab Split

### Current work
- Task: split the combined `Port/LAG` section tab into separate `Port` and `LAG` tabs.
- Branch: `work/mvp-interface-stabilization`
- Related files:
  - `src/core/legacyCore.js`
  - `tests/summary-renderer.test.js`
  - `docs/PROJECT_STATE.md`

### Decision
- Keep the existing section tab component and visual style.
- Replace the single `{ scope: "port-lag", label: "Port/LAG", types: ["port", "lag"] }` filter with:
  - `{ scope: "port", label: "Port", types: ["port"] }`
  - `{ scope: "lag", label: "LAG", types: ["lag"] }`

### Verification
- `node --check src/core/legacyCore.js`: pass.
- `node --test tests/summary-renderer.test.js`: pass, 9 tests.
- Chrome CDP UI check: pass.
  - Compare section tabs show `Port` and `LAG` as separate buttons.
  - `Port/LAG` combined tab is no longer present.
- Screenshot: `docs/verification/screenshots/2026-06-04/port-lag-tab-split/after-port-lag-split.png`.
- `npm.cmd test`: pass, 229 pass / 1 skip.
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains.

## 2026-06-04 Performance Rendering Optimization

### Current work
- Task: reduce perceived slowness in compare, summary, and report views for full config comparison.
- Branch: `work/mvp-interface-stabilization`
- Related files:
  - `src/core/legacyCore.js`
  - `src/core/legacyState.js`
  - `src/core/compareRenderer.js`
  - `src/styles/global-summary.css`
  - `docs/verification/performance-rendering-2026-06-04.md`
  - `docs/verification/screenshots/2026-06-04/performance-rendering/after-report-optimized.png`

### Root cause
- Report tab activation rerendered the full overview report every time.
- The default compact report review table still created all full-option field columns and all detail rows in hidden DOM.
- The report pane reached about `293140` DOM nodes on the measured fixture.
- Diff rendering bound semantic-pair events per line and measured every `.diff-line` for alignment.
- Semantic preview rendered every plan card immediately after compare.

### Decision
- Cache unchanged report overview renders by render version.
- Keep report review compact view lightweight by default.
- Render full option columns only on explicit full-view request.
- Render report detail field UI only when a detail row is expanded.
- Use event delegation for semantic pair hover/click.
- Align only semantic object block wrappers, not every diff line.
- Render the first `120` semantic preview cards initially and expose a full-load button.

### Verification
- Browser fixture:
  - old `439644` chars, new `512478` chars.
  - default report DOM reduced from about `293140` nodes to about `35459` nodes.
  - report tab repeat activation reduced from about `11s` to about `0.3-0.6s`.
  - report detail row lazy expansion measured about `24ms`.
  - semantic preview full-load button measured about `0.4s` for all cards.
- Screenshot:
  - `docs/verification/screenshots/2026-06-04/performance-rendering/after-report-optimized.png`
- Commands:
  - `node --check src/core/legacyCore.js`
  - `node --check src/core/legacyState.js`
  - `node --check src/core/compareRenderer.js`
  - `node --test tests/summary-renderer.test.js tests/summary-analytics.test.js tests/comparison-exclusion.test.js tests/policy-coverage.test.js tests/semantic-mapping-policy.test.js tests/matcher-quality.test.js tests/static-route-object-key.test.js`
  - `npm.cmd run guard:legacy-core`
  - `npm.cmd test`
  - `npm.cmd run build`

### Remaining notes
- Full option report view is intentionally on demand; selecting it can still take several seconds for many option columns.
- Remaining compare time is mostly large diff pane rendering and semantic matching; deeper follow-up is diff virtualization or worker-based parser/matcher execution.

## 2026-06-04 Summary UX Follow-up Note

### Issue
- In the Summary tab, the visible area can grow without a practical boundary as grouped items increase.
- Some summary items become difficult or impossible to inspect when there are many entries.
- Even when violations exist, it is hard for users to identify which object, field, or rule is violating expectations by group.
- The current summary view does not give a sufficiently intuitive operational path for finding and reviewing violations from a user's perspective.

### Desired direction
- Add bounded scrolling or pagination so large summary groups do not expand the page indefinitely.
- Provide a clearer group-level violation view that lets users quickly see where violations exist.
- Make each violation traceable to its object, field, rule/status, and related compare detail.
- Keep the existing visual style, but improve scanability and navigation for large result sets.
- Treat this as a UX improvement task, not just a CSS overflow fix, because the main issue is finding and understanding violations efficiently.

### Next work candidate
- Review the Summary tab data structure and rendering flow.
- Design a compact grouped violation list or drill-down interaction.
- Verify with full-config comparison data where many objects and violations are present.

## 2026-06-04 Summary UX Grouped Review

### Current work
- Task: improve Summary tab usability when review items and violations increase.
- Branch: `work/mvp-interface-stabilization`
- Related files:
  - `src/core/legacyCore.js`
  - `src/styles/global-summary.css`
  - `tests/summary-renderer.test.js`
  - `docs/verification/summary-ux-2026-06-04.md`
  - `docs/verification/screenshots/2026-06-04/summary-ux/`

### Decision
- Keep the existing Summary tab layout and visual language.
- Add grouped review controls inside the immediate review workspace rather than redesigning the whole Summary page.
- Group review rows by object type, while keeping existing issue-kind filters and search.
- Add bounded internal scrolling to the issue list, selected issue detail, and field-level issue sections.
- Update the selected detail automatically when filtering hides the previous selection.

### Verification
- `node --check src/core/legacyCore.js`: pass.
- `node --test tests/summary-renderer.test.js`: pass, 10 tests.
- `node --test tests/summary-renderer.test.js tests/summary-analytics.test.js tests/comparison-exclusion.test.js tests/policy-coverage.test.js`: pass, 93 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- `npm.cmd test`: pass, 230 pass / 1 skip.
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains.
- Browser CDP desktop check: pass.
  - Type group buttons rendered.
  - Issue list max-height computed as `640px`.
  - Detail card max-height computed as `680px`.
- Browser CDP mobile check: pass.
  - Issue workspace collapsed to one column at `390x900`.

### Screenshots
- `docs/verification/screenshots/2026-06-04/summary-ux/after-summary-grouped.png`
- `docs/verification/screenshots/2026-06-04/summary-ux/after-summary-issue-groups.png`
- `docs/verification/screenshots/2026-06-04/summary-ux/after-summary-issue-groups-mobile.png`

### Remaining notes
- Built-in sample data verified the UI contract. A larger full-config case should still be checked manually to confirm grouping remains useful when many object types and many violations are present.
- This pass does not add pagination or virtual scrolling; it bounds the existing UI and improves group-level navigation.

## 2026-06-05 Relationship Graph Expansion

### Current work
- Task: improve relationship graph for full config comparisons.
- Branch: `work/mvp-interface-stabilization`.
- Related files:
  - `src/core/summaryAnalytics.js`
  - `src/core/legacyCore.js`
  - `src/core/legacySelectors.js`
  - `src/components/AppShell.jsx`
  - `src/components/GraphTabPanel.jsx`
  - `src/styles/global-report.css`
  - `tests/summary-analytics.test.js`
  - `tests/summary-renderer.test.js`
  - `docs/verification/relationship-graph-2026-06-05.md`

### Requirements handled
- Add a dedicated Graph tab so the relationship graph can be viewed larger than inside Report.
- Keep existing Report graph, but route the report quick graph action to the dedicated Graph tab.
- Add graph controls for `비교 관계` and `내부 연결`.
- Add expand/collapse visual behavior for the graph canvas.
- Add old/new config internal relationship edges for port, lag, service/SAP, interface, static-route, BGP, filter, QoS, and policy references.
- Keep comparison mapping edges separate from config-internal edges.

### Decisions
- Relationship graph edges now carry `graphMode: "comparison"` or `graphMode: "internal"` for UI toggling.
- Internal graph edges are built per side (`old`, `new`) from already parsed semantic objects.
- Missing referenced targets such as filter/qos/policy/service are shown as virtual reference nodes instead of hiding the relationship.
- Static-route to BGP prefix matching ignores broad prefixes shorter than `/24` to avoid noisy default-route links.
- The graph layout uses topology columns: Port, LAG, Interface, SAP/Service, Static/PIM, BGP, Filter/QoS/Policy.

### Verification
- `node --check src/core/summaryAnalytics.js`: pass.
- `node --check src/core/legacyCore.js`: pass.
- `node --test tests/summary-analytics.test.js`: pass, 28 tests.
- `node --test tests/summary-renderer.test.js`: pass, 10 tests.
- `npm.cmd test`: pass, 231 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains.
- Browser CDP check: pass.
  - Graph tab active.
  - Graph rendered with 20 nodes and 20 edges on the verification fixture.
  - Internal edges: 16.
  - Comparison edges: 4.
  - Comparison/internal toggles rendered.
  - Expand state applied.

### Screenshots
- `docs/verification/screenshots/2026-06-05/relationship-graph/after-graph-tab.png`

### Remaining notes
- Full production config should be rechecked after the user compares real large configs, because parser coverage still determines which old/new internal links can be inferred.
- The current graph remains a bounded summary graph and now uses type-balanced representative sampling.

## 2026-06-05 Relationship Graph Sampling Fix

### Issue
- In full config comparisons, the graph could show only port nodes.
- Root cause: graph data used the first active plan items in order, and full configs often place many port objects before LAG/interface/static-route/BGP objects.
- Port-heavy configs also made the graph lane very tall.

### Change
- Replaced first-N slicing with graph-specific type-balanced sampling.
- Added a per-type graph cap of 12 plan items.
- The per-type cap applies even when total plan items are below the global graph cap, so a port-heavy but otherwise small graph does not become vertically dominated by port nodes.
- Added graph metadata for selected/hidden counts and a UI note explaining representative sampling.

### Verification
- `node --check src/core/summaryAnalytics.js`: pass.
- `node --check src/core/legacyCore.js`: pass.
- `node --test tests/summary-analytics.test.js`: pass, 29 tests.
- `node --test tests/summary-analytics.test.js tests/summary-renderer.test.js`: pass, 39 tests.
- `npm.cmd test`: pass, 232 pass / 1 skip.
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains.
- `npm.cmd run guard:legacy-core`: pass.
- `npm.cmd run validate:graph`: partial.
  - Synthetic graph case passed.
  - Full real validation could not run because local fixture `예제 및 테스트 설정/Gangbuk-SEA028_config.txt` is missing.
- Browser CDP port-heavy graph check: pass.
  - 40-port fixture rendered port plus lag/interface/sap/static-route/bgp/filter/policy/service.
  - Nodes reduced to 38.
  - Limit note showed hidden port count.

### Screenshots
- `docs/verification/screenshots/2026-06-05/relationship-graph/after-graph-balanced-sampling.png`

### Remaining notes
- The sampling layer remains in place. The following progressive disclosure pass adds click-to-expand cluster nodes on top of this sampling.

## 2026-06-05 Relationship Graph Progressive Disclosure

### Issue
- The initial relationship graph still showed too much information, making full-config review hard to scan.
- The flow layout was intentionally type-column based, so users could only read it as row/column lanes.
- A free layout mode was needed, but it still had to avoid node label overlap.

### Change
- Default graph rendering now uses compact mode.
- Compact mode keeps up to 3 nodes per side/type group and replaces the rest with `+N` cluster nodes.
- Clicking a cluster node or the `상세 보기` button switches the graph to full detail.
- Added `흐름` and `자유` layout buttons.
- `자유` layout uses a wider deterministic scatter canvas with collision checks rather than fixed topology columns.
- Graph interactions now rebind through an abort controller so repeated graph re-renders do not accumulate duplicate listeners.

### Verification
- `node --check src/core/legacyCore.js`: pass.
- `node --test tests/summary-renderer.test.js tests/summary-analytics.test.js`: pass, 39 tests.
- `npm.cmd test`: pass, 232 pass / 1 skip.
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains.
- `npm.cmd run guard:legacy-core`: pass.
- Browser CDP full graph UX check: pass.
  - Compact flow: 35 nodes, 53 edges, 8 cluster nodes, 0 node overlaps.
  - Full flow: 69 nodes, 110 edges, 0 cluster nodes, 0 node overlaps.
  - Full free layout: 69 nodes, 110 edges, 0 cluster nodes, 0 node overlaps.

### Screenshots
- `docs/verification/screenshots/2026-06-05/relationship-graph/after-graph-compact-default.png`
- `docs/verification/screenshots/2026-06-05/relationship-graph/after-graph-free-layout.png`

### Remaining notes
- The free layout is not drag-and-drop; it is a deterministic scatter layout. It trades a larger scrollable canvas for readable non-overlapping nodes without adding a new graph library.

## 2026-06-05 Relationship Graph React Flow Migration

### Current work
- Task: replace the legacy direct SVG relationship graph renderer with React Flow.
- Branch: `work/mvp-interface-stabilization`.
- Related files:
  - `package.json`
  - `package-lock.json`
  - `src/main.jsx`
  - `src/core/legacyCore.js`
  - `src/components/graph/RelationshipGraph.jsx`
  - `src/components/graph/RelationshipGraphBridge.jsx`
  - `src/components/graph/ConfigNode.jsx`
  - `src/components/graph/ConfigEdge.jsx`
  - `src/utils/graphAdapter.js`
  - `src/utils/dagreLayout.js`
  - `src/styles/global-report.css`
  - `tests/graph-adapter.test.js`
  - `tests/summary-renderer.test.js`
  - `docs/verification/relationship-graph-2026-06-05.md`

### Requirements handled
- Added `@xyflow/react` and `dagre`.
- Added a graph adapter that converts the existing `summaryAnalytics` graph output into React Flow nodes and edges.
- Added graph data validation for duplicate node ids, duplicate edge ids, and missing edge endpoints.
- Added dagre flow layout and kept the existing free/scatter layout option through a React Flow-compatible utility.
- Added custom React Flow node and edge components.
- Replaced the relationship graph HTML/SVG output with a React Flow mount root while keeping existing toolbar controls.
- Preserved compact/full detail behavior, comparison/internal mode toggles, search, label toggle, node click focus, pane reset, and cluster expansion.
- Kept `summaryAnalytics` graph output structure unchanged.

### Verification
- `node --check src/core/legacyCore.js`: pass.
- `node --test tests/graph-adapter.test.js tests/summary-renderer.test.js`: pass, 13 tests.
- `npm.cmd test`: pass, 235 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains.
- Browser CDP React Flow check: pass.
  - React Flow nodes rendered: 34.
  - Initial visible edges: 0, by design.
  - MiniMap rendered: yes.
  - Controls rendered: yes.
  - Node click showed connected edges: 2.
  - Node click dimmed unrelated nodes: 14.
  - Pane click reset edges and dim state: yes.
  - Node status data included `unchanged`, `modified`, and `added`.
  - Free layout toggle rendered React Flow with 34 nodes.
  - Flow layout toggle restored dagre positioning.
  - Label toggle hid object labels while preserving type/score text.

### Screenshots
- `docs/verification/screenshots/2026-06-05/relationship-graph-react-flow/after-react-flow-graph.png`

### Remaining notes
- React Flow added bundle weight. The production build still succeeds, but the existing chunk-size warning remains and should be addressed separately if load time becomes a problem.
- Search in compact mode can keep aggregate cluster nodes visible when their hidden search text matches. This is expected progressive disclosure behavior.

## 2026-06-05 Relationship Graph Layout Emergency Fix

### Current work
- Task: fix React Flow graph nodes clustering vertically without stable dagre lanes.
- Branch: `work/mvp-interface-stabilization`.
- Related files:
  - `src/utils/dagreLayout.js`
  - `src/components/graph/RelationshipGraph.jsx`
  - `src/components/graph/RelationshipGraphBridge.jsx`
  - `src/core/legacyCore.js`
  - `src/styles/global-report.css`
  - `docs/verification/relationship-graph-2026-06-05.md`

### Requirements handled
- Applied requested fix 1: replaced the `applyDagreLayout` body with explicit dagre graph setup, LR rank direction, orphan edge filtering, rounded positions, and no `(0,0)` fallback for missing dagre positions.
- Applied requested fix 2: `RelationshipGraph.jsx` now calculates `layoutedNodes` before passing nodes into `useNodesState`.
- Applied requested fix 3: React Flow now has explicit `fitViewOptions`, `minZoom={0.05}`, `maxZoom={2}`, and `defaultEdgeOptions={{ hidden: true }}`.
- Applied requested fix 4: React Flow is wrapped in a `width: 100%; height: 100%; minHeight: 600` container, and the parent `.report-graph-flow-root` height is explicitly set to `calc(100vh - 160px)` with `min-height: 600px`.
- Preserved the existing free layout helper and `layoutMode` bridge so the previously added free layout toggle does not regress.
- Did not apply fix 5 in this pass because the user specifically requested fixes 1-4 only.

### Verification
- `node --check src/utils/dagreLayout.js`: pass.
- `node --check src/components/graph/RelationshipGraph.jsx`: not applicable; Node cannot directly syntax-check `.jsx` and returns `ERR_UNKNOWN_FILE_EXTENSION`.
- `node --test tests/graph-adapter.test.js tests/summary-renderer.test.js`: pass, 13 tests.
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains.
- `npm.cmd test`: pass, 235 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- Browser CDP console check: pass.
  - `console.log('layouted:', rows)` was captured.
  - Node count: 34.
  - Distinct x positions: 3.
  - Distinct y positions: 15.
  - x range: `40` to `520`.
  - y range: `40` to `570`.
  - All nodes at `(0,0)`: false.
  - FitView control exists: true.
  - MiniMap exists: true.
  - `.report-graph-flow-root` height: `800px` on the 1680x960 verification viewport.

### Screenshots
- `docs/verification/screenshots/2026-06-05/relationship-graph-layout-fix/after-layout-fix.png`

### Remaining notes
- The graph is no longer at `(0,0)` or a single vertical pile. If stricter type columns are still needed, apply the separately listed rank hint work as the next change.

## 2026-06-05 Relationship Graph Readability Fix

### Issue
- The emergency dagre fix made positions non-zero, but large graphs were still unreadable because React Flow fit the entire graph into one viewport.
- In full detail mode, many nodes became too small to read and appeared as a dense vertical cluster.

### Change
- Added `columnRank` metadata for graph node types in `src/utils/graphAdapter.js`.
- Added a readable column layout path in `src/utils/dagreLayout.js` for large graphs over 42 nodes.
- Large graph flow layout now uses stable type columns: port, LAG, interface, SAP/service, static/PIM, BGP, filter/QoS/policy, more.
- React Flow now disables automatic full fit for large graphs and starts at readable zoom `0.82`.
- Minimum zoom is now `0.35` so the graph cannot collapse into unreadable dots.
- The graph container now has a fixed viewport height and hidden overflow; navigation is handled through React Flow pan/zoom and MiniMap instead of nested scrollbars.

### Verification
- `node --check src/utils/dagreLayout.js`: pass.
- `node --test tests/graph-adapter.test.js tests/summary-renderer.test.js`: pass, 13 tests.
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains.
- `npm.cmd test`: pass, 235 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- Browser CDP large graph check: pass.
  - Synthetic full graph detail nodes: 115.
  - Distinct x columns: 8.
  - Distinct y positions: 20.
  - x range: `48` to `1588`.
  - y range: `48` to `862`.
  - All nodes at `(0,0)`: false.
  - Minimum rendered node width: `97px`.
  - Median rendered node width: `97px`.
  - FitView control exists: true.
  - MiniMap exists: true.

### Screenshots
- `docs/verification/screenshots/2026-06-05/relationship-graph-readable-fix/after-readable-large-graph.png`

### Remaining notes
- Full detail mode can still contain more nodes than the visible viewport. That is intentional; the graph now prioritizes readable nodes and uses pan/zoom/MiniMap for navigation instead of shrinking everything into one view.

## 2026-06-10 Dev Server Startup Hang Check

### Issue
- `npm.cmd run dev` started a Vite process on port `5173`, but the site did not open.
- HTTP requests to `/` and `/src/main.jsx` timed out while the Node/Vite process kept consuming CPU.

### Cause
- Temporary Chrome verification profiles had been created inside the repository under `tmp/`.
- The repo uses `@tailwindcss/vite`; with a large temporary browser profile inside the project root, Vite/Tailwind scanning could stall dev-server requests and production builds.

### Change
- Removed the workspace-local `tmp/` directory created during browser verification.
- Added `tmp/` to `.gitignore` so future verification scratch files do not become a Vite/Tailwind scan target.

### Verification
- `npm.cmd run build`: pass in `4.56s`; existing chunk-size warning remains.
- `npm.cmd test`: pass, 235 pass / 1 skip.
- Restarted dev server with `npm.cmd run dev -- --host 127.0.0.1 --port 5173`.
- `http://127.0.0.1:5173/`: HTTP 200.
- `http://127.0.0.1:5173/src/main.jsx`: HTTP 200.

### Next Session Notes
- Use `npm.cmd run dev`, not bare `npm.cmd run`, to start the site.
- Keep temporary browser profiles outside the repository or under ignored `tmp/`.

## 2026-06-10 Relationship Graph Focus And Layout Modes

### Issue
- Clicking one graph element only showed directly connected edges, so users could not quickly understand the related path.
- The default graph view showed nodes but did not make `port -> lag -> interface -> static-route -> bgp/pim` connectivity clear.
- Users requested multiple layout modes including row/column and radial views.

### Change
- Default graph view now keeps primary internal topology edges visible:
  - `port -> lag`
  - `lag -> interface`
  - `port -> interface`
  - `interface -> static-route`
  - `static-route -> bgp`
  - `interface -> pim`
- Node click focus now expands a multi-hop neighborhood instead of only direct neighbors.
- Focused edges are highlighted thicker, and related nodes are kept visible while unrelated nodes are dimmed.
- After clicking a node, React Flow fits the related neighborhood into view.
- Added a `방사형` graph layout mode alongside existing `행열` and `자유`.
- Added config-internal `interface -> pim` graph edges.

### Files
- `src/components/graph/RelationshipGraph.jsx`
- `src/components/graph/ConfigEdge.jsx`
- `src/components/graph/ConfigNode.jsx`
- `src/utils/dagreLayout.js`
- `src/core/legacyCore.js`
- `src/core/summaryAnalytics.js`
- `tests/graph-adapter.test.js`
- `tests/summary-analytics.test.js`
- `tests/summary-renderer.test.js`

### Verification
- `node --test tests/graph-adapter.test.js tests/summary-analytics.test.js tests/summary-renderer.test.js`: pass, 42 tests.
- `npm.cmd test`: pass, 235 pass / 1 skip.
- `npm.cmd run build`: pass in `4.76s`; existing chunk-size warning remains.
- Browser CDP graph check: pass.
  - Default visible topology edges: 10.
  - Clicking `old-port` expanded related path edges to 16.
  - Focused path included comparison edges and both old/new internal chain edges.
  - Radial mode rendered with distributed x/y positions.

### Screenshots
- `docs/verification/screenshots/2026-06-10/relationship-graph-focus-layouts/after-radial-layout.png`

### Remaining Notes
- Large real configs may still need a dedicated "selected neighborhood only" view if the focused path grows too broad. Current behavior keeps all nodes visible but dims unrelated nodes to preserve context.

## 2026-06-10 Relationship Graph Circuit Lane Layout

### Issue
- The large row/column graph placed nodes by config order inside each type column.
- Because each column was sorted independently, related `port`, `lag`, `interface`, `static-route`, `bgp`, and `pim` objects often appeared on different y positions.
- This made internal relationship lines cross heavily and look random even when the underlying circuit relationship was correct.

### Change
- Updated the large graph row/column layout to build topology-connected components before assigning positions.
- Internal topology edges now determine a shared lane:
  - `internal-port-lag`
  - `internal-lag-interface`
  - `internal-port-interface`
  - `internal-interface-static-route`
  - `internal-static-route-bgp`
  - `internal-interface-pim`
  - SAP/service topology edges where present.
- Nodes in the same detected circuit are aligned on the same y-axis across columns.
- If multiple nodes from the same circuit fall in one column, they stack only within that circuit lane.

### Files
- `src/utils/dagreLayout.js`
- `tests/graph-adapter.test.js`

### Verification
- `node --test tests/graph-adapter.test.js tests/summary-renderer.test.js`: pass, 14 tests.
- `npm.cmd test`: pass, 236 pass / 1 skip.
- `npm.cmd run build`: pass in `4.54s`; existing chunk-size warning remains.
- Browser CDP synthetic large graph check: pass.
  - 20 circuit lanes checked.
  - Every checked `port -> lag -> interface -> static-route -> bgp` circuit had a single shared y coordinate.
  - Rendered DOM sample showed same-circuit nodes aligned horizontally.

### Screenshots
- `docs/verification/screenshots/2026-06-10/relationship-graph-lane-layout/after-lane-layout.png`

### Remaining Notes
- If parser output does not include enough internal topology edges for a real circuit, that circuit cannot be lane-aligned yet. The next improvement would be adding more relationship inference, not changing the renderer.

## 2026-06-12 Relationship Graph Type Filter

### Issue
- The relationship graph exposed too many object categories by default.
- Shared policy/reference objects such as BGP, QoS, filter, policy, SAP, and service made the graph look overloaded before users selected a focused view.

### Change
- The default relationship graph view now shows only the topology path requested for the first pass:
  - `port`
  - `lag`
  - `interface`
  - `static`
  - `pim`
- Added graph type checkboxes for `Port`, `LAG`, `Interface`, `Static`, and `PIM`.
- Preserved type checkbox state when switching graph detail/layout modes.
- Hidden graph types now fade and shrink through the React Flow node/edge renderer instead of visually competing with active topology nodes.
- Focus, fit view, and edge visibility now exclude type-filtered nodes.
- Policy, QoS, filter, SAP/service, and BGP controls are intentionally left for a later expansion.

### Files
- `src/core/legacyCore.js`
- `src/components/graph/RelationshipGraph.jsx`
- `src/components/graph/ConfigNode.jsx`
- `src/components/graph/ConfigEdge.jsx`
- `src/styles/global-report.css`
- `tests/summary-renderer.test.js`

### Verification
- `node --test tests/summary-renderer.test.js tests/graph-adapter.test.js`: pass, 14 tests.
- `npm.cmd test`: pass, 236 pass / 1 skip.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains.
- Browser CDP type-filter check: pass.
  - Default visible types: `interface`, `lag`, `pim`, `port`, `static`.
  - Policy/reference types visible by default: false.
  - Unchecking `LAG` hides LAG while keeping `Port` visible.
  - Node hide transition includes opacity and transform animation.
  - Browser console errors during graph verification: none.

### Screenshots
- `docs/verification/screenshots/2026-06-12/relationship-graph-type-filter/after-type-filter.png`

### Remaining Notes
- The next graph expansion should add optional controls for shared references (`filter`, `qos`, `policy`, `sap/service`, `bgp`) instead of enabling them by default.

## 2026-06-12 Relationship Graph Connectivity And Spread Fix

### Issue
- The graph still looked too spread out after type filtering.
- Cause 1: the readable column layout still reserved x-axis columns for hidden types such as SAP/service and BGP, so visible `interface -> static/pim` nodes were separated by unused column gaps.
- Cause 2: large graphs auto-fit all visible nodes after render, which zoomed the whole graph down and made nodes hard to read.
- Cause 3: `lag -> interface` edges only used explicit `lag`, `port`, or `sap` fields on interface objects. LAG description endpoints and interface names/descriptions that identify the same circuit were not used.
- Cause 4: graph sampling could select a LAG but omit its member port plan item, so the LAG appeared without a connected port even though the full comparison had the port object.

### Change
- Large readable graph layout now compresses columns around currently visible type filters.
- Reduced readable column gap from `220px` to `180px`.
- Large graphs no longer auto-fit every visible node on initial render; they start at readable zoom and keep pan/zoom navigation.
- Graph reference indexing now includes description endpoint candidates and directional-name variants such as `to-*`, `from-*`, `via-*`, and `g-to-*`.
- `lag -> interface` graph edges now also check interface object reference variants, so shared description/interface endpoint names can connect the circuit.
- Graph sampling now expands selected topology nodes with direct neighbors:
  - selected LAG pulls in member port if available.
  - selected LAG can pull in same-endpoint interface.
  - selected interface can pull in referenced LAG/port.
  - selected PIM/static-route can pull in explicit interface references where available.

### Files
- `src/components/graph/RelationshipGraph.jsx`
- `src/utils/dagreLayout.js`
- `src/core/summaryAnalytics.js`
- `tests/graph-adapter.test.js`
- `tests/summary-analytics.test.js`

### Verification
- `node --test tests/summary-analytics.test.js tests/graph-adapter.test.js tests/summary-renderer.test.js`: pass, 46 tests.
- `npm.cmd test`: pass, 239 pass / 1 skip.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains.
- Browser CDP large graph layout check: pass.
  - Viewport transform stayed readable: `translate(28px, 28px) scale(0.82)`.
  - Visible types: `interface`, `lag`, `pim`, `port`, `static`.
  - `port -> lag` x delta: `180`.
  - `lag -> interface` x delta: `180`.
  - `interface -> static` x delta: `180`.
  - Browser console errors during graph verification: none.

### Screenshots
- `docs/verification/screenshots/2026-06-12/relationship-graph-connectivity-layout/after-connectivity-layout.png`

### Remaining Notes
- If a real config has no parseable member-port, interface reference, SAP reference, or shared description endpoint, the graph still cannot infer that physical relationship. That would require adding new parser evidence, not just renderer changes.

## 2026-06-12 Relationship Graph Row Connectivity Fix

### Issue
- The relationship graph row/column view could still look arbitrary because broad endpoint reference expansion made one LAG or port appear connected to unrelated interfaces.
- Small graphs still used the dagre path, so the "row/column" mode did not always render as a readable circuit row.
- Hidden type-filtered nodes could still participate in layout spacing, leaving large empty gaps and pushing visible topology nodes apart.

### Change
- `lag -> interface` inference now uses explicit `lag`, `port`, and `sap` references first.
- Description/name endpoint fallback is now applied only when it resolves to exactly one LAG or port candidate.
- Topology neighbor expansion no longer uses broad `graphObjectRefVariants()` for LAG/interface/PIM neighbor discovery.
- Row/column flow mode now always prefers the readable column layout, regardless of graph size.
- Readable layout now calculates components from currently visible types only; filtered-out nodes no longer reserve visible lane height.
- Default visible relationship graph types now include `BGP`, so the basic path reads as `Port -> LAG -> Interface -> Static -> BGP -> PIM`.
- PIM was moved to its own column after BGP instead of sharing the Static column.

### Files
- `src/core/summaryAnalytics.js`
- `src/utils/dagreLayout.js`
- `src/utils/graphAdapter.js`
- `src/components/graph/RelationshipGraph.jsx`
- `src/core/legacyCore.js`
- `tests/summary-analytics.test.js`
- `tests/graph-adapter.test.js`

### Verification
- `node --test tests/summary-analytics.test.js tests/graph-adapter.test.js tests/summary-renderer.test.js`: pass, 47 tests.
- `npm.cmd test`: pass, 240 pass / 1 skip.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains.
- Browser CDP React Flow synthetic row check: pass.
  - Console errors: `0`.
  - Row 1 y-axis spread: `0`.
  - Row 2 y-axis spread: `0`.
  - Visible x-order: Port, LAG, Interface, Static, BGP, PIM.
  - Hidden SAP node opacity: `0`, and it did not affect the visible row placement.

### Screenshots
- `docs/verification/screenshots/2026-06-12/relationship-graph-row-connectivity/after-readable-flow.png`

### Remaining Notes
- If a real device config legitimately has one LAG feeding multiple logical interfaces, one physical node still cannot be duplicated into multiple perfect rows without adding a separate "duplicated lane node" visualization mode. The current fix prevents false fan-out and keeps confirmed circuit chains aligned.

## 2026-06-12 Canonical Relation Graph Phase 1

### Current Work
- Task: start separating graph relation inference from the React Flow renderer.
- Branch: `work/mvp-interface-stabilization`.
- Scope: add canonical graph types, canonical IDs, interface canonicalization, and first direct relation resolvers.

### Change
- Added a new canonical graph layer under `src/core/relationGraph/`.
- Added explicit node kinds:
  - `PORT`
  - `LAG`
  - `L3_INTERFACE`
  - `PEER_NH`
  - `STATIC_ROUTE`
  - `BGP_NEIGHBOR`
  - `PIM`
- Added explicit direct relation kinds:
  - `MEMBER_OF`
  - `HAS_INTERFACE`
  - `HAS_PEER`
  - `USED_BY_STATIC`
  - `USED_BY_BGP`
  - `HAS_PIM`
- Added canonical ID helpers for all target node kinds.
- Added interface, port, LAG, device, and VRF canonicalization helpers.
- Added `CanonicalNode` and `GraphEdge` factory functions through plain JS object constructors.
- `createGraphEdge()` now rejects invalid/transitive endpoint pairs.
- Implemented `PORT -> LAG` resolver:
  - LAG member-port evidence.
  - Port channel-group/LAG evidence.
  - Same physical port with multiple LAG candidates is classified as `conflict` and no automatic edge is created.
- Implemented `LAG -> L3_INTERFACE` resolver:
  - Explicit `lag` reference.
  - Explicit `sap` reference such as `lag-11:100`.
  - Interface port reference only when the port already resolves to one LAG.
  - Multiple LAG candidates are classified as `ambiguous` and no automatic edge is created.
- Static route, BGP, PIM canonical nodes can be created, but no transitive direct edges are generated in this phase.

### Files
- `src/core/relationGraph/types.js`
- `src/core/relationGraph/canonicalInterface.js`
- `src/core/relationGraph/canonicalIds.js`
- `src/core/relationGraph/relationResolver.js`
- `src/core/relationGraph/canonicalGraphBuilder.js`
- `src/core/relationGraph/index.js`
- `tests/relation-graph.test.js`

### Verification
- `node --test tests/relation-graph.test.js`: pass, 8 tests.
- `node --test tests/relation-graph.test.js tests/summary-analytics.test.js tests/graph-adapter.test.js`: pass, 45 tests.
- `npm.cmd test`: pass, 248 pass / 1 skip.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains.

### Remaining Notes
- The existing UI still uses `summaryAnalytics.buildGraphData()`. The new canonical graph builder is implemented and tested independently, but not yet wired into the report/graph rendering pipeline.
- Next phase should add `PEER_NH`, static route, BGP, and PIM resolvers, then project canonical graph data into a view graph for React Flow.

## 2026-06-12 Canonical Relation Graph Static/BGP/PIM Resolvers

### Current Work
- Task: extend the canonical graph resolver layer with static route, BGP, and PIM direct relations.
- Branch: `work/mvp-interface-stabilization`.
- Scope: canonical resolver only. React Flow renderer and legacy summary graph rendering were not changed in this pass.

### Change
- Added IPv4/CIDR utilities for canonical resolver decisions.
- Added `PIM_NEIGHBOR` node kind and `USED_BY_PIM` direct relation.
- Added canonical PIM neighbor ID helper.
- Added `L3_INTERFACE -> PEER_NH` relation inference from explicit interface peer fields and /30-/31 interface addresses.
- Added static route resolver:
  - Requires same device and VRF between route and interface candidates.
  - Skips routes without next-hop and records `unresolved`.
  - Uses explicit outgoing interface match at confidence `100`.
  - Uses interface peer IP match at confidence `95`.
  - Uses connected subnet membership at confidence `70`.
  - Emits `PEER_NH -> STATIC_ROUTE` only when the highest score candidate is unique.
  - Emits `ambiguous` when top candidates tie and does not create the route edge.
- Added BGP resolver:
  - Resolves direct connected peers by peer IP or connected subnet.
  - Allows multihop/loopback neighbors only when directly connected or when static-route reachability proves the neighbor prefix.
  - Emits `PEER_NH -> BGP_NEIGHBOR` with confidence and evidence.
- Added PIM resolver:
  - Separates interface enable from neighbor relations.
  - Emits `L3_INTERFACE -> PIM` for interface enable.
  - Emits `PEER_NH -> PIM_NEIGHBOR` only when a neighbor IP is present and resolvable.
- Preserved transitive edge ban: no `PORT -> STATIC_ROUTE`, `PORT -> BGP_NEIGHBOR`, or `LAG -> STATIC_ROUTE` direct edge is generated.

### Files
- `src/core/relationGraph/types.js`
- `src/core/relationGraph/canonicalIds.js`
- `src/core/relationGraph/canonicalGraphBuilder.js`
- `src/core/relationGraph/index.js`
- `src/core/relationGraph/ipUtils.js`
- `src/core/relationGraph/relationResolver.js`
- `tests/relation-graph.test.js`

### Verification
- `node --check src/core/relationGraph/relationResolver.js`: pass.
- `node --check src/core/relationGraph/canonicalGraphBuilder.js`: pass.
- `node --test tests/relation-graph.test.js`: pass, 15 tests.
- `node --test tests/relation-graph.test.js tests/summary-analytics.test.js tests/graph-adapter.test.js`: pass, 52 tests.
- `npm.cmd test`: pass, 255 pass / 1 skip.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains.

### Remaining Notes
- The canonical graph layer is still independent from the current UI graph. The next step is to add a canonical graph -> React Flow view graph projection and then wire it into the graph tab behind existing behavior.
- Static/BGP/PIM resolvers currently use IPv4 only. IPv6 can be added as a separate resolver utility extension.
- BGP multihop reachability is proven through resolved static-route reachability in this phase. Policy, IGP, and recursive route proof are not implemented yet.

## 2026-06-12 Canonical View Graph React Flow Rendering

### Current Work
- Task: render a canonical relation graph through a separate view graph instead of passing canonical graph data directly to React Flow.
- Branch: `work/mvp-interface-stabilization`.
- Scope: React Flow rendering data path, fixed-column view projection, canonicalId-based interaction, and static route aggregation.

### Change
- Added `buildCanonicalViewGraph()` under `src/core/relationGraph/viewGraph.js`.
- Default flow view now uses fixed canonical columns:
  - `PORT`: x `0`
  - `LAG`: x `260`
  - `L3_INTERFACE`: x `560`
  - `PEER_NH`: x `860`
  - `STATIC_ROUTE`: x `1160`
  - `BGP_NEIGHBOR`: x `1480`
  - `PIM`: x `1760`
- `buildGraphData()` now attaches `graph.viewGraph` while preserving the existing legacy `graph.nodes`/`graph.edges` contract.
- `renderRelationshipGraph()` prefers `graph.viewGraph` when present, so React Flow receives view graph nodes/edges, not canonical graph nodes/edges.
- `toReactFlowData()` preserves view node positions and passes through `canonicalId`, `canonicalKind`, `viewLayout`, and aggregate metadata.
- `RelationshipGraph.jsx` keeps fixed-column coordinates in flow mode and still allows radial/free modes to use their existing layout functions.
- Click, hover, focus, and dimming now use `data.canonicalId` so cloned nodes for the same canonical object highlight together.
- Static routes sharing one next-hop are collapsed into `Static Routes: N` aggregate nodes by default.
- Clicking a static aggregate expands the hidden individual static route child nodes for focused inspection.
- Added `Peer` to graph type filters so `PEER_NH` is visible in the default chain.

### Files
- `src/core/relationGraph/viewGraph.js`
- `src/core/relationGraph/index.js`
- `src/core/summaryAnalytics.js`
- `src/core/legacyCore.js`
- `src/utils/graphAdapter.js`
- `src/components/graph/RelationshipGraph.jsx`
- `src/components/graph/ConfigNode.jsx`
- `src/components/graph/ConfigEdge.jsx`
- `tests/relation-graph.test.js`
- `tests/graph-adapter.test.js`
- `tests/summary-analytics.test.js`

### Verification
- `node --check src/core/relationGraph/viewGraph.js`: pass.
- `node --check src/core/summaryAnalytics.js`: pass.
- `node --check src/core/legacyCore.js`: pass.
- `node --test tests/relation-graph.test.js tests/graph-adapter.test.js`: pass, 23 tests.
- `node --test tests/summary-analytics.test.js tests/summary-renderer.test.js tests/graph-adapter.test.js tests/relation-graph.test.js`: pass, 66 tests.
- `npm.cmd test`: pass, 259 pass / 1 skip.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains.
- Browser CDP renderer check: pass.
  - Rendered node types: `port`, `lag`, `interface`, `peer`, `static`, `bgp`, `pim`.
  - Fixed transforms confirmed: `0`, `260`, `560`, `860`, `1160`, `1480`, `1760`.
  - Static route children opacity before aggregate click: `0`, `0`.
  - Static route children opacity after aggregate click: `1`, `1`.
  - Console/runtime errors: none related to graph rendering. The only captured error-level event was existing `favicon.ico` 404.

### UI Screenshots
- Default collapsed fixed-column view: `docs/verification/screenshots/2026-06-12/canonical-view-graph/after-fixed-column-default.png`
- Aggregate expanded fixed-column view: `docs/verification/screenshots/2026-06-12/canonical-view-graph/after-fixed-column-view.png`

### Known Issues
- `PIM_NEIGHBOR` view nodes share the PIM column because the requested default column order does not include a separate PIM neighbor column.
- Static route aggregate expansion is local to the current React Flow render state. Changing graph filters or rerendering the graph returns aggregates to the default collapsed state.
- The view graph is now wired into the report graph rendering path, but broader real-config quality still depends on parser/resolver evidence coverage.

## 2026-06-12 Relationship Graph Trace Matrix UX

### Current Work
- Task: improve the default relationship graph from a broad node graph into a path trace matrix.
- Branch: `work/mvp-interface-stabilization`.
- Scope: React Flow renderer view graph projection, row-focused interaction, summary/detail/full graph views, and tests.

### Change
- Replaced the prior fixed-number column projection with a trace matrix view model.
- Added view modes:
  - `summary`: default path view with `PORT | LAG | L3_INTERFACE | PEER_NH | SERVICES`.
  - `detail`: path view with individual service nodes expanded by service type.
  - `full`: full graph view using the same dynamic column calculation as detail.
- Summary view now displays services as one aggregate node, for example `Static 2 | BGP 0 | PIM 1`.
- Detail/full views use individual `STATIC_ROUTE`, `BGP_NEIGHBOR`, and `PIM` nodes only when those node types exist.
- Column x positions are calculated from visible columns using `COLUMN_LAYOUT`, so missing BGP/PIM/static columns no longer reserve blank space.
- Added row bands and column header nodes so one row reads as one connection path.
- Added chain-focused click behavior:
  - clicking a node or row band highlights the same `chainId`;
  - other chains are dimmed;
  - right side panel shows PORT, LAG, Interface, Peer/NH, Static routes, BGP neighbors, PIM, confidence, and evidence.
- Changed default graph buttons to user-facing actions:
  - `경로 요약`
  - `경로 상세`
  - `문제만 보기`
  - `전체 그래프`
- Moved the old layout-oriented controls under `고급 배치`.

### Files
- `src/core/relationGraph/viewGraph.js`
- `src/core/relationGraph/index.js`
- `src/core/legacyCore.js`
- `src/styles/global-report.css`
- `src/utils/graphAdapter.js`
- `src/components/graph/RelationshipGraph.jsx`
- `src/components/graph/ConfigNode.jsx`
- `src/components/graph/ConfigEdge.jsx`
- `src/components/graph/graphFocus.js`
- `tests/relation-graph.test.js`
- `tests/graph-adapter.test.js`
- `tests/summary-analytics.test.js`

### Verification
- `node --check src/core/relationGraph/viewGraph.js`: pass.
- `node --check src/core/legacyCore.js`: pass.
- `node --check src/core/summaryAnalytics.js`: pass.
- `node --check src/utils/graphAdapter.js`: pass.
- `node --check src/components/graph/graphFocus.js`: pass.
- `node --test tests/relation-graph.test.js tests/graph-adapter.test.js`: pass, 26 tests.
- `node --test tests/summary-analytics.test.js`: pass, 33 tests.
- `node --test tests/summary-renderer.test.js`: pass, 10 tests.
- `npm.cmd test`: pass, 262 pass / 1 skip.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains.
- Browser CDP renderer check: pass.
  - Summary headers rendered: `PORT`, `LAG`, `INTERFACE`, `PEER/NH`, `SERVICES`.
  - Services aggregate rendered: `Static 2 | BGP 0 | PIM 1`.
  - Row click opened the side detail panel.
  - Non-selected row dimmed to opacity `0.12`.

### UI Screenshots
- Summary trace matrix with selected row: `docs/verification/screenshots/2026-06-12/trace-matrix-graph/summary-selected-row.png`

### Known Issues
- `detail` and `full` currently use the same expanded service-column projection. The main distinction is intended UX usage: `detail` for selected-chain inspection and `full` for broader graph inspection.
- The side panel is an overlay on the right side of the graph. On narrow graph widths it can cover the far-right SERVICES/PIM area until the user pans or closes the panel.
- Orphan static/BGP/PIM nodes with no resolver-backed chain are still not emphasized in the default trace matrix; they remain dependent on unresolved/diagnostic reporting.

## 2026-06-12 Relationship Graph Old/New Side Layout

### Current Work
- Task: place old config trace matrix on the left and new config trace matrix on the right.
- Branch: `work/mvp-interface-stabilization`.
- Scope: canonical view graph layout coordinates and side headers only.

### Change
- Changed trace matrix side placement from vertical stacking to horizontal side lanes.
- `old` side now starts at the left origin.
- `new` side now starts at `old layout width + side gap`, so both sides keep the same column order but render next to each other.
- Each side now has its own repeated column headers and a side title:
  - `기존 설정`
  - `신규 설정`
- Row `y` positions are calculated independently within each side, preventing new config rows from being pushed below old config rows.
- Added a regression test that asserts old nodes are left of new nodes and side headers are present.

### Files
- `src/core/relationGraph/viewGraph.js`
- `src/components/graph/ConfigNode.jsx`
- `tests/relation-graph.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --check src/core/relationGraph/viewGraph.js`: pass.
- `node --test tests/relation-graph.test.js tests/summary-analytics.test.js tests/graph-adapter.test.js`: pass, 60 tests.
- `npm.cmd test`: pass, 263 pass / 1 skip.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains.
- Browser CDP renderer check: pass.
  - synthetic old port x: `146.97`
  - synthetic new port x: `875.22`
  - new side is rendered to the right of old side.

### UI Screenshots
- Old-left/new-right trace matrix: `docs/verification/screenshots/2026-06-12/trace-matrix-graph/old-left-new-right.png`

### Known Issues
- Very wide old/new side-by-side layouts may require panning or zooming on smaller screens.

## 2026-06-12 Relationship Graph Services Click Fix

### Current Work
- Task: fix SERVICES aggregate click resetting the graph instead of showing Static/BGP/PIM details.
- Branch: `work/mvp-interface-stabilization`.
- Scope: React Flow click handling and legacy graph rerender bridge.

### Cause
- `SERVICES` aggregate nodes share the same `chainId` as their row.
- The click handler treated a second click on the same `chainId` as a selection toggle reset.
- Because `SERVICES` was not handled as an expand/detail action first, clicking `Static | BGP | PIM` could look like the graph returned to its initial state.

### Change
- `SERVICES` aggregate clicks are now excluded from the same-chain reset path.
- In the legacy graph bridge, `SERVICES` clicks now trigger `rerenderGraphView(..., { viewMode: "detail" })`.
- Detail view then shows individual `STATIC_ROUTE`, `BGP_NEIGHBOR`, and `PIM` nodes when present.

### Files
- `src/components/graph/RelationshipGraph.jsx`
- `src/core/legacyCore.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --test tests/summary-renderer.test.js tests/relation-graph.test.js`: pass, 30 tests.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains.
- Browser CDP renderer check: pass.
  - synthetic SERVICES click called `onServicesOpen` once.
- `npm.cmd test`: pass, 263 pass / 1 skip.

## 2026-06-12 ECharts Sankey Detail Panel

### Current Work
- Task: implement the second-pass ECharts Sankey detail panel for node/link clicks.
- Branch: `work/mvp-interface-stabilization`.
- Scope: keep the existing React Flow graph and Sankey PoC, but replace the simple selected-path card with a right-side detail panel.

### Change
- Sankey node/link clicks still select the first related `pathId` and log `[sankey-poc] selectedPath` for debugging.
- The selected path now renders in a right-side detail panel with:
  - selected path title and status badge;
  - path anchor details: chain ID, interface, peer/next-hop, VRF, confidence;
  - OLD path and NEW path cards: port, LAG, interface, peer/next-hop;
  - service impact counts: Static Route, BGP Neighbor, PIM;
  - resolver evidence/config evidence list when available.
- The detail panel uses fixed side width, internal scrolling, and ellipsis handling so long config names do not expand the graph layout.
- Empty state now explains that selecting a Sankey node or link populates the panel.

### Files
- `src/components/graph/SankeyFlowPoc.jsx`
- `src/styles/global-report.css`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --check src/core/legacyCore.js`: pass.
- `node --check src/components/graph/sankeyPocModel.js`: pass.
- `node --test tests/sankey-poc-model.test.js`: pass, 2 tests.
- `node --test tests/summary-renderer.test.js`: pass, 11 tests.
- `npm.cmd test`: pass, 266 pass / 1 skip.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains because ECharts is still bundled into the main app chunk.
- `npm.cmd run guard:legacy-core`: pass.
- `git diff --check`: pass, with existing CRLF normalization warnings only.

### UI Verification
- Local dev server was available at `http://127.0.0.1:5174`.
- Automated screenshot was not captured for this step because the current app requires a populated compare state before the Sankey panel renders meaningful data in a fresh browser profile.
- Manual check scenario for next UI pass:
  - run compare with a config pair that produces Sankey paths;
  - open the graph/report area containing `Sankey View PoC`;
  - click a Sankey node and a Sankey link;
  - verify the right panel shows OLD path, NEW path, service impact, confidence, and evidence without expanding the chart layout.

### Known Issues
- ECharts still increases the Vite main bundle size; later work should lazy-load the Sankey PoC or move ECharts into a manual chunk.
- The Sankey detail panel uses the currently available VisualPath data. Evidence depth depends on canonical chain details and may be sparse for mock/fallback paths.

## 2026-06-12 ECharts Sankey Selected Path Tree

### Current Work
- Task: add a Tree View for the selected Sankey path.
- Branch: `work/mvp-interface-stabilization`.
- Scope: keep the existing Sankey chart, right detail panel, and React Flow raw graph; add only the selected-path tree inside the Sankey detail panel.

### Change
- Added `SankeyPathTree` to the Sankey detail panel.
- The tree groups selected path data into:
  - `OLD`: old port, LAG, interface, peer/next-hop.
  - `COMMON`: anchor interface, peer/next-hop, VRF, confidence.
  - `NEW`: new LAG, port, interface, peer/next-hop.
  - `SERVICES`: Static Route, BGP Neighbor, PIM counts.
- Missing old/new sides render explicit empty states instead of blank rows.
- Added tree styling with group badges, connector lines, bounded text, and ellipsis handling so long values do not expand the right panel.

### Files
- `src/components/graph/SankeyFlowPoc.jsx`
- `src/styles/global-report.css`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --test tests/sankey-poc-model.test.js`: pass, 2 tests.
- `node --test tests/summary-renderer.test.js`: pass, 11 tests.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains because ECharts is still bundled into the main app chunk.
- `npm.cmd test`: pass, 266 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- `git diff --check`: pass, with existing CRLF normalization warnings only.

### Known Issues
- No new screenshot was captured in this step because the Sankey panel needs a populated compare state for meaningful UI verification in a fresh browser profile.
- The tree currently shows aggregate service counts. A later pass can expand SERVICES into individual Static/BGP/PIM objects if the Sankey side panel gets a drill-down mode.

## 2026-06-12 ECharts Sankey KPI And Impact Panels

### Current Work
- Task: add top KPI cards and bottom service impact, change distribution, and impact ranking panels to the ECharts Sankey PoC.
- Branch: `work/mvp-interface-stabilization`.
- Scope: keep the Sankey chart, selected detail panel, tree view, and React Flow raw graph; add derived summary panels around the Sankey chart.

### Change
- Added Sankey model helpers:
  - `buildSankeyKpis`
  - `summarizeSankeyServices`
  - `buildSankeyChangeDistribution`
  - `buildSankeyImpactRanking`
- Added top KPI cards for:
  - total paths;
  - changed/review paths;
  - service-affected paths;
  - average confidence.
- Added bottom panels for:
  - service impact summary: Static Route, BGP Neighbor, PIM counts;
  - change type distribution with status bars;
  - impact ranking with score, service count, confidence, and status.
- Impact ranking rows select the same Sankey path as chart node/link clicks and update the existing right detail panel.
- Added bounded layout, ellipsis handling, and responsive columns so summary panels do not stretch the graph area.

### Files
- `src/components/graph/sankeyPocModel.js`
- `src/components/graph/SankeyFlowPoc.jsx`
- `src/styles/global-report.css`
- `tests/sankey-poc-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --check src/components/graph/sankeyPocModel.js`: pass.
- `node --test tests/sankey-poc-model.test.js`: pass, 3 tests.
- `node --test tests/summary-renderer.test.js`: pass, 11 tests.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains because ECharts is still bundled into the main app chunk.
- `npm.cmd test`: pass, 267 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- `git diff --check`: pass, with existing CRLF normalization warnings only.

### Known Issues
- No new screenshot was captured in this step because the Sankey panel needs a populated compare state for meaningful UI verification in a fresh browser profile.
- Impact score is a derived PoC score based on path status, service count, confidence, and existing `impactScore`; it is not yet a user-approved operational severity formula.

## 2026-06-12 Move Sankey PoC From Report To Graph Tab

### Current Work
- Task: move the four-pass ECharts Sankey implementation out of the report tab and into the dedicated graph tab.
- Branch: `work/mvp-interface-stabilization`.
- Scope: move render placement only; keep the existing Sankey model, detail panel, tree view, KPI cards, bottom panels, and React Flow raw graph behavior.

### Change
- Removed `renderSankeyPoc(graph)` from the report tab's embedded graph section.
- The report tab now keeps only the existing React Flow relationship graph section.
- Added `renderSankeyPoc(dashboard.graph)` to `renderStandaloneGraphPage`, so the dedicated graph tab now shows:
  - Sankey PoC with KPI cards;
  - selected path detail panel;
  - selected path tree view;
  - service impact summary;
  - change type distribution;
  - impact ranking;
  - Raw Graph View below it.
- Updated static renderer tests to assert Sankey is mounted from `renderStandaloneGraphPage` and not from `renderOverviewReport`.

### Files
- `src/core/legacyCore.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --check src/core/legacyCore.js`: pass.
- `node --test tests/summary-renderer.test.js`: pass, 11 tests.
- `node --test tests/sankey-poc-model.test.js`: pass, 3 tests.
- `npm.cmd test`: pass, 267 pass / 1 skip.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains because ECharts is still bundled into the main app chunk.
- `npm.cmd run guard:legacy-core`: pass.
- `git diff --check`: pass, with existing CRLF normalization warnings only.

### Known Issues
- No new screenshot captured yet. Manual UI check should compare the report tab and graph tab after running a populated config comparison:
  - report tab: no Sankey PoC block;
  - graph tab: Sankey PoC appears above Raw Graph View.

## 2026-06-12 Sankey Main Flow Data Filtering

### Current Work
- Task: fix the ECharts Sankey data generation so the main Sankey does not render raw, unbounded VisualPath data.
- Branch: `work/mvp-interface-stabilization`.
- Scope: data shaping and rendering bindings only. Existing React Flow raw graph remains unchanged.

### Change
- Added `isMainSankeyEligible(path)` so the main Sankey only includes `changed` or `unchanged` paths that have:
  - old/new sides;
  - old/new port and LAG;
  - a valid logical anchor from interface name or peer IP.
- Excluded `added`, `removed`, `ambiguous`, `unresolved`, and structurally incomplete paths from the main Sankey.
- Split Sankey node internals from user-visible labels:
  - internal `id`/`name` stay stable and unique;
  - `displayLabel` is used for chart labels and tooltips;
  - forbidden placeholders such as `sankey-path`, `chain:`, `no-port`, `no-lag`, `no-interface`, and `no-peer` are not displayed.
- Added path anchor labels from short interface name and peer IP, with `미매핑 경로` kept out of the main Sankey by eligibility filtering.
- Added stage-level visible node limiting:
  - top 8 groups per stage are shown;
  - overflow is grouped as `+N 더보기` aggregate nodes.
- Aggregated links by `sourceId + targetId + status`.
- Capped main Sankey links to 100 and exposed a truncation notice for runtime data.
- Updated KPI cards and notice area to separate:
  - total raw VisualPath count;
  - main Sankey display count;
  - excluded added/removed/ambiguous/unresolved counts;
  - displayed-path average confidence.
- The right detail panel default state now only instructs the user to click a flow node or link.

### Files
- `src/components/graph/sankeyPocModel.js`
- `src/components/graph/SankeyFlowPoc.jsx`
- `src/styles/global-report.css`
- `tests/sankey-poc-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --check src/components/graph/sankeyPocModel.js`: pass.
- `node --test tests/sankey-poc-model.test.js`: pass, 9 tests.
- `node --test tests/summary-renderer.test.js`: pass, 11 tests.
- `npm.cmd test`: pass, 273 pass / 1 skip.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains because ECharts is bundled into the main app chunk.
- `npm.cmd run guard:legacy-core`: pass.
- `git diff --check`: pass, with existing CRLF normalization warnings only.

### Runtime Count Notes
- The model now returns `totalPathCount`, `displayedPathCount`, `excludedSummary`, `nodes.length`, `links.length`, `aggregateNodeCount`, and `truncated` for the real browser compare dataset.
- CLI fallback mock data result:
  - total paths: 2
  - main Sankey paths: 2
  - excluded added/removed/ambiguous/unresolved: 0/0/0/0
  - nodes: 10
  - links: 8
  - aggregate nodes: 0
- The user's 647-path runtime dataset is not stored as a local fixture, so exact production counts must be read from the graph tab KPI/notice after running that comparison.

### Known Issues
- No screenshot captured in this step because the reported 647-path compare state is runtime-only and not available as a local fixture.
- The Sankey PoC still selects the first `pathId` from an aggregate node/link. A later detail-drilldown pass can expose an aggregate member list instead.

## 2026-06-12 Sankey Graph Focus Layout

### Current Work
- Task: update only the ECharts Sankey UI/layout so the graph becomes the primary visual area.
- Branch: `work/mvp-interface-stabilization`.
- Scope: layout and visibility only. `src/components/graph/sankeyPocModel.js` data filtering/generation logic was not modified in this step.

### Change
- Removed the large KPI card render from the Sankey screen.
- Replaced the title/KPI area with a compact one-line toolbar containing:
  - short title: `변경 흐름`;
  - compact summary pills for total, displayed, excluded, changed, added, removed, and average confidence;
  - `통계 보기`, `상세 패널`, and `Raw Graph View` buttons.
- Removed user-visible `PoC` wording from the Sankey UI.
- Hid the right detail panel by default.
- Detail opens as an absolute positioned right drawer when a node/link is selected or the detail button is toggled.
- Added a drawer close button that clears selection and hides the drawer.
- Hid the bottom statistics panels by default.
- `통계 보기` toggles the existing Service Impact, Change Distribution, and Impact Ranking panels.
- Enlarged the Sankey chart area:
  - `height: calc(100vh - 170px)`;
  - `min-height: 620px`;
  - compact card padding.
- Kept a `Raw Graph View` button in the Sankey toolbar and retained the existing raw React Flow section below the Sankey block.

### Files
- `src/components/graph/SankeyFlowPoc.jsx`
- `src/styles/global-report.css`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --test tests/summary-renderer.test.js`: pass, 11 tests.
- `node --test tests/sankey-poc-model.test.js`: pass, 9 tests.
- `npm.cmd test`: pass, 273 pass / 1 skip.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains because ECharts is bundled into the main app chunk.
- `npm.cmd run guard:legacy-core`: pass.

### UI Verification
- Screenshot: `docs/verification/screenshots/2026-06-12/sankey-layout/after-desktop.png`.
- Browser verification used Chrome headless against the running Vite dev server.
- Screenshot metrics:
  - viewport height: 950px;
  - Sankey chart height: 780px;
  - chart height ratio: 82% of viewport;
  - compact toolbar visible: true;
  - detail panel initially hidden: true;
  - bottom stats initially hidden: true;
  - Raw Graph View button visible: true;
  - visible `PoC` text: false.

### Known Issues
- Screenshot verification used the component's fallback mock graph because the user's 647-path runtime comparison state is not stored as a local fixture.
- The current Sankey node visual density for the fallback mock is very large because only two mock paths are present and ECharts allocates available vertical space to them. The requested layout goal, graph-first screen occupancy, is satisfied.

## 2026-06-12 Sankey Aggregate Load More Interaction

### Current Work
- Task: implement only the `+ more` aggregate node interaction for the ECharts Sankey view.
- Branch: `work/mvp-interface-stabilization`.
- Scope: preserve the existing main Sankey filtering/selection behavior; add stage-level visible limits and aggregate click handling.

### Change
- Added per-stage visible node limits for Sankey stages.
- `buildSankeyData()` now accepts `stageVisibleLimits` while keeping the existing `visibleNodeLimit` option compatible.
- Aggregate nodes still represent hidden groups per stage; increasing a stage limit reduces that stage's remaining aggregate count.
- Clicking an aggregate node increases only that node's stage visible limit by 20.
- Aggregate clicks do not clear the current selected path, detail drawer state, or stats panel state.
- When the hidden count reaches zero for a stage, that stage's aggregate node is no longer generated.

### Files
- `src/components/graph/sankeyPocModel.js`
- `src/components/graph/SankeyFlowPoc.jsx`
- `tests/sankey-poc-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --check src/components/graph/sankeyPocModel.js`: pass.
- `node --check src/components/graph/SankeyFlowPoc.jsx`: not applicable; Node v24 does not directly syntax-check `.jsx` modules.
- `node --test tests/sankey-poc-model.test.js`: pass, 10 tests.
- `node --test tests/summary-renderer.test.js`: pass, 11 tests.
- `npm.cmd test`: pass, 274 pass / 1 skip.
- `npm.cmd run build`: pass; existing Vite chunk-size warning remains because ECharts is bundled into the main app chunk.
- `npm.cmd run guard:legacy-core`: pass.

### Known Issues
- No new screenshot was captured for this interaction-only change. The behavior is covered by model and renderer tests; a browser dataset with enough per-stage aggregate nodes is needed for meaningful manual click verification.

## 2026-06-15 Sankey Visual Style And Animation

### Current Work
- Task: improve only the ECharts Sankey visual styling and animation.
- Branch: `work/mvp-interface-stabilization`.
- Scope: renderer/CSS styling only. Sankey data filtering, eligibility, path generation, and resolver logic were not changed.

### Change
- Added Sankey-specific visual color tokens in the React renderer.
- Added CSS custom properties for Sankey status colors.
- Replaced saturated stage colors with muted old/common/new stage fills.
- Lowered default Sankey link opacity:
  - unchanged: `0.1`;
  - changed/other statuses: `0.18`.
- Added hover emphasis with stronger adjacent node/link focus, shadow, and thicker selected links.
- Added blur styling for unrelated nodes/links during hover focus.
- Added ECharts animation options:
  - `animationDuration: 650`;
  - `animationDurationUpdate: 360`;
  - `animationEasing: "cubicOut"`;
  - `animationEasingUpdate: "cubicOut"`.
- Cleaned node labels by tightening max length, reducing label width/font size, and normalizing whitespace.
- Reduced the graph container and action button color intensity to avoid a primary-color-heavy look.

### Files
- `src/components/graph/SankeyFlowPoc.jsx`
- `src/styles/global-report.css`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --test tests/summary-renderer.test.js`: pass, 11 tests.
- `node --test tests/sankey-poc-model.test.js`: pass, 10 tests.
- `npm.cmd test`: pass, 274 pass / 1 skip.
- `npm.cmd run build`: pass after rerun with elevated permissions. The first sandboxed build could not read the parent path while resolving `vite.config.js`.
- `npm.cmd run guard:legacy-core`: pass.
- `git diff --check`: pass, with CRLF normalization warnings only.

### Known Issues
- No new screenshot was captured in this pass. The current verification is automated/static plus production build; visual confirmation should be done in the graph tab with a populated compare state.

## 2026-06-15 Relation Graph Display Casing Preservation

### Current Work
- Task: keep report and graph labels in their original config casing after normalization.
- Branch: `work/mvp-interface-stabilization`.
- Scope: display labels only. Canonical IDs, resolver matching, graph relations, report layout, and UI styling were not changed.

### Cause
- PORT, LAG, L3 interface, and PIM canonical nodes were using normalized values directly for `label` and display attributes such as `attributes.name`, `attributes.lag`, and `attributes.interface`.
- The graph view and the report subscriber path table both read those canonical display fields, so normalized lowercase values appeared in the UI.

### Change
- Canonical node IDs still use normalized values for stable matching.
- Display fields now prefer the original object name from `sourceName` / `identity`.
- Added normalized companion attributes for resolver use:
  - `attributes.normalizedName` for PORT and L3 interface.
  - `attributes.normalizedLag` for LAG.
  - `attributes.normalizedInterface` for PIM.
- Resolver lookup paths now use normalized companion attributes where needed.
- Peer/PIM neighbor metadata preserves display interface names while retaining normalized interface names for matching.

### Files
- `src/core/relationGraph/canonicalGraphBuilder.js`
- `src/core/relationGraph/relationResolver.js`
- `tests/relation-graph.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --test tests/relation-graph.test.js`: pass, 21 tests.
- `node --test tests/summary-renderer.test.js`: pass, 11 tests.
- `node --test tests/sankey-poc-model.test.js`: pass, 10 tests.
- `npm.cmd test`: pass, 275 pass / 1 skip.
- `npm.cmd run build`: pass after rerun with elevated permissions. The first sandboxed build could not read the parent path while resolving `vite.config.js`.
- `npm.cmd run guard:legacy-core`: pass.
- `git diff --check`: pass, with CRLF normalization warnings only.

### Known Issues
- No screenshot was captured because this change is display-data plumbing only and does not alter layout or styling.
- Existing unrelated working-tree changes from prior graph/report work remain present.

## 2026-06-15 Report Subscriber Path Row Merge

### Current Work
- Task: fix duplicated subscriber/device rows in the report subscriber path table.
- Branch: `work/mvp-interface-stabilization`.
- Scope: report subscriber path row generation only. Parser, canonical graph relations, graph view rendering, and table styling were not changed.

### Cause
- The canonical relation graph correctly creates `PEER_NH` nodes for static-route next-hop candidates.
- The relationship graph summary view can have one chain per `PEER_NH`.
- The report subscriber path table reused those graph chains directly, so one interface with multiple static-route next-hops appeared as multiple subscriber/device rows.
- This was a table row aggregation issue, not a parser issue.

### Change
- The report subscriber table now first dedupes graph chain rows, then merges rows by subscriber identity:
  - primary key: `side + L3_INTERFACE canonical id`;
  - fallback keys: LAG, PORT, then PEER_NH when no interface exists.
- Merged rows aggregate and dedupe:
  - Port;
  - LAG;
  - Peer/NH;
  - Static Route;
  - BGP;
  - PIM;
  - evidence and minimum confidence.
- Column search/filter data uses the full aggregated values while the visible cell keeps the compact `first item 외 N` summary.

### Files
- `src/core/legacyCore.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --test tests/summary-renderer.test.js`: pass, 12 tests.
- `node --test tests/relation-graph.test.js`: pass, 21 tests.
- `npm.cmd test`: pass, 276 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- `git diff --check`: pass, with CRLF normalization warnings only.
- `npm.cmd run build`: pass after rerun with elevated permissions. The first sandboxed build could not read the parent path while resolving `vite.config.js`.

### Known Issues
- No screenshot was captured in this pass. The new regression test reproduces the reported duplicate pattern with one interface and multiple static-route next-hop rows.

## 2026-06-15 Report Graph Removal And No-LAG Port Matching

### Current Work
- Task: remove the duplicated relationship graph from the report tab, show direct port/interface matching when a circuit has no LAG, and prevent port/LAG-only rows from appearing as subscriber/device rows.
- Branch: `work/mvp-interface-stabilization`.
- Scope: report rendering and relationship view graph row construction only. Canonical resolver rules remain unchanged.

### Cause
- The report tab still had a graph section even though the same relationship graph and Sankey view already live in the graph tab.
- The subscriber path table accepted graph chains without an L3 interface, so orphan or unused PORT/LAG chains could fall back into the `subscriber` label and appear as 가입자/장비 values.
- Interfaces that referenced a physical port directly but had no LAG did not have a display-only upstream port row in the view graph.

### Change
- Removed the relationship graph render block from `renderOverviewReport`; the graph tab still renders Sankey and Raw Graph View through `renderStandaloneGraphPage`.
- `buildReportSubscriberRows` now skips chains that do not have an L3 interface, preventing port/LAG-only rows from being reported as subscriber/device rows.
- L3 interface canonical nodes now retain direct `portRefs` from parsed fields.
- The view graph indexes canonical ports by normalized port name and builds view-only `DIRECT_PORT_INTERFACE` edges when an interface has no LAG but has a direct port reference.
- No `PORT -> STATIC_ROUTE`, `PORT -> BGP_NEIGHBOR`, or canonical transitive relation was added.

### Files
- `src/core/legacyCore.js`
- `src/core/relationGraph/canonicalGraphBuilder.js`
- `src/core/relationGraph/viewGraph.js`
- `tests/relation-graph.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`
- `docs/verification/screenshots/2026-06-16/subscriber-table-bgp-counts/report-tab-empty-state.png`

### Verification
- `node --test tests/relation-graph.test.js`: pass, 22 tests.
- `node --test tests/summary-renderer.test.js`: pass, 12 tests.
- `npm.cmd test`: pass, 277 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- `git diff --check`: pass, CRLF warnings only.
- `npm.cmd run build`: pass after rerun with elevated permissions. The first sandboxed build could not read the parent path while resolving `vite.config.js`.
- Browser load check at `http://127.0.0.1:5179/`: app loaded, no console errors, empty initial state had no report graph roots.

### UI Verification Notes
- A populated comparison state was not available in the fresh browser session, so the report-tab removal is covered by static renderer tests rather than a populated screenshot.
- Screenshot capture was attempted twice but Browser CDP returned `Page.captureScreenshot` timeout. No screenshot file was produced for this pass.

### Known Issues
- Direct port/interface matching depends on the parsed interface object exposing a `port` or `member-port` field. Config forms that express this relation in another field name may need an additional parser mapping.
- Existing unrelated working-tree changes from prior graph/report work remain present.

## 2026-06-15 Subscriber Path Serial IP, BGP, And Direct Port Display

### Current Work
- Task: fix subscriber path table display so new-side labels keep original config casing, replace the visible Peer/NH column with interface Serial IP, show BGP neighbors, and display directly assigned physical ports for MN-style interfaces without LAG.
- Branch: `work/mvp-interface-stabilization`.
- Scope: canonical display extraction, subscriber path table rendering, direct port fallback, and regression tests.

### Cause
- Some new-side objects were built from normalized identity/field values, so display casing could remain lowercase even when raw config had mixed case.
- The visible `Peer/NH` column showed computed peer next-hop values, but the requested operator-facing value is the local interface serial IP.
- BGP neighbor display depends on `PEER_NH -> BGP_NEIGHBOR` relation generation; if a BGP object missed its normalized `neighbor` field but still had a raw `neighbor` line, it could fail to connect.
- Direct physical-port interfaces without LAG can be expressed through `port`, `member-port`, or direct physical SAP values such as `sap 1/1/...`; these were not all preserved as direct port references for the view graph.

### Change
- Canonical graph display names now prefer raw config identity extraction for PORT, LAG, L3 interface, PIM, and BGP before falling back to normalized identity fields.
- L3 interface nodes now retain direct physical port references from:
  - `port`;
  - `member-port`;
  - direct physical `sap` values containing `/`;
  - raw interface lines containing `port`, `port-id`, `physical-port`, or `sap`.
- BGP canonical node creation now falls back to raw `neighbor` extraction when normalized fields do not contain a neighbor value.
- The subscriber path table visible column changed from `Peer/NH` to `Serial IP`.
- The Interface column now shows the interface name only; the local serial address/prefix is shown in the new `Serial IP` column.
- Internal peer data is still retained for Static/BGP/PIM relation calculation and global row search.

### Files
- `src/core/relationGraph/canonicalGraphBuilder.js`
- `src/core/legacyCore.js`
- `src/styles/global-report.css`
- `tests/relation-graph.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --test tests/relation-graph.test.js`: pass, 25 tests.
- `node --test tests/summary-renderer.test.js`: pass, 12 tests.
- `npm.cmd test`: pass, 280 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- `git diff --check`: pass, CRLF warnings only.
- `npm.cmd run build`: pass after rerun with elevated permissions. The first sandboxed build could not read the parent path while resolving `vite.config.js`.

### Known Issues
- A populated runtime comparison dataset was not available in the browser session, so visual confirmation for the exact user screenshots still needs to be done on the user's loaded config state.
- Direct physical-port matching now covers common `port`/`member-port`/physical `sap` forms. If MN config uses another proprietary field name, add that field to the direct port reference extraction list.

## 2026-06-15 Subscriber Path Serial Pairing And Service Context Fix

### Current Work
- Task: fix the report subscriber path table so old/new rows for the same circuit are paired by interface Serial IP, and improve missing new-side Static/BGP/PIM service display caused by graph VRF context mismatches.
- Branch: `work/mvp-interface-stabilization`.
- Scope: subscriber path table row generation, MD-CLI context extraction, canonical relation VRF comparison, and focused regression tests.

### Cause
- The subscriber path table grouped rows by `side + interface id`, so old and new circuits with the same serial link were rendered as separate rows.
- Static-route fan-out rows were already merged by interface, but old/new topology values could not be compared in the same row.
- MD-CLI one-line service objects did not include a `routing-context`, and router-scoped BGP/PIM objects did not retain router context consistently.
- Canonical relation resolution treated `Base` and `default` VRFs as different values, so new-side Static/BGP/PIM services could fail to attach to the interface path even when they were in the same base router context.

### Change
- `buildReportSubscriberRows` now:
  - first merges per-side graph chains by interface;
  - calculates a Serial IP CIDR network key, for example `.57/30` and `.58/30` both become the same `/30` circuit key;
  - pairs old/new buckets with the same serial subnet into one row;
  - displays topology and service values as `old -> new`, for example `7/2/4 -> 2/2/c6/1`, `174 -> lag-B-2206`, and `Static: old 1 -> new 1`.
- Rows without a matching opposite side still render as old-only or new-only rows.
- `sameDeviceAndVrf` in the relation resolver now treats `base` and `default` as equivalent for canonical graph relation matching.
- MD-CLI one-line service parser now preserves VPRN `routing-context` for service interface/subscriber objects and creates service-scoped one-line static-route objects.
- MD-CLI router one-line BGP/PIM objects and block BGP/PIM objects now keep router context in fields.
- Report description text now says one row represents a Serial IP based old/new subscriber path.

### Files
- `src/core/legacyCore.js`
- `src/core/parsers/nokiaMdCliParser.js`
- `src/core/relationGraph/relationResolver.js`
- `tests/summary-renderer.test.js`
- `tests/relation-graph.test.js`
- `tests/mvp-core-scope.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --test tests/summary-renderer.test.js`: pass, 13 tests.
- `node --test tests/relation-graph.test.js`: pass, 26 tests.
- `node --test tests/mvp-core-scope.test.js`: pass, 16 tests.
- `npm.cmd test`: pass, 283 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- `git diff --check`: pass, CRLF warnings only.
- `npm.cmd run build`: pass after rerun with elevated permissions. The first sandboxed build could not read the parent path while resolving `vite.config.js`.

### Known Issues
- If the source config does not expose an old-side port/LAG relationship at all, the paired row can only display `- -> new-value` for that field. The table does not invent an old port/LAG without parser/resolver evidence.
- Visual confirmation against the user's loaded full config still needs to be performed in the app because the local fresh browser state does not contain that dataset.

## 2026-06-15 Graph Overview And Focus Mode Phase 1

### Current Work
- Task: restructure the graph tab phase 1 so the default screen is Overview Mode, subscriber/device candidates are shown as compact Top N rows, Focus Flow is shown only after selecting one row, the full Sankey flow is removed from the default view, and Raw Graph View remains available.
- Branch: `work/mvp-interface-stabilization`.
- Scope: graph tab React view composition, overview/focus model helpers, compact graph CSS, and regression tests.

### Change
- Added `OVERVIEW_TOP_N = 10`, `buildGraphOverviewModel`, and `buildFocusGraphModel` to the graph model layer.
- Overview Mode now renders:
  - compact summary bar: total, changed, added, removed, ambiguous, unresolved, average confidence;
  - compact impact map by Physical, LAG, Interface, Static, BGP, PIM, and problem/mismatch;
  - Top 10 subscriber/device/path rows sorted by problem status, add/remove, change count, and service impact.
- Selecting a compact row switches to Focus Mode and renders one large `OLD -> COMMON -> NEW -> SERVICES` Focus Flow.
- Detail panel remains closed after row selection and can be opened explicitly with `상세 패널` or `상세 보기`.
- The ECharts Sankey full flow is no longer rendered as the graph tab default body. Existing Sankey data generation functions remain for later group/raw flow work and tests.
- Raw Graph View remains mounted below the overview/focus area and is reachable through the `Raw Graph View` button.

### Files
- `src/components/graph/sankeyPocModel.js`
- `src/components/graph/SankeyFlowPoc.jsx`
- `src/styles/global-report.css`
- `tests/sankey-poc-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`
- `docs/verification/screenshots/2026-06-15/graph-overview-focus/overview-mode-viewport.png`
- `docs/verification/screenshots/2026-06-15/graph-overview-focus/focus-flow-viewport.png`

### Verification
- `node --test tests/sankey-poc-model.test.js`: pass, 13 tests.
- `node --test tests/summary-renderer.test.js`: pass, 13 tests.
- `npm.cmd test`: pass, 286 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- `git diff --check`: pass, CRLF warnings only.
- `npm.cmd run build`: pass after rerun with elevated permissions. The first sandboxed build could not read the parent path while resolving `vite.config.js`.
- Browser verification at `http://127.0.0.1:5173/` with synthetic subscriber fixtures:
  - app loaded with no console errors;
  - graph tab defaulted to Overview Mode;
  - Overview showed compact summary, impact map, and Top N list rather than the full Sankey flow;
  - selecting a row switched to Focus Flow;
  - detail panel remained closed until explicitly requested;
  - Raw Graph View remained present.

### UI Verification Materials
- `docs/verification/screenshots/2026-06-15/graph-overview-focus/overview-mode-viewport.png`
- `docs/verification/screenshots/2026-06-15/graph-overview-focus/focus-flow-viewport.png`

### Known Issues
- Phase 1 does not implement Group Mode or virtualized lists yet.
- Detail Drawer overlay and Tree/Evidence tabs remain for later phases.
- The old Sankey rendering helpers are still present in code for later selected-group flow work, but the default graph screen no longer renders the full Sankey chart.

## 2026-06-15 Graph Subscriber Summary Phase 2

### Current Work
- Task: verify and lock down phase 2 graph behavior: `SubscriberSummaryList`, compact Top N subscriber/device rows, Overview-to-Focus transition, and Raw Graph View preservation.
- Branch: `work/mvp-interface-stabilization`.
- Scope: regression coverage and handoff documentation. The implementation had already been introduced with the Overview/Focus graph changes, so this pass avoids unrelated UI changes.

### Change
- Added renderer regression checks that confirm:
  - `SubscriberSummaryList` exists and uses compact `sankey-poc-subscriber-row` items;
  - the list is driven by `overviewModel.topSubscribers`;
  - selected state is tracked by `selectedPathId`/`chainId`;
  - selecting a row switches to `FocusFlowView`;
  - non-focus state renders `SankeyOverviewPanel`;
  - the default graph body does not render the full ECharts Sankey chart.
- Kept `Raw Graph View` intact.
- Kept `+more` aggregate behavior out of the default Overview screen. Existing Sankey helper code remains for future selected-group work but is not rendered in the default graph body.

### Files
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --test tests/sankey-poc-model.test.js`: pass, 13 tests.
- `node --test tests/summary-renderer.test.js`: pass, 13 tests.
- `npm.cmd test`: pass, 286 pass / 1 skip.
- `git diff --check`: pass, CRLF warnings only.

### Known Issues
- Phase 2 still uses a compact Top N list rather than a virtualized full subscriber list. This is intentional for the current requirement.
- Group-specific Sankey flow remains a later phase; the default graph screen stays Overview/Focus based.

## 2026-06-15 Graph Detail Drawer Phase 3

### Current Work
- Task: implement only the graph DetailDrawer overlay for selected subscriber/path details.
- Branch: `work/mvp-interface-stabilization`.
- Scope: graph tab drawer composition, drawer tabs, selection behavior, overlay CSS, regression tests, and UI verification.

### Change
- Replaced the always-content detail panel shape with a `DetailDrawer` overlay that is closed by default.
- Selecting a compact subscriber/path row now:
  - sets the selected path;
  - switches Overview to Focus;
  - opens the right-side drawer;
  - resets the drawer tab to `summary`.
- The drawer is absolutely positioned inside `.sankey-poc-body`, so it overlays the graph and does not reduce the main graph width.
- Drawer tabs:
  - `요약`: old path, common anchor, new path, services, confidence;
  - `Tree`: OLD / COMMON / NEW / SERVICES tree view;
  - `Evidence`: selected path status, confidence, and evidence list.
- Tree View is rendered only inside the drawer `Tree` tab.
- Raw Graph View remains available.

### Files
- `src/components/graph/SankeyFlowPoc.jsx`
- `src/styles/global-report.css`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`
- `docs/verification/screenshots/2026-06-15/graph-detail-drawer/detail-drawer-evidence-tab.png`

### Verification
- `node --test tests/sankey-poc-model.test.js`: pass, 13 tests.
- `node --test tests/summary-renderer.test.js`: pass, 13 tests.
- `npm.cmd test`: pass, 286 pass / 1 skip.
- `git diff --check`: pass, CRLF warnings only.
- `npm.cmd run build`: pass after rerun with elevated permissions. The first sandboxed build could not read the parent path while resolving `vite.config.js`.
- Browser verification at `http://127.0.0.1:5174/`:
  - graph default state: Overview, compact rows present, drawer closed, Raw Graph View present;
  - row selection switched to Focus and opened one right-side drawer;
  - `.sankey-poc-body` width stayed `1155px` before and after drawer open;
  - drawer CSS position was `absolute`;
  - drawer tabs were `요약`, `Tree`, `Evidence`;
  - Tree tab showed OLD / COMMON / NEW / SERVICES only inside the drawer;
  - Evidence tab showed evidence/empty evidence area;
  - browser error logs were empty.

### UI Verification Materials
- `docs/verification/screenshots/2026-06-15/graph-detail-drawer/detail-drawer-evidence-tab.png`

### Known Issues
- The drawer width is fixed to `min(420px, calc(100% - 20px))`; very narrow screens will show the drawer over most of the graph. This is expected for the current desktop-focused graph workflow.
- Existing Sankey helper code remains for later selected-group work, but the default graph screen still uses Overview/Focus rather than a full Sankey chart.

## 2026-06-15 Graph Design Interaction Phase 4

### Current Work
- Task: improve graph tab visual design and interactions only.
- Branch: `work/mvp-interface-stabilization`.
- Scope: low-saturation color tokens, hover/selection motion, opacity treatment for non-selected rows/ranking entries, compact spacing, focus view distinction, unnecessary UI copy removal, and verification. Sankey/path data generation logic was not changed.

### Change
- Refined Sankey graph presentation tokens to lower-saturation colors:
  - `changed`: `#8a5a2b`
  - `added`: `#477663`
  - `removed`: `#8b4b5a`
  - `ambiguous`: `#6c5b8d`
  - `unresolved`: `#8d4f5a`
  - graph accent: `#42606f`
- Added shared motion token `--sankey-motion: 160ms ease`.
- Added hover and selected-state transitions for graph toolbar buttons, compact subscriber rows, ranking rows, focus actions, focus cards, and drawer.
- Added opacity reduction rules for non-selected compact rows and ranking rows when a selected item exists.
- Made focus view visually distinct from compact overview with a stronger low-saturation background, raised focus cards, and `sankeyFocusIn` animation.
- Added `sankeyDrawerIn` animation for the overlay detail drawer and a reduced-motion fallback.
- Removed extra explanatory copy from the graph overview/focus empty states and shortened the data notice. UI no longer shows PoC wording.
- Kept `Raw Graph View` available and did not add any new graph structure.

### Files
- `src/components/graph/sankeyPocModel.js`
- `src/components/graph/SankeyFlowPoc.jsx`
- `src/styles/global-report.css`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`
- `docs/verification/screenshots/2026-06-15/graph-design-interactions/focus-flow-drawer.png`

### Verification
- `node --test tests/summary-renderer.test.js`: pass, 13 tests.
- `node --test tests/sankey-poc-model.test.js`: pass, 13 tests.
- `npm.cmd test`: pass, 286 pass / 1 skip.
- `git diff --check`: pass, CRLF warnings only.
- `npm.cmd run build`: pass after rerun with elevated permissions. The first sandboxed build could not read the parent path while resolving `vite.config.js`.
- Browser verification at `http://127.0.0.1:5173/`:
  - graph tab rendered Overview/focus UI without PoC text;
  - compact summary rows rendered before selection;
  - selecting a row switched to Focus Flow and opened the overlay detail drawer;
  - drawer tabs remained `요약`, `Tree`, `Evidence`;
  - `Raw Graph View` remained present;
  - browser console error logs were empty.

### UI Verification Materials
- `docs/verification/screenshots/2026-06-15/graph-design-interactions/focus-flow-drawer.png`

### Known Issues
- Browser verification used a small synthetic config to exercise graph selection because the default sample contains only a static-route comparison and does not produce a topology-focused graph path.
- Build still emits the existing Vite chunk-size warning for large bundles.

## 2026-06-15 Graph Performance Limits Phase 5

### Current Work
- Task: add graph performance limits and tests only.
- Branch: `work/mvp-interface-stabilization`.
- Scope: Overview Top N verification, rendered Sankey node/link caps, large subscriber list model test, Raw Graph View access guard, drawer initial closed guard, and focus rendering guard. Existing graph features were not removed.

### Change
- Added explicit Sankey render caps in `src/components/graph/sankeyPocModel.js`:
  - `MAX_RENDERED_GRAPH_NODES = 60`
  - `MAX_RENDERED_GRAPH_LINKS = 100`
- `buildSankeyData()` now applies both caps before passing data to the rendering layer.
- Link selection now skips links whose endpoints would push the rendered node set above `MAX_RENDERED_GRAPH_NODES`.
- Returned Sankey metadata now includes `displayedNodeCount`, `totalNodeCount`, `hiddenNodeCount`, `maxNodes`, and a `truncated` flag that considers both hidden links and hidden nodes.
- Overview remains bounded by `OVERVIEW_TOP_N = 10`; full subscriber summaries can exist in the model, but the default overview exposes only Top N rows.
- Deferred interaction guards remain in place:
  - drawer starts closed;
  - Focus Flow is rendered only when a path is selected;
  - Raw Graph View button remains available.

### Files
- `src/components/graph/sankeyPocModel.js`
- `tests/sankey-poc-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `node --test tests/sankey-poc-model.test.js`: pass, 17 tests.
- `node --test tests/summary-renderer.test.js`: pass, 14 tests.
- `npm.cmd test`: pass, 291 pass / 1 skip.
- `git diff --check`: pass, CRLF warnings only.
- `npm.cmd run build`: pass after rerun with elevated permissions. The first sandboxed build failed because Vite/esbuild could not read the parent path while resolving `vite.config.js`.

### Added Tests
- Sankey link cap uses `MAX_RENDERED_GRAPH_LINKS`.
- Sankey node cap keeps `nodes.length <= maxNodes`.
- Rendered links never reference hidden nodes after node capping.
- Default Sankey caps are exported and applied.
- Overview model stays bounded with 75 subscriber paths by rendering only Top N rows.
- `buildFocusGraphModel(null)` returns `null`, so no Focus node model is created before selection.
- Static renderer guard confirms Raw Graph View remains available.
- Static renderer guard confirms drawer starts closed and is rendered only when `detailOpen` is true.
- Static renderer guard confirms Focus Flow is gated by `viewMode === "focus" && focusModel`.

### Known Issues
- Virtualized list was reviewed but not applied in this phase because the default Overview renders only Top N rows. If a future expanded "all subscribers" list is added, virtualization should be implemented for that expanded list.
- The production build still emits the existing Vite chunk-size warning for large bundles.

## 2026-06-15 Dependency Graph Scaffold Phase 1

### Current Work
- Task: reset the graph tab direction from summary/list/dashboard style back to a graph-first dependency exploration screen.
- Branch: `work/mvp-interface-stabilization`.
- Scope: phase 1 scaffold only. Parser, canonical graph builder, and relation resolver logic were not broadly changed.

### Change
- Added a Dependency Graph view scaffold for the graph tab default body.
- The default graph tab now renders:
  - left filter/selection panel;
  - central large free-form graph canvas;
  - right overlay detail drawer that does not shrink the canvas;
  - bottom group carousel;
  - preserved Raw Graph View section below the scaffold.
- The new view renders PORT, LAG, INTERFACE, PEER/NH, STATIC, BGP, PIM, and INTERNAL node groups with a deterministic free-form SVG layout.
- The graph model uses existing visual path data when available and falls back to a small mock dependency graph only when no graph data exists.
- The old ECharts Sankey/Overview-Focus graph body is no longer mounted as the graph tab default screen for this phase.
- The `Raw Graph View` button scrolls to the retained raw graph section.

### Files
- `src/components/graph/DependencyGraphView.jsx`
- `src/components/graph/dependencyGraphModel.js`
- `src/components/graph/RelationshipGraphBridge.jsx`
- `src/core/legacyCore.js`
- `src/styles/global-report.css`
- `tests/dependency-graph-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`
- `docs/verification/screenshots/2026-06-15/dependency-graph-scaffold/after-desktop.png`

### Verification
- `node --test tests/dependency-graph-model.test.js`: pass, 3 tests.
- `node --test tests/summary-renderer.test.js`: pass, 14 tests.
- `npm.cmd test`: pass, 294 pass / 1 skip.
- `git diff --check`: pass, CRLF warnings only.
- `npm.cmd run build`: pass after rerun with elevated permissions. The first sandboxed build could not read the parent path while resolving `vite.config.js`.
- Browser verification at `http://127.0.0.1:4173/` using the built app and local Chrome executable:
  - graph tab became active after running the sample comparison;
  - `[data-dependency-graph-root]` mounted;
  - central graph canvas mounted;
  - left side panel mounted;
  - right drawer mounted with `position: absolute`;
  - bottom carousel mounted;
  - Raw Graph View remained present;
  - Sankey root was not mounted as the graph tab default body;
  - rendered sample contained 14 dependency nodes, 13 edges, and 8 group labels;
  - canvas height was 695px in the desktop viewport.

### UI Verification Materials
- `docs/verification/screenshots/2026-06-15/dependency-graph-scaffold/after-desktop.png`

### Known Issues
- This is a phase 1 scaffold and uses a deterministic SVG free-form layout rather than a final force/organic graph engine.
- Group carousel cards are visual scaffolding only; full group filtering/expansion behavior is reserved for later phases.
- The model intentionally avoids parser/resolver changes in this phase, so relationship accuracy remains whatever the existing graph data provides.
- The production build still emits the existing Vite chunk-size warning for large bundles.

## 2026-06-15 Dependency Graph Data Conversion Phase 2

### Current Work
- Task: connect real canonical/view graph data to the Dependency Graph node and edge model.
- Branch: `work/mvp-interface-stabilization`.
- Scope: data conversion, kind styling, edge styling, hover/click adjacency highlight, and kind filters only. The phase 1 layout scaffold was preserved.

### Change
- Added Dependency Graph node conversion for:
  - `port`
  - `lag`
  - `interface`
  - `peer`
  - `static`
  - `bgp`
  - `pim`
  - `internal`
  - `system`
  - `group` as a supported model kind.
- Added Dependency Graph edge conversion for:
  - `direct`
  - `inferred`
  - `routing`
  - `bgp`
  - `pim`
  - `backup`
  - `reference`
  - `internal`.
- Canonical relations are mapped to graph edge styles:
  - `MEMBER_OF`, `HAS_INTERFACE`, and direct port-interface view edges -> `direct`.
  - `HAS_PEER` -> `inferred`.
  - `USED_BY_STATIC` -> `routing`.
  - `USED_BY_BGP` -> `bgp`.
  - `HAS_PIM` and `USED_BY_PIM` -> `pim`.
  - filter/QoS/policy/reference style edges -> `reference`.
  - internal edges -> `internal`.
- Labels now use safe display text and block debug/internal placeholders such as `chain:`, `sankey-path`, `no-port`, `no-lag`, `no-interface`, and `no-peer`.
- Kind filters now remove the selected node kind and any related edges from the SVG graph.
- Hover and click now highlight the selected node's 1-hop adjacent nodes/edges while dimming unrelated items.
- Raw Graph View remains available below the Dependency Graph scaffold.

### Files
- `src/components/graph/dependencyGraphModel.js`
- `src/components/graph/DependencyGraphView.jsx`
- `src/styles/global-report.css`
- `tests/dependency-graph-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`
- `docs/verification/screenshots/2026-06-15/dependency-graph-data/after-desktop.png`

### Verification
- `node --test tests/dependency-graph-model.test.js`: pass, 8 tests.
- `node --test tests/summary-renderer.test.js`: pass, 14 tests.
- `npm.cmd test`: pass, 299 pass / 1 skip.
- `git diff --check`: pass, CRLF warnings only.
- `npm.cmd run build`: pass after rerun with elevated permissions. The first sandboxed build could not read the parent path while resolving `vite.config.js`.
- Browser verification using built app at `http://127.0.0.1:4173/` and local Chrome executable:
  - `[data-dependency-graph-root]` mounted.
  - `[data-dependency-canvas]` mounted.
  - `Raw Graph View` button remained present.
  - synthetic topology comparison rendered 17 nodes and 21 edges.
  - rendered node kinds: `port`, `lag`, `interface`, `peer`, `static`, `bgp`, `pim`, `internal`, `system`.
  - rendered edge kinds: `backup`, `bgp`, `direct`, `inferred`, `internal`, `pim`, `routing`.
  - node labels did not expose debug placeholders.
  - hovering a port produced adjacency highlight: 2 highlighted nodes, 1 active edge, unrelated nodes/edges faded.
  - clicking a port opened the overlay drawer and kept the selected node highlighted.
  - disabling the BGP filter removed BGP nodes and BGP edges; re-enabling restored them.

### UI Verification Materials
- `docs/verification/screenshots/2026-06-15/dependency-graph-data/after-desktop.png`

### Known Issues
- The phase 1 free-form SVG layout is preserved by request, so dense data can still visually overlap in places. Layout refinement is intentionally left for a later phase.
- The current drawer still exposes the canonical node ID for diagnostics. Node labels are cleaned, but the diagnostic detail field remains available.
- The production build still emits the existing Vite chunk-size warning for large bundles.

## 2026-06-15 Dependency Graph Grouping Phase 3

### Current Work
- Task: add grouping, collapse/expand, Top-N limits, compact placeholders, and group carousel wiring to the Dependency Graph.
- Branch: `work/mvp-interface-stabilization`.
- Scope: Dependency Graph rendering/model layer only. Raw Graph View remains preserved; Sankey is not restored as the default graph screen.

### Change
- Added `DependencyGraphGroup`-style model data with `id`, `label`, `type`, `nodeIds`, `count`, `statusSummary`, `collapsed`, and `hiddenChildrenCount`.
- Added group creation for all network, domain groups, problem group, status groups, and subscriber/device buckets where metadata exists.
- Domain groups cover Physical, L2/LAG, L3/Interface, Peer/NH, Routing/Static, BGP, PIM, and Internal.
- Default graph is now a compact group overview. Individual PORT/LAG/INTERFACE/PEER/STATIC/BGP/PIM nodes are not rendered all at once.
- Selecting a group in the bottom carousel expands only that group and keeps other groups compact.
- Clicking a group node toggles collapse/expand for that group.
- Added compact SVG placeholder chips such as `... 외 24개`; clicking the chip increases the group visible limit by one step.
- Added rendering caps: `MAX_VISIBLE_GROUPS = 12`, `MAX_VISIBLE_NODES_PER_CLUSTER = 8`, `MAX_VISIBLE_EDGES = 160`, `MAX_VISIBLE_LABELS = 80`, `MAX_RENDERED_GRAPH_NODES = 60`, `MAX_RENDERED_GRAPH_LINKS = 160`.
- Edges whose endpoints are hidden are aggregated to visible group nodes where possible; overflow edges are hidden and counted.
- The bottom group carousel now uses generated graph groups and updates `selectedGroupId` while preserving node-kind filters.

### Files
- `src/components/graph/dependencyGraphModel.js`
- `src/components/graph/DependencyGraphView.jsx`
- `src/styles/global-report.css`
- `tests/dependency-graph-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`
- `docs/verification/screenshots/2026-06-15/dependency-graph-groups/after-desktop.png`

### Verification
- `node --test tests/dependency-graph-model.test.js`: pass, 10 tests.
- `node --test tests/summary-renderer.test.js`: pass, 14 tests.
- `npm.cmd test`: pass, 301 pass / 1 skip.
- `git diff --check`: pass, CRLF warnings only.
- `npm.cmd run build`: pass after rerun with elevated permissions. The sandboxed build could not read the parent path while resolving `vite.config.js`.
- Browser verification using built app at `http://127.0.0.1:4173/` and local Chrome executable:
  - default graph mounted `[data-dependency-graph-root]`;
  - Raw Graph View button remained present;
  - default graph rendered compact group nodes, not all individual nodes;
  - Physical group carousel card selection changed the active group and expanded only that group;
  - Physical group initially showed 8 port nodes and `... 외 24개`;
  - clicking the placeholder increased visible port nodes to 16 and changed the placeholder to `... 외 16개`;
  - status bar showed rendered node/edge counts without the earlier misleading ratio.

### UI Verification Materials
- `docs/verification/screenshots/2026-06-15/dependency-graph-groups/after-desktop.png`

### Known Issues
- The group overview still uses the phase 1 deterministic SVG layout rather than a final force/organic layout engine.
- Group expansion currently increases visible nodes by a fixed step. It does not yet support per-kind nested expansion controls inside one group.
- Placeholder chips are SVG click targets; keyboard activation for placeholder chips can be improved in a later accessibility pass.
- The production build still emits the existing Vite chunk-size warning for large bundles.

## 2026-06-15 Dependency Graph Focus Mode Phase 4

### Current Work
- Task: add Focus Mode and right overlay Detail Drawer for selected Dependency Graph node/edge/group.
- Branch: `work/mvp-interface-stabilization`.
- Scope: Dependency Graph model/view/CSS/tests only. Raw Graph View remains preserved and the default view remains Dependency Graph.

### Change
- Added `GRAPH_VIEW_MODES` with `dependency`, `focus`, `sankey`, and `raw`.
- Added `DEFAULT_FOCUS_STATE` with `selectedNodeId`, `selectedEdgeId`, `focusDepth`, and `includeInternalRelations`.
- Added `buildFocusGraphModel()`:
  - selected node is placed near the graph center;
  - 1-hop and 2-hop neighborhoods are calculated from raw dependency edges;
  - non-selected graph data remains out of the focus render set or is visually faded in the canvas state;
  - selected group nodes expand only that group up to `MAX_VISIBLE_NODES_PER_CLUSTER`.
- Added `buildDependencyPaths()`:
  - computes shortest dependency paths from the selected node or edge endpoint;
  - exposes path summaries such as `INTERFACE -> PEER / NH -> BGP`, `INTERFACE -> PEER / NH -> STATIC`, and `INTERFACE -> PIM`;
  - path entries keep `nodeIds`, `edgeIds`, and `relationKinds` for graph highlight.
- Reworked `DependencyGraphView` selection state:
  - default selection is empty so the default graph is not dimmed by an implicit anchor selection;
  - node click opens the drawer;
  - node double click enters Focus Mode;
  - edge click opens edge details;
  - edge double click enters Focus Mode from the edge source;
  - background click clears selection and returns to Dependency view;
  - ESC closes the drawer.
- Added right overlay `DetailDrawer`:
  - tabs: Summary, Detail, Path, History;
  - node summary shows name, type, device, IP, VRF, status, confidence, and impact count;
  - edge summary shows source, target, edge kind, status, confidence, and direct/inferred classification;
  - path tab can select a dependency path and highlight its edge/node set;
  - drawer is absolutely positioned over the graph stage and does not shrink the canvas width.
- Added wide transparent SVG edge hitboxes so users can reliably click thin dependency lines.
- Added Focus/Dependency view toggle, 1-hop/2-hop controls, and internal relation toggle.
- Added CSS for focus anchors, selected/path-highlight edges, faded focus edges, drawer tabs, path list buttons, and overlay controls.

### Files
- `src/components/graph/dependencyGraphModel.js`
- `src/components/graph/DependencyGraphView.jsx`
- `src/styles/global-report.css`
- `tests/dependency-graph-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`
- `docs/verification/screenshots/2026-06-15/dependency-graph-focus/after-desktop.png`

### Verification
- `node --test tests/dependency-graph-model.test.js`: pass, 14 tests.
- `node --test tests/summary-renderer.test.js`: pass, 14 tests.
- `npm.cmd test`: pass, 305 pass / 1 skip.
- `git diff --check`: pass, CRLF warnings only.
- `npm.cmd run build`: pass after elevated rerun. Sandboxed build is blocked by esbuild path access to `vite.config.js`.
- Browser verification using built app at `http://127.0.0.1:4173/`:
  - initial Dependency Graph mounted with drawer closed;
  - Raw Graph View button remained available;
  - node click opened the overlay drawer with four tabs: `요약`, `세부 정보`, `경로`, `변경 이력`;
  - drawer did not shrink graph canvas width (`911px` before and after open in the test viewport);
  - Focus Mode button switched graph root to `data-view-mode="focus"` and rendered a focus anchor;
  - edge hitbox click opened edge detail drawer with source/target fields and selected edge highlight;
  - close button closed the drawer while preserving graph canvas width.

### UI Verification Materials
- `docs/verification/screenshots/2026-06-15/dependency-graph-focus/after-desktop.png`

### Known Issues
- Browser automation could not type a larger custom sample into the hidden editor-backed config textarea. Topology-rich dependency paths are verified by unit tests instead of the browser smoke test.
- Browser ESC keypress automation failed because the in-app browser reported a focused target mismatch. The source code has the ESC handler and static test coverage; drawer close button was verified in browser.
- The default bundled sample config only produces a very small dependency graph, so the saved screenshot shows a simple Focus state. Larger path visual density should be checked with real customer configs in a follow-up pass.
- The production build still emits the existing Vite chunk-size warning for large bundles.

## 2026-06-15 Dependency Graph Layout Stabilization Phase 5

### Current Work
- Task: stabilize the Dependency Graph layout and add view controls: Organic/Radial/Force/Focus layouts, zoom/pan/fit, minimap, fullscreen, render caps, and label density.
- Branch: `work/mvp-interface-stabilization`.
- Scope: Dependency Graph model/view/CSS/tests only. Default view remains Dependency Graph; Sankey remains a secondary view and Raw Graph View remains available.

### Change
- Added layout modes:
  - `organic`: deterministic natural cluster spread;
  - `radial`: group-centered radial placement;
  - `force`: deterministic force-like placement with stable node-id based seed;
  - `focus`: enters the existing selected node/edge Focus Mode.
- Added deterministic layout helpers in `dependencyGraphModel.js`:
  - `stableHash`;
  - `seededUnit`;
  - `organicGroupPosition`;
  - `radialGroupPosition`;
  - `forceGroupPosition`.
- Updated render limits:
  - `MAX_RENDERED_GRAPH_NODES = 300`;
  - `MAX_RENDERED_GRAPH_EDGES = 500`;
  - `MAX_VISIBLE_LABELS = 120`.
- Raw dependency edges are now preserved through conversion and capped only at render time, so hidden edge counts can be reported.
- Added SVG viewport controls:
  - zoom in/out;
  - reset to 100%;
  - fit view based on rendered node bounds;
  - pan by dragging empty canvas;
  - clear selection.
- Added static minimap/overview map with current viewport rectangle.
- Added fullscreen mode:
  - graph shell becomes fixed overlay;
  - left panel overlays instead of shrinking the canvas;
  - bottom carousel is hidden;
  - ESC exits fullscreen.
- Added label density:
  - low zoom shows only system/group/selected/related labels;
  - medium zoom prioritizes problem/aggregate labels;
  - high zoom shows individual labels up to `MAX_VISIBLE_LABELS`;
  - selected and hovered labels stay visible.
- Added compressed-data status text when nodes/edges are hidden by render limits.
- Kept Raw Graph View button in the toolbar.

### Files
- `src/components/graph/dependencyGraphModel.js`
- `src/components/graph/DependencyGraphView.jsx`
- `src/styles/global-report.css`
- `tests/dependency-graph-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`
- `docs/verification/screenshots/2026-06-15/dependency-graph-layout/after-desktop.png`

### Verification
- `node --test tests/dependency-graph-model.test.js`: pass, 17 tests.
- `node --test tests/summary-renderer.test.js`: pass, 14 tests.
- `npm.cmd test`: pass, 308 pass / 1 skip.
- `npm.cmd run build`: pass after elevated rerun. Sandboxed build is still blocked by esbuild path access to `vite.config.js`.
- Browser verification using built app at `http://127.0.0.1:4174/`:
  - Dependency Graph mounted after running a small old/new config compare;
  - toolbar showed `Organic`, `Radial`, `Force`, `Focus`, zoom, fit, clear, fullscreen, and Raw Graph View;
  - minimap rendered;
  - Organic/Radial/Force changed node positions;
  - zoom reset changed status to `100%`;
  - zoom out changed status to `85%` and later `55%`;
  - label density changed to `low` at 55% and `high` at 130%;
  - fullscreen entered with `data-fullscreen="true"`;
  - ESC exited fullscreen with `data-fullscreen="false"`;
  - rendered counts stayed under the configured caps.

### UI Verification Materials
- `docs/verification/screenshots/2026-06-15/dependency-graph-layout/after-desktop.png`

### Known Issues
- The minimap is currently static and shows the viewport rectangle, but it does not yet support click/drag navigation.
- `Force` mode is deterministic and force-like, not a full physical simulation engine.
- Browser automation had duplicate global button names because an outer legacy root and the new shell both expose controls; verification scoped interactions to `.dependency-graph-shell`.
- The production build still emits the existing Vite chunk-size warning for large bundles.

## 2026-06-15 Dependency Graph Object Node Correction

### Current Work
- Task: correct the Dependency Graph default canvas so it renders real configuration objects instead of large summary/classification cards.
- Branch: `work/mvp-interface-stabilization`.
- Scope: Dependency Graph model/view/CSS/tests only. Raw Graph View remains available and Sankey remains non-default.

### Change
- Main graph render nodes are now limited to real setting object kinds:
  - `port`;
  - `lag`;
  - `interface`;
  - `peer`;
  - `static`;
  - `bgp`;
  - `pim`;
  - `internal`;
  - `system-interface`.
- Removed runtime promotion of these summary objects to main graph nodes:
  - `DOMAIN` / domain group cards;
  - `PROBLEM` / problem group cards;
  - `SYSTEM` / Network anchor card;
  - `group-node:*` aggregate cards.
- Added `MAIN_GRAPH_NODE_KINDS` and switched the default render path to `buildObjectRenderGraph`.
- Groups now remain as cluster metadata and render as SVG hull/background regions with label/count only.
- The `... 외 N개` overflow item remains a small placeholder chip, not a large graph node.
- Added compact object node renderer:
  - small pill/rounded nodes for ordinary objects;
  - only selected/focus anchor nodes receive larger emphasis/ring-like border;
  - long detail stays in drawer/tooltip surfaces.
- Carousel group selection now changes the selected group/range without selecting a `group-node:*` or opening the drawer.
- Focus Mode refuses `group-node:*` summary ids as focus targets.
- Added `system-interface` style token/filter support for real system-interface objects while keeping `system` out of main graph nodes.

### Files
- `src/components/graph/dependencyGraphModel.js`
- `src/components/graph/DependencyGraphView.jsx`
- `src/styles/global-report.css`
- `tests/dependency-graph-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`
- `docs/verification/screenshots/2026-06-15/dependency-graph-object-nodes/after-desktop.png`
- `docs/verification/screenshots/2026-06-15/dependency-graph-object-nodes/after-canvas.png`
- `docs/verification/screenshots/2026-06-15/dependency-graph-object-nodes/after-canvas-visible.png`

### Verification
- `npm.cmd test`: pass, 308 pass / 1 skip.
- `npm.cmd run build`: pass after elevated rerun. Sandboxed build is still blocked by esbuild path access to `vite.config.js`.
- Browser verification using built app at `http://127.0.0.1:4174/` with a small old/new topology sample:
  - Dependency Graph root mounted;
  - compact object nodes: 10;
  - group nodes: 0;
  - system summary nodes: 0;
  - cluster hulls: 10;
  - object node kind counts included `port`, `lag`, `interface`, `peer`, `static`, `bgp`, and `pim`;
  - Raw Graph View button remained available;
  - Sankey was not the default graph view;
  - browser console error log was empty.

### UI Verification Materials
- `docs/verification/screenshots/2026-06-15/dependency-graph-object-nodes/after-desktop.png`
- `docs/verification/screenshots/2026-06-15/dependency-graph-object-nodes/after-canvas.png`
- `docs/verification/screenshots/2026-06-15/dependency-graph-object-nodes/after-canvas-visible.png`

### Known Issues
- The old local `buildGroupedRenderGraph`/`focusGroupModel` helper code still exists as unreachable legacy implementation, but the default and focus runtime paths no longer call it for group cards.
- Full-page screenshots can visually shrink the canvas because the app page is tall; canvas-specific clipped screenshots were saved alongside the full-page capture.
- The production build still emits the existing Vite chunk-size warning for large bundles.

## 2026-06-15 Dependency Graph Mock Object View Reset

### Current Work
- Task: reset the Graph tab direction after the user rejected summary/card-like Dependency Graph output.
- Branch: `work/mvp-interface-stabilization`.
- Scope: Dependency Graph visual model and Graph tab wrapper only. Real data connection is intentionally disconnected for this step.

### Requirement Applied
- Main graph nodes must be real setting objects only:
  - `port`;
  - `lag`;
  - `interface`;
  - `peer`;
  - `static`;
  - `bgp`;
  - `pim`;
  - `internal`;
  - `system-interface`.
- `DOMAIN`, `PROBLEM`, `SYSTEM`, `group`, `summary`, `hidden`, added/removed, and "more" placeholders must not render as main graph nodes.
- Cluster/domain information is represented only as translucent SVG hulls/background regions.
- The first implementation uses static mock data and must not connect actual parser/canonical data yet.

### Change
- Added `buildDependencyMockGraphModel()` with exactly 20 compact object nodes and 18 direct dependency edges.
- The mock graph centers on `INTERFACE to-pef1-1 / 14.59.4.65`.
- Left cluster:
  - PORT `2/1/1`;
  - PORT `2/1/2`;
  - additional compact PORT examples;
  - LAG `311`.
- Right cluster:
  - PEER `14.59.4.65`;
  - BGP `112.188.17.25`;
  - additional compact peer/BGP examples.
- Bottom cluster:
  - STATIC `0.0.0.0/0`;
  - PIM `239.1.1.1`;
  - INTERNAL `route-map`;
  - INTERNAL `policy`.
- `DependencyGraphView` now calls `buildDependencyMockGraphModel()` instead of `buildDependencyGraphModel(graph)`.
- The left summary panel and bottom carousel are hidden in mock mode so the graph canvas occupies most of the screen.
- Graph tab now renders the mock Dependency Graph even when no comparison report exists, so the mock direction can be reviewed before reconnecting real data.
- Raw Graph View label/button remains available; Sankey is not the default view.

### Files
- `src/components/graph/dependencyGraphModel.js`
- `src/components/graph/DependencyGraphView.jsx`
- `src/core/legacyCore.js`
- `src/styles/global-report.css`
- `tests/dependency-graph-model.test.js`
- `tests/summary-renderer.test.js`
- `docs/verification/screenshots/2026-06-15/dependency-graph-mock-object-view/after-desktop.png`
- `docs/verification/screenshots/2026-06-15/dependency-graph-mock-object-view/after-full-page.png`

### Verification
- `npm.cmd test`: pass, 310 pass / 1 skip.
- `git diff --check`: pass. Only existing CRLF normalization warnings were printed.
- `npm.cmd run build`: pass after elevated rerun. Sandboxed build is still blocked by esbuild path access to `vite.config.js`.
- Browser verification using dev app at `http://127.0.0.1:5176/`:
  - `data-mock-graph="true"`;
  - dependency canvas count: 1;
  - compact node count: 20;
  - edge count: 18;
  - cluster hull count: 4;
  - side panel count: 0;
  - carousel count: 0;
  - forbidden text count for DOMAIN/PROBLEM/SYSTEM/summary/hidden/more: 0;
  - forbidden main node kind count: 0;
  - required labels all present: `to-pef1-1 / 14.59.4.65`, `2/1/1`, `2/1/2`, `311`, `14.59.4.65`, `112.188.17.25`, `0.0.0.0/0`, `239.1.1.1`, `route-map`, `policy`;
  - Raw Graph View title present;
  - browser console error log: empty.

### UI Verification Materials
- `docs/verification/screenshots/2026-06-15/dependency-graph-mock-object-view/after-desktop.png`
- `docs/verification/screenshots/2026-06-15/dependency-graph-mock-object-view/after-full-page.png`

### Known Issues
- This is intentionally mock-only. Real canonical/parser data must not be reconnected until the mock visual direction is accepted.
- The full-page screenshot is not the primary review artifact because the app header repeats in the capture; use `after-desktop.png` plus DOM verification metrics for the current mock check.
- The production build still emits the existing Vite chunk-size warning for large bundles.

## 2026-06-16 Dependency Graph Polish

### Current Work
- Task: keep the current real-setting-object centered Dependency Graph structure and apply visual polish only.
- Branch: `work/mvp-interface-stabilization`.
- Scope: Dependency Graph view/CSS/test contracts plus the graph tab wrapper. No parser/canonical data reconnection and no dashboard/Sankey/table direction change.

### Change
- Kept the mock object graph as the default Graph tab review target:
  - 20 compact setting-object nodes;
  - 18 dependency edges;
  - no DOMAIN/PROBLEM/SYSTEM/group/summary card nodes in the main canvas.
- Separated Raw Graph View into its own hidden panel:
  - default graph view shows only Dependency Graph;
  - `Raw Graph View` button switches to the legacy React Flow panel;
  - `Dependency Graph` button returns to the polished dependency canvas.
- Replaced rectangular/dashed cluster boxes with soft translucent SVG hull paths and small count badges.
- Reduced default node weight and kept large emphasis only for the anchor/selected node.
- Added two-hop visual support so directly related nodes stay readable while unrelated items are dimmed.
- Softened edge curves, opacity, and color tokens to reduce visual noise.
- Polished toolbar, minimap, render status, hover/selection transitions, and overlay drawer spacing.

### Files
- `src/components/graph/DependencyGraphView.jsx`
- `src/core/legacyCore.js`
- `src/styles/global-report.css`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`
- `docs/verification/screenshots/2026-06-16/dependency-graph-polish/after-desktop.png`

### Verification
- `npm.cmd test`: pass, 310 pass / 1 skip.
- `git diff --check`: pass. Only CRLF normalization warnings were printed.
- `npm.cmd run build`: pass after elevated rerun. Sandboxed build is still blocked by esbuild path access to `vite.config.js`.
- Browser verification using dev app at `http://127.0.0.1:5173/` with local Chrome:
  - Graph tab mounted with Dependency panel visible and Raw panel hidden by default;
  - compact object node count: 20;
  - cluster hull count: 4;
  - Raw Graph View switch hid Dependency panel and showed Raw panel;
  - returning to Dependency Graph hid the Raw panel again;
  - node click opened the overlay drawer;
  - drawer did not shrink the graph canvas width (`1348px` before and after drawer open);
  - screenshot saved with drawer closed and Dependency panel active.

### UI Verification Materials
- `docs/verification/screenshots/2026-06-16/dependency-graph-polish/after-desktop.png`

### Known Issues
- This remains intentionally mock-only until the visual direction is accepted.
- Browser console recorded one generic 404 resource error during dev-server load; no page runtime error was observed.
- The production build still emits the existing Vite chunk-size warning for large bundles.

## 2026-06-16 Remove Unusable Graph Tab

### Current Work
- Task: remove the currently unusable Graph tab and related renderer code.
- Branch: `work/mvp-interface-stabilization`.
- Scope: remove Graph tab UI, React Flow/Dagre/ECharts/Sankey/Dependency Graph renderer files, graph-tab event handlers, graph-tab CSS, and graph UI tests.
- Preserved: internal relationship/canonical graph data builders used by report subscriber-path tables and analytics tests.

### Change
- Removed the top-level Graph tab button and `#graphTab` panel from the app shell.
- Removed report quick action `data-report-action="graph"` and kept only summary/review/export actions.
- Removed graph tab renderer registration from `src/main.jsx`.
- Removed legacy graph tab state transitions, standalone graph rendering, graph focus/filter handlers, and React root mounting helpers from `src/core/legacyCore.js`.
- Removed graph renderer source files:
  - React Flow relationship graph;
  - Dependency Graph view/model;
  - Sankey PoC view/model;
  - graph adapter and Dagre layout utility.
- Removed unused graph CSS blocks from report/summary/compare styles.
- Removed unused graph UI dependencies from package manifests:
  - `@xyflow/react`;
  - `dagre`;
  - `echarts`;
  - `echarts-for-react`.
- Renamed the old report panel component from graph-oriented naming to `ReportPanel.jsx`.

### Files
- `src/components/AppShell.jsx`
- `src/components/ReportPanel.jsx`
- `src/components/RelationshipGraphPanel.jsx` (deleted)
- `src/components/GraphTabPanel.jsx` (deleted)
- `src/components/graph/*` (deleted graph UI renderer files)
- `src/core/legacyCore.js`
- `src/core/legacySelectors.js`
- `src/main.jsx`
- `src/styles/global-report.css`
- `src/styles/global-summary.css`
- `src/styles/global-compare-settings.css`
- `src/utils/dagreLayout.js` (deleted)
- `src/utils/graphAdapter.js` (deleted)
- `tests/summary-renderer.test.js`
- `tests/graph-adapter.test.js` (deleted)
- `tests/dependency-graph-model.test.js` (deleted)
- `tests/sankey-poc-model.test.js` (deleted)
- `package.json`
- `package-lock.json`
- `docs/verification/screenshots/2026-06-16/remove-graph-tab/after-desktop.png`

### Verification
- `npm.cmd test`: pass, 266 pass / 1 skip.
- `npm.cmd run build`: pass. Existing Vite chunk-size warning remains for `legacyCore`.
- Browser verification at `http://localhost:5173/`:
  - tab buttons: `summaryPageTabBtn`, `objectsPageTabBtn`, `compareTabBtn`, `profilesTabBtn`, `reportPageTabBtn`;
  - `#graphPageTabBtn`: absent;
  - `#graphTab`: absent;
  - `#graphReport`: absent;
  - report quick actions: `summary`, `review`, `export`;
  - screenshot saved.

### UI Verification Materials
- `docs/verification/screenshots/2026-06-16/remove-graph-tab/after-desktop.png`

### Known Issues
- Internal names and tests that refer to `graph` inside `summaryAnalytics` and `core/relationGraph` remain intentionally because the report subscriber path table still consumes that relationship data.
- `package.json` still has `validate:graph` and `validate:all` includes graph mode; these validate internal relationship data, not the removed Graph tab UI.
- The production build still emits the existing Vite chunk-size warning for large bundles.

## 2026-06-16 Report Subscriber Path Table Relationship Fix

### Current Work
- Task: fix Report tab subscriber path table mismatches for full Nokia Classic to Nokia MD-CLI config comparison.
- Branch: `work/mvp-interface-stabilization`.
- Scope: relationship data only. The removed Graph tab UI remains removed; internal `core/relationGraph` code is preserved because the report table uses it.

### Change
- Preserved original display casing for port, LAG, interface, BGP, and PIM labels while keeping normalized keys for matching.
- Added interface aliases so a `subscriber-interface` row can match related `group-interface` references.
- Attached PIM entries that refer to a group interface back to the subscriber-interface path row.
- Extracted SAP/LAG and direct physical port references from interface fields/raw lines.
- Restored report summary rows for interfaces whose explicit `HAS_INTERFACE` canonical relation is absent or ambiguous, using interface SAP/LAG refs as a view/report fallback.
- Added direct physical port fallback for LAG-less interfaces such as MN interfaces.
- Kept canonical graph rules intact: no transitive PORT to STATIC/BGP edge is generated.

### Files
- `src/core/relationGraph/canonicalGraphBuilder.js`
- `src/core/relationGraph/relationResolver.js`
- `src/core/relationGraph/viewGraph.js`
- `tests/relation-graph.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `npm.cmd test`: pass, 268 pass / 1 skip / 269 total.
- `npm.cmd run build`: pass. Existing Vite chunk-size warning remains for `legacyCore`.

### Known Issues
- The fix is verified with reduced tests matching the reported patterns: subscriber-interface/group-interface PIM, ambiguous SAP-to-LAG refs, direct physical port refs, and casing recovery.
- The exact full Nokia Classic/MD-CLI input from the screenshot was not available as a fixture, so FN20 should be rechecked in the UI with the user's full config.
- If FN20 still shows an unexpected static-route count after this relationship fix, the next likely target is static route ownership/resolution for that specific serial network, not the report row renderer.

## 2026-06-16 MD-CLI Split Prefix Interface Mapping Fix

### Current Work
- Task: fix likely MD-CLI full-config interface mapping failure where `address` and `prefix-length` are split under `ipv4 primary`.
- Branch: `work/mvp-interface-stabilization`.
- Scope: parser/address normalization and relation graph address fallback only. Existing report UI layout is unchanged.

### Change
- Relaxed MD-CLI block interface address extraction so nested or inline `primary ... address ... prefix-length ...` forms are combined as CIDR.
- Added canonical graph fallback that combines `fields.address` plus `fields.prefix-length` when parser output still carries split fields.
- Added raw-line fallback for interface address recovery before peer/NH relation resolution.
- Added relation resolver fallback so split address fields can still generate PEER/NH and static/BGP/PIM relationships.

### Files
- `src/core/parsers/nokiaMdCliParser.js`
- `src/core/relationGraph/canonicalGraphBuilder.js`
- `src/core/relationGraph/relationResolver.js`
- `tests/static-route-object-key.test.js`
- `tests/relation-graph.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- Targeted parser/relation tests passed through `npm.cmd test -- tests/static-route-object-key.test.js` and `npm.cmd test -- tests/relation-graph.test.js`.
- Added coverage for MD-CLI `interface { ipv4 { primary { address 112.188.23.49; prefix-length 30 }}}` parsing to `112.188.23.49/30`.
- Added coverage that split address/prefix fields generate peer `112.188.23.50` in canonical relation graph.

### Known Issues
- The user's exact full comparison input is still not checked into the repository as a fixture, so UI confirmation should be repeated with the Nokia Classic to Nokia MD-CLI full config pair.

## 2026-06-16 MD-CLI Subscriber Service Relationship Stabilization

### Current Work
- Task: fix Report tab subscriber path table errors for Nokia MD-CLI full config where subscriber/group interfaces, backup LAG interfaces, BGP, PIM, and static routes were split or missing.
- Branch: `work/mvp-interface-stabilization`.
- Scope: parser and canonical relationship model only. Report table layout/UI was not redesigned.

### Change
- Prevented MD-CLI `pim { interface ... }` blocks from also being parsed as standalone service `interface` objects in `parseMdCliServiceObjects`.
- Changed canonical node merging so empty wrapper attributes do not overwrite real interface attributes such as `address`, `ipAddress`, `lagRefs`, and `portRefs`.
- Deduplicated canonical graph entries by node id and merged their source fields/raw lines, preventing duplicate wrapper entries from creating false ambiguous PIM/interface relations.
- Allowed BGP neighbor resolution to use static route reachability whenever direct peer/subnet matching has no candidate, covering loopback BGP neighbors reached through serial next-hop routes even when the config lacks an explicit multihop field.

### Files
- `src/core/parsers/nokiaMdCliParser.js`
- `src/core/relationGraph/canonicalGraphBuilder.js`
- `src/core/relationGraph/relationResolver.js`
- `tests/static-route-object-key.test.js`
- `tests/relation-graph.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- Added parser coverage that MD-CLI PIM interface blocks do not create standalone `interface` rows while the parent `subscriber-interface` keeps its `group-interface`.
- Added canonical graph coverage for `to-Nowon-TOU-FN20`: address-bearing interface plus addressless wrapper duplicate still produces one subscriber path with Port, LAG, Serial IP, Static Route, BGP, and PIM.
- Ran the user's attached MD-CLI full config file:
  - Parsed objects: `762` total; `subscriber-interface 27`, `interface 59`, `pim 59`, `bgp 57`, `static-route 64`.
  - Canonical nodes: `L3_INTERFACE 82`, `PIM 59`, `BGP_NEIGHBOR 57`, `STATIC_ROUTE 64`.
  - Canonical edges: `HAS_INTERFACE 62`, `HAS_PEER 78`, `USED_BY_STATIC 86`, `USED_BY_BGP 50`, `HAS_PIM 58`.
  - Report subscriber rows from the attached new config: `82`.
  - `g-to-Nowon-TOU-FN05` no longer appears as a separate subscriber row; it is attached as PIM under `to-Nowon-TOU-FN05`.
  - `to-Dobong-TOU-FB04`: `6/1/c10/1`, `lag-A-6110`, `112.188.21.57/30`, static `112.188.30.136/32`, BGP `112.188.30.136`, PIM `g-to-Dobong-TOU-FB04`.
  - `to-Dobong-TOU-FD04`: `2/2/c4/1`, `lag-B-2204`, `112.188.23.49/30`, static `112.188.30.112/32`, BGP `112.188.30.112`, PIM `to-Dobong-TOU-FD04`.
  - `to-Nowon-TOU-FN20`: `2/2/c2/1`, `lag-B-2202`, `112.188.27.137/30`, static `112.188.30.71/32`, BGP `112.188.30.71`, PIM `to-Nowon-TOU-FN20`.
- Targeted test commands passed:
  - `npm.cmd test -- tests/relation-graph.test.js`
  - `npm.cmd test -- tests/static-route-object-key.test.js`

### Known Issues
- The current user attachment is the new MD-CLI config only. The reported old-side MN static-route false positive requires the matching old Nokia Classic full config or the old `To-MNT*`/static-route section to reproduce exactly.
- The attached new config still has a few unresolved/ambiguous diagnostics (`USED_BY_BGP`, `USED_BY_STATIC`, one `HAS_PIM`) that should be checked against device-specific policy/context before forcing automatic links.

## 2026-06-16 Report Table Sorting And Counts

### Current Work
- Task: add sorting and clearer total-count visibility to report tables.
- Branch: `work/mvp-interface-stabilization`.
- Scope: Report tab table interaction only. Existing report data generation, parser, relation resolver, table columns, and layout structure were preserved.

### Change
- Added sortable header buttons to the Report tab review table and subscriber path table.
- Sorting is applied by DOM row reordering so existing filters, detail rows, compare-jump buttons, and compact/full view modes keep their existing behavior.
- Review table supports sorting by visible compact columns, full-mode option fields, score, reason, and diagnostic fields.
- Subscriber path table supports sorting by all current columns. Static/BGP/PIM service columns sort by service count while retaining the existing compact cell summary.
- Replaced terse count text such as `1/1` with explicit `표시 N / 전체 M` count text for both report tables.
- Reset buttons now also clear the active sort state for their own table.

### Files
- `src/core/legacyCore.js`
- `src/core/legacyState.js`
- `src/styles/global-report.css`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`
- `docs/verification/screenshots/2026-06-16/report-table-sort-count/after-desktop.png`

### Verification
- `npm.cmd test -- tests/summary-renderer.test.js`: pass. Because the package script includes `tests/*.test.js`, this executed the full test suite: `274` tests, `273` pass, `1` skip.
- `npm.cmd run build`: pass. Existing Vite chunk-size warning remains for `legacyCore`.
- `git diff --check`: pass with only existing LF-to-CRLF working-tree warnings.
- Browser verification on `http://127.0.0.1:5180/`:
  - ran the small built-in sample comparison;
  - opened the Report tab;
  - review table rendered `6` sort buttons and count `표시 1 / 전체 1`;
  - subscriber path table rendered `11` sort buttons and count `표시 0 / 전체 0`;
  - browser console error log was empty.

### Known Issues
- Browser verification used the small built-in sample config because a full user comparison session is not persisted as a repository fixture.
- The working tree contains unrelated pre-existing graph removal/report/parser changes from earlier tasks; this change only intentionally touches report table sorting/count behavior.

## 2026-06-16 Subscriber Path Table BGP And Pairing Fix

### Current Work
- Task: fix Report tab subscriber path table cases where PE/IV BGP values were missing, lag-A subscriber-interface old/new rows did not pair, and add per-column value counts.
- Branch: `work/mvp-interface-stabilization`.
- Scope: report/view graph enrichment and subscriber path table counters only. Canonical resolver ambiguity rules and existing report table layout were preserved.

### Change
- Added report/view-layer BGP enrichment through exact `/32` static route prefixes. This lets PE/IV rows show BGP neighbors when the canonical graph correctly leaves the underlying BGP edge ambiguous because multiple equal-cost static next-hop candidates exist.
- Kept the canonical rule that ambiguous BGP reachability does not create `USED_BY_BGP` edges.
- Added a secondary old/new subscriber row pairing pass by normalized interface label. Serial IP/subnet matching remains primary, but unpaired old-only/new-only rows with the same subscriber-interface name now merge, covering lag-A cases where the active interface serial address changes.
- Added per-column count badges to the subscriber path table headers. Counts show visible rows with a value over total rows with a value for each column.

### Files
- `src/core/relationGraph/viewGraph.js`
- `src/core/legacyCore.js`
- `src/styles/global-report.css`
- `tests/relation-graph.test.js`
- `tests/summary-renderer.test.js`
- `docs/PROJECT_STATE.md`

### Verification
- `npm.cmd test -- tests/relation-graph.test.js tests/summary-renderer.test.js`: pass. Because the package script includes `tests/*.test.js`, this executed the full test suite: `276` tests, `275` pass, `1` skip.
- `npm.cmd run build`: pass. Existing Vite chunk-size warning remains for `legacyCore`.
- Browser server check: `http://127.0.0.1:5181/` returned HTTP `200`.
- Browser DOM check without a persisted comparison session confirmed the app loads and the Report tab opens; subscriber table count badges require an active comparison result to render.
- UI screenshot saved at `docs/verification/screenshots/2026-06-16/subscriber-table-bgp-counts/report-tab-empty-state.png`.

### Known Issues
- The exact old Nokia Classic full config used in the user screenshots is not available as a repository fixture, so lag-A pairing was covered by a focused synthetic regression test and the new MD-CLI attachment was used for service-side inspection.
- The browser session used for verification did not contain the user's full comparison data, so visual confirmation with the exact full Classic-to-MD-CLI pair should be repeated when that pair is available in the running app.
