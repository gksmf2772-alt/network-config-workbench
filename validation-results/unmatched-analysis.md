# Unmatched Object Analysis

Generated: 2026-05-17T11:01:25.320Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- matched: 61
- unmatched source: 575
- unmatched target: 447
- low confidence: 60
- field overlap: 29%
- fixture scope: partial-assembled-target
- full source objects: 696
- target fixture objects: 579
- source objects in target scope: 672
- source objects outside target scope: 24
- Target fixture 범위 밖 미매칭: 389
- Matcher 개선 필요: 449
- Parser 미지원 가능성: 73
- 실제 누락 가능성: 111
- conclusion: High unmatched count is expected for this fixture set because the MD-CLI target is a partial feature-split target, but port/LAG/SAP rename mapping and service parent matching also need matcher or manual-map work.

## By Reason
- target fixture is partial: 389
- object key normalization mismatch: 273
- parent/relationship mismatch: 176
- target object has no source counterpart: 102
- parser gap: 73
- source object has no target counterpart: 9

## By Type/Side
- old:port: 148
- old:sap: 95
- old:interface: 91
- new:port: 63
- new:sap: 62
- new:lag: 58
- old:lag: 58
- new:pim: 50
- new:interface: 32
- old:filter: 31
- new:dhcp: 27
- old:group-interface: 27
- old:subscriber-interface: 27
- new:cpu-protection: 25
- new:default-host: 25
- new:group-interface: 25
- new:static-host: 25
- new:sub-sla-mgmt: 25
- new:subscriber-interface: 25
- old:default-host: 25
- old:sub-sla-mgmt: 25
- old:qos-policy: 13
- old:community: 9
- old:static-route: 9
- old:route-policy: 8
- old:prefix-list: 7
- new:filter: 4
- new:qos-policy: 1
- old:bgp: 1
- old:static-host: 1

## Weak Mappings
- static-route: static-route:112.188.30.19/32|112.188.22.198 -> static-route:112.188.30.19/32|112.188.21.198, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.64/32|112.188.22.90 -> static-route:112.188.30.64/32|112.188.21.90, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.65/32|112.188.28.94 -> static-route:112.188.30.65/32|112.188.27.94, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.66/32|112.188.28.98 -> static-route:112.188.30.66/32|112.188.27.98, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.67/32|112.188.28.102 -> static-route:112.188.30.67/32|112.188.27.102, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.68/32|112.188.28.106 -> static-route:112.188.30.68/32|112.188.27.106, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.69/32|112.188.28.134 -> static-route:112.188.30.69/32|112.188.27.134, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.71/32|112.188.28.138 -> static-route:112.188.30.71/32|112.188.27.138, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.111/32|112.188.24.58 -> static-route:112.188.30.111/32|112.188.23.58, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.112/32|112.188.24.50 -> static-route:112.188.30.112/32|112.188.23.50, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.113/32|112.188.24.54 -> static-route:112.188.30.113/32|112.188.23.54, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.115/32|112.188.23.34 -> static-route:112.188.30.115/32|112.188.24.34, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.116/32|112.188.24.62 -> static-route:112.188.30.116/32|112.188.23.62, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.117/32|112.188.24.66 -> static-route:112.188.30.117/32|112.188.23.66, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.118/32|112.188.24.70 -> static-route:112.188.30.118/32|112.188.23.70, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.119/32|112.188.24.6 -> static-route:112.188.30.119/32|112.188.23.6, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.121/32|112.188.24.170 -> static-route:112.188.30.121/32|112.188.23.170, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.122/32|112.188.24.122 -> static-route:112.188.30.122/32|112.188.23.122, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.123/32|112.188.24.78 -> static-route:112.188.30.123/32|112.188.23.78, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.124/32|112.188.24.10 -> static-route:112.188.30.124/32|112.188.23.10, score 60, reason matching rule too strict
