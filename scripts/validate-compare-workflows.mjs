import { parseCliArgs, runManifestValidation } from "./validationWorkflow.mjs";

const args = parseCliArgs();
const summary = runManifestValidation({
  mode: args.mode,
  strictMissingFixtures: args.strictMissingFixtures,
  writeReports: args.writeReports,
});

console.log(JSON.stringify(summary, null, 2));
if (summary.status === "failed") process.exit(1);
