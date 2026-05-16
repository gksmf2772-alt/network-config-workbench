import { discoverInventory, writeInventoryReports } from "./validationWorkflow.mjs";

const inventory = writeInventoryReports(discoverInventory());
console.log(JSON.stringify({
  command: "validate:inventory",
  passed: true,
  configs: inventory.foundConfigFiles.length,
  profiles: inventory.foundProfiles.length,
  policies: inventory.foundExceptionPolicies.length + inventory.foundAdvancedComparePolicies.length,
  missingInputs: inventory.missingInputs,
}, null, 2));
