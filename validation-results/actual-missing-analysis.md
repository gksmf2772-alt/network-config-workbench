# Actual Missing Analysis

Generated: 2026-05-29T14:11:42.325Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- total: 38
- true missing from target fixture: 23
- outside partial target scope: 0
- target object has no source counterpart: 15
- parser/matcher false negative: 0
- missing parent relationship: 0
- manual mapping could resolve: 0
- conclusion: Actual missing candidates now separate confirmed source-missing objects from target-only extras; parser/matcher false-negative counts are kept distinct.

## By Object Type
- route-policy: 8
- port: 7
- prefix-list: 7
- community: 6
- interface: 4
- lag: 4
- pim: 2

## By Completeness
- true-missing-from-target-fixture: 23
- target-object-has-no-source-counterpart: 15

## Samples
- old lag:lag:75 true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old lag:lag:175 true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old prefix-list:prefix-list:KT_DHCP+CVNET true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old prefix-list:prefix-list:LDP true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old prefix-list:prefix-list:PREMIUM true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old prefix-list:prefix-list:iCOD_Addr true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old prefix-list:prefix-list:iCOD_VOD true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old prefix-list:prefix-list:In-Filter true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old prefix-list:prefix-list:Drop_Prefix true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old community:community:900 true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old community:community:901 true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old community:community:7750 true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old community:community:9000 true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old community:community:9150 true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old community:community:Deny-to-iCoD true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old route-policy:route-policy:Deny true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old route-policy:route-policy:TO-iCOD true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old route-policy:route-policy:UP-PEER true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old route-policy:route-policy:SER-PEER true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old route-policy:route-policy:bsr_drop true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old route-policy:route-policy:FROM-iCOD true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old route-policy:route-policy:NTOPIA-PEER true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- old route-policy:route-policy:PREMIUM-PEER true-missing-from-target-fixture Complete target fixture or confirm object is intentionally out of migration scope.
- new interface:interface:112.188.16.114/30 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new interface:interface:112.188.16.118/30 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new interface:interface:112.188.17.114/30 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new interface:interface:112.188.17.118/30 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new lag:lag:lag-A-4101 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new lag:lag:lag-B-4203 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new port:port:2/1/c17/1 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
