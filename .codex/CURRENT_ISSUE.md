# Current Issue

## MVP core comparison stabilization

Affected stability-map boundary:
- `src/core/comparisonPlan.js` field visibility only.
- `tests/mvp-core-scope.test.js` MVP contract coverage.
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
- Summary/report/graph count checked: no count logic changes.
- Diff scroll sync checked: untouched.
- Line connector rendering checked: untouched.
- Tests run: npm.cmd run guard:legacy-core pass; npm.cmd test pass; npm.cmd run build pass.

## Current implementation facts

- Product goal is documented in `docs/mvp-product-definition.md`.
- Development priority is documented in `docs/mvp-development-priority.md`.
- Handoff is documented in `.codex/HANDOFF.md` and `docs/mvp-implementation-handoff.md`.
- MVP contract tests are in `tests/mvp-core-scope.test.js`.
- Only runtime change in this step: `interface` is now a visible compare field.

## Next work

Do not start UI work first.

Next code work must follow:
1. Pick one MVP area: Interface, Static-route, or BGP neighbor.
2. Add a failing contract test from real config behavior.
3. Fix parser/normalizer/matcher minimally.
4. Run `npm.cmd run guard:legacy-core`, `npm.cmd test`, `npm.cmd run build`.
