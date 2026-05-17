# Conversion Policy Required Analysis

Generated: 2026-05-17T11:01:25.626Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- total: 163
- policy types: 2
- static-route rewrite candidates: 59
- SAP/service parent mapping: 159
- SAP/service parent mapping candidates: 0
- QoS/filter reference mapping: 4
- vendor default behavior: 0
- conclusion: Most conversion-policy-required items are service relationship and filter/QoS policy decisions, not safe automatic rewrites.

## By Policy Type
- SAP/service parent mapping policy: 159
- QoS/filter policy reference mapping: 4

## Policy File Candidates
- static-route next-hop rewrite policy: 59 -> validation/policies/classic15-mdcli22-static-route-conversion.json
- gateway vs next-hop alias policy: 0 -> validation/policies/classic15-mdcli22-field-aliases.json
- metric/tag/admin-state tolerance policy: 0 -> validation/policies/classic15-mdcli22-advanced-policy.json
- port/LAG rename alias policy: 0 -> validation/policies/classic15-mdcli22-object-aliases.json
- SAP/service parent mapping policy: 159 -> validation/policies/classic15-mdcli22-service-mapping.json
- QoS/filter policy reference mapping: 4 -> validation/policies/classic15-mdcli22-policy-reference-mapping.json
- vendor default behavior policy: 0 -> validation/policies/classic15-mdcli22-advanced-policy.json

## Top Items
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:2/1/1 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:3/1/1 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:lag-111 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:lag-112 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:lag-113 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.public:1 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.private:1 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.private:2 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.private:3 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.private:4 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.private:5 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.private:6 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.private:7 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.private:8 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.private:9 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.private:10 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.private:11 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:4/1/4 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.private:12 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:tunnel-1.private:13 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:lag-114 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:lag-173 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:lag-115 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:lag-195 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:4/1/5 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:2/1/2 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:3/1/2 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:2/1/4 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:2/1/5 field=subscriber-interface,group-interface
- SAP/service parent mapping policy service.sap-relationship-incomplete sap:2/1/3 field=subscriber-interface,group-interface
