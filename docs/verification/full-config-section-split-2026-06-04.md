# Full Config Section Split Verification - 2026-06-04

## Scope

- Fix compare-pane section leakage when whole device configs are pasted into old/new inputs.
- Preserve the existing compare-pane line rendering and section tab UI.
- Verify that each section tab renders only its own object types and that both old/new panes remain populated.

## Fixture

- Old: `Gangbu-SEA027H_config.txt`
- New: `2026-05-28_15-13-31_Dobong-SEA027H_*_MDconfig.log`
- Fixture directory: sibling `자료/테스트 config`.

## Result

- BGP tab renders only `bgp` rows.
- BGP tab no longer contains `bgp:bgp`, `bgp-peers`, or wildcard `.*` object keys.
- PIM tab renders only PIM section interfaces.
- MD-CLI PIM parsing no longer consumes following service `interface`/`sap` blocks.
- Full-device config comparison uses normalized vendor parser objects for large/multi-section inputs, then adapts them into the existing compare-pane row model.
- Policy tab renders policy-family rows from narrow `filter`, `prefix-list`, and `route-policy` starts.
- Interface, Static Route, Port, LAG, and Service/SAP rendered rows stay within their section object types.

## Commands

- `node --check src/core/legacyCore.js`: pass.
- `node --check src/core/parsers/nokiaMdCliParser.js`: pass.
- `node --test tests/comparison-exclusion.test.js tests/static-route-object-key.test.js`: pass, 46 tests.
- `npm.cmd run validate:compare:fixtures -- --fixture-dir "..\자료\테스트 config" --md-full-logs --case 1 --iterations 1`: pass.
- `npm.cmd test`: pass, 229 pass / 1 skip.
- `npm.cmd run build`: pass with existing Vite chunk-size warning.

## Browser DOM Audit

- Tool: clean headless Chrome via CDP on `http://127.0.0.1:9333/`.
- App URL: `http://127.0.0.1:5173/?full-config-final-b64-simple=1780558243570`.
- All comparison status: `차이 910건`.
- BGP: old `342` / new `342`, types `bgp` only, suspicious text `0`.
- Static Route: old `589` / new `589`, types `static-route` only.
- Port and LAG are now separate section tabs. The previous combined Port/LAG verification had old `5597` / new `5597` rows with types `port`, `lag` only.
- Service/SAP: old `1985` / new `1985`, types `subscriber-interface`, `sap` only.
- PIM: old `124` / new `124`, types `pim` only, suspicious `sap`/`service`/`router` text `0`.
- Policy: old `56` / new `56`, types `filter`, `route-policy`, `prefix-list`, `community` only.
- Interface: old `2496` / new `2496`, types `interface` only.

## Screenshots

- `docs/verification/screenshots/2026-06-04/full-config-section-split/after-bgp-rows.png`
- `docs/verification/screenshots/2026-06-04/full-config-section-split/after-pim-rows.png`
- `docs/verification/screenshots/2026-06-04/full-config-section-split/after-policy-rows.png`
- `docs/verification/screenshots/2026-06-04/full-config-section-split/after-full-config-bgp-final.png`
- `docs/verification/screenshots/2026-06-04/port-lag-tab-split/after-port-lag-split.png`

## Remaining Risk

- Policy parsing is intentionally narrow. Broad matching for `community`, bare `filter`, or `port-list` should not be added casually because those words appear in unrelated sections.
