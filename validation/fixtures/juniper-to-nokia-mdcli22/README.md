# Juniper to Nokia MD-CLI 22 validation inputs

Required for real validation:

- `source-juniper.conf`
  - Real Juniper source config, preferably set-style.
- `target-nokia-mdcli22.conf`
  - Expected Nokia MD-CLI 22 config, migrated config, or reference target config.
- `profile.json`
  - Optional comparison/migration profile.
- `exceptions.json`
  - Optional line/object/field exception policy.
- `audit-profile.json`
  - Optional standards audit profile.
- `manual-mappings.json`
  - Optional known mappings.

Once `source-juniper.conf` and a target/reference config are added, enable `juniper-to-nokia-mdcli-22` in `validation/compare-validation.manifest.json`.
