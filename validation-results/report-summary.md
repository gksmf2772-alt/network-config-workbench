# Validation report

Status: passed
Generated: 2026-05-18T12:20:28.034Z

## Counts
- passed: 2
- failed: 0
- skipped: 0
- blocked: 1

## Cases
### juniper-to-nokia-mdcli-22
- status: blocked
- synthetic: false
- reason: missing-source-config
- messageKo: 현재 레포지토리 내 Juniper 원본 설정이 없어 실제 Juniper → Nokia MD-CLI 22 검증은 보류합니다.
### synthetic-juniper-set-smoke
- status: passed
- synthetic: true
- parsed objects: old 5, new 3
- semantic: matched 3, old-only 2, new-only 0, coverage 90%
- audit: active 7, suppressed 2
- graph: nodes 20, edges 10
### nokia-classic15-to-nokia-mdcli-22
- status: passed
- synthetic: false
- parsed objects: old 549, new 349
- semantic: matched 118, old-only 351, new-only 156, coverage 94%
- audit: active 572, suppressed 60
- graph: nodes 415, edges 308
