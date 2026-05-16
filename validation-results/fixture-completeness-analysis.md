# Fixture Completeness Analysis

Generated: 2026-05-16T17:03:55.396Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- status: partial-assembled-target
- high unmatched expected: true
- source: 예제 및 테스트 설정/Gangbuk-SEA028_config.txt
- target files: 예제 및 테스트 설정/New_bgp_1.txt, 예제 및 테스트 설정/New_static_1.txt, 예제 및 테스트 설정/New_interface_1.txt, 예제 및 테스트 설정/New_lag_1.txt, 예제 및 테스트 설정/New_port_1.txt, 예제 및 테스트 설정/New_PIM_1.txt
- feature files used: bgp, static, interface, lag, port, PIM
- advanced policy files: validation/policies/classic15-mdcli22-advanced-policy.json, validation/policies/classic15-mdcli22-line-exceptions.json, validation/policies/classic15-mdcli22-field-aliases.json
- conclusion: The current validation compares one full Classic router log against an assembled set of feature-split MD-CLI target files. Large unmatched counts are expected; category-specific failures still need analysis.

## Object Coverage By Type
- bgp: source 57, target 56, matched 56, candidate 0, status source-heavy-partial-target
- community: source 9, target 0, matched 0, candidate 0, status target-policy-definition-missing-or-parser-gap
- cpu-protection: source 0, target 25, matched 0, candidate 0, status target-only-fixture-object
- default-host: source 25, target 25, matched 0, candidate 0, status key-normalization-or-manual-map-required
- dhcp: source 0, target 27, matched 0, candidate 0, status target-only-fixture-object
- filter: source 32, target 5, matched 1, candidate 0, status source-heavy-partial-target
- group-interface: source 27, target 25, matched 0, candidate 0, status source-heavy-partial-target
- interface: source 96, target 37, matched 4, candidate 1, status source-heavy-partial-target
- lag: source 58, target 58, matched 0, candidate 0, status key-normalization-or-manual-map-required
- pim: source 0, target 50, matched 0, candidate 0, status target-only-fixture-object
- port: source 148, target 63, matched 0, candidate 0, status source-heavy-partial-target
- prefix-list: source 7, target 0, matched 0, candidate 0, status target-policy-definition-missing-or-parser-gap
- qos-policy: source 13, target 1, matched 0, candidate 0, status source-heavy-partial-target
- route-policy: source 8, target 0, matched 0, candidate 0, status target-policy-definition-missing-or-parser-gap
- sap: source 95, target 62, matched 0, candidate 0, status source-heavy-partial-target
- static-host: source 1, target 25, matched 0, candidate 0, status target-heavy-generated-or-extra
- static-route: source 68, target 70, matched 0, candidate 59, status target-heavy-generated-or-extra
- sub-sla-mgmt: source 25, target 25, matched 0, candidate 0, status key-normalization-or-manual-map-required
- subscriber-interface: source 27, target 25, matched 0, candidate 0, status source-heavy-partial-target

## Improvement Targets
- Port and LAG identity changed between Classic and MD-CLI; manual mapping or hardware rename mapping is required.
- SAP and service objects include parent/interface key differences; relationship-aware matching needs improvement.
- Filter/QoS/route-policy definitions are placeholder parsed; body parser coverage should be expanded.
- Static routes with same prefix but changed next-hop stay as candidates; conversion policy is required before auto-generation.
