# Unmatched Object Analysis

Generated: 2026-05-29T14:11:42.149Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- matched: 336
- unmatched source: 167
- unmatched target: 15
- low confidence: 0
- field overlap: 66%
- fixture scope: partial-assembled-target
- full source objects: 503
- target fixture objects: 351
- source objects in target scope: 482
- source objects outside target scope: 21
- Target fixture 범위 밖 미매칭: 144
- Matcher 개선 필요: 0
- Parser 미지원 가능성: 0
- 실제 누락 가능성: 23
- target-only objects: 15
- conclusion: High unmatched count is expected because the MD-CLI target is a partial feature-split target; source unmatched counts now follow the dashboard fixture-scope classifier.

## By Reason
- target fixture is partial: 144
- source object has no target counterpart: 23
- target object has no source counterpart: 15

## By Type/Side
- old:port: 90
- old:interface: 38
- old:route-policy: 8
- old:static-route: 8
- new:port: 7
- old:pim: 7
- old:prefix-list: 7
- old:community: 6
- new:interface: 4
- new:lag: 2
- new:pim: 2
- old:lag: 2
- old:bgp: 1

## Weak Mappings
