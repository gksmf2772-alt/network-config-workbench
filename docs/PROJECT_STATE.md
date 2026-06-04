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
