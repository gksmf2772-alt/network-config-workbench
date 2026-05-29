# Parser Backlog

Generated: 2026-05-29T14:11:42.334Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- groups: 7
- unsupported lines: 4288
- active findings: 469
- auto-generation blocking groups: 3
- conclusion: QoS/filter/route-policy body coverage and subscriber/service policy details are the highest-value parser backlog before automatic generation.

## Groups
### QoS policy body parsing
- priority: 121
- unsupported lines: 710
- active findings: 214
- object type: qos-policy
- migration impact: conversion-policy-required
- needed for auto-generation: true
- impact blocks-auto-generation: 0
- impact conversion-policy-required: 0
- impact actual-missing: 0
- ease/risk: medium/medium
- next action: Backlog only until narrower fixtures and expected normalized fields are available.
- expected fields: policy-id/name, queue, scheduler, policer, shaper, cir, pir, mbs, cbs, remarking
- affected rules: qos.policy-parser-partial(214)
- examples:
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:524 cpm-queue
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:525 queue 100 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:527 queue 101 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:529 queue 102 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:531 queue 120 create

### Filter/ACL body parsing
- priority: 118
- unsupported lines: 2372
- active findings: 190
- object type: filter
- migration impact: conversion-policy-required
- needed for auto-generation: true
- impact blocks-auto-generation: 0
- impact conversion-policy-required: 0
- impact actual-missing: 0
- ease/risk: low/high
- next action: Extract filter definitions and default-action first; defer full entry shadow analysis.
- expected fields: filter-id/name, entry-id, match source/destination, protocol/port, action, log, default-action
- affected rules: filter.parser-partial(182), filter.default-action-missing(8)
- examples:
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:127 script-policy "mda1_1_action"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:132 script-policy "mda1_2_action"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:137 script-policy "mda2_1_action"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:142 script-policy "mda2_2_action"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:147 script-policy "mda3_1_action"

### BGP import/export policy references
- priority: 92
- unsupported lines: 152
- active findings: 71
- object type: bgp,route-policy
- migration impact: review-before-migration
- needed for auto-generation: false
- impact blocks-auto-generation: 0
- impact conversion-policy-required: 0
- impact actual-missing: 8
- ease/risk: high/low
- next action: Keep reference extraction tests; add max-prefix only if syntax sample is stable.
- expected fields: neighbor, group, import.policy, export.policy, max-prefix, auth, description
- affected rules: bgp.max-prefix-required(57), filter.default-action-missing(8), bgp.group-inheritance-unresolved(5), static-route.default-review(1)
- examples:
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:280 description "## MNT BGP peer permit ##"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:285 description "## PE BGP peer permit ##"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:290 description "## SER-PEER BGP Peer permit ##"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:295 description "## Ntopia BGP Peer permit ##"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:421 match "configure router bgp shutdown"

### Route-policy body parsing
- priority: 92
- unsupported lines: 93
- active findings: 8
- object type: route-policy
- migration impact: conversion-policy-required
- needed for auto-generation: false
- impact blocks-auto-generation: 0
- impact conversion-policy-required: 0
- impact actual-missing: 8
- ease/risk: low/high
- next action: Backlog only until narrower fixtures and expected normalized fields are available.
- expected fields: policy-name, entry/order, from prefix/community/as-path, action, next-policy, default-action
- affected rules: filter.default-action-missing(8)
- examples:
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:521 community "uEBCJLTFQr/kIe7sOLfDJk" hash2 r version both
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:542 policy 100 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:547 policy 200 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:552 policy 254 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:555 policy 255 create

### Subscriber/service policy parsing
- priority: 91
- unsupported lines: 72
- active findings: 175
- object type: subscriber-service,sap,subscriber-interface,group-interface,dhcp
- migration impact: manual-conversion-required
- needed for auto-generation: true
- impact blocks-auto-generation: 0
- impact conversion-policy-required: 0
- impact actual-missing: 0
- ease/risk: medium/medium
- next action: Backlog only until narrower fixtures and expected normalized fields are available.
- expected fields: service-id, sap, subscriber-interface, group-interface, dhcp, static-host, default-host, sub-sla-mgmt, cpu-protection
- affected rules: filter.parser-partial(100), qos.policy-parser-partial(75)
- examples:
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:543 description "DHCP Rate Limit"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:548 description "DHCP_PIM_Limit_400"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:814 event-control "dhcp" 2010 suppress
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:815 event-control "dhcp" 2027 suppress
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:1293 description "KT_DHCP+CVNET"

### Management/security baseline parsing
- priority: 90
- unsupported lines: 337
- active findings: 2
- object type: management-security
- migration impact: target-default-risk
- needed for auto-generation: false
- impact blocks-auto-generation: 0
- impact conversion-policy-required: 0
- impact actual-missing: 0
- ease/risk: low/high
- next action: Backlog only until narrower fixtures and expected normalized fields are available.
- expected fields: aaa, ssh, snmp, ntp, syslog, management ACL, cpu-protection, netconf
- affected rules: security.cpu-protection-coverage(1), security.management-acl-review(1)
- examples:
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:14 system
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:15 name "Gangbuk-SEA028"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:16 load-balancing
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:17 l4-load-balancing
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:18 mc-enh-load-balancing

### Prefix/community/as-path policy parsing
- priority: 88
- unsupported lines: 93
- active findings: 8
- object type: prefix-list,community,route-policy
- migration impact: conversion-policy-required
- needed for auto-generation: false
- impact blocks-auto-generation: 0
- impact conversion-policy-required: 0
- impact actual-missing: 21
- ease/risk: low/high
- next action: Backlog only until narrower fixtures and expected normalized fields are available.
- expected fields: prefix-list entries, community members, as-path regex, policy reference graph
- affected rules: filter.default-action-missing(8)
- examples:
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:521 community "uEBCJLTFQr/kIe7sOLfDJk" hash2 r version both
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:542 policy 100 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:547 policy 200 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:552 policy 254 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:555 policy 255 create
