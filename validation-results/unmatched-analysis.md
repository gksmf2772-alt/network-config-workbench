# Unmatched Object Analysis

Generated: 2026-05-18T12:20:59.851Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- matched: 118
- unmatched source: 351
- unmatched target: 156
- low confidence: 62
- field overlap: 40%
- fixture scope: partial-assembled-target
- full source objects: 549
- target fixture objects: 349
- source objects in target scope: 525
- source objects outside target scope: 24
- Target fixture 범위 밖 미매칭: 272
- Matcher 개선 필요: 161
- Parser 미지원 가능성: 24
- 실제 누락 가능성: 50
- conclusion: High unmatched count is expected for this fixture set because the MD-CLI target is a partial feature-split target, but port/LAG/SAP rename mapping and service parent matching also need matcher or manual-map work.

## By Reason
- target fixture is partial: 272
- object key normalization mismatch: 124
- target object has no source counterpart: 50
- parent/relationship mismatch: 37
- parser gap: 24

## By Type/Side
- old:interface: 162
- old:port: 100
- new:pim: 50
- new:lag: 32
- old:lag: 32
- new:interface: 31
- new:port: 29
- old:subscriber-interface: 23
- new:subscriber-interface: 14
- old:community: 9
- old:static-route: 9
- old:route-policy: 8
- old:prefix-list: 7
- old:bgp: 1

## Weak Mappings
- port: port:2/1/1 -> port:2/1/c17/1, score 85, reason matching rule too strict
- port: port:2/1/2 -> port:2/1/c17/1, score 85, reason matching rule too strict
- port: port:2/1/3 -> port:2/1/c17/1, score 85, reason matching rule too strict
- port: port:2/1/4 -> port:2/1/c17/1, score 85, reason matching rule too strict
- port: port:2/1/5 -> port:2/1/c17/1, score 85, reason matching rule too strict
- port: port:3/1/1 -> port:2/2/c17/1, score 85, reason matching rule too strict
- port: port:3/1/2 -> port:2/2/c17/1, score 85, reason matching rule too strict
- port: port:3/1/3 -> port:2/2/c17/1, score 85, reason matching rule too strict
- port: port:3/1/4 -> port:2/2/c17/1, score 85, reason matching rule too strict
- port: port:3/1/5 -> port:2/2/c17/1, score 85, reason matching rule too strict
- port: port:4/1/1 -> port:2/1/c17/1, score 85, reason matching rule too strict
- port: port:4/1/2 -> port:2/1/c17/1, score 85, reason matching rule too strict
- port: port:4/1/3 -> port:2/1/c17/1, score 85, reason matching rule too strict
- port: port:4/1/4 -> port:2/1/c17/1, score 85, reason matching rule too strict
- port: port:4/1/5 -> port:2/1/c17/1, score 85, reason matching rule too strict
- port: port:4/2/1 -> port:2/2/c17/1, score 85, reason matching rule too strict
- port: port:4/2/2 -> port:2/2/c17/1, score 85, reason matching rule too strict
- port: port:4/2/3 -> port:2/2/c17/1, score 85, reason matching rule too strict
- static-route: static-route:112.188.30.19/32 -> static-route:112.188.30.19/32, score 60, reason matching rule too strict
- static-route: static-route:112.188.30.64/32 -> static-route:112.188.30.64/32, score 60, reason matching rule too strict
