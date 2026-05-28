# Current Issue

## MVP core comparison stabilization

Affected stability-map boundary:
- `src/core/comparisonPlan.js` field visibility only.
- `src/core/semanticFieldNormalizer.js` interface identity only.
- `src/core/parsers/nokiaClassicParser.js` direct router interface context only.
- `src/core/parsers/nokiaMdCliParser.js` block/one-line router interface context only.
- `src/core/matchers/objectMatcher.js` interface routing-context guard only.
- `src/core/semanticFieldNormalizer.js` static-route identity only.
- `src/core/parsers/nokiaClassicParser.js` direct router static-route context only.
- `src/core/parsers/nokiaMdCliParser.js` block/one-line router static-route context only.
- `src/core/matchers/objectMatcher.js` static-route routing-context guard only.
- `src/core/parsers/nokiaClassicParser.js` Classic nested BGP group context only.
- `src/core/comparisonPlan.js` BGP group structure-converted status only.
- `src/core/summaryAnalytics.js` review-row admin-state display and suppressed normalized BGP field rows only.
- `src/core/objectReviewGroups.js` active/suppressed field grouping only.
- `src/core/semanticTheme.js` user-facing state label mapping only.
- `src/core/compareRenderer.js` compare result status label display only.
- `src/core/parsers/nokiaClassicParser.js` Classic PIM block context only.
- `src/core/parsers/nokiaClassicParser.js` Classic PIM normalized identity only.
- `src/core/parsers/nokiaMdCliParser.js` MD-CLI router PIM one-line precedence only.
- `src/core/summaryAnalytics.js` MVP section summary counts only.
- `src/core/summaryRenderer.js` MVP section summary cards only.
- `src/core/legacyCore.js` section summary insertion and Excel CSV export button wiring only.
- `src/core/reportExport.js` Excel-compatible CSV report generation only.
- `src/components/ConfigInputPanel.jsx` export button tooltip only.
- `tests/comparison-exclusion.test.js` status label contract coverage.
- `tests/bgp-effective-neighbor.test.js` BGP inheritance contract coverage.
- `tests/static-route-object-key.test.js` parser contract coverage.
- `tests/mvp-core-scope.test.js` MVP contract coverage.
- `tests/summary-analytics.test.js` section summary count coverage.
- `tests/summary-renderer.test.js` section summary markup coverage.
- `tests/report-export.test.js` Excel report export coverage.
- `tests/fixture-validation-script.test.js` fixture matrix/discovery coverage.
- `scripts/validateCompareFixtures.js` actual example fixture matrix validation only.
- `docs/*` product and handoff documentation.

Allowed edit scope:
- Stabilize MVP comparison behavior for Nokia Classic -> Nokia MD-CLI.
- Focus only on Interface, Static-route, and BGP neighbor.
- Add tests before parser/normalizer/matcher changes.
- Expose interface name changes after address/prefix-based interface matching.

Forbidden:
- Semantic object match policy rewrite.
- Manual mapping behavior or localStorage key changes.
- Profile exception behavior.
- Comparison exclusion behavior.
- Existing summary/report/graph count semantics.
- Diff scroll sync behavior.
- Connector path routing, object bridge, anchor geometry, and line relation data semantics.
- UI color/line connector/graph refinements.
- New vendor expansion.
- C rewrite.

Post-edit checklist:
- Semantic match checked: no matcher policy rewrite in this step.
- Manual mapping checked: untouched.
- Profile exception checked: untouched.
- Comparison exclusion checked: untouched.
- Summary/report/graph count checked: BGP suppressed rows and MVP section summary added; graph and aggregate count contracts preserved.
- Compare renderer checked: display labels only; internal match status values and CSS state classes preserved.
- Diff scroll sync checked: untouched.
- Line connector rendering checked: untouched.
- Tests run: npm.cmd run guard:legacy-core pass; npm.cmd test pass, 167 pass / 1 skip; npm.cmd run build pass.

## Current implementation facts

