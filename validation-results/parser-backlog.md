# Parser Backlog

Generated: 2026-05-18T12:21:00.174Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- groups: 7
- unsupported lines: 757
- active findings: 572
- auto-generation blocking groups: 3
- conclusion: QoS/filter/route-policy body coverage and subscriber/service policy details are the highest-value parser backlog before automatic generation.

## Groups
### Filter/ACL body parsing
- priority: 118
- unsupported lines: 500
- active findings: 190
- object type: filter
- migration impact: manual-conversion-required
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

### QoS policy body parsing
- priority: 102
- unsupported lines: 7
- active findings: 214
- object type: qos-policy
- migration impact: manual-conversion-required
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

### BGP import/export policy references
- priority: 90
- unsupported lines: 11
- active findings: 174
- object type: bgp,route-policy
- migration impact: target-default-risk
- needed for auto-generation: false
- impact blocks-auto-generation: 0
- impact conversion-policy-required: 0
- impact actual-missing: 0
- ease/risk: high/low
- next action: Keep reference extraction tests; add max-prefix only if syntax sample is stable.
- expected fields: neighbor, group, import.policy, export.policy, max-prefix, auth, description
- affected rules: bgp.max-prefix-required(57), bgp.export-policy-required(53), bgp.import-policy-required(53), filter.default-action-missing(8), bgp.group-inheritance-unresolved(2), static-route.default-review(1)
- examples:
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:280 description "## MNT BGP peer permit ##"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:285 description "## PE BGP peer permit ##"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:290 description "## SER-PEER BGP Peer permit ##"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:295 description "## Ntopia BGP Peer permit ##"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:421 match "configure router bgp shutdown"

### Subscriber/service policy parsing
- priority: 88
- unsupported lines: 7
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

### Route-policy body parsing
- priority: 88
- unsupported lines: 6
- active findings: 8
- object type: route-policy
- migration impact: target-default-risk
- needed for auto-generation: false
- impact blocks-auto-generation: 0
- impact conversion-policy-required: 0
- impact actual-missing: 0
- ease/risk: low/high
- next action: Backlog only until narrower fixtures and expected normalized fields are available.
- expected fields: policy-name, entry/order, from prefix/community/as-path, action, next-policy, default-action
- affected rules: filter.default-action-missing(8)
- examples:
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:542 policy 100 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:547 policy 200 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:552 policy 254 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:555 policy 255 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:559 policy "_default-access-policy" create

### Management/security baseline parsing
- priority: 84
- unsupported lines: 210
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
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:15 name "Gangbuk-SEA028"
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:16 load-balancing
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:17 l4-load-balancing
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:18 mc-enh-load-balancing
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:20 management cli

### Prefix/community/as-path policy parsing
- priority: 84
- unsupported lines: 6
- active findings: 8
- object type: prefix-list,community,route-policy
- migration impact: target-default-risk
- needed for auto-generation: false
- impact blocks-auto-generation: 0
- impact conversion-policy-required: 0
- impact actual-missing: 0
- ease/risk: low/high
- next action: Backlog only until narrower fixtures and expected normalized fields are available.
- expected fields: prefix-list entries, community members, as-path regex, policy reference graph
- affected rules: filter.default-action-missing(8)
- examples:
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:542 policy 100 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:547 policy 200 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:552 policy 254 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:555 policy 255 create
  - old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:559 policy "_default-access-policy" create
