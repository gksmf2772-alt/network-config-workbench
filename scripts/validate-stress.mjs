import { parseCliArgs, runStressValidation } from "./validationWorkflow.mjs";

const args = parseCliArgs();
const summary = runStressValidation({
  iterations: args.iterations,
  strictMissingFixtures: args.strictMissingFixtures,
  writeReports: args.writeReports,
});

console.log(JSON.stringify(summary, null, 2));
if (summary.status === "failed") process.exit(1);
