# Blocks Auto-Generation Analysis

Generated: 2026-05-16T17:03:55.397Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- baseline total: 71
- total: 66
- resolved from baseline: 5
- parser extension: 0
- conversion policy: 66
- target fixture completion: 66
- actual config correction: 0
- conclusion: Remaining blocks are undefined target policy references. Classic indirect static-route next-hop parser gaps are resolved in this pass.

## By Rule
- qos.referenced-policy-undefined: 66

## By Resolution
- conversion policy: 66
- target fixture completion: 66

## Resolved From Baseline
- static-route.next-hop-invalid: 5, Classic indirect/tunnel-next-hop static routes now preserve next-hop for audit/migration review.

## Top Items
- qos.referenced-policy-undefined new sap:100/to-mnc#1-1/2/1/c17/1 field=ingress.qos.sap-ingress.policy-name value=SEA_IN -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-mnc#1-1/2/1/c17/1 field=egress.qos.sap-egress.policy-name value=SEA_CORE_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-mnc#1-2/4/1/c17/1 field=ingress.qos.sap-ingress.policy-name value=SEA_IN -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-mnc#1-2/4/1/c17/1 field=egress.qos.sap-egress.policy-name value=SEA_CORE_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-mnc#2-1/2/2/c17/1 field=ingress.qos.sap-ingress.policy-name value=SEA_IN -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-mnc#2-1/2/2/c17/1 field=egress.qos.sap-egress.policy-name value=SEA_CORE_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-mnc#2-2/4/2/c17/1 field=ingress.qos.sap-ingress.policy-name value=SEA_IN -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-mnc#2-2/4/2/c17/1 field=egress.qos.sap-egress.policy-name value=SEA_CORE_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-pe#1-1/lag-p-2113 field=ingress.qos.sap-ingress.policy-name value=SEA_IN -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-pe#1-2/lag-p-2115 field=ingress.qos.sap-ingress.policy-name value=SEA_IN -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-pe#2-1/lag-p-2213 field=ingress.qos.sap-ingress.policy-name value=SEA_IN -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-pe#2-2/lag-p-2215 field=ingress.qos.sap-ingress.policy-name value=SEA_IN -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-icod#1-1/lag-i-2114 field=egress.qos.sap-egress.policy-name value=SEA_CORE_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-icod#1-2/lag-i-2116 field=egress.qos.sap-egress.policy-name value=SEA_CORE_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-icod#2-1/lag-i-2214 field=egress.qos.sap-egress.policy-name value=SEA_CORE_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-icod#2-2/lag-i-2216 field=egress.qos.sap-egress.policy-name value=SEA_CORE_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-gongneug-tou-fg19/lag-b-6205 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-dobong-tou-fd09/lag-b-6211 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-dobong-tou-fb06/lag-b-6208 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-dobong-tou-fb07/lag-b-6209 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-dobong-tou-fb08/lag-b-6210 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-dobong-tou-fb02/lag-b-4202 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-dobong-tou-fd08/lag-b-6203 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-dobong-tou-fd13/lag-b-6204 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-dobong-tou-fd22/lag-b-6201 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-gangbuk-tou-fk56/lag-b-6212 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-gongneug-tou-fg11/lag-b-6206 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-gongneug-tou-fg12/lag-b-8201 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-dobong-tou-fb01/lag-b-2206 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
- qos.referenced-policy-undefined new sap:100/to-dobong-tou-fd04/lag-b-2204 field=egress.qos.sap-egress.policy-name value=SEA_ACCESS_OUT -> target fixture completion, conversion policy
