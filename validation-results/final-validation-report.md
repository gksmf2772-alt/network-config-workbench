# Final Validation Report
Generated: 2026-05-18T12:20:30.215Z
## 1. Repository Validation Inventory
- configs found: 31
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
- Nokia Classic→MD-CLI: old objects 549, new objects 349
- eligible lines 11841, recognized 11084, unsupported 757
- router-log wrapper lines 123, source-line mapping ok
- Synthetic Juniper smoke: old objects 5, new objects 3, unsupported 1
## 4. Semantic Comparison Results
- matched 118, unmatched source 351, unmatched target 156
- ambiguous 20, low-confidence 62, field overlap 40%
- semantic line coverage 94%, suppressed/ignored lines 62
## 5. Exception/Policy Validation
- ignored fields 288
- active audit findings 572, suppressed audit findings 60
- ignored/suppressed items are separated from active risk in Summary/Report/Graph validation.
## 6. Standards Audit Results
- QoS/policy/routing/service/security categories: {"qos":214,"filter-acl":190,"routing-bgp":224,"management-security":4}
- migration impacts: {"manual-conversion-required":396,"target-default-risk":116,"review-before-migration":120}
- total findings 632, active 572, suppressed 60
## 7. Summary/Compare/Report/Graph Consistency
- compare: passed (2 passed, 1 blocked, 0 failed)
- audit: passed (2 passed, 1 blocked, 0 failed)
- report: passed (2 passed, 1 blocked, 0 failed)
- graph: passed (2 passed, 1 blocked, 0 failed)
- primary graph nodes 415, edges 308, invalid edges 0
- compare HTML length 8862521, undefined false, NaN false
## 8. Migration/Generation Validation
- migration readiness: manual-review
- generation validation: not-applicable
- target-default-risk 116, manual-review objects 516
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
- unmatched: source 351, target 156, weak mappings 80
- full source objects: 549, target fixture objects: 349
- Target fixture 범위 밖 미매칭: 272
- Matcher 개선 필요: 161
- Parser 미지원 가능성: 24
- 실제 누락 가능성: 50
- line accounting: eligible 11841, recognized 11084, parser-unmapped 757, ignored/suppressed 62, wrapper 123
- active findings: 572, suppressed 60
- blocks auto-generation: 0
- conversion policy required: 0
- blocks drill-down: baseline 71, current 0, resolved 71, parser extension 0, target fixture completion 0, actual config correction 0
- conversion policy drill-down: total 0, static-route rewrite candidates 59, SAP/service mapping 0, QoS/filter mapping 0, vendor default policy 0
- actual missing drill-down: total 50, true missing 0, target-only 50, outside scope 0, parser/matcher false negative 0, manual mapping possible 0
- matcher effectiveness: port/LAG candidates 18, SAP candidates 0, static-route manual-review candidates 59, false exact match prevention 59
- mode/scope validation: passed, simple compare active 0, BGP-only active 0, standards active 5, migration active 0, suppressed 3
- matcher status: port/LAG rename, SAP parent relationship, static-route next-hop conversion policy handling added.
- parser improvement: Classic indirect/tunnel-next-hop static route extraction added; static-route next-hop blockers removed.
- parser backlog groups: 7
- advanced policy files: validation/policies/classic15-mdcli22-advanced-policy.json, validation/policies/classic15-mdcli22-line-exceptions.json, validation/policies/classic15-mdcli22-field-aliases.json
- high unmatched count is expected from partial feature-split target fixtures, not a parser crash.
- detail reports: validation-results/unmatched-analysis.md, unsupported-line-analysis.md, finding-priority-analysis.md, fixture-completeness-analysis.md, parser-backlog.md, blocks-auto-generation-analysis.md, conversion-policy-required-analysis.md, actual-missing-analysis.md, matcher-effectiveness-analysis.md, mode-scope-validation.md

## 13. Profile Exception Application
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

## 14. Object Review Grouping
- active profile: object-review-grouping-fixture
- object groups before: 2
- object groups after profile exception: 2
- active issues: 6 -> 4
- suppressed issues: 0 -> 2
- profile-suppressed issues: 0 -> 2
- invariant oneRowPerObjectBefore: true
- invariant groupSuppressedAcrossObjects: true
- invariant stateDescriptionRemainActive: true
- detail reports: validation-results/object-review-grouping.md, validation-results/object-review-grouping.json

## 15. Field Issue Dedupe
- status: passed
- duplicate field rows before: 1
- duplicate field rows after: 0
- description duplicate count: 2 -> 1
- description row active/suppressed: 1/1
- suppressed-only group excluded from active rows: true
- detail reports: validation-results/field-issue-dedupe.md, validation-results/field-issue-dedupe.json
