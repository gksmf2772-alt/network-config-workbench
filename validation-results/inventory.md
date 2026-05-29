# Validation Inventory

Generated: 2026-05-29T14:11:31.870Z

## Searched Paths
- examples
- example
- samples
- sample
- fixtures
- fixture
- tests
- test
- validation
- configs
- config
- profiles
- presets
- sessions
- data
- public
- src
- scripts
- 예제 및 테스트 설정
- .

## Found Config Files
- validation/fixtures/synthetic/juniper-set-smoke.conf (juniper-set, set) [synthetic]
- validation/fixtures/synthetic/nokia-mdcli22-smoke.conf (nokia-md-cli, md-cli) [synthetic]

## Found Old/Source Files
- validation/fixtures/synthetic/juniper-set-smoke.conf (juniper-set, set) [synthetic]

## Found New/Target Files
- validation/fixtures/synthetic/nokia-mdcli22-smoke.conf (nokia-md-cli, md-cli) [synthetic]

## Found Profiles
- validation/profiles/nokia-classic15-mdcli22-profile.json
- validation/profiles/synthetic-juniper-smoke-profile.json

## Found Presets
- scripts/validate-object-review-grouping.mjs
- scripts/validate-profile-exceptions.mjs
- scripts/validateCompareFixtures.js
- scripts/validationWorkflow.mjs
- src/adapters/legacyProfileAdapter.js
- src/core/comparisonPlan.js
- src/core/legacyCore.js
- src/core/profile.js
- src/core/summaryRenderer.js
- src/core/vendorPresets.js
- tests/policy-coverage.test.js
- tests/static-route-object-key.test.js

## Found Exception/Ignore Policies
- validation/policies/classic15-mdcli22-line-exceptions.json

## Found Advanced Compare Policies
- validation/policies/classic15-mdcli22-advanced-policy.json
- validation/policies/classic15-mdcli22-field-aliases.json

## Found Standards Audit Profiles
- scripts/analyze-validation-quality.mjs
- src/core/analysisModes.js
- src/core/legacyState.js
- src/core/standardsAudit.js
- src/core/summaryAnalytics.js
- tests/bgp-effective-neighbor.test.js
- tests/mode-scope-policy.test.js
- tests/standards-audit.test.js
- validation/compare-validation.manifest.json

## Found Saved Sessions
- src/core/legacySelectors.js

## Found Manual Mapping Data
- scripts/check-legacy-core-guardrail.js
- src/core/comparator.js
- src/core/manualMapping.js
- src/core/matchers/objectMatcher.js
- tests/compare-golden-regression.test.js
- tests/fixture-validation-script.test.js
- validation/fixtures/juniper-to-nokia-mdcli22/README.md

## Unknown Or Ambiguous Files
- src/core/profileBackup.js
- src/core/profileEditor.js
- tests/profile-editor.test.js
- vite.config.js

## Missing Inputs
- juniper-source-config: Juniper 원본 설정 파일이 없어 실제 비교 검증을 수행할 수 없습니다.
