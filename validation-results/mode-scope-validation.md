# Mode/Scope Validation

Generated: 2026-05-18T12:21:00.170Z
Status: passed

## Summary
- cases: 8
- passed: 8
- failed: 0
- simple compare active findings: 0
- BGP-neighbor-only active findings: 0
- standards-audit active findings: 5
- migration-readiness active findings: 0
- suppressed/ignored findings: 3

## Cases
- simple-bgp-neighbor-compare: passed (4/4) {"simpleCompareActiveFindings":0,"bgpNeighborOnlyActiveFindings":0}
- classic-direct-to-mdcli-group-equivalent: passed (5/5) {"status":"matched","policyViolationCount":0}
- mdcli-group-reference-missing-definition: passed (4/4) {"inheritanceStatus":"inheritance-unresolved","policyViolationCount":0}
- standards-audit-bgp-policy-not-required: passed (2/2) {"activeFindings":3}
- standards-audit-bgp-policy-required: passed (2/2) {"activeFindings":5}
- migration-readiness-visible-only-in-mode: passed (1/1) {"migrationReadinessActiveFindings":0,"targetDefaultRisk":0}
- new-line-exception-suppresses-downstream: passed (6/6) {"suppressedFindings":3,"summaryActiveFindings":0}
- manual-mapping-plus-exception: passed (4/4) {"matched":1,"policyViolationCount":0}
