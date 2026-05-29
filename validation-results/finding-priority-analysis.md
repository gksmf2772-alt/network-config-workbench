# Finding Priority Analysis

Generated: 2026-05-29T14:11:42.323Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- total findings: 528
- active findings: 469
- suppressed findings: 59
- blocks auto-generation: 0
- conversion policy required: 0
- parser partial support: 409
- conclusion: Findings are dominated by missing QoS/policy references, BGP policy requirements, SAP relationship gaps, and target default risk. Most are actionable migration-readiness blockers or conversion-policy inputs, not parser crash symptoms.

## Top 20 Priority
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.16.30/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.17.30/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.22.53/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.22.57/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.22.61/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.16.226/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.24.93/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.24.85/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.24.97/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.24.9/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.16.230/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.16.54/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.17.54/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.16.150/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.16.154/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.16.6/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.17.6/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.22.89/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.23.33/30
- 160 manual-review/manual-conversion-required filter.parser-partial interface:112.188.24.61/30

## Top Duplicated Rules
- qos.policy-parser-partial: active 214, suppressed 0, total 214
- filter.parser-partial: active 182, suppressed 0, total 182
- bgp.max-prefix-required: active 57, suppressed 0, total 57
- filter.default-action-missing: active 8, suppressed 0, total 8
- bgp.group-inheritance-unresolved: active 5, suppressed 56, total 61
- security.cpu-protection-coverage: active 1, suppressed 1, total 2
- security.management-acl-review: active 1, suppressed 1, total 2
- static-route.default-review: active 1, suppressed 0, total 1
- bgp.neighbor-description-required: active 0, suppressed 1, total 1
