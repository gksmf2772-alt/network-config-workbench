import fs from "node:fs";
import { spawnSync } from "node:child_process";

const STABILITY_MAP = "docs/legacy-core-stability-map.md";
const CURRENT_ISSUE = ".codex/CURRENT_ISSUE.md";
const GUARDED_FILES = [
  "src/core/legacyCore.js",
  "src/core/comparator.js",
  "src/core/comparisonPlan.js",
  "src/core/matchers/objectMatcher.js",
  "src/core/manualMapping.js",
  "src/core/policyEvaluator.js",
  "src/core/summaryAnalytics.js",
  "src/core/compareVisualStatus.js",
  "src/core/diffRenderer.js",
  "src/core/diffScrollSync.js",
  "src/core/lineDiff.js",
];

const REQUIRED_ITEMS = [
  { label: "영향 boundary", patterns: [/영향\s*boundary/i, /Affected stability-map boundary/i] },
  { label: "허용 범위", patterns: [/허용\s*범위/i, /Allowed edit scope/i] },
  { label: "금지 범위", patterns: [/금지\s*범위/i, /Forbidden/i] },
  { label: "테스트 결과", patterns: [/테스트\s*결과/i, /Tests run/i] },
];

const failures = [];

if (!fs.existsSync(STABILITY_MAP)) {
  failures.push(`안정성 문서가 없습니다: ${STABILITY_MAP}`);
}

const changedFiles = new Set([
  ...gitDiffNameOnly(["diff", "--name-only"]),
  ...gitDiffNameOnly(["diff", "--cached", "--name-only"]),
]);

const guardedChanges = GUARDED_FILES.filter((file) => changedFiles.has(file));

if (guardedChanges.length) {
  if (!fs.existsSync(CURRENT_ISSUE)) {
    failures.push(`작업 규칙 문서가 없습니다: ${CURRENT_ISSUE}`);
  } else {
    const issueText = fs.readFileSync(CURRENT_ISSUE, "utf8");
    for (const item of REQUIRED_ITEMS) {
      if (!item.patterns.some((pattern) => pattern.test(issueText))) {
        failures.push(`${CURRENT_ISSUE}에 '${item.label}' 항목이 없습니다.`);
      }
    }
  }
}

if (failures.length) {
  console.error("legacyCore guardrail 실패");
  console.error("");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error("");
  console.error("해결 방법:");
  console.error(`- ${STABILITY_MAP}를 확인하십시오.`);
  console.error(`- ${CURRENT_ISSUE}에 영향 boundary, 허용 범위, 금지 범위, 테스트 결과를 남기십시오.`);
  process.exit(1);
}

if (guardedChanges.length) {
  console.log(`legacyCore guardrail 통과: ${guardedChanges.join(", ")} 변경 체크리스트 확인됨.`);
} else {
  console.log("legacyCore guardrail 통과: 감시 대상 비교 핵심 파일 변경 없음, 안정성 문서 존재 확인됨.");
}

function gitDiffNameOnly(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    failures.push(`git ${args.join(" ")} 실행 실패: ${String(result.stderr || "").trim()}`);
    return [];
  }

  return String(result.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}
