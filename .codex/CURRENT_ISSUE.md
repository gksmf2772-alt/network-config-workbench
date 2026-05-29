# Current Issue

## MVP core comparison stabilization

Affected stability-map boundary:
- `src/core/comparisonPlan.js` field visibility only.
- `src/core/semanticFieldNormalizer.js` interface identity only.
- `src/core/parsers/nokiaClassicParser.js` direct router interface context only.
- `src/core/parsers/nokiaClassicParser.js` Classic duplicate interface stub merge only.
- `src/core/parsers/nokiaMdCliParser.js` block/one-line router interface context only.
- `src/core/matchers/objectMatcher.js` interface routing-context guard only.
- `src/core/semanticFieldNormalizer.js` static-route identity only.
- `src/core/parsers/nokiaClassicParser.js` direct router static-route context only.
- `src/core/parsers/nokiaMdCliParser.js` block/one-line router static-route context only.
- `src/core/matchers/objectMatcher.js` static-route routing-context guard only.
- `src/core/matchers/objectMatcher.js` port/LAG description endpoint extraction only.
- `src/core/parsers/nokiaClassicParser.js` Classic nested BGP group context only.
- `src/core/comparisonPlan.js` BGP group structure-converted status only.
- `src/core/summaryAnalytics.js` review-row admin-state display and suppressed normalized BGP field rows only.
- `src/core/objectReviewGroups.js` active/suppressed field grouping only.
- `src/core/semanticTheme.js` user-facing state label mapping only.
- `src/core/compareRenderer.js` compare result status label display only.
- `src/core/parsers/nokiaClassicParser.js` Classic PIM block context only.
- `src/core/parsers/nokiaClassicParser.js` malformed PIM child exit context recovery only.
- `src/core/parsers/nokiaClassicParser.js` Classic PIM normalized identity only.
- `src/core/parsers/nokiaClassicParser.js` Classic physical port header detection only.
- `src/core/parsers/index.js` policy community placeholder definition filter only.
- `src/core/parsers/nokiaMdCliParser.js` MD-CLI router PIM one-line precedence only.
- `src/core/summaryAnalytics.js` MVP section summary counts only.
- `src/core/summaryRenderer.js` MVP section summary cards only.
- `src/core/legacyCore.js` section summary insertion and Excel XLSX export button wiring only.
- `src/core/reportExport.js` Excel-compatible CSV and XLSX report generation only.
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
- Summary/report/graph count checked: BGP suppressed rows, MVP section summary, and fixture-scope realMissingTarget classification contracts preserved.
- Compare renderer checked: display labels only; internal match status values and CSS state classes preserved.
- Diff scroll sync checked: untouched.
- Line connector rendering checked: untouched.
- Tests run: npm.cmd run guard:legacy-core pass; npm.cmd test pass, 197 pass / 1 skip; npm.cmd run build pass.

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
  - Interface old-only rows without target address evidence are classified as `unmatchedRealMissingTarget`, not `unmatchedMatcherIssue`.
  - Current PC interface `missing-target-address-with-description-evidence` 20 rows are 10G -> 100G disappearing circuits; target has no matching interface IP address, so do not match them by description-only evidence.
  - Current PC interface remaining 18 rows split into GRE tunnel address 16 and system/loopback address 2.
  - Classic no-address duplicate interface stubs merge into the addressed interface object when the interface name is unambiguous.
  - Port/LAG old-only rows without target physical-id/member/description-endpoint evidence are classified as `unmatchedRealMissingTarget`.
  - Port/LAG description endpoint matching supports compact old vs split target tokens, directional `to-` prefixes, parenthesized physical ports, and underscore device fallback when no port token exists.
  - Web top diff `legacyCore` endpoint alignment now mirrors the same compact-old vs split-target LAG endpoint logic, so `lag 184` maps to `lag-B-4206` by `Dobong-TOU-FD19_7/1` vs `Dobong-TOU-FD19, Po11(Te7/1)`.
  - Classic `port-list` TCP/UDP entries such as DHCP `port 67/68` are not parsed as physical port objects.
  - Policy placeholder old-only rows without same target identity are classified as `unmatchedRealMissingTarget`, not parser gap.
  - Classic policy community placeholders only include `community ... members/expression` definitions; SNMP communities, notify-community, and `community add` actions are not definition objects.
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
    - Classic PIM block keeps context after a misindented child `exit`, so following group interfaces stay PIM objects.
    - Classic PIM normalized identity is now canonical lower-case, so Classic/MD-CLI case differences auto-match.
    - Current PC fixture PIM matched counts: case 1/2 = 47/47.
    - Current PC fixture PIM old-only rows with only generic target interface evidence stay unmatched; PIM config must exist on target to match.
  - Actual fixture matrix validator:
    - `scripts/validateCompareFixtures.js --all-cases --scope full` finds sibling `network-config-workbench-home\\예제 및 테스트 설정`.
    - Case mapping: 027 -> New_*_1, 028 -> New_*_2, 029 -> New_*_3, 030 -> New_*_4.
    - Scope support: full, bgp, static, interface, lag, port, pim.
    - `NCW_FIXTURE_DIR` / `--fixture-dir` can override fixture location.
    - Exact target part names are preferred, but a single suffixed variant is accepted when the exact file is missing.
      - Example: `New_static_1_순서수정.txt`, `New_PIM_1_확인완료.txt`.
    - Current PC path `C:\Users\gksmf\바탕 화면\실험실\코덱스\자료\테스트 config` validates full/static/pim for cases 1/2.
    - Current PC interface/port/lag/full scope `unmatchedMatcherIssue`: case 1/2 = 0.
    - Current PC full scope `unmatchedParserGap`: case 1/2 = 0.
    - Validator output includes `fixtureScope.byType` and `fixtureScope.byReason` for partial target, matcherIssue, parserGap, and realMissingTarget diagnostics.
    - `--md-full-logs` validates current PC case 1/2 `MDconfig` and `MDfullcontext` logs by SEA id + log type.
    - `--available-cases` validates only fixture cases whose source and target files exist, so the current PC case 1/2 directory no longer fails because case 3/4 files are absent.
    - Current PC full `realMissingTarget` by type:
      - case 1: port 66, interface 38, static-route 10, pim 8, route-policy 8, prefix-list 7, community 5, lag 4, bgp 1.
      - case 2: port 70, interface 38, static-route 9, pim 8, route-policy 8, prefix-list 7, community 6, lag 6, bgp 1.
    - Current PC static-route `realMissingTarget` by reason:
      - case 1: missing-target-default-route 1, missing-target-indirect-tunnel-route 4, missing-target-loopback-host-route 3, missing-target-multi-next-hop-route 2.
      - case 2: missing-target-default-route 1, missing-target-indirect-tunnel-route 4, missing-target-loopback-host-route 2, missing-target-multi-next-hop-route 2.
    - Current PC policy placeholder `realMissingTarget` by reason:
      - case 1: community expression 1, community members 4, ip-prefix-list 5, prefix-list 2, route-policy deny/drop 2, route-policy iCOD 2, route-policy peer 4.
      - case 2: community expression 1, community members 5, ip-prefix-list 5, prefix-list 2, route-policy deny/drop 2, route-policy iCOD 2, route-policy peer 4.
    - Current PC BGP `realMissingTarget` by reason:
      - case 1: missing-target-bgp-ser-peer 1.
      - case 2: missing-target-bgp-ser-peer 1.
    - Current PC port/lag `realMissingTarget` by reason:
      - case 1: lag missing-target-lag-members-with-description 4; port missing-target-disabled-port 65, missing-target-active-port-with-description 1.
      - case 2: lag missing-target-lag-members-with-description 6; port missing-target-disabled-port 67, missing-target-active-port-with-description 3.
    - Current PC interface `realMissingTarget` by reason:
      - case 1: missing-target-address-with-description-evidence 20, missing-target-gre-address 16, missing-target-system-loopback-address 2.
      - case 2: missing-target-address-with-description-evidence 20, missing-target-gre-address 16, missing-target-system-loopback-address 2.
      - The 20 description-evidence rows are `to-mnt#*` disappearing circuits from 10G -> 100G change; keep unmatched unless target interface IP exists.
    - Current PC PIM `realMissingTarget` by reason:
      - case 1: missing-target-pim-config-with-interface-evidence 4, missing-target-type 4.
      - case 2: missing-target-pim-config-with-interface-evidence 4, missing-target-type 4.
  - Summary dashboard now shows MVP section cards for Interface / Static-route / BGP neighbor.
  - Section cards show total, matched, review-needed, changed, missing, added, and average overlap.
  - Clicking a section card reuses the existing object type filter flow.
  - Export report now downloads real `.xlsx` multi-sheet workbook with fixed columns:
    - section, old object, new object, status, field, old value, new value, reason, severity, action needed.
  - Excel export suppresses ignored/structure-converted/inheritance-unresolved noise by default and keeps changed/missing/added/review-needed separate.
  - Smoke contracts added:
    - `Excel 저장` is a visible text button, not icon-only.
    - Export click path builds XLSX workbook, writes `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, and updates status.
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
- Real `.xlsx` multi-sheet export is implemented; CSV builder remains for compatibility.
- Continue fixture result drill-down from realMissingTarget counts.
- Current PC fixture case 1/2 full/static lowConfidence is 0 after static-route prefix candidate score adjustment.
- Current PC fixture case 1/2 static unmatchedMatcherIssue is 0 after old-only static routes without target prefix are classified as realMissingTarget.
- Current PC fixture case 1/2 interface/port/lag/full unmatchedMatcherIssue is 0 after target-evidence classification and Classic interface stub merge.
- Current PC fixture case 1/2 full parserGap is 0 after policy placeholder target-identity classification.
- Added full MD-CLI `MDconfig.log` / `MDfullcontext.log` check. Case 1/2 block and one-line full logs now have unmatchedMatcherIssue 0, parserGap 0, lowConfidence 0. This is automated by `node scripts/validateCompareFixtures.js --all-cases --md-full-logs --iterations 1`.
- Full MD-CLI `gre-source` -> `gre-source-1` is Nokia-only primary redundancy conversion and auto-matches by `nokia-gre-source-primary-conversion`; `gre-source-2` remains new-only redundancy.
- Continue fixture result drill-down from remaining realMissingTarget groups or UI polish.