- Product goal is documented in `docs/mvp-product-definition.md`.
- Development priority is documented in `docs/mvp-development-priority.md`.
- Handoff is documented in `.codex/HANDOFF.md` and `docs/mvp-implementation-handoff.md`.
- MVP contract tests are in `tests/mvp-core-scope.test.js`.
- Runtime changes so far:
  - `interface` is now a visible compare field.
  - non-Base router context is part of interface identity.
  - Classic direct and MD-CLI block/one-line router interface context is preserved.
  - interface same-address auto-match is blocked when routing contexts differ.
  - MD-CLI one-line service interfaces with duplicate service/address are preserved when interface names differ.
  - non-Base router context is part of static-route identity.
  - Classic direct and MD-CLI block/one-line router static-route context is preserved.
  - static-route same-prefix/same-next-hop auto-match is blocked when routing contexts differ.
  - Classic nested BGP group context is applied to child neighbors.
  - BGP group reference rename is classified as `structure-converted`, not `changed`.
  - Summary/review rows preserve the `admin-state` label instead of displaying it as `state`.
  - BGP `structure-converted` group rows and `inheritance-unresolved` inherited fields stay out of active object issues and are grouped as suppressed field issues.
  - User-facing compare labels use MVP terms: `동일`, `변경`, `검토 필요`, `누락`, `추가`, `미매칭`.
  - Actual fixture check:
    - Classic BGP neighbor raw/parsed counts match: 57, 57, 51, 51.
    - New_bgp_1..4 neighbor raw/parsed counts match: 56, 56, 44, 44.
    - Classic BGP child neighbors now carry group/peer-as/export from group context.
    - Object grouping has zero active `structure-converted`/`inheritance-unresolved` rows on all BGP example pairs.
    - Suppressed BGP grouping counts: group 56/56/44/44, inheritance 164/164/132/132.
  - Actual part-file parser scan:
    - Static raw/parsed counts match for New_static_1..4.
    - LAG raw/parsed counts match for New_lag_1..4.
    - Port raw/parsed counts match for New_port_1..4.
    - PIM raw/parsed counts now match: Classic 15,55,49,48 and New_PIM_1..4 50,50,44,44.
    - Classic PIM normalized identity is now canonical lower-case, so Classic/MD-CLI case differences auto-match.
    - PIM matched counts in actual fixtures: case 1/2/3/4 = 47/14/42/39.
  - Actual fixture matrix validator:
    - `scripts/validateCompareFixtures.js --all-cases --scope full` finds sibling `network-config-workbench-home\\예제 및 테스트 설정`.
    - Case mapping: 027 -> New_*_1, 028 -> New_*_2, 029 -> New_*_3, 030 -> New_*_4.
    - Scope support: full, bgp, static, interface, lag, port, pim.
    - `NCW_FIXTURE_DIR` / `--fixture-dir` can override fixture location.
  - Summary dashboard now shows MVP section cards for Interface / Static-route / BGP neighbor.
  - Section cards show total, matched, review-needed, changed, missing, added, and average overlap.
  - Clicking a section card reuses the existing object type filter flow.
  - Export report now downloads Excel-compatible UTF-8 CSV with fixed columns:
    - section, old object, new object, status, field, old value, new value, reason, severity, action needed.
  - Excel export suppresses ignored/structure-converted/inheritance-unresolved noise by default and keeps changed/missing/added/review-needed separate.
  - Smoke contracts added:
    - `Excel 저장` is a visible text button, not icon-only.
    - Export click path builds CSV rows, writes `text/csv;charset=utf-8`, and updates status.
    - Section cards are bound to object list filtering and switch to the objects result tab.
  - Actual fixture export check:
    - Source: `Gangbu-SEA027H_config.txt`
    - Target parts: `New_interface_1.txt` + `New_static_1.txt` + `New_bgp_1.txt`
    - Export rows: 1036.
    - Status counts: 변경 416, 추가 143, 누락 477.

## Next work

Do not start UI work first.

Next code work must follow:
1. Pick one MVP area: Interface, Static-route, or BGP neighbor.
2. Add a failing contract test from real config behavior.
3. Fix parser/normalizer/matcher minimally.
4. Run `npm.cmd run guard:legacy-core`, `npm.cmd test`, `npm.cmd run build`.

Recommended next unit:
- Decide whether MVP needs real `.xlsx` multi-sheet export or the current Excel-compatible CSV is enough.
- Continue parser/matcher gap scan from fixture matrix counts; current remaining visible items are full-case lowConfidence 2 in cases 3/4 and matcherIssue counts outside MVP core.
