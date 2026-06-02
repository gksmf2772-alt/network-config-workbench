# Compare Section Filter Verification - 2026-06-02

## Scope
- Restore the existing compare pane visual style after reverting the semantic object block replacement.
- Make each compare section tab render only its own object type rows.

## Root Cause
- Section tabs updated `state.activeObjectSectionScope`.
- The compare panes still rendered the full `report.diffRows` array.
- The prior attempted fix changed the row source to semantic object blocks, which changed the UI.

## Fix
- Keep `report.diffRows` as existing line diff data.
- Render `getActiveCompareDiffRows(state.lastReport)` instead of raw `state.lastReport.diffRows`.
- Filter visible rows by `oldRow/newRow.objectKey` type.
- Keep `applySemanticPlanVisualStatusToDiffRows(report.diffRows || [], semanticRuntime.plan)`.
- Do not add `buildSemanticRuntimeDiffRows`.

## Browser Verification
- Tool: Chrome CDP through Node built-in `fetch` and `WebSocket`.
- Dev server: `http://127.0.0.1:5173/`.
- Fixture source: sibling `자료/테스트 config`.
- Checked scopes:
  - `interface`: only `interface`.
  - `static-route`: only `static-route`.
  - `bgp`: only `bgp`.
  - `port-lag`: only `port`, `lag`.
  - `pim`: only `pim`.
- BGP rendered `448` `.diff-line` rows and `0` `.semantic-object-block-wrapper` rows.

## Screenshot
- `docs/verification/screenshots/2026-06-02/compare-section-filter/after-bgp-line-diff.png`

## Automated Verification
- `node --check src/core/legacyCore.js`: pass.
- `node --test tests/comparison-exclusion.test.js`: 19 pass.
- `npm.cmd run guard:legacy-core`: pass.
- `npm.cmd test`: 226 pass / 1 skip.
- `npm.cmd run build`: pass with existing Vite chunk size warning.
