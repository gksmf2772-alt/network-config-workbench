// src/core/coverageDiagnostics.js

import { evaluatePolicyContext } from "./policyEvaluator.js";
import { normalizeComparableLine } from "./lineNormalizer.js";

export function buildSemanticCoverageDiagnostics({
  oldText = "",
  newText = "",
  oldResult = {},
  newResult = {},
  plan = [],
  profile = {},
} = {}) {
  const old = buildSideCoverageDiagnostics({
    side: "old",
    text: oldResult.preprocess?.text || oldText,
    preprocess: oldResult.preprocess,
    objects: oldResult.objects || [],
    plan,
    profile,
  });
  const next = buildSideCoverageDiagnostics({
    side: "new",
    text: newResult.preprocess?.text || newText,
    preprocess: newResult.preprocess,
    objects: newResult.objects || [],
    plan,
    profile,
  });

  const eligibleLineCount = old.eligibleLineCount + next.eligibleLineCount;
  const recognizedLineCount = old.recognizedLineCount + next.recognizedLineCount;
  const ignoredLineCount = old.ignoredLineCount + next.ignoredLineCount;
  const suppressedLineCount = old.suppressedLineCount + next.suppressedLineCount;
  const wrapperLineCount = old.wrapperLineCount + next.wrapperLineCount;
  const linesWithoutSourceMapping = old.linesWithoutSourceMapping + next.linesWithoutSourceMapping;
  const unparsedLineCount = Math.max(0, eligibleLineCount - recognizedLineCount - ignoredLineCount);

  const coveragePercent = eligibleLineCount
    ? Math.round((recognizedLineCount / eligibleLineCount) * 100)
    : recognizedLineCount
      ? 100
      : null;

  return {
    coveragePercent,
    eligibleLineCount,
    recognizedLineCount,
    ignoredLineCount,
    suppressedLineCount,
    wrapperLineCount,
    unparsedLineCount,
    linesWithoutSourceMapping,
    parsedObjectCount: (oldResult.objects || []).length + (newResult.objects || []).length,
    objectTypesWithoutSourceMapping: [...new Set([
      ...old.objectTypesWithoutSourceMapping,
      ...next.objectTypesWithoutSourceMapping,
    ])],
    sides: {
      old,
      new: next,
    },
    status: coveragePercent == null ? "unavailable" : coveragePercent < 60 ? "low" : "ok",
    reason: coverageReason({
      coveragePercent,
      eligibleLineCount,
      recognizedLineCount,
      ignoredLineCount,
      wrapperLineCount,
      linesWithoutSourceMapping,
    }),
  };
}

export function buildSideCoverageDiagnostics({
  side = "old",
  text = "",
  preprocess = null,
  objects = [],
  profile = {},
} = {}) {
  const rawLines = String(text || "").split(/\r?\n/);
  const recognized = collectRecognizedLineSet(objects);
  const eligibleLines = [];
  const ignoredLines = [];
  const unparsedLines = [];
  let suppressedLineCount = 0;

  rawLines.forEach((rawLine, index) => {
    const normalized = normalizeComparableLine(rawLine);
    if (!isEligibleConfigLine(rawLine)) return;
    const policy = evaluatePolicyContext({
      profile,
      rawLine,
      normalizedLine: normalized,
      side,
    });
    if (policy.suppressed) {
      ignoredLines.push({
        line: index + 1,
        text: rawLine,
        reason: policy.reason,
        sourcePolicy: policy.sourcePolicy,
      });
      suppressedLineCount += 1;
      return;
    }
    eligibleLines.push({ line: index + 1, text: rawLine, normalized });
    if (!recognized.has(normalized)) {
      unparsedLines.push({ line: index + 1, text: rawLine, reason: "parser-unmapped" });
    }
  });

  const objectTypesWithoutSourceMapping = objects
    .filter((object) => !Array.isArray(object.rawLines) || object.rawLines.length === 0)
    .map((object) => object.normalizedType || object.type || "object");

  return {
    side,
    eligibleLineCount: eligibleLines.length,
    recognizedLineCount: eligibleLines.filter((line) => recognized.has(line.normalized)).length,
    ignoredLineCount: ignoredLines.length,
    suppressedLineCount,
    wrapperLineCount: preprocess?.diagnostics?.wrapperLineCount || 0,
    unparsedLineCount: unparsedLines.length,
    linesWithoutSourceMapping: objects.filter((object) => !object.rawLines?.length).length,
    objectTypesWithoutSourceMapping,
    parsedObjectCount: objects.length,
    eligibleLines,
    ignoredLines,
    unparsedLines: unparsedLines.slice(0, 80),
    preprocessSkipped: preprocess?.skipped || [],
  };
}

function collectRecognizedLineSet(objects = []) {
  const set = new Set();
  objects.forEach((object) => {
    (object.rawLines || []).forEach((line) => {
      const normalized = normalizeComparableLine(line);
      if (normalized) set.add(normalized);
    });
  });
  return set;
}

function isEligibleConfigLine(line = "") {
  const normalized = normalizeComparableLine(line);
  if (!normalized) return false;
  if (normalized === "!" || normalized === "{" || normalized === "}" || normalized === "exit") return false;
  if (/^#/.test(normalized)) return false;
  if (/^echo\s+/.test(normalized)) return false;
  if (/^exit\s+all$/.test(normalized) || /^configure$/.test(normalized)) return false;
  return true;
}

function coverageReason({
  coveragePercent,
  eligibleLineCount,
  recognizedLineCount,
  ignoredLineCount,
  wrapperLineCount,
  linesWithoutSourceMapping,
}) {
  if (coveragePercent == null) return "계산 가능한 config 라인이 없습니다.";
  if (coveragePercent === 0 && recognizedLineCount > 0) return "라인 매핑 계산 오류 가능성이 있습니다.";
  if (coveragePercent < 60 && wrapperLineCount > eligibleLineCount) return "router log wrapper가 많아 실제 config 추출 비율이 낮습니다.";
  if (coveragePercent < 60 && linesWithoutSourceMapping) return "일부 객체에 원본 라인 매핑이 없습니다.";
  if (coveragePercent < 60 && ignoredLineCount) return "예외/숨김 처리 라인이 많습니다.";
  if (coveragePercent < 60) return "파서가 인식하지 못한 config 라인이 많습니다.";
  return "의미 기반 분석 라인 매핑 정상";
}
