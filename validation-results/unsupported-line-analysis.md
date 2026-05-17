# Unsupported Line Analysis

Generated: 2026-05-17T11:01:25.602Z
Case: nokia-classic15-to-nokia-mdcli-22

## Summary
- total unsupported: 736
- eligible lines: 11841
- recognized/analyzed lines: 11105
- parser-unmapped lines: 736
- ignored/suppressed lines: 62
- unsupported syntax lines: 736
- router-log wrapper lines: 123
- old/source unsupported: 736
- new/target unsupported: 0
- status: partial-support
- conclusion: Unsupported lines are parser coverage gaps, mostly Classic source system/router/service/policy detail lines. The previous aggregate was an undercount caused by double-subtracting 62 ignored target lines; corrected parser-unmapped count is 736.

## By Section
- filter: 367
- router: 188
- system: 179
- port: 2

## By Object Type
- unknown: 301
- filter: 257
- management-security: 160
- qos-policy: 7
- route-policy: 6
- subscriber-service: 4
- port: 1

## Focus Areas
- Filter/ACL: 479
- Management/Security: 210
- Parser coverage: 89
- QoS: 7
- Subscriber/Service: 7
- Routing policy: 6
- BGP: 5

## Samples
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:15 [system/management-security] name "Gangbuk-SEA028"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:16 [system/management-security] load-balancing
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:17 [system/management-security] l4-load-balancing
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:18 [system/management-security] mc-enh-load-balancing
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:20 [system/management-security] management cli
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:21 [system/management-security] configuration
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:22 [system/management-security] no immediate
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:25 [system/management-security] netconf
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:28 [system/management-security] rollback
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:29 [system/management-security] rollback-location "cf3:/rollback/rollback"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:30 [system/management-security] local-max-checkpoints 50
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:36 [system/management-security] sntp
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:39 [system/management-security] zone KST 09
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:40 [system/management-security] prefer-local-time
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:42 [system/management-security] script-control
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:43 [system/management-security] script "mda1_1"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:44 [system/management-security] location "cf3:/EHS/mda1_1.script"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:47 [system/management-security] script "mda1_2"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:48 [system/management-security] location "cf3:/EHS/mda1_2.script"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:51 [system/management-security] script "mda2_1"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:52 [system/management-security] location "cf3:/EHS/mda2_1.script"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:55 [system/management-security] script "mda2_2"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:56 [system/management-security] location "cf3:/EHS/mda2_2.script"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:59 [system/management-security] script "mda3_1"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:60 [system/management-security] location "cf3:/EHS/mda3_1.script"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:63 [system/management-security] script "mda3_2"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:64 [system/management-security] location "cf3:/EHS/mda3_2.script"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:67 [system/management-security] script "mda4_1"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:68 [system/management-security] location "cf3:/EHS/mda4_1.script"
- old 예제 및 테스트 설정/Gangbuk-SEA028_config.txt:71 [system/management-security] script "mda4_2"
