# Actual Missing Analysis

Generated: 2026-05-16T17:03:55.400Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- total: 111
- true missing from target fixture: 9
- outside partial target scope: 0
- target object has no source counterpart: 102
- parser/matcher false negative: 9
- missing parent relationship: 0
- manual mapping could resolve: 9
- conclusion: Actual missing candidates are mostly target-side extra objects or source objects without same-type target coverage; each still needs fixture-scope confirmation.

## By Object Type
- pim: 50
- dhcp: 27
- cpu-protection: 25
- static-route: 9

## By Completeness
- target-object-has-no-source-counterpart: 102
- true-missing-from-target-fixture: 9

## Samples
- old static-route:static-route:0.0.0.0/0|61.78.49.241 true-missing-from-target-fixture Review candidate objects and add explicit object/manual mapping if same real-world object.
- old static-route:static-route:112.188.30.8/32|112.188.28.78 true-missing-from-target-fixture Review candidate objects and add explicit object/manual mapping if same real-world object.
- old static-route:static-route:112.188.30.28/32|112.188.21.126 true-missing-from-target-fixture Review candidate objects and add explicit object/manual mapping if same real-world object.
- old static-route:static-route:112.188.30.43/32|112.188.28.98 true-missing-from-target-fixture Review candidate objects and add explicit object/manual mapping if same real-world object.
- old static-route:static-route:125.144.253.0/24|125.144.5.1 true-missing-from-target-fixture Review candidate objects and add explicit object/manual mapping if same real-world object.
- old static-route:static-route:125.159.0.0/23|125.144.5.1 true-missing-from-target-fixture Review candidate objects and add explicit object/manual mapping if same real-world object.
- old static-route:static-route:125.159.7.128/25|125.144.5.1 true-missing-from-target-fixture Review candidate objects and add explicit object/manual mapping if same real-world object.
- old static-route:static-route:125.159.44.0/24|125.144.5.1 true-missing-from-target-fixture Review candidate objects and add explicit object/manual mapping if same real-world object.
- old static-route:static-route:220.116.146.117/32|112.188.17.5 true-missing-from-target-fixture Review candidate objects and add explicit object/manual mapping if same real-world object.
- new dhcp:dhcp:100/to-dobong-tou-fb03/g-to-dobong-tou-fb03 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new cpu-protection:cpu-protection:100/to-dobong-tou-fb03/g-to-dobong-tou-fb03/lag-a-6109 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new dhcp:dhcp:100/to-dobong-tou-fb04/g-to-dobong-tou-fb04 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new cpu-protection:cpu-protection:100/to-dobong-tou-fb04/g-to-dobong-tou-fb04/lag-a-6110 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new dhcp:dhcp:100/to-dobong-tou-fb05/g-to-dobong-tou-fb05 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new cpu-protection:cpu-protection:100/to-dobong-tou-fb05/g-to-dobong-tou-fb05/lag-a-6111 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new dhcp:dhcp:100/to-nowon-tou-fn09/g-to-nowon-tou-fn09 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new cpu-protection:cpu-protection:100/to-nowon-tou-fn09/g-to-nowon-tou-fn09/lag-a-6112 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new dhcp:dhcp:100/to-nowon-tou-fn08/g-to-nowon-tou-fn08 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new cpu-protection:cpu-protection:100/to-nowon-tou-fn08/g-to-nowon-tou-fn08/lag-a-4101 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new dhcp:dhcp:100/to-gangbuk-tou-fk55/g-to-gangbuk-tou-fk55 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new cpu-protection:cpu-protection:100/to-gangbuk-tou-fk55/g-to-gangbuk-tou-fk55/lag-a-8101 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new dhcp:dhcp:100/to-gangbuk-tou-fk53/g-to-gangbuk-tou-fk53 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new cpu-protection:cpu-protection:100/to-gangbuk-tou-fk53/g-to-gangbuk-tou-fk53/lag-a-6105 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new dhcp:dhcp:100/to-gangbuk-tou-fk54/g-to-gangbuk-tou-fk54 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new cpu-protection:cpu-protection:100/to-gangbuk-tou-fk54/g-to-gangbuk-tou-fk54/lag-a-6108 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new dhcp:dhcp:100/to-nowon-tou-fn11/g-to-nowon-tou-fn11 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new cpu-protection:cpu-protection:100/to-nowon-tou-fn11/g-to-nowon-tou-fn11/lag-a-6106 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new dhcp:dhcp:100/to-nowon-tou-fn14/g-to-nowon-tou-fn14 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new cpu-protection:cpu-protection:100/to-nowon-tou-fn14/g-to-nowon-tou-fn14/lag-a-4102 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
- new dhcp:dhcp:100/to-gangbuk-tou-fk51/g-to-gangbuk-tou-fk51 target-object-has-no-source-counterpart Complete target fixture or confirm object is intentionally out of migration scope.
