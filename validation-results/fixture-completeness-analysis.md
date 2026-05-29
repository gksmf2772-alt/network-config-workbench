# Fixture Completeness Analysis

Generated: 2026-05-29T14:11:42.323Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- status: partial-assembled-target
- high unmatched expected: true
- source: 예제 및 테스트 설정/Gangbuk-SEA028_config.txt
- target files: 예제 및 테스트 설정/New_bgp_2.txt, 예제 및 테스트 설정/New_static_2.txt, 예제 및 테스트 설정/New_interface_2.txt, 예제 및 테스트 설정/New_lag_2.txt, 예제 및 테스트 설정/New_port_2.txt, 예제 및 테스트 설정/New_PIM_2.txt
- feature files used: bgp, static, interface, lag, port, PIM
- advanced policy files: validation/policies/classic15-mdcli22-advanced-policy.json, validation/policies/classic15-mdcli22-line-exceptions.json, validation/policies/classic15-mdcli22-field-aliases.json
- conclusion: The current validation compares one full Classic router log against an assembled set of feature-split MD-CLI target files. Large unmatched counts are expected; category-specific failures still need analysis.

## Object Coverage By Type
- bgp: source 57, target 56, matched 56, candidate 0, status source-heavy-partial-target
- community: source 6, target 0, matched 0, candidate 0, status target-policy-definition-missing-or-parser-gap
- interface: source 71, target 37, matched 33, candidate 0, status source-heavy-partial-target
- lag: source 58, target 58, matched 56, candidate 0, status balanced
- pim: source 55, target 50, matched 48, candidate 0, status source-heavy-partial-target
- port: source 146, target 63, matched 56, candidate 0, status source-heavy-partial-target
- prefix-list: source 7, target 0, matched 0, candidate 0, status target-policy-definition-missing-or-parser-gap
- route-policy: source 8, target 0, matched 0, candidate 0, status target-policy-definition-missing-or-parser-gap
- static-route: source 68, target 60, matched 60, candidate 0, status source-heavy-partial-target
- subscriber-interface: source 27, target 27, matched 27, candidate 0, status balanced

## Improvement Targets
- Port and LAG identity changed between Classic and MD-CLI; manual mapping or hardware rename mapping is required.
- SAP and service objects include parent/interface key differences; relationship-aware matching needs improvement.
- Filter/QoS/route-policy definitions are placeholder parsed; body parser coverage should be expanded.
- Static routes with same prefix but changed next-hop stay as candidates; conversion policy is required before auto-generation.
