# Final Validation Report
Generated: 2026-05-29T14:11:36.570Z
## 1. Repository Validation Inventory
- configs found: 2
- profiles found: 2
- policies found: 3
- sessions found: 1
- ambiguous/missing inputs: 4 ambiguous, 1 missing
## 2. Validation Cases
- juniper-to-nokia-mdcli-22: blocked (missing-source-config)
- synthetic-juniper-set-smoke: passed synthetic smoke
- nokia-classic15-to-nokia-mdcli-22: passed
### Juniper → Nokia MD-CLI 22
- Status: blocked
- Reason: Juniper source config not found in repository
- Searched paths: examples, example, samples, sample, fixtures, fixture, tests, test, validation, configs, config, profiles, presets, sessions, data, public, src, scripts, 예제 및 테스트 설정, .
- Synthetic smoke test: passed
- Required files: source-juniper.conf, target-nokia-mdcli22.conf, profile.json, exceptions.json, audit-profile.json, manual-mappings.json
- Not counted as passed
### Nokia Classic CLI 15 → Nokia MD-CLI 22
- Status: passed
## 3. Parser Results
- Nokia Classic→MD-CLI: old objects 503, new objects 351
- eligible lines 11844, recognized 7556, unsupported 4288
- router-log wrapper lines 123, source-line mapping ok
- Synthetic Juniper smoke: old objects 5, new objects 4, unsupported 0
## 4. Semantic Comparison Results
- matched 336, unmatched source 167, unmatched target 15
- ambiguous 0, low-confidence 0, field overlap 66%
- semantic line coverage 64%, suppressed/ignored lines 62
## 5. Exception/Policy Validation
- ignored fields 230
- active audit findings 469, suppressed audit findings 59
- ignored/suppressed items are separated from active risk in Summary/Report/Graph validation.
## 6. Standards Audit Results
- QoS/policy/routing/service/security categories: {"qos":214,"filter-acl":190,"routing-bgp":120,"management-security":4}
- migration impacts: {"manual-conversion-required":396,"target-default-risk":10,"review-before-migration":122}
- total findings 528, active 469, suppressed 59
## 7. Summary/Compare/Report/Graph Consistency
- compare: passed (2 passed, 1 blocked, 0 failed)
- audit: passed (2 passed, 1 blocked, 0 failed)
- report: passed (2 passed, 1 blocked, 0 failed)
- graph: passed (2 passed, 1 blocked, 0 failed)
- primary graph nodes 407, edges 300, invalid edges 0
- compare HTML length 6307665, undefined false, NaN false
## 8. Migration/Generation Validation
- migration readiness: manual-review
- generation validation: not-applicable
- target-default-risk 10, manual-review objects 518
- full config generation is not implemented; no generation success was claimed.
## 9. Build/Test Results
- npm.cmd test: passed
- npm.cmd run build: passed
- npm.cmd run validate:compare:fixtures: passed
- npm.cmd run validate:profile-exceptions: passed
- npm.cmd run validate:object-review: passed
- npm.cmd run validate:field-dedupe: passed
- validate:compare: passed
- validate:audit: passed
- validate:report: passed
- validate:graph: passed
## 10. Remaining Limitations
- Juniper 실제 설정 기반 검증은 source-juniper.conf 추가 전까지 blocked 상태입니다.
- Synthetic Juniper smoke fixture는 production migration/comparison pass로 계산하지 않습니다.
- Config generation/migration 엔진은 아직 구현되지 않아 migration-readiness만 검증합니다.
- Filter/QoS/route-policy 본문 파싱은 placeholder/부분 지원이며 manual-review finding으로 추적합니다.
- UI smoke는 별도 브라우저 테스트 프레임워크 없이 pure data helper 기준으로 검증했습니다.

## 11. Validation Quality Analysis
- fixture completeness: partial-assembled-target
- high unmatched expected: true
- unmatched: source 167, target 15, weak mappings 0
- full source objects: 503, target fixture objects: 351
- in target scope: 482, outside target scope: 21
- Target fixture 범위 밖 미매칭: 144
- Matcher 개선 필요: 0
- Parser 미지원 가능성: 0
- 실제 누락 가능성: 23
- target-only objects: 15
- line accounting: eligible 11844, recognized 7556, parser-unmapped 4288, ignored/suppressed 62, wrapper 123
- active findings: 469, suppressed 59
- blocks auto-generation: 0
- conversion policy required: 0
- blocks drill-down: baseline 71, current 0, resolved 71, parser extension 0, target fixture completion 0, actual config correction 0
- conversion policy drill-down: total 0, static-route rewrite candidates 0, SAP/service mapping 0, QoS/filter mapping 0, vendor default policy 0
- actual missing drill-down: total 38, true missing 23, target-only 15, outside scope 0, parser/matcher false negative 0, manual mapping possible 0
- matcher effectiveness: port/LAG candidates 0, SAP candidates 0, static-route manual-review candidates 0, false exact match prevention 0
- mode/scope validation: passed, simple compare active 0, BGP-only active 0, standards active 5, migration active 0, suppressed 3
- matcher status: port/LAG rename, SAP parent relationship, static-route next-hop conversion policy handling added.
- parser improvement: Classic indirect/tunnel-next-hop static route extraction added; static-route next-hop blockers removed.
- parser backlog groups: 7
- advanced policy files: validation/policies/classic15-mdcli22-advanced-policy.json, validation/policies/classic15-mdcli22-line-exceptions.json, validation/policies/classic15-mdcli22-field-aliases.json
- high unmatched count is expected from partial feature-split target fixtures, not a parser crash.
- detail reports: validation-results/unmatched-analysis.md, unsupported-line-analysis.md, finding-priority-analysis.md, fixture-completeness-analysis.md, parser-backlog.md, blocks-auto-generation-analysis.md, conversion-policy-required-analysis.md, actual-missing-analysis.md, matcher-effectiveness-analysis.md, mode-scope-validation.md

## 12. Profile Exception Application
- active profile: profile-exception-application-fixture
- loaded profile exceptions: 1
- matched exception IDs: ex-profile-bgp-group-added-mdcli
- active issues: 6 -> 4
- suppressed issues: 0 -> 2
- BGP group active issues: 2 -> 0
- profile-suppressed BGP group issues: 0 -> 2
- admin-state active issues kept: 2
- invariant profileGroupSuppressed: true
- invariant adminStateStillActive: true
- detail reports: validation-results/profile-exception-application.md, validation-results/profile-exception-application.json

## 13. Object Review Grouping
- active profile: object-review-grouping-fixture
- object groups before: 2
- object groups after profile exception: 2
- active issues: 4 -> 4
- suppressed issues: 2 -> 2
- profile-suppressed issues: 0 -> 2
- invariant oneRowPerObjectBefore: true
- invariant groupSuppressedAcrossObjects: true
- invariant stateDescriptionRemainActive: true
- detail reports: validation-results/object-review-grouping.md, validation-results/object-review-grouping.json

## 14. Field Issue Dedupe
- status: passed
- duplicate field rows before: 1
- duplicate field rows after: 0
- description duplicate count: 2 -> 1
- description row active/suppressed: 1/1
- suppressed-only group excluded from active rows: true
- detail reports: validation-results/field-issue-dedupe.md, validation-results/field-issue-dedupe.json
