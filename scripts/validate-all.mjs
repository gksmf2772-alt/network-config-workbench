import fs from "node:fs";
import { spawnSync } from "node:child_process";

import {
  RESULTS_DIR,
  absPath,
  discoverInventory,
  parseCliArgs,
  runManifestValidation,
  writeFinalReports,
  writeInventoryReports,
} from "./validationWorkflow.mjs";
import { runQualityAnalysis } from "./analyze-validation-quality.mjs";

const args = parseCliArgs();
const commandResults = [
  runCommand("npm.cmd", ["test"]),
  runCommand("npm.cmd", ["run", "build"]),
  runCommand("npm.cmd", ["run", "validate:compare:fixtures"]),
  runCommand("npm.cmd", ["run", "validate:profile-exceptions"]),
  runCommand("npm.cmd", ["run", "validate:object-review"]),
  runCommand("npm.cmd", ["run", "validate:field-dedupe"]),
];
const inventory = writeInventoryReports(discoverInventory());
const modes = ["compare", "audit", "report", "graph"];
const validationSummaries = modes.map((mode) =>
  runManifestValidation({
    mode,
    strictMissingFixtures: args.strictMissingFixtures,
    writeReports: true,
  })
);
const stressPath = absPath(`${RESULTS_DIR}/stress-summary.json`);
const stressSummary = fs.existsSync(stressPath)
  ? JSON.parse(fs.readFileSync(stressPath, "utf8"))
  : null;
const final = writeFinalReports({
  inventory,
  validationSummaries,
  stressSummary,
  commandResults: [
    ...commandResults,
    ...validationSummaries.map((summary) => ({ command: `validate:${summary.mode}`, status: summary.status })),
    { command: "validate:stress", status: stressSummary?.status || "not-run" },
  ],
});
const qualityAnalysis = runQualityAnalysis({
  writeReports: true,
  updateFinalReport: true,
});
const overallFailed = commandResults.some((item) => item.status === "failed") ||
  validationSummaries.some((summary) => summary.status === "failed");

console.log(JSON.stringify({
  command: "validate:all",
  status: overallFailed ? "failed" : "passed",
  finalReport: `${RESULTS_DIR}/final-validation-report.md`,
  qualityReport: `${RESULTS_DIR}/fixture-completeness-analysis.md`,
  stressStatus: stressSummary?.status || "not-run",
  fixtureCompleteness: qualityAnalysis.fixtureCompleteness.summary.status,
}, null, 2));

if (overallFailed) process.exit(1);

function runCommand(command, args) {
  const started = Date.now();
  const commandLine = [command, ...args].join(" ");
  const result = spawnSync(commandLine, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
  });
  return {
    command: commandLine,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs: Date.now() - started,
    stdoutTail: String(result.stdout || "").split(/\r?\n/).slice(-20).join("\n"),
    stderrTail: String(result.stderr || "").split(/\r?\n/).slice(-20).join("\n"),
  };
}
