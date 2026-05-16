# Finding Priority Analysis

Generated: 2026-05-16T17:03:55.394Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- total findings: 682
- active findings: 623
- suppressed findings: 59
- blocks auto-generation: 66
- conversion policy required: 163
- parser partial support: 58
- conclusion: Findings are dominated by missing QoS/policy references, BGP policy requirements, SAP relationship gaps, and target default risk. Most are actionable migration-readiness blockers or conversion-policy inputs, not parser crash symptoms.

## Top 20 Priority
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-mnc#1-1/2/1/c17/1
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-mnc#1-1/2/1/c17/1
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-mnc#1-2/4/1/c17/1
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-mnc#1-2/4/1/c17/1
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-mnc#2-1/2/2/c17/1
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-mnc#2-1/2/2/c17/1
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-mnc#2-2/4/2/c17/1
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-mnc#2-2/4/2/c17/1
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-pe#1-1/lag-p-2113
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-pe#1-2/lag-p-2115
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-pe#2-1/lag-p-2213
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-pe#2-2/lag-p-2215
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-icod#1-1/lag-i-2114
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-icod#1-2/lag-i-2116
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-icod#2-1/lag-i-2214
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-icod#2-2/lag-i-2216
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-gongneug-tou-fg19/lag-b-6205
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-dobong-tou-fd09/lag-b-6211
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-dobong-tou-fb06/lag-b-6208
- 215 critical/blocks-auto-generation qos.referenced-policy-undefined sap:100/to-dobong-tou-fb07/lag-b-6209

## Top Duplicated Rules
- qos.sap-ingress-required: active 149, suppressed 0, total 149
- service.sap-relationship-incomplete: active 107, suppressed 0, total 107
- qos.referenced-policy-undefined: active 66, suppressed 0, total 66
- bgp.max-prefix-required: active 57, suppressed 0, total 57
- bgp.import-policy-required: active 53, suppressed 0, total 53
- bgp.export-policy-required: active 53, suppressed 0, total 53
- filter.default-action-missing: active 45, suppressed 0, total 45
- subscriber.dhcp-group-missing: active 27, suppressed 0, total 27
- service.group-subscriber-missing: active 25, suppressed 0, total 25
- qos.sap-egress-required: active 20, suppressed 0, total 20
- qos.defined-policy-unused: active 11, suppressed 0, total 11
- qos.sap-ingress-egress-asymmetry: active 4, suppressed 0, total 4
- bgp.group-inheritance-unresolved: active 2, suppressed 56, total 58
- security.management-acl-review: active 1, suppressed 1, total 2
- static-route.default-review: active 1, suppressed 0, total 1
- subscriber.static-host-abnormal: active 1, suppressed 0, total 1
- security.cpu-protection-coverage: active 1, suppressed 0, total 1
- bgp.neighbor-description-required: active 0, suppressed 2, total 2
