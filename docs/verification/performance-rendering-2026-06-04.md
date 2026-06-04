# Performance Rendering Verification - 2026-06-04

## Scope

- Task: Improve perceived speed for compare, summary, and report views with full device configs.
- Branch: `work/mvp-interface-stabilization`
- Fixture:
  - Old: `Gangbu-SEA027H_config.txt` (`439644` chars)
  - New: `2026-05-28_15-13-31_Dobong-SEA027H_전체설정후_MDconfig.log` (`512478` chars)

## Findings Before Fix

- Core compare calculation was not the only bottleneck.
- The browser report render created about `293140` nodes for the report pane.
- Report tab reopen cost was about `11s` because `renderOverviewReport()` rebuilt the full table and graph on every tab activation.
- The report review table rendered all hidden full-option columns and all hidden detail rows up front.
- Diff render also bound semantic pair events to each rendered line and measured all `.diff-line` rows for height alignment.

## Changes

- Cache report overview rendering by report render version so report tab activation does not rebuild unchanged DOM.
- Remove duplicate pre-semantic summary/report rendering from `renderReportV2()`.
- Reuse cached dashboard data between summary and report renders.
- Render report review table in compact mode by default:
  - Full option field columns are rendered only when the user selects full view.
  - Detail field UI is rendered only when a row detail is expanded.
- Replace per-line semantic pair event binding with delegated pane-level handlers.
- Restrict semantic start alignment to semantic object block wrappers instead of every `.diff-line`.
- Render only the first `120` semantic preview cards initially and expose an explicit full-load button.

## Browser Verification

After optimization with the same fixture:

- Compare completed with `11202` old/new diff rows.
- Report rows: `1402`.
- Report DOM nodes after default compact render: about `35459`.
- Report tab first activation: about `0.6-0.8s`.
- Report tab repeat activation: about `0.3-0.6s`.
- Full option view is now on demand and took about `6.2s` for the measured `147` option columns.
- Expanding one report detail row took about `24ms`.
- Semantic preview default render showed `120` cards and a full-load button.
- Loading all semantic preview cards on demand took about `0.4s`.

## Screenshot

- `docs/verification/screenshots/2026-06-04/performance-rendering/after-report-optimized.png`

## Automated Verification

- `node --check src/core/legacyCore.js`
- `node --check src/core/legacyState.js`
- `node --check src/core/compareRenderer.js`
- `node --test tests/summary-renderer.test.js tests/summary-analytics.test.js tests/comparison-exclusion.test.js tests/policy-coverage.test.js tests/semantic-mapping-policy.test.js tests/matcher-quality.test.js tests/static-route-object-key.test.js`
- `npm.cmd run guard:legacy-core`
- `npm.cmd test`
- `npm.cmd run build`

## Notes

- Remaining compare time is still affected by large diff pane rendering and semantic matching. The report and summary tab repeat-render bottleneck is addressed.
- A deeper follow-up would be diff pane virtualization or worker-based parser/matcher execution.
