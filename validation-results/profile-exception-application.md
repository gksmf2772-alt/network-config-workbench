# Profile Exception Application

- generatedAt: 2026-05-17T11:00:32.775Z
- activeProfile: profile-exception-application-fixture
- loadedProfileExceptions: 1
- matchedExceptionId: ex-profile-bgp-group-added-mdcli

## Counts

| metric | before | after |
| --- | ---: | ---: |
| activeIssueCount | 6 | 4 |
| suppressedIssueCount | 0 | 2 |
| activeGroupIssueCount | 2 | 0 |
| suppressedProfileGroupIssueCount | 0 | 2 |
| activeAdminStateIssueCount | 2 | 2 |
| activeDescriptionIssueCount | 2 | 2 |

## Match Attempts

| object | field | ruleId | changeType | matched | unmatchedReason |
| --- | --- | --- | --- | --- | --- |
| bgp:112.188.30.19 | neighbor | semantic-compare.important-field-change | equal | no | fieldPath mismatch |
| bgp:112.188.30.19 | description | semantic-compare.important-field-change | changed | no | fieldPath mismatch |
| bgp:112.188.30.19 | group | semantic-compare.important-field-change | structure-converted | yes | - |
| bgp:112.188.30.19 | admin-state | semantic-compare.important-field-change | added | no | fieldPath mismatch |
| bgp:112.188.30.19 | peerIp | semantic-compare.important-field-change | equal | no | fieldPath mismatch |
| bgp:112.188.30.64 | neighbor | semantic-compare.important-field-change | equal | no | fieldPath mismatch |
| bgp:112.188.30.64 | description | semantic-compare.important-field-change | changed | no | fieldPath mismatch |
| bgp:112.188.30.64 | group | semantic-compare.important-field-change | structure-converted | yes | - |
| bgp:112.188.30.64 | admin-state | semantic-compare.important-field-change | added | no | fieldPath mismatch |
| bgp:112.188.30.64 | peerIp | semantic-compare.important-field-change | equal | no | fieldPath mismatch |
