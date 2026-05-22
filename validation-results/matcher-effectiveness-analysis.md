# Matcher Effectiveness Analysis

Generated: 2026-05-18T12:21:00.165Z
Case: nokia-classic15-to-nokia-mdcli-22

## Current vs Baseline
- baseline generated: 2026-05-16T08:40:50.564Z
- matched: 118 (+57)
- unmatched source: 351 (-224)
- unmatched target: 156 (-291)
- ambiguous: 20 (+15)
- low-confidence: 62 (+2)
- field overlap: 40% (+11)

## Matcher Signals
- port/LAG candidates: 18
- SAP candidates: 0
- static-route candidate/manual-review: 59
- false exact match prevention: 59
- manual mapping candidates generated: 80
- relationship evidence candidates: 0
- conclusion: Matcher changes are measurable through safer candidates and false-exact-match prevention; partial target scope still dominates absolute unmatched counts.

## Candidate Score Reasons
- prefix: 59
- static-route-next-hop-mismatch: 59
- ambiguous-candidates: 20
- description-endpoint-match: 18
- canonical-field:auth-policy: 2
- canonical-field:dhcp.allow-unmatching-subnets: 2
- description-partial-similarity: 2
