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
