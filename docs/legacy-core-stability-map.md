# legacyCore stability map

Goal: reduce future edit blast radius without changing runtime behavior now.

This file records the current comparison/rendering boundaries in
`src/core/legacyCore.js`. Treat it as the extraction order for later small
refactors, not as a request to change behavior in this step.

## Current hot path

1. `runCompare`
   - Reads UI options.
   - Parses both configs.
   - Builds the legacy report through `compareObjects`.
   - Builds semantic runtime data through `buildSemanticRuntime`.
   - Applies semantic visual state to diff rows.
   - Renders report, diff panes, semantic preview, then schedules connectors.

2. `buildSemanticRuntime`
   - Normalizes old/new config.
   - Resolves semantic object matches.
   - Loads manual object links.
   - Builds comparison plan.
   - Applies mode/scope filters and audit findings.
   - Sorts plan and optionally attaches manual candidates.

3. Diff row and line relation model
   - `buildDiffRows`
   - `buildSemanticPlanDiffRows`
   - `buildSemanticObjectBlockRows`
   - `buildSemanticLineMatchIndex`
   - `findSemanticLineRelationForRawLine`
   - `renderSemanticObjectConfigLine`

4. DOM rendering and connector path control
   - `renderDiff`
   - `renderDiffLine`
   - `renderDiffConnectors`
   - `collectVisibleDiffObjectGroups`
   - `buildVisibleLineConnectorPaths`
   - `buildVisibleSemanticConfigLineConnectorPaths`
   - fallback semantic field connector builders

5. Summary/report/graph
   - Dashboard data must continue to come from `summaryAnalytics.js`.
   - `legacyCore.js` should only pass the current report, plan, semantic
     summary, policy/audit state, and manual link count into that module.

## Do-not-change contracts

- Semantic object matching is owned by `matchers/objectMatcher.js` and
  `comparisonPlan.js`; `legacyCore.js` only orchestrates it.
- Manual object links must keep the existing local storage/profile merge order.
- Profile exceptions and comparison exclusions are policy evaluator concerns.
- Summary, report, and graph counts must keep using canonical plan state after
  policy suppression/exclusion.
- Diff scroll sync remains delegated to `diffScrollSync.js`.
- Line connector SVG helper output remains delegated to `diffRenderer.js`.

## Proposed extraction order

1. Extract semantic runtime orchestration.
   - Candidate module: `semanticRuntimeAdapter.js`.
   - Move only pure orchestration after passing in profile, options, config text,
     and manual link loader.
   - Keep policy, matcher, and plan semantics unchanged.

2. Extract semantic diff row builders.
   - Candidate module: `semanticDiffRows.js`.
   - Move row-model functions before DOM functions.
   - Preserve generated row fields exactly because connector rendering depends
     on `data-*` values produced later by `renderDiffLine`.

3. Extract connector controller last.
   - Candidate module: `diffConnectorController.js`.
   - Keep DOM measurement, pane visibility checks, active relation state, and
     SVG rendering together.
   - Leave pure SVG path helpers in `diffRenderer.js`.

4. Add characterization tests before moving each boundary.
   - Semantic runtime: matched/manual/excluded plan item snapshots.
   - Diff rows: semantic pair keys, object statuses, line relation keys.
   - Connector controller: existing path helper tests plus DOM fixture checks.

## Safe edit rule

For bug fixes before extraction, change only one layer at a time:

- Data contract bug: matcher/plan/policy modules.
- Row model bug: semantic diff row builders.
- DOM class/attribute bug: `renderDiffLine` or semantic line renderers.
- SVG geometry bug: connector controller or `diffRenderer.js`.
- Count bug: `summaryAnalytics.js`, not connector or row rendering.
