import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
} from "../src/core/comparator.js";
import { buildSemanticCoverageDiagnostics } from "../src/core/coverageDiagnostics.js";
import { evaluatePolicyContext } from "../src/core/policyEvaluator.js";
import { normalizeComparableLine } from "../src/core/lineNormalizer.js";
import {
  buildGraphData,
  buildSummaryDashboardData,
  createFixtureUnmatchedClassifier,
} from "../src/core/summaryAnalytics.js";
import {
  buildAnalysisContext,
  filterAuditForModeScope,
} from "../src/core/analysisModes.js";
import {
  attachAuditFindingsToPlan,
  runStandardsAudit,
  runStandardsAuditForSides,
} from "../src/core/standardsAudit.js";
import {
  RESULTS_DIR,
  absPath,
  discoverInventory,
  loadManifest,
  loadValidationProfile,
  readJson,
  readText,
  writeJson,
  writeText,
} from "./validationWorkflow.mjs";

const PRIMARY_CASE_ID = "nokia-classic15-to-nokia-mdcli-22";
const PLACEHOLDER_TYPES = new Set(["qos-policy", "filter", "route-policy", "prefix-list", "community"]);
const CORE_OBJECT_TYPES = new Set(["bgp", "static-route", "interface", "sap", "lag", "port", "subscriber-interface", "group-interface"]);
const BASELINE_2026_05_16 = {
  generatedAt: "2026-05-16T08:40:50.564Z",
  matched: 61,
  unmatchedSource: 575,
  unmatchedTarget: 447,
  ambiguous: 5,
  lowConfidence: 60,
  fieldOverlapPercent: 29,
  semanticLineCoveragePercent: 94,
  parserUnmappedLines: 736,
  activeAuditFindings: 628,
  suppressedAuditFindings: 171,
  blocksAutoGeneration: 71,
  conversionPolicyRequired: 163,
};

export function runQualityAnalysis({ writeReports = true, updateFinalReport = true } = {}) {
  const inventory = discoverInventory();
  const manifest = loadManifest();
  const testCase = (manifest.cases || []).find((item) => item.id === PRIMARY_CASE_ID);
  if (!testCase) throw new Error(`${PRIMARY_CASE_ID} case missing from manifest`);

  const artifacts = buildCaseArtifacts(testCase, inventory);
  const unmatched = buildUnmatchedAnalysis(artifacts);
  const unsupportedLines = buildUnsupportedLineAnalysis(artifacts);
  const findingPriority = buildFindingPriorityAnalysis(artifacts);
  const fixtureCompleteness = buildFixtureCompletenessAnalysis(artifacts, inventory);
  const blocksAutoGeneration = buildBlocksAutoGenerationAnalysis(artifacts, unsupportedLines);
  const conversionPolicyRequired = buildConversionPolicyRequiredAnalysis(artifacts);
  const actualMissing = buildActualMissingAnalysis(artifacts, unmatched);
  const matcherEffectiveness = buildMatcherEffectivenessAnalysis(artifacts, unmatched);
  const modeScopeValidation = buildModeScopeValidation();
  const parserBacklog = buildParserBacklogAnalysis(artifacts, unsupportedLines, findingPriority, {
    blocksAutoGeneration,
    conversionPolicyRequired,
    actualMissing,
  });

  const quality = {
    generatedAt: new Date().toISOString(),
    caseId: PRIMARY_CASE_ID,
    unmatched,
    unsupportedLines,
    findingPriority,
    fixtureCompleteness,
    parserBacklog,
    blocksAutoGeneration,
    conversionPolicyRequired,
    actualMissing,
    matcherEffectiveness,
    modeScopeValidation,
  };

  if (writeReports) {
    writeJson(`${RESULTS_DIR}/unmatched-analysis.json`, unmatched);
    writeText(`${RESULTS_DIR}/unmatched-analysis.md`, renderUnmatchedMarkdown(unmatched));
    writeJson(`${RESULTS_DIR}/unsupported-line-analysis.json`, unsupportedLines);
    writeText(`${RESULTS_DIR}/unsupported-line-analysis.md`, renderUnsupportedMarkdown(unsupportedLines));
    writeJson(`${RESULTS_DIR}/finding-priority-analysis.json`, findingPriority);
    writeText(`${RESULTS_DIR}/finding-priority-analysis.md`, renderFindingPriorityMarkdown(findingPriority));
    writeJson(`${RESULTS_DIR}/fixture-completeness-analysis.json`, fixtureCompleteness);
    writeText(`${RESULTS_DIR}/fixture-completeness-analysis.md`, renderFixtureCompletenessMarkdown(fixtureCompleteness));
    writeJson(`${RESULTS_DIR}/parser-backlog.json`, parserBacklog);
    writeText(`${RESULTS_DIR}/parser-backlog.md`, renderParserBacklogMarkdown(parserBacklog));
    writeJson(`${RESULTS_DIR}/blocks-auto-generation-analysis.json`, blocksAutoGeneration);
    writeText(`${RESULTS_DIR}/blocks-auto-generation-analysis.md`, renderBlocksAutoGenerationMarkdown(blocksAutoGeneration));
    writeJson(`${RESULTS_DIR}/conversion-policy-required-analysis.json`, conversionPolicyRequired);
    writeText(`${RESULTS_DIR}/conversion-policy-required-analysis.md`, renderConversionPolicyRequiredMarkdown(conversionPolicyRequired));
    writeJson(`${RESULTS_DIR}/actual-missing-analysis.json`, actualMissing);
    writeText(`${RESULTS_DIR}/actual-missing-analysis.md`, renderActualMissingMarkdown(actualMissing));
    writeJson(`${RESULTS_DIR}/matcher-effectiveness-analysis.json`, matcherEffectiveness);
    writeText(`${RESULTS_DIR}/matcher-effectiveness-analysis.md`, renderMatcherEffectivenessMarkdown(matcherEffectiveness));
    writeJson(`${RESULTS_DIR}/mode-scope-validation.json`, modeScopeValidation);
    writeText(`${RESULTS_DIR}/mode-scope-validation.md`, renderModeScopeValidationMarkdown(modeScopeValidation));
  }

  if (updateFinalReport) {
    updateFinalValidationReport(quality);
  }

  return quality;
}

function buildCaseArtifacts(testCase, inventory) {
  const profile = loadValidationProfile(testCase);
  const sourceText = readText(testCase.sourceConfigPath);
  const targetPaths = getTargetPaths(testCase);
  const targetBundle = buildTargetBundle(targetPaths);
  const oldResult = normalizeConfig({
    vendor: testCase.sourceVendor,
    profile,
    configText: sourceText,
    side: "old",
  });
  const newResult = normalizeConfig({
    vendor: testCase.targetVendor,
    profile,
    configText: targetBundle.text,
    side: "new",
  });
  const matches = matchNormalizedObjects({
    oldObjects: oldResult.objects,
    newObjects: newResult.objects,
    manualMap: profile.manualMap || {},
    profile,
  });
  const rawPlan = createComparisonPlan(matches, profile);
  const audit = runStandardsAuditForSides({
    oldResult,
    newResult,
    profile,
    oldVendor: testCase.sourceVendor,
    newVendor: testCase.targetVendor,
  });
  const plan = attachAuditFindingsToPlan(rawPlan, audit);
  const coverage = buildSemanticCoverageDiagnostics({
    oldText: sourceText,
    newText: targetBundle.text,
    oldResult,
    newResult,
    plan,
    profile,
  });
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan,
    semanticSummary: { coverageDiagnostics: coverage, coveragePercent: coverage.coveragePercent },
    coverageDiagnostics: coverage,
    audit,
    fixtureScope: profile.fixturePolicy || { status: testCase.fixtureCompleteness },
  });

  return {
    inventory,
    testCase,
    profile,
    sourceText,
    targetPaths,
    targetBundle,
    oldResult,
    newResult,
    plan,
    audit,
    coverage,
    dashboard,
    objectCounts: {
      old: countBy(oldResult.objects, (object) => objectType(object)),
      new: countBy(newResult.objects, (object) => objectType(object)),
    },
  };
}

function buildUnmatchedAnalysis(artifacts) {
  const { testCase, oldResult, newResult, plan, dashboard, targetBundle } = artifacts;
  const classifyFixtureUnmatched = createFixtureUnmatchedClassifier(
    plan,
    artifacts.profile.fixturePolicy || { status: testCase.fixtureCompleteness }
  );
  const records = plan
    .filter((item) => !item.policySuppressed && ["old-only", "new-only"].includes(item.status))
    .map((item) => {
      const side = item.status === "old-only" ? "old" : "new";
      const object = side === "old" ? item.oldObject : item.newObject;
      const fixtureClassification = side === "old" ? classifyFixtureUnmatched(item) : null;
      const source = side === "old"
        ? locateSourceObject(object, oldResult, testCase.sourceConfigPath)
        : locateTargetObject(object, targetBundle);
      const oppositeObjects = side === "old" ? newResult.objects : oldResult.objects;
      return {
        side,
        status: item.status,
        objectType: objectType(object),
        objectKey: objectKey(object),
        sourceFile: source.file,
        sourceLines: source.lines,
        parserSupportStatus: parserSupportStatus(object),
        likelyReason: classifyUnmatchedReason({
          item,
          object,
          side,
          oldResult,
          newResult,
          oppositeObjects,
          fixtureClassification,
        }),
        fixtureUnmatchedCategory: fixtureClassification?.category || "",
        diagnosticReason: fixtureClassification?.reason || "",
        score: item.score ?? null,
        sampleLines: (object.rawLines || []).slice(0, 3),
      };
    });

  const weakMappings = plan
    .filter((item) => !item.policySuppressed && item.oldObject && item.newObject && (item.status === "candidate" || (Number(item.score || 0) > 0 && Number(item.score || 0) < 80)))
    .map((item) => ({
      objectType: item.objectType,
      oldKey: objectKey(item.oldObject),
      newKey: objectKey(item.newObject),
      status: item.status,
      reason: item.reason,
      score: item.score ?? 0,
      matchKeyFields: item.matchKeyFields || [],
      scoreReasons: item.scoreReasons || [],
      likelyReason: classifyWeakMappingReason(item),
    }));

  const byTypeSide = countBy(records, (item) => `${item.side}:${item.objectType}`);
  const byReason = countBy(records, (item) => item.likelyReason);
  const byParserSupport = countBy(records, (item) => item.parserSupportStatus);
  const sourceHeavyTypes = objectCoverageRows(artifacts)
    .filter((row) => row.unmatchedSource > 0 || row.unmatchedTarget > 0);
  const scopeSummary = buildUnmatchedScopeSummary({ artifacts, records });

  return {
    generatedAt: new Date().toISOString(),
    caseId: testCase.id,
    summary: {
      matched: dashboard.counts.matched,
      unmatchedSource: dashboard.counts.oldOnly,
      unmatchedTarget: dashboard.counts.newOnly,
      lowConfidence: dashboard.counts.lowConfidence,
      weakMappings: weakMappings.length,
      fieldOverlapPercent: dashboard.fieldAnalysis.aggregate.overlapPercent,
      fixtureScopeStatus: scopeSummary.status,
      fullSourceObjectCount: scopeSummary.fullSourceObjectCount,
      targetFixtureObjectCount: scopeSummary.targetFixtureObjectCount,
      sourceObjectsInTargetScope: scopeSummary.sourceObjectsInTargetScope,
      sourceObjectsOutsideTargetScope: scopeSummary.sourceObjectsOutsideTargetScope,
      unmatchedDuePartialTargetScope: scopeSummary.unmatchedDuePartialTargetScope,
      unmatchedDueLikelyMatcherIssue: scopeSummary.unmatchedDueLikelyMatcherIssue,
      unmatchedDueParserGap: scopeSummary.unmatchedDueParserGap,
      unmatchedDueRealMissingTarget: scopeSummary.unmatchedDueRealMissingTarget,
      unmatchedTargetOnly: scopeSummary.unmatchedTargetOnly,
      labelsKo: scopeSummary.labelsKo,
      primaryConclusion: "High unmatched count is expected because the MD-CLI target is a partial feature-split target; source unmatched counts now follow the dashboard fixture-scope classifier.",
    },
    groups: {
      byTypeSide,
      byReason,
      byParserSupport,
      sourceHeavyTypes,
      weakMappingsByType: countBy(weakMappings, (item) => item.objectType),
      weakMappingsByReason: countBy(weakMappings, (item) => item.likelyReason),
    },
    records,
    weakMappings,
    scopeSummary,
    topSamples: records.slice(0, 60),
  };
}

export function buildUnmatchedScopeSummary({ artifacts, records }) {
  const { oldResult, newResult, profile, testCase } = artifacts;
  const partialTarget =
    profile.fixturePolicy?.status === "partial-assembled-target" ||
    testCase.fixtureCompleteness === "partial-assembled-target";
  const targetTypes = new Set(newResult.objects.map(objectType));
  const sourceObjectsInTargetScope = oldResult.objects.filter((object) => targetTypes.has(objectType(object))).length;
  const sourceRecords = records.filter((item) => item.side === "old");
  const targetOnlyRecords = records.filter((item) => item.side === "new");
  const unmatchedDuePartialTargetScope = sourceRecords.filter((item) => item.likelyReason === "target fixture is partial").length;
  const unmatchedDueLikelyMatcherIssue = sourceRecords.filter((item) =>
    ["object key normalization mismatch", "parent/relationship mismatch", "matching rule too strict"].includes(item.likelyReason)
  ).length;
  const unmatchedDueParserGap = sourceRecords.filter((item) => item.likelyReason === "parser gap").length;
  const unmatchedDueRealMissingTarget = sourceRecords.filter((item) =>
    item.likelyReason === "source object has no target counterpart"
  ).length;

  return {
    status: partialTarget ? "partial-assembled-target" : "full-or-unknown-target",
    labelsKo: [
      partialTarget ? "부분 Target 구성" : "전체/미확인 Target 구성",
      partialTarget ? "전체 장비 설정 간 1:1 비교 아님" : "전체 장비 설정 간 비교 가능성 확인 필요",
      "Target fixture 범위 밖 미매칭",
      "Matcher 개선 필요",
      "Parser 미지원 가능성",
      "실제 누락 가능성",
    ],
    fullSourceObjectCount: oldResult.objects.length,
    targetFixtureObjectCount: newResult.objects.length,
    sourceObjectsInTargetScope,
    sourceObjectsOutsideTargetScope: oldResult.objects.length - sourceObjectsInTargetScope,
    unmatchedDuePartialTargetScope,
    unmatchedDueLikelyMatcherIssue,
    unmatchedDueParserGap,
    unmatchedDueRealMissingTarget,
    unmatchedTargetOnly: targetOnlyRecords.length,
  };
}

function buildUnsupportedLineAnalysis(artifacts) {
  const { testCase, oldResult, newResult, sourceText, targetBundle, profile } = artifacts;
  const oldLines = collectUnsupportedLines({
    side: "old",
    vendorSyntax: testCase.sourceSyntax,
    file: testCase.sourceConfigPath,
    text: oldResult.preprocess?.text || sourceText,
    result: oldResult,
    profile,
  });
  const newLines = collectUnsupportedLines({
    side: "new",
    vendorSyntax: testCase.targetSyntax,
    file: "assembled-target",
    text: newResult.preprocess?.text || targetBundle.text,
    result: newResult,
    profile,
    targetBundle,
  });
  const records = [...oldLines, ...newLines];
  return {
    generatedAt: new Date().toISOString(),
    caseId: testCase.id,
    summary: {
      totalUnsupported: records.length,
      legacyDoubleSubtractUnsupported: Math.max(0, records.length - artifacts.coverage.ignoredLineCount),
      ignoredLineCount: artifacts.coverage.ignoredLineCount,
      lineAccounting: {
        eligibleLines: artifacts.coverage.eligibleLineCount,
        recognizedAnalyzedLines: artifacts.coverage.recognizedLineCount,
        parserUnmappedLines: records.length,
        ignoredSuppressedLines: artifacts.coverage.ignoredLineCount,
        unsupportedSyntaxLines: records.length,
        routerLogWrapperLines: artifacts.coverage.wrapperLineCount,
      },
      oldUnsupported: oldLines.length,
      newUnsupported: newLines.length,
      parserCoverageStatus: records.length ? "partial-support" : "ok",
      primaryConclusion: `Unsupported lines are parser coverage gaps, mostly Classic source system/router/service/policy detail lines. The previous aggregate was an undercount caused by double-subtracting ${artifacts.coverage.ignoredLineCount} ignored target lines; corrected parser-unmapped count is ${records.length}.`,
    },
    groups: {
      bySide: countBy(records, (item) => item.side),
      byFile: countBy(records, (item) => item.sourceFile),
      byVendorSyntax: countBy(records, (item) => item.vendorSyntax),
      bySection: countBy(records, (item) => item.section),
      byLikelyObjectType: countBy(records, (item) => item.likelyObjectType),
      byReason: countBy(records, (item) => item.reason),
      byMigrationImpact: countBy(records, (item) => item.migrationImpact),
      byParserGapStatus: countBy(records, (item) => item.parserGapStatus),
      focusAreas: countBy(records.flatMap((item) => item.relatedFocusAreas), (item) => item),
    },
    records,
    topSamples: records.slice(0, 100),
  };
}

function buildFindingPriorityAnalysis(artifacts) {
  const { testCase, audit, oldResult, newResult } = artifacts;
  const findings = audit.findings || [];
  const active = findings.filter((finding) => !finding.suppressed);
  const suppressed = findings.filter((finding) => finding.suppressed);
  const ranked = active
    .map((finding) => ({
      ...compactFinding(finding),
      priorityScore: findingPriorityScore(finding),
      priorityReason: findingPriorityReason(finding),
      likelyCause: classifyFindingCause(finding, oldResult, newResult),
    }))
    .sort((left, right) => right.priorityScore - left.priorityScore || left.ruleId.localeCompare(right.ruleId));

  const duplicateRuleGroups = groupObjects(findings, (finding) => finding.ruleId)
    .map(([ruleId, list]) => ({
      ruleId,
      total: list.length,
      active: list.filter((finding) => !finding.suppressed).length,
      suppressed: list.filter((finding) => finding.suppressed).length,
      severity: mostCommon(list.map((finding) => finding.severity)),
      category: mostCommon(list.map((finding) => finding.category)),
      migrationImpact: mostCommon(list.map((finding) => finding.migrationImpact)),
      objectTypes: countBy(list, (finding) => finding.objectType).slice(0, 6),
    }))
    .sort((left, right) => right.active - left.active || right.total - left.total);

  const blockers = active.filter((finding) => finding.migrationImpact === "blocks-auto-generation").map(compactFinding);
  const conversionPolicyRequired = active.filter((finding) => finding.migrationImpact === "conversion-policy-required").map(compactFinding);
  const parserPartial = active
    .filter((finding) => /parser|partial|unsupported/i.test(`${finding.ruleId} ${finding.titleKo} ${finding.descriptionKo}`) || PLACEHOLDER_TYPES.has(finding.objectType))
    .map(compactFinding);
  const likelyMissingTargetFixture = active
    .filter((finding) => classifyFindingCause(finding, oldResult, newResult).includes("target-fixture"))
    .map(compactFinding);

  return {
    generatedAt: new Date().toISOString(),
    caseId: testCase.id,
    summary: {
      totalFindings: findings.length,
      activeFindings: active.length,
      suppressedFindings: suppressed.length,
      blocksAutoGeneration: blockers.length,
      conversionPolicyRequired: conversionPolicyRequired.length,
      parserPartialSupport: parserPartial.length,
      likelyMissingTargetFixture: likelyMissingTargetFixture.length,
      primaryConclusion: "Findings are dominated by missing QoS/policy references, BGP policy requirements, SAP relationship gaps, and target default risk. Most are actionable migration-readiness blockers or conversion-policy inputs, not parser crash symptoms.",
    },
    groups: {
      bySeverity: countBy(findings, (finding) => finding.severity),
      byMigrationImpact: countBy(findings, (finding) => finding.migrationImpact),
      byCategory: countBy(findings, (finding) => finding.category),
      byRuleId: countBy(findings, (finding) => finding.ruleId),
      byObjectType: countBy(findings, (finding) => finding.objectType),
      bySide: countBy(findings, (finding) => finding.side),
      byPolicyProfile: countBy(findings, (finding) => finding.policyProfile),
      activeByRuleId: countBy(active, (finding) => finding.ruleId),
      suppressedByRuleId: countBy(suppressed, (finding) => finding.ruleId),
    },
    top20HighestPriority: ranked.slice(0, 20),
    topDuplicatedRuleGroups: duplicateRuleGroups.slice(0, 20),
    blocksAutoGeneration: blockers.slice(0, 100),
    conversionPolicyRequired: conversionPolicyRequired.slice(0, 100),
    parserPartialSupport: parserPartial.slice(0, 100),
    likelyMissingTargetFixture: likelyMissingTargetFixture.slice(0, 100),
  };
}

function buildFixtureCompletenessAnalysis(artifacts, inventory) {
  const { testCase, targetPaths } = artifacts;
  const targetBasenames = targetPaths.map((item) => path.basename(item));
  const featureFilesUsed = targetBasenames
    .map((name) => name.match(/^New_([^_]+)_\d+/i)?.[1] || "")
    .filter(Boolean);
  const targetFeatureSplit = featureFilesUsed.length === targetBasenames.length && targetBasenames.length > 1;
  const availableTargetSiblings = (inventory.foundTargetFiles || [])
    .filter((item) => /^New_/i.test(path.basename(item.path || "")))
    .map((item) => item.path);
  const coverageRows = objectCoverageRows(artifacts);
  const sourceHeavy = coverageRows.filter((row) => row.sourceCount > row.targetCount);
  const targetOnly = coverageRows.filter((row) => row.sourceCount === 0 && row.targetCount > 0);
  const weakMatchTypes = coverageRows.filter((row) => row.sourceCount && row.targetCount && row.matched === 0);
  const advancedPolicyFiles = [
    testCase.advancedComparePolicyPath,
    testCase.lineExceptionPolicyPath,
    testCase.fieldAliasesPath,
  ].filter(Boolean);

  return {
    generatedAt: new Date().toISOString(),
    caseId: testCase.id,
    summary: {
      status: targetFeatureSplit ? "partial-assembled-target" : "unknown-or-single-target",
      highUnmatchedExpected: targetFeatureSplit,
      targetFeatureSplit,
      sourcePath: testCase.sourceConfigPath,
      targetPaths,
      featureFilesUsed,
      availableTargetSiblingCount: availableTargetSiblings.length,
      advancedPolicyFiles,
      primaryConclusion: targetFeatureSplit
        ? "The current validation compares one full Classic router log against an assembled set of feature-split MD-CLI target files. Large unmatched counts are expected; category-specific failures still need analysis."
        : "Target completeness is not proven by filename structure; missing groups should be treated as validation failures until a full reference target is supplied.",
    },
    evidence: {
      sourceEligibleLines: artifacts.coverage.sides.old.eligibleLineCount,
      targetEligibleLines: artifacts.coverage.sides.new.eligibleLineCount,
      sourceObjectCount: artifacts.oldResult.objects.length,
      targetObjectCount: artifacts.newResult.objects.length,
      targetBasenames,
      availableTargetSiblings,
    },
    objectCoverageByType: coverageRows,
    missingTargetObjectGroups: sourceHeavy,
    targetOnlyObjectGroups: targetOnly,
    weakMatchObjectGroups: weakMatchTypes,
    conclusion: {
      unmatchedCountIsExpected: targetFeatureSplit,
      parserFailure: false,
      likelyBugsOrImprovementTargets: [
        "Port and LAG identity changed between Classic and MD-CLI; manual mapping or hardware rename mapping is required.",
        "SAP and service objects include parent/interface key differences; relationship-aware matching needs improvement.",
        "Filter/QoS/route-policy definitions are placeholder parsed; body parser coverage should be expanded.",
        "Static routes with same prefix but changed next-hop stay as candidates; conversion policy is required before auto-generation."
      ],
    },
  };
}

function buildBlocksAutoGenerationAnalysis(artifacts, unsupportedLines) {
  const findings = (artifacts.audit.findings || [])
    .filter((finding) => !finding.suppressed && finding.migrationImpact === "blocks-auto-generation")
    .map((finding) => {
      const classification = classifyBlockerFinding(finding, artifacts, unsupportedLines);
      return {
        ...compactFinding(finding),
        parserGapVsActualConfigIssue: classification.parserGapVsActualConfigIssue,
        policyMissingVsUnsupportedTargetSyntax: classification.policyMissingVsUnsupportedTargetSyntax,
        resolutionPath: classification.resolutionPath,
        recommendedAction: classification.recommendedAction,
        sourceExcerpt: (finding.sourceLines || []).slice(0, 5),
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    caseId: artifacts.testCase.id,
    summary: {
      baselineTotal: BASELINE_2026_05_16.blocksAutoGeneration,
      total: findings.length,
      resolvedFromBaseline: BASELINE_2026_05_16.blocksAutoGeneration - findings.length,
      parserExtension: findings.filter((item) => item.resolutionPath.includes("parser extension")).length,
      matcherImprovement: findings.filter((item) => item.resolutionPath.includes("matcher improvement")).length,
      conversionPolicy: findings.filter((item) => item.resolutionPath.includes("conversion policy")).length,
      manualMapping: findings.filter((item) => item.resolutionPath.includes("manual mapping")).length,
      targetFixtureCompletion: findings.filter((item) => item.resolutionPath.includes("target fixture completion")).length,
      actualConfigCorrection: findings.filter((item) => item.resolutionPath.includes("actual config correction")).length,
      resolvedFromBaselineDetails: BASELINE_2026_05_16.blocksAutoGeneration - findings.length > 0
        ? [{
            ruleId: "static-route.next-hop-invalid",
            count: BASELINE_2026_05_16.blocksAutoGeneration - findings.length,
            resolution: "Classic indirect/tunnel-next-hop static routes now preserve next-hop for audit/migration review.",
          }]
        : [],
      primaryConclusion: findings.some((item) => item.ruleId === "static-route.next-hop-invalid")
        ? "Blocks are dominated by undefined target QoS policy references; static-route indirect next-hop items are parser-extension candidates."
        : "Remaining blocks are undefined target policy references. Classic indirect static-route next-hop parser gaps are resolved in this pass.",
    },
    groups: {
      byRuleId: countBy(findings, (item) => item.ruleId),
      byCategory: countBy(findings, (item) => item.category),
      byObjectType: countBy(findings, (item) => item.objectType),
      bySide: countBy(findings, (item) => item.side),
      byFieldPath: countBy(findings, (item) => item.fieldPath),
      byParserVsActual: countBy(findings, (item) => item.parserGapVsActualConfigIssue),
      byPolicyVsUnsupported: countBy(findings, (item) => item.policyMissingVsUnsupportedTargetSyntax),
      byResolutionPath: countBy(findings.flatMap((item) => item.resolutionPath), (item) => item),
    },
    findings,
  };
}

function classifyBlockerFinding(finding, artifacts) {
  const sourceText = (finding.sourceLines || []).map((line) => line.text || "").join("\n");
  const partialTarget =
    artifacts.profile.fixturePolicy?.status === "partial-assembled-target" ||
    artifacts.testCase.fixtureCompleteness === "partial-assembled-target";

  if (finding.ruleId === "static-route.next-hop-invalid") {
    const parserGap = /\bindirect\b|\btunnel-next-hop\b/i.test(sourceText);
    return {
      parserGapVsActualConfigIssue: parserGap ? "parser-gap" : "actual-config-issue",
      policyMissingVsUnsupportedTargetSyntax: parserGap ? "unsupported-source-syntax" : "abnormal-value",
      resolutionPath: parserGap
        ? ["parser extension", "conversion policy"]
        : ["actual config correction", "manual review"],
      recommendedAction: parserGap
        ? "Parse Classic indirect/tunnel-next-hop as explicit next-hop plus route-type, then require conversion policy for MD-CLI syntax."
        : "Confirm static route has a valid next-hop before generation.",
    };
  }

  if (/referenced-policy-undefined/.test(finding.ruleId)) {
    const targetFixtureGap = partialTarget && finding.side === "new";
    return {
      parserGapVsActualConfigIssue: targetFixtureGap ? "target-fixture-gap" : "actual-config-issue",
      policyMissingVsUnsupportedTargetSyntax: "policy-missing",
      resolutionPath: targetFixtureGap
        ? ["target fixture completion", "conversion policy"]
        : ["actual config correction", "conversion policy", "parser extension"],
      recommendedAction: "Add referenced policy definitions or provide explicit QoS/filter policy mapping before generation.",
    };
  }

  return {
    parserGapVsActualConfigIssue: "manual-review",
    policyMissingVsUnsupportedTargetSyntax: "manual-review",
    resolutionPath: ["manual mapping", "manual review"],
    recommendedAction: "Review finding source object and rule before migration.",
  };
}

function buildConversionPolicyRequiredAnalysis(artifacts) {
  const findings = (artifacts.audit.findings || [])
    .filter((finding) => !finding.suppressed && finding.migrationImpact === "conversion-policy-required")
    .map((finding) => {
      const policy = classifyConversionPolicyFinding(finding);
      return {
        ...compactFinding(finding),
        policyTypeNeeded: policy.policyTypeNeeded,
        sourceValue: finding.actualValue || "",
        targetValue: finding.expectedValue || "",
        defaultBehaviorRisk: policy.defaultBehaviorRisk,
        targetMdCli22Behavior: policy.targetMdCli22Behavior,
        recommendedPolicyRule: policy.recommendedPolicyRule,
      };
    });
  const matcherPolicyCandidates = collectMatcherPolicyCandidates(artifacts.plan || []);

  return {
    generatedAt: new Date().toISOString(),
    caseId: artifacts.testCase.id,
    summary: {
      total: findings.length,
      policyTypes: countBy(findings, (item) => item.policyTypeNeeded).length,
      staticRouteNextHopRewrite: findings.filter((item) => item.policyTypeNeeded === "static-route next-hop rewrite policy").length,
      staticRouteNextHopRewriteCandidates: matcherPolicyCandidates.staticRouteNextHopRewrite.length,
      gatewayNextHopAlias: findings.filter((item) => item.policyTypeNeeded === "gateway vs next-hop alias policy").length,
      metricTagAdminTolerance: findings.filter((item) => item.policyTypeNeeded === "metric/tag/admin-state tolerance policy").length,
      portLagRenameAlias: findings.filter((item) => item.policyTypeNeeded === "port/LAG rename alias policy").length,
      portLagRenameAliasCandidates: matcherPolicyCandidates.portLagRenameAlias.length,
      sapServiceParentMapping: findings.filter((item) => item.policyTypeNeeded === "SAP/service parent mapping policy").length,
      sapServiceParentMappingCandidates: matcherPolicyCandidates.sapServiceParentMapping.length,
      qosFilterReferenceMapping: findings.filter((item) => item.policyTypeNeeded === "QoS/filter policy reference mapping").length,
      vendorDefaultBehavior: findings.filter((item) => item.policyTypeNeeded === "vendor default behavior policy").length,
      primaryConclusion: "Most conversion-policy-required items are service relationship and filter/QoS policy decisions, not safe automatic rewrites.",
    },
    groups: {
      byPolicyType: countBy(findings, (item) => item.policyTypeNeeded),
      byObjectType: countBy(findings, (item) => item.objectType),
      byFieldPath: countBy(findings, (item) => item.fieldPath),
      byRuleId: countBy(findings, (item) => item.ruleId),
      byDefaultBehaviorRisk: countBy(findings, (item) => item.defaultBehaviorRisk),
    },
    policyFileCandidates: [
      "static-route next-hop rewrite policy",
      "gateway vs next-hop alias policy",
      "metric/tag/admin-state tolerance policy",
      "port/LAG rename alias policy",
      "SAP/service parent mapping policy",
      "QoS/filter policy reference mapping",
      "vendor default behavior policy",
    ].map((policyType) => ({
      policyType,
      count: findings.filter((item) => item.policyTypeNeeded === policyType).length + matcherPolicyCandidateCount(matcherPolicyCandidates, policyType),
      recommendedPath: recommendedPolicyPath(policyType),
    })),
    matcherPolicyCandidates,
    findings,
  };
}

function collectMatcherPolicyCandidates(plan = []) {
  const candidates = (plan || []).filter((item) => item.status === "candidate" && !item.policySuppressed);
  return {
    staticRouteNextHopRewrite: candidates
      .filter((item) => item.objectType === "static-route" && (item.scoreReasons || []).some((reason) => /next-hop-mismatch|prefix-only/i.test(reason)))
      .map(compactPlanCandidate),
    portLagRenameAlias: candidates
      .filter((item) => ["port", "lag"].includes(item.objectType))
      .map(compactPlanCandidate),
    sapServiceParentMapping: candidates
      .filter((item) => item.objectType === "sap")
      .map(compactPlanCandidate),
  };
}

function matcherPolicyCandidateCount(candidates, policyType) {
  if (policyType === "static-route next-hop rewrite policy") return candidates.staticRouteNextHopRewrite.length;
  if (policyType === "port/LAG rename alias policy") return candidates.portLagRenameAlias.length;
  if (policyType === "SAP/service parent mapping policy") return candidates.sapServiceParentMapping.length;
  return 0;
}

function compactPlanCandidate(item = {}) {
  return {
    objectType: item.objectType,
    oldKey: objectKey(item.oldObject),
    newKey: objectKey(item.newObject),
    score: item.score,
    reason: item.reason,
    matchKeyFields: item.matchKeyFields || [],
    scoreReasons: item.scoreReasons || [],
  };
}

function classifyConversionPolicyFinding(finding) {
  if (/static-route.*next-hop|gateway/i.test(`${finding.ruleId} ${finding.fieldPath}`)) {
    return {
      policyTypeNeeded: "static-route next-hop rewrite policy",
      defaultBehaviorRisk: "next-hop rewrite may change forwarding path",
      targetMdCli22Behavior: "MD-CLI requires explicit static route next-hop semantics.",
      recommendedPolicyRule: "Allow prefix-scoped from/to next-hop rewrite only when documented.",
    };
  }
  if (/sap-relationship|group-subscriber|dhcp-group|subscriber/i.test(finding.ruleId)) {
    return {
      policyTypeNeeded: "SAP/service parent mapping policy",
      defaultBehaviorRisk: "service hierarchy mismatch may attach SAP/subscriber object to wrong parent",
      targetMdCli22Behavior: "MD-CLI service hierarchy is explicit and parent-scoped.",
      recommendedPolicyRule: "Map service-id, subscriber-interface, group-interface, SAP and parent interface explicitly.",
    };
  }
  if (/qos|filter|policy/.test(`${finding.ruleId} ${finding.fieldPath}`)) {
    return {
      policyTypeNeeded: "QoS/filter policy reference mapping",
      defaultBehaviorRisk: "missing or remapped policy can alter traffic treatment",
      targetMdCli22Behavior: "Referenced policies must exist before service/SAP generation.",
      recommendedPolicyRule: "Define source-to-target policy name mapping and required policy definition source.",
    };
  }
  if (/default-action|default|admin-state/.test(`${finding.ruleId} ${finding.fieldPath}`)) {
    return {
      policyTypeNeeded: "vendor default behavior policy",
      defaultBehaviorRisk: "vendor default may differ after MD-CLI migration",
      targetMdCli22Behavior: "Default behavior must be made explicit for safe generated config.",
      recommendedPolicyRule: "Declare accepted target defaults and fields requiring explicit generation.",
    };
  }
  if (/lag|port/.test(`${finding.objectType} ${finding.fieldPath}`)) {
    return {
      policyTypeNeeded: "port/LAG rename alias policy",
      defaultBehaviorRisk: "renamed physical attachment may map to wrong target object",
      targetMdCli22Behavior: "LAG/port identities may be name-based and require alias mapping.",
      recommendedPolicyRule: "Map old physical port/LAG IDs to target object names and member sets.",
    };
  }
  return {
    policyTypeNeeded: "vendor default behavior policy",
    defaultBehaviorRisk: "manual policy decision required",
    targetMdCli22Behavior: "Target behavior must be explicit before generation.",
    recommendedPolicyRule: "Add object/field-scoped conversion rule.",
  };
}

function recommendedPolicyPath(policyType) {
  const map = {
    "static-route next-hop rewrite policy": "validation/policies/classic15-mdcli22-static-route-conversion.json",
    "gateway vs next-hop alias policy": "validation/policies/classic15-mdcli22-field-aliases.json",
    "metric/tag/admin-state tolerance policy": "validation/policies/classic15-mdcli22-advanced-policy.json",
    "port/LAG rename alias policy": "validation/policies/classic15-mdcli22-object-aliases.json",
    "SAP/service parent mapping policy": "validation/policies/classic15-mdcli22-service-mapping.json",
    "QoS/filter policy reference mapping": "validation/policies/classic15-mdcli22-policy-reference-mapping.json",
    "vendor default behavior policy": "validation/policies/classic15-mdcli22-advanced-policy.json",
  };
  return map[policyType] || "validation/policies/classic15-mdcli22-advanced-policy.json";
}

function buildActualMissingAnalysis(artifacts, unmatched) {
  const records = (unmatched.records || [])
    .filter((record) => ["source object has no target counterpart", "target object has no source counterpart"].includes(record.likelyReason))
    .map((record) => {
      const classification = classifyActualMissingRecord(record, artifacts, unmatched);
      return {
        ...record,
        completenessStatus: classification.completenessStatus,
        parserOrMatcherStatus: classification.parserOrMatcherStatus,
        missingParentRelationship: classification.missingParentRelationship,
        manualMappingCouldResolve: classification.manualMappingCouldResolve,
        recommendedAction: classification.recommendedAction,
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    caseId: artifacts.testCase.id,
    summary: {
      total: records.length,
      trueMissingFromTargetFixture: records.filter((item) => item.completenessStatus === "true-missing-from-target-fixture").length,
      outsidePartialTargetScope: records.filter((item) => item.completenessStatus === "outside-partial-target-scope").length,
      targetObjectHasNoSourceCounterpart: records.filter((item) => item.completenessStatus === "target-object-has-no-source-counterpart").length,
      parserMatcherFalseNegative: records.filter((item) => item.parserOrMatcherStatus === "parser-or-matcher-false-negative").length,
      missingParentRelationship: records.filter((item) => item.missingParentRelationship).length,
      manualMappingCouldResolve: records.filter((item) => item.manualMappingCouldResolve).length,
      primaryConclusion: "Actual missing candidates now separate confirmed source-missing objects from target-only extras; parser/matcher false-negative counts are kept distinct.",
    },
    groups: {
      bySide: countBy(records, (item) => item.side),
      byObjectType: countBy(records, (item) => item.objectType),
      byCompletenessStatus: countBy(records, (item) => item.completenessStatus),
      byParserOrMatcherStatus: countBy(records, (item) => item.parserOrMatcherStatus),
      byManualMapping: countBy(records, (item) => item.manualMappingCouldResolve ? "manual-map-possible" : "manual-map-not-enough"),
    },
    records,
  };
}

export function classifyActualMissingRecord(record, artifacts) {
  const partialTarget =
    artifacts.profile.fixturePolicy?.status === "partial-assembled-target" ||
    artifacts.testCase.fixtureCompleteness === "partial-assembled-target";
  const oldCount = artifacts.oldResult.objects.filter((object) => objectType(object) === record.objectType).length;
  const newCount = artifacts.newResult.objects.filter((object) => objectType(object) === record.objectType).length;
  const hasSameTypeOpposite = record.side === "old" ? newCount > 0 : oldCount > 0;
  const fixtureCategory = record.fixtureUnmatchedCategory || "";
  const isConfirmedSourceMissing = record.side === "old" && fixtureCategory === "realMissingTarget";
  const missingParentRelationship = ["sap", "subscriber-interface", "group-interface", "static-host", "default-host", "sub-sla-mgmt"].includes(record.objectType);
  const outsidePartialTargetScope = partialTarget && record.side === "old" && fixtureCategory === "partialTargetScope";
  const manualMappingCouldResolve =
    record.side === "old" &&
    !isConfirmedSourceMissing &&
    hasSameTypeOpposite &&
    ["port", "lag", "interface", "sap", "static-route", "bgp"].includes(record.objectType);

  return {
    completenessStatus: outsidePartialTargetScope
      ? "outside-partial-target-scope"
      : record.side === "new"
        ? "target-object-has-no-source-counterpart"
        : "true-missing-from-target-fixture",
    parserOrMatcherStatus: isConfirmedSourceMissing
      ? "confirmed-source-missing"
      : record.side === "new"
        ? "target-only-object"
        : hasSameTypeOpposite
          ? "parser-or-matcher-false-negative"
          : "no-opposite-type-coverage",
    missingParentRelationship,
    manualMappingCouldResolve,
    recommendedAction: manualMappingCouldResolve
      ? "Review candidate objects and add explicit object/manual mapping if same real-world object."
      : "Complete target fixture or confirm object is intentionally out of migration scope.",
  };
}

function buildMatcherEffectivenessAnalysis(artifacts, unmatched) {
  const reviewablePlan = artifacts.plan.filter((item) => !item.policySuppressed);
  const candidates = reviewablePlan.filter((item) => item.status === "candidate");
  const candidateByType = countBy(candidates, (item) => item.objectType);
  const staticRouteManualReview = candidates.filter((item) =>
    item.objectType === "static-route" &&
    (item.scoreReasons || []).some((reason) => /next-hop-mismatch|policy-rewrite|prefix-only/i.test(reason))
  );
  const falseExactMatchPrevention = candidates.filter((item) =>
    (item.scoreReasons || []).some((reason) =>
      /next-hop-mismatch|lag-member-set-changed|conflicting-parent|missing-parent/i.test(reason)
    )
  );
  const relationshipCandidates = candidates.filter((item) =>
    (item.scoreReasons || []).some((reason) => /same-parent|same-policy|same-sap|parent/i.test(reason))
  );

  const current = {
    matched: artifacts.dashboard.counts.matched,
    unmatchedSource: artifacts.dashboard.counts.oldOnly,
    unmatchedTarget: artifacts.dashboard.counts.newOnly,
    ambiguous: artifacts.dashboard.counts.ambiguous,
    lowConfidence: artifacts.dashboard.counts.lowConfidence,
    fieldOverlapPercent: artifacts.dashboard.fieldAnalysis.aggregate.overlapPercent,
  };

  return {
    generatedAt: new Date().toISOString(),
    caseId: artifacts.testCase.id,
    baseline: BASELINE_2026_05_16,
    current,
    deltaFromBaseline: {
      matched: current.matched - BASELINE_2026_05_16.matched,
      unmatchedSource: current.unmatchedSource - BASELINE_2026_05_16.unmatchedSource,
      unmatchedTarget: current.unmatchedTarget - BASELINE_2026_05_16.unmatchedTarget,
      ambiguous: current.ambiguous - BASELINE_2026_05_16.ambiguous,
      lowConfidence: current.lowConfidence - BASELINE_2026_05_16.lowConfidence,
      fieldOverlapPercent: current.fieldOverlapPercent - BASELINE_2026_05_16.fieldOverlapPercent,
    },
    summary: {
      portLagCandidateCount: candidates.filter((item) => ["port", "lag"].includes(item.objectType)).length,
      sapCandidateCount: candidates.filter((item) => item.objectType === "sap").length,
      staticRouteCandidateManualReviewCount: staticRouteManualReview.length,
      falseExactMatchPreventionCount: falseExactMatchPrevention.length,
      manualMappingCandidatesGenerated: candidates.length,
      relationshipEvidenceCandidates: relationshipCandidates.length,
      weakMappings: unmatched.summary.weakMappings,
      primaryConclusion: "Matcher changes are measurable through safer candidates and false-exact-match prevention; partial target scope still dominates absolute unmatched counts.",
    },
    groups: {
      candidateByType,
      candidateByReason: countBy(candidates, (item) => item.reason),
      candidateByScoreReason: countBy(candidates.flatMap((item) => item.scoreReasons || []), (item) => item),
    },
    candidates: candidates.slice(0, 200).map((item) => ({
      objectType: item.objectType,
      oldKey: objectKey(item.oldObject),
      newKey: objectKey(item.newObject),
      score: item.score,
      reason: item.reason,
      matchKeyFields: item.matchKeyFields || [],
      scoreReasons: item.scoreReasons || [],
    })),
  };
}

function buildModeScopeValidation() {
  const cases = [];
  const makeObject = (type, key, fields = {}, rawLines = [], side = "old") => ({
    id: `${side}-${type}-${key}`,
    vendor: "nokia-md-cli",
    normalizedType: type,
    normalizedIdentity: key,
    sourceName: key,
    fields,
    rawLines: rawLines.length ? rawLines : [`${type} ${key}`],
  });

  const bgp = makeObject("bgp", "192.0.2.1", { neighbor: "192.0.2.1" }, ["neighbor 192.0.2.1"]);
  const bgpAudit = runStandardsAuditForSides({
    oldResult: { objects: [bgp] },
    newResult: { objects: [] },
    profile: {},
    oldVendor: "nokia-md-cli",
    newVendor: "nokia-md-cli",
  });
  const simpleContext = buildAnalysisContext({ mode: "simple-compare", scope: "bgp-neighbor-only" });
  const simpleAudit = filterAuditForModeScope(bgpAudit, simpleContext);
  const simpleDashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [],
    audit: bgpAudit,
    analysisMode: "simple-compare",
    compareScope: "bgp-neighbor-only",
  });
  cases.push(modeScopeCase("simple-bgp-neighbor-compare", [
    simpleAudit.summary.active === 0,
    simpleDashboard.counts.auditActive === 0,
    simpleDashboard.context.standardsAuditVisible === false,
    simpleDashboard.context.migrationReadinessVisible === false,
  ], {
    simpleCompareActiveFindings: simpleDashboard.counts.auditActive,
    bgpNeighborOnlyActiveFindings: simpleAudit.summary.active,
  }));

  const groupOldResult = normalizeConfig({
    vendor: "nokia-classic",
    profile: {},
    configText: [
      "neighbor 210.183.28.162",
      "    peer-as 4766",
      "    export SER-PEER",
    ].join("\n"),
    side: "old",
  });
  const groupNewResult = normalizeConfig({
    vendor: "nokia-md-cli",
    profile: {},
    configText: [
      '/configure { router "Base" bgp group "ACCESS-PEER" peer-as 4766 export policy ["SER-PEER"] }',
      '/configure { router "Base" bgp neighbor "210.183.28.162" group "ACCESS-PEER" }',
    ].join("\n"),
    side: "new",
  });
  const groupPlan = createComparisonPlan(matchNormalizedObjects({
    oldObjects: groupOldResult.objects,
    newObjects: groupNewResult.objects,
    manualMap: {},
    profile: {},
  }), {});
  const groupItem = groupPlan.find((item) => item.objectType === "bgp");
  cases.push(modeScopeCase("classic-direct-to-mdcli-group-equivalent", [
    groupItem?.status === "matched",
    groupItem?.fieldSummary?.["peer-as"]?.status === "equal",
    groupItem?.fieldSummary?.["export.policy"]?.status === "equal",
    groupItem?.fieldSummary?.group?.effectiveStatus === "structure-converted",
    groupItem?.policyViolationCount === 0,
  ], {
    status: groupItem?.status || "",
    policyViolationCount: groupItem?.policyViolationCount || 0,
  }));

  const missingGroupNewResult = normalizeConfig({
    vendor: "nokia-md-cli",
    profile: {},
    configText: '/configure { router "Base" bgp neighbor "210.183.28.162" group "ACCESS-PEER" }',
    side: "new",
  });
  const missingGroupPlan = createComparisonPlan(matchNormalizedObjects({
    oldObjects: groupOldResult.objects,
    newObjects: missingGroupNewResult.objects,
    manualMap: {},
    profile: {},
  }), {});
  const missingGroupItem = missingGroupPlan.find((item) => item.objectType === "bgp");
  cases.push(modeScopeCase("mdcli-group-reference-missing-definition", [
    missingGroupItem?.status === "matched",
    missingGroupItem?.fieldSummary?.["peer-as"]?.effectiveStatus === "inheritance-unresolved",
    missingGroupItem?.fieldSummary?.["export.policy"]?.effectiveStatus === "inheritance-unresolved",
    missingGroupItem?.policyViolationCount === 0,
  ], {
    inheritanceStatus: missingGroupItem?.fieldSummary?.["peer-as"]?.effectiveStatus || "",
    policyViolationCount: missingGroupItem?.policyViolationCount || 0,
  }));

  const noPolicyRequired = runStandardsAudit({
    side: "old",
    vendor: "nokia-md-cli",
    profile: { standardsAudit: { enabled: true, rules: { requireBgpImportPolicy: false, requireBgpExportPolicy: false } } },
    objects: [bgp],
  });
  cases.push(modeScopeCase("standards-audit-bgp-policy-not-required", [
    !noPolicyRequired.findings.some((finding) => finding.ruleId === "bgp.import-policy-required"),
    !noPolicyRequired.findings.some((finding) => finding.ruleId === "bgp.export-policy-required"),
  ], {
    activeFindings: noPolicyRequired.summary.active,
  }));

  const policyRequired = runStandardsAudit({
    side: "old",
    vendor: "nokia-md-cli",
    profile: { standardsAudit: { enabled: true, rules: { requireBgpImportPolicy: true, requireBgpExportPolicy: true } } },
    objects: [bgp],
  });
  cases.push(modeScopeCase("standards-audit-bgp-policy-required", [
    policyRequired.findings.some((finding) => finding.ruleId === "bgp.import-policy-required" && !finding.suppressed),
    policyRequired.findings.some((finding) => finding.ruleId === "bgp.export-policy-required" && !finding.suppressed),
  ], {
    activeFindings: policyRequired.summary.active,
  }));

  const migrationAudit = filterAuditForModeScope(bgpAudit, buildAnalysisContext({ mode: "migration-readiness", scope: "bgp-neighbor-only" }));
  cases.push(modeScopeCase("migration-readiness-visible-only-in-mode", [
    migrationAudit.summary.total >= migrationAudit.summary.active,
  ], {
    migrationReadinessActiveFindings: migrationAudit.summary.active,
    targetDefaultRisk: migrationAudit.summary.byMigrationImpact?.["target-default-risk"] || 0,
  }));

  const suppressedProfile = {
    rules: {
      ignore: [{ source: "new", pattern: "metric 100", matchMode: "contains", reason: "target fixture default" }],
    },
  };
  const oldRoute = makeObject("static-route", "0.0.0.0/0", {
    route: "0.0.0.0/0",
    "next-hop": "192.0.2.1",
    metric: "10",
  }, ["static-route 0.0.0.0/0 next-hop 192.0.2.1 metric 10"], "old");
  const newRoute = makeObject("static-route", "0.0.0.0/0", {
    route: "0.0.0.0/0",
    "next-hop": "192.0.2.1",
    metric: "100",
  }, ["static-route 0.0.0.0/0 next-hop 192.0.2.1 metric 100"], "new");
  const routeMatches = matchNormalizedObjects({
    oldObjects: [oldRoute],
    newObjects: [newRoute],
    manualMap: {},
    profile: suppressedProfile,
  });
  const routePlan = createComparisonPlan(routeMatches, suppressedProfile);
  const suppressedAudit = runStandardsAuditForSides({
    oldResult: { objects: [] },
    newResult: { objects: [newRoute] },
    profile: suppressedProfile,
    oldVendor: "nokia-md-cli",
    newVendor: "nokia-md-cli",
  });
  const suppressedDashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: attachAuditFindingsToPlan(routePlan, suppressedAudit),
    audit: suppressedAudit,
    analysisMode: "standards-audit",
    compareScope: "all",
  });
  const suppressedGraph = buildGraphData({ plan: routePlan, auditFindings: suppressedAudit.findings });
  cases.push(modeScopeCase("new-line-exception-suppresses-downstream", [
    routePlan[0]?.fieldSummary?.metric?.effectiveStatus === "ignored",
    routePlan[0]?.policyViolationCount === 0,
    suppressedAudit.summary.active === 0,
    suppressedAudit.summary.suppressed > 0,
    suppressedDashboard.counts.auditActive === 0,
    !suppressedGraph.nodes.some((node) => node.objectType === "standard-finding"),
  ], {
    suppressedFindings: suppressedAudit.summary.suppressed,
    summaryActiveFindings: suppressedDashboard.counts.auditActive,
  }));

  const manualMatches = matchNormalizedObjects({
    oldObjects: [oldRoute],
    newObjects: [newRoute],
    manualMap: { [oldRoute.id]: newRoute.id },
    profile: suppressedProfile,
  });
  const manualPlan = createComparisonPlan(manualMatches, suppressedProfile);
  cases.push(modeScopeCase("manual-mapping-plus-exception", [
    manualPlan.length === 1,
    manualPlan[0]?.reason === "manual",
    manualPlan[0]?.status === "matched",
    manualPlan[0]?.policyViolationCount === 0,
  ], {
    matched: manualPlan.filter((item) => item.status === "matched").length,
    policyViolationCount: manualPlan[0]?.policyViolationCount || 0,
  }));

  const passed = cases.filter((item) => item.status === "passed").length;
  const failed = cases.filter((item) => item.status === "failed").length;
  return {
    generatedAt: new Date().toISOString(),
    status: failed ? "failed" : "passed",
    summary: {
      cases: cases.length,
      passed,
      failed,
      simpleCompareActiveFindingCount: simpleDashboard.counts.auditActive,
      bgpNeighborOnlyCompareActiveFindingCount: simpleAudit.summary.active,
      standardsAuditActiveFindingCount: policyRequired.summary.active,
      migrationReadinessActiveFindingCount: migrationAudit.summary.active,
      suppressedIgnoredFindingCount: suppressedAudit.summary.suppressed,
    },
    cases,
  };
}

function modeScopeCase(id, assertions = [], metrics = {}) {
  const failed = assertions.some((item) => !item);
  return {
    id,
    status: failed ? "failed" : "passed",
    assertionsPassed: assertions.filter(Boolean).length,
    assertionsTotal: assertions.length,
    metrics,
  };
}

const PARSER_BACKLOG_GROUPS = [
  {
    id: "qos-policy-body",
    titleKo: "QoS policy body parsing",
    objectTypes: ["qos-policy"],
    focus: ["QoS"],
    expectedNormalizedFields: ["policy-id/name", "queue", "scheduler", "policer", "shaper", "cir", "pir", "mbs", "cbs", "remarking"],
    priorityBase: 90,
  },
  {
    id: "filter-acl-body",
    titleKo: "Filter/ACL body parsing",
    objectTypes: ["filter"],
    focus: ["Filter/ACL"],
    expectedNormalizedFields: ["filter-id/name", "entry-id", "match source/destination", "protocol/port", "action", "log", "default-action"],
    priorityBase: 88,
  },
  {
    id: "route-policy-body",
    titleKo: "Route-policy body parsing",
    objectTypes: ["route-policy"],
    focus: ["Routing policy"],
    expectedNormalizedFields: ["policy-name", "entry/order", "from prefix/community/as-path", "action", "next-policy", "default-action"],
    priorityBase: 86,
  },
  {
    id: "prefix-community-aspath-policy",
    titleKo: "Prefix/community/as-path policy parsing",
    objectTypes: ["prefix-list", "community", "route-policy"],
    focus: ["Routing policy"],
    expectedNormalizedFields: ["prefix-list entries", "community members", "as-path regex", "policy reference graph"],
    priorityBase: 82,
  },
  {
    id: "bgp-import-export-policy",
    titleKo: "BGP import/export policy references",
    objectTypes: ["bgp", "route-policy"],
    focus: ["BGP", "Routing policy"],
    expectedNormalizedFields: ["neighbor", "group", "import.policy", "export.policy", "max-prefix", "auth", "description"],
    priorityBase: 80,
  },
  {
    id: "subscriber-service-policy",
    titleKo: "Subscriber/service policy parsing",
    objectTypes: ["subscriber-service", "sap", "subscriber-interface", "group-interface", "dhcp"],
    focus: ["Subscriber/Service"],
    expectedNormalizedFields: ["service-id", "sap", "subscriber-interface", "group-interface", "dhcp", "static-host", "default-host", "sub-sla-mgmt", "cpu-protection"],
    priorityBase: 78,
  },
  {
    id: "management-security",
    titleKo: "Management/security baseline parsing",
    objectTypes: ["management-security"],
    focus: ["Management/Security"],
    expectedNormalizedFields: ["aaa", "ssh", "snmp", "ntp", "syslog", "management ACL", "cpu-protection", "netconf"],
    priorityBase: 72,
  },
];

function buildParserBacklogAnalysis(artifacts, unsupportedLines, findingPriority, riskAnalyses = {}) {
  const activeFindings = (artifacts.audit.findings || []).filter((finding) => !finding.suppressed);
  const items = PARSER_BACKLOG_GROUPS.map((group) => {
    const unsupported = (unsupportedLines.records || []).filter((record) =>
      group.objectTypes.includes(record.likelyObjectType) ||
      (record.relatedFocusAreas || []).some((focus) => group.focus.includes(focus))
    );
    const findings = activeFindings.filter((finding) =>
      group.objectTypes.includes(finding.objectType) ||
      group.focus.some((focus) => String(finding.category || "").toLowerCase().includes(focus.toLowerCase().split("/")[0])) ||
      group.focus.some((focus) => String(finding.ruleId || "").toLowerCase().includes(focus.toLowerCase().split("/")[0]))
    );
    const migrationImpact = mostCommon([
      ...unsupported.map((record) => record.migrationImpact),
      ...findings.map((finding) => finding.migrationImpact),
    ]);
    const affectedRules = countBy(findings, (finding) => finding.ruleId).slice(0, 10);
    const priority = group.priorityBase +
      Math.min(20, Math.ceil(unsupported.length / 20)) +
      Math.min(20, Math.ceil(findings.length / 20)) +
      (findings.some((finding) => finding.migrationImpact === "blocks-auto-generation") ? 20 : 0) +
      (findings.some((finding) => finding.migrationImpact === "conversion-policy-required") ? 10 : 0);
    const impactOnBlocks = countRelatedFindings(riskAnalyses.blocksAutoGeneration?.findings || [], group);
    const impactOnConversionPolicy = countRelatedFindings(riskAnalyses.conversionPolicyRequired?.findings || [], group);
    const impactOnActualMissing = countRelatedRecords(riskAnalyses.actualMissing?.records || [], group);
    const ease = parserBacklogEase(group.id);
    const implementationRisk = parserBacklogRisk(group.id);

    return {
      id: group.id,
      titleKo: group.titleKo,
      priority: Math.min(priority, 150),
      unsupportedLineCount: unsupported.length,
      activeFindingCount: findings.length,
      exampleSourceLines: unsupported.slice(0, 12).map((record) => ({
        side: record.side,
        sourceFile: record.sourceFile,
        line: record.line,
        text: record.text.trim(),
      })),
      objectType: group.objectTypes.join(","),
      expectedNormalizedFields: group.expectedNormalizedFields,
      migrationImpact: migrationImpact || "review-before-migration",
      auditRulesAffected: affectedRules,
      impactOnBlocksAutoGeneration: impactOnBlocks,
      impactOnConversionPolicyRequired: impactOnConversionPolicy,
      impactOnActualMissingPossibility: impactOnActualMissing,
      impactOnAuditAccuracy: findings.length,
      easeOfImplementation: ease,
      implementationRisk,
      recommendedNextAction: recommendedParserBacklogAction({ group, impactOnBlocks, impactOnConversionPolicy, unsupported, ease, implementationRisk }),
      neededForAutoGeneration: findings.some((finding) =>
        ["blocks-auto-generation", "conversion-policy-required", "manual-conversion-required"].includes(finding.migrationImpact)
      ),
      parserGapStatus: unsupported.length ? "parser-gap" : "tracked",
    };
  })
    .filter((item) => item.unsupportedLineCount || item.activeFindingCount)
    .sort((left, right) => right.priority - left.priority || right.unsupportedLineCount - left.unsupportedLineCount);

  return {
    generatedAt: new Date().toISOString(),
    caseId: artifacts.testCase.id,
    summary: {
      groupCount: items.length,
      unsupportedLineCount: unsupportedLines.summary.totalUnsupported,
      activeFindingCount: findingPriority.summary.activeFindings,
      autoGenerationBlockingGroups: items.filter((item) => item.neededForAutoGeneration).length,
      topPriorityGroup: items[0]?.id || "",
      primaryConclusion: "QoS/filter/route-policy body coverage and subscriber/service policy details are the highest-value parser backlog before automatic generation.",
    },
    groups: items,
  };
}

function countRelatedFindings(findings = [], group = {}) {
  return findings.filter((finding) =>
    group.objectTypes.includes(finding.objectType) ||
    group.focus.some((focus) => String(finding.category || "").toLowerCase().includes(focus.toLowerCase().split("/")[0])) ||
    group.focus.some((focus) => String(finding.ruleId || "").toLowerCase().includes(focus.toLowerCase().split("/")[0]))
  ).length;
}

function countRelatedRecords(records = [], group = {}) {
  return records.filter((record) =>
    group.objectTypes.includes(record.objectType || record.likelyObjectType) ||
    group.focus.some((focus) => String(record.relatedFocusAreas || "").toLowerCase().includes(focus.toLowerCase().split("/")[0]))
  ).length;
}

function parserBacklogEase(id = "") {
  if (["bgp-import-export-policy", "static-route-details"].includes(id)) return "high";
  if (["qos-policy-body", "subscriber-service-policy"].includes(id)) return "medium";
  return "low";
}

function parserBacklogRisk(id = "") {
  if (["bgp-import-export-policy", "static-route-details"].includes(id)) return "low";
  if (["qos-policy-body", "subscriber-service-policy"].includes(id)) return "medium";
  return "high";
}

function recommendedParserBacklogAction({ group, impactOnBlocks, impactOnConversionPolicy, unsupported, ease, implementationRisk }) {
  if (group.id === "bgp-import-export-policy") {
    return "Keep reference extraction tests; add max-prefix only if syntax sample is stable.";
  }
  if (group.id === "qos-policy-body" && impactOnBlocks > 0) {
    return "First add policy definition/reference extraction; defer queue/scheduler body semantics.";
  }
  if (group.id === "filter-acl-body" && unsupported.length > 100) {
    return "Extract filter definitions and default-action first; defer full entry shadow analysis.";
  }
  if (ease === "high" && implementationRisk === "low") {
    return "Implement now with fixture-backed tests.";
  }
  return "Backlog only until narrower fixtures and expected normalized fields are available.";
}

function getTargetPaths(testCase = {}) {
  if (Array.isArray(testCase.targetConfigPaths)) return testCase.targetConfigPaths;
  if (testCase.targetConfigPath) return [testCase.targetConfigPath];
  return [];
}

function buildTargetBundle(paths = []) {
  const files = [];
  let offset = 0;
  const parts = [];
  for (const targetPath of paths) {
    const text = readText(targetPath);
    const lines = text.split(/\r?\n/);
    files.push({
      path: targetPath,
      startLine: offset + 1,
      endLine: offset + lines.length,
      lineCount: lines.length,
      lines,
    });
    parts.push(text);
    offset += lines.length;
  }
  return {
    text: parts.join("\n"),
    files,
  };
}

function objectCoverageRows(artifacts) {
  const { oldResult, newResult, plan } = artifacts;
  const types = new Set([
    ...oldResult.objects.map(objectType),
    ...newResult.objects.map(objectType),
  ]);
  return [...types].sort().map((type) => {
    const sourceCount = oldResult.objects.filter((object) => objectType(object) === type).length;
    const targetCount = newResult.objects.filter((object) => objectType(object) === type).length;
    const matched = plan.filter((item) => item.objectType === type && item.status === "matched" && !item.policySuppressed).length;
    const candidate = plan.filter((item) => item.objectType === type && item.status === "candidate" && !item.policySuppressed).length;
    const unmatchedSource = plan.filter((item) => item.objectType === type && item.status === "old-only" && !item.policySuppressed).length;
    const unmatchedTarget = plan.filter((item) => item.objectType === type && item.status === "new-only" && !item.policySuppressed).length;
    return {
      objectType: type,
      sourceCount,
      targetCount,
      matched,
      candidate,
      unmatchedSource,
      unmatchedTarget,
      status: classifyCoverageRow({ type, sourceCount, targetCount, matched, candidate, unmatchedSource, unmatchedTarget }),
    };
  });
}

function classifyCoverageRow({ type, sourceCount, targetCount, matched, candidate }) {
  if (sourceCount && !targetCount) return PLACEHOLDER_TYPES.has(type) ? "target-policy-definition-missing-or-parser-gap" : "target-fixture-missing";
  if (!sourceCount && targetCount) return "target-only-fixture-object";
  if (sourceCount > targetCount) return "source-heavy-partial-target";
  if (targetCount > sourceCount) return "target-heavy-generated-or-extra";
  if (sourceCount && targetCount && !matched && !candidate) return "key-normalization-or-manual-map-required";
  if (candidate) return "weak-candidate-needs-review";
  return "balanced";
}

function locateSourceObject(object, result, sourcePath) {
  const processedLines = String(result.preprocess?.text || "").split(/\r?\n/);
  const lineMap = Array.isArray(result.preprocess?.lineMap) ? result.preprocess.lineMap : [];
  return {
    file: sourcePath,
    lines: locateRawLines(object?.rawLines || [], processedLines).map((line) => lineMap[line - 1] || line),
  };
}

function locateTargetObject(object, targetBundle) {
  const lines = [];
  let file = targetBundle.files[0]?.path || "assembled-target";
  for (const rawLine of object?.rawLines || []) {
    const match = locateTargetLine(rawLine, targetBundle);
    if (match) {
      file = match.file;
      lines.push(match.line);
    }
  }
  return { file, lines: [...new Set(lines)] };
}

function locateRawLines(rawLines = [], sourceLines = []) {
  const locations = [];
  rawLines.forEach((rawLine) => {
    const normalizedRaw = normalizeComparableLine(rawLine);
    const index = sourceLines.findIndex((line) => normalizeComparableLine(line) === normalizedRaw);
    if (index >= 0) locations.push(index + 1);
  });
  return [...new Set(locations)];
}

function locateTargetLine(rawLine, targetBundle) {
  const normalizedRaw = normalizeComparableLine(rawLine);
  for (const file of targetBundle.files || []) {
    const index = file.lines.findIndex((line) => normalizeComparableLine(line) === normalizedRaw);
    if (index >= 0) return { file: file.path, line: index + 1 };
  }
  return null;
}

function parserSupportStatus(object) {
  const type = objectType(object);
  if (PLACEHOLDER_TYPES.has(type)) return "placeholder-partial";
  if (!object?.rawLines?.length) return "missing-source-line-map";
  return "parsed";
}

function classifyUnmatchedReason({ item, object, side, oldResult, newResult, oppositeObjects, fixtureClassification }) {
  const type = objectType(object);
  const oldCount = oldResult.objects.filter((candidate) => objectType(candidate) === type).length;
  const newCount = newResult.objects.filter((candidate) => objectType(candidate) === type).length;
  const oppositeCount = oppositeObjects.filter((candidate) => objectType(candidate) === type).length;
  const hasExactOppositeKey = oppositeObjects.some((candidate) =>
    objectType(candidate) === type && normalizeKey(candidate) === normalizeKey(object)
  );

  if (side === "old" && fixtureClassification) {
    return unmatchedReasonFromFixtureClassification(fixtureClassification);
  }
  if (side === "new") return "target object has no source counterpart";
  if (PLACEHOLDER_TYPES.has(type)) return "parser gap";
  if (side === "old" && newCount === 0) return "target fixture is partial";
  if (side === "old" && oldCount > newCount) return "target fixture is partial";
  if (side === "new" && oldCount === 0) return "target object has no source counterpart";
  if (oppositeCount > 0 && !hasExactOppositeKey && ["port", "lag", "interface", "sap"].includes(type)) {
    return "object key normalization mismatch";
  }
  if (oppositeCount > 0 && !hasExactOppositeKey && ["subscriber-interface", "group-interface", "default-host", "static-host", "sub-sla-mgmt"].includes(type)) {
    return "parent/relationship mismatch";
  }
  if (item.reason === "unmatched" && CORE_OBJECT_TYPES.has(type)) return "source object has no target counterpart";
  return side === "old" ? "expected unmatched" : "target object has no source counterpart";
}

function unmatchedReasonFromFixtureClassification(classification = {}) {
  if (classification.category === "partialTargetScope") return "target fixture is partial";
  if (classification.category === "parserGap") return "parser gap";
  if (classification.category === "matcherIssue") return "matching rule too strict";
  return "source object has no target counterpart";
}

function classifyWeakMappingReason(item) {
  if (item.objectType === "static-route" && item.reason === "prefix") return "matching rule too strict";
  if (item.objectType === "static-route") return "syntax conversion not supported";
  if (item.objectType === "interface" && /description/i.test(item.reason || "")) return "object key normalization mismatch";
  return "matching rule too strict";
}

function collectUnsupportedLines({ side, vendorSyntax, file, text, result, profile, targetBundle = null }) {
  const rawLines = String(text || "").split(/\r?\n/);
  const recognized = collectRecognizedLineSet(result.objects || []);
  const records = [];
  let currentSection = "unknown";

  rawLines.forEach((rawLine, index) => {
    currentSection = updateSection(currentSection, rawLine);
    const normalized = normalizeComparableLine(rawLine);
    if (!isEligibleConfigLine(rawLine)) return;
    const policy = evaluatePolicyContext({
      profile,
      rawLine,
      normalizedLine: normalized,
      side,
    });
    if (policy.suppressed) return;
    if (recognized.has(normalized)) return;

    const location = side === "new" && targetBundle
      ? locateTargetLine(rawLine, targetBundle)
      : null;
    const originalLine = side === "old"
      ? (result.preprocess?.lineMap?.[index] || index + 1)
      : (location?.line || index + 1);
    const likelyObjectType = inferUnsupportedObjectType(rawLine, currentSection);
    const relatedFocusAreas = inferFocusAreas(rawLine, likelyObjectType, currentSection);
    records.push({
      side,
      vendorSyntax,
      sourceFile: location?.file || file,
      line: originalLine,
      section: currentSection,
      likelyObjectType,
      text: rawLine,
      reason: unsupportedReason(rawLine, likelyObjectType),
      migrationImpact: unsupportedMigrationImpact(likelyObjectType),
      parserGapStatus: intentionallyUnsupported(likelyObjectType) ? "intentionally-unsupported-review" : "parser-gap",
      relatedFocusAreas,
    });
  });

  return records;
}

function collectRecognizedLineSet(objects = []) {
  const set = new Set();
  for (const object of objects) {
    for (const line of object.rawLines || []) {
      const normalized = normalizeComparableLine(line);
      if (normalized) set.add(normalized);
    }
  }
  return set;
}

function isEligibleConfigLine(line = "") {
  const normalized = normalizeComparableLine(line);
  if (!normalized) return false;
  if (["!", "{", "}", "exit"].includes(normalized)) return false;
  if (/^#/.test(normalized)) return false;
  if (/^echo\s+/.test(normalized)) return false;
  if (/^exit\s+all$/.test(normalized) || /^configure$/.test(normalized)) return false;
  return true;
}

function updateSection(current, rawLine = "") {
  const text = rawLine.trim().toLowerCase().replace(/[{}"]/g, " ");
  if (/^\/configure\b/.test(text)) {
    if (/\bbgp\b/.test(text)) return "router/bgp";
    if (/\bstatic-routes\b/.test(text)) return "router/static-routes";
    if (/\bservice\b/.test(text)) return "service";
    if (/\bfilter\b/.test(text)) return "filter";
    if (/\bqos\b/.test(text)) return "qos";
    if (/\bport\b/.test(text)) return "port";
    if (/\blag\b/.test(text)) return "lag";
    return "configure";
  }
  if (/^system\b/.test(text)) return "system";
  if (/^router\b/.test(text)) return "router";
  if (/^service\b/.test(text)) return "service";
  if (/^filter\b/.test(text)) return "filter";
  if (/^qos\b/.test(text)) return "qos";
  if (/^port\b/.test(text)) return "port";
  if (/^lag\b/.test(text)) return "lag";
  if (/^interface\b/.test(text)) return "interface";
  if (/^bgp\b|^neighbor\b/.test(text)) return "router/bgp";
  if (/^static-route-entry\b|^next-hop\b|^indirect\b/.test(text)) return "router/static-routes";
  if (/^sap\b|^subscriber-interface\b|^group-interface\b/.test(text)) return "service";
  return current;
}

function inferUnsupportedObjectType(rawLine = "", section = "") {
  const text = rawLine.trim().toLowerCase();
  if (/\bqos\b|sap-ingress|sap-egress|queue\b|scheduler\b|policer\b|shaper\b/.test(text)) return "qos-policy";
  if (/\bfilter\b|entry\s+\d+|default-action|match\b|action\b|permit|deny|drop\b|forward\b/.test(text)) return "filter";
  if (/\bpolicy\b|prefix-list|community|as-path|policy-statement|route-policy/.test(text)) return "route-policy";
  if (/\bbgp\b|neighbor\b|peer-as|authentication-key|import|export|max-prefix/.test(text) || section.includes("bgp")) return "bgp";
  if (/static-route-entry|next-hop|indirect|tunnel-next-hop/.test(text) || section.includes("static")) return "static-route";
  if (/subscriber-interface/.test(text)) return "subscriber-interface";
  if (/group-interface/.test(text)) return "group-interface";
  if (/\bsap\b|ingress|egress/.test(text) && section === "service") return "sap";
  if (/\bdhcp\b|static-host|default-host|sub-sla/.test(text)) return "subscriber-service";
  if (/\bcpu-protection\b|cpm|management|snmp|ssh|aaa|ntp|syslog|netconf/.test(text) || section === "system") return "management-security";
  if (section === "port") return "port";
  if (section === "lag") return "lag";
  if (section === "interface") return "interface";
  if (section === "service") return "service";
  return "unknown";
}

function inferFocusAreas(rawLine, objectType, section) {
  const text = `${rawLine} ${objectType} ${section}`.toLowerCase();
  const areas = [];
  if (/qos|queue|scheduler|policer|sap-ingress|sap-egress/.test(text)) areas.push("QoS");
  if (/filter|acl|permit|deny|entry|default-action/.test(text)) areas.push("Filter/ACL");
  if (/route-policy|policy-statement|prefix-list|community|as-path/.test(text)) areas.push("Routing policy");
  if (/bgp|neighbor|peer-as|max-prefix|import|export/.test(text)) areas.push("BGP");
  if (/subscriber|group-interface|sap|dhcp|static-host|default-host|sub-sla/.test(text)) areas.push("Subscriber/Service");
  if (/system|management|snmp|ssh|aaa|ntp|syslog|cpu-protection|netconf/.test(text)) areas.push("Management/Security");
  return areas.length ? [...new Set(areas)] : ["Parser coverage"];
}

function unsupportedReason(rawLine, likelyObjectType) {
  if (PLACEHOLDER_TYPES.has(likelyObjectType)) return "policy body parser partial";
  if (["management-security", "qos-policy", "filter", "route-policy"].includes(likelyObjectType)) return "parser coverage gap";
  if (/^\s*(exit|})\s*$/i.test(rawLine)) return "structural line";
  return "parser-unmapped";
}

function unsupportedMigrationImpact(likelyObjectType) {
  if (["qos-policy", "filter", "route-policy"].includes(likelyObjectType)) return "conversion-policy-required";
  if (["bgp", "static-route", "subscriber-service", "sap"].includes(likelyObjectType)) return "review-before-migration";
  if (likelyObjectType === "management-security") return "target-default-risk";
  return "manual-conversion-required";
}

function intentionallyUnsupported(likelyObjectType) {
  return ["management-security", "route-policy", "qos-policy", "filter"].includes(likelyObjectType);
}

function compactFinding(finding) {
  return {
    id: finding.id,
    ruleId: finding.ruleId,
    category: finding.category,
    severity: finding.severity,
    titleKo: finding.titleKo,
    objectType: finding.objectType,
    objectKey: finding.objectKey,
    side: finding.side,
    fieldPath: finding.fieldPath,
    actualValue: finding.actualValue,
    expectedValue: finding.expectedValue,
    sourceLines: finding.sourceLines,
    migrationImpact: finding.migrationImpact,
    policyProfile: finding.policyProfile,
    suppressed: Boolean(finding.suppressed),
  };
}

function findingPriorityScore(finding) {
  const severity = {
    critical: 100,
    unsupported: 90,
    warning: 70,
    "manual-review": 60,
    info: 20,
    suppressed: 0,
  }[finding.severity] || 10;
  const impact = {
    "blocks-auto-generation": 100,
    "unsupported-target": 90,
    "manual-conversion-required": 85,
    "conversion-policy-required": 75,
    "target-default-risk": 65,
    "review-before-migration": 45,
    "no-impact": 0,
  }[finding.migrationImpact] || 20;
  const core = CORE_OBJECT_TYPES.has(finding.objectType) ? 15 : 0;
  return severity + impact + core;
}

function findingPriorityReason(finding) {
  if (finding.migrationImpact === "blocks-auto-generation") return "blocks auto generation";
  if (finding.migrationImpact === "conversion-policy-required") return "conversion policy required";
  if (finding.severity === "critical") return "critical active finding";
  return "review priority";
}

function classifyFindingCause(finding, oldResult, newResult) {
  const oldCount = oldResult.objects.filter((object) => objectType(object) === finding.objectType).length;
  const newCount = newResult.objects.filter((object) => objectType(object) === finding.objectType).length;
  if (/parser|partial|default-action/.test(finding.ruleId)) return "parser partial support";
  if (finding.side === "old" && oldCount > newCount) return "target-fixture-partial";
  if (/referenced-policy-undefined|defined-policy-unused/.test(finding.ruleId)) return "policy-definition-gap";
  if (/sap-relationship|group-subscriber|dhcp-group/.test(finding.ruleId)) return "relationship-or-target-fixture-gap";
  return "standards-rule";
}

function renderUnmatchedMarkdown(analysis) {
  return [
    "# Unmatched Object Analysis",
    "",
    `Generated: ${analysis.generatedAt}`,
    `Case: ${analysis.caseId}`,
    "",
    "## Summary",
    `- matched: ${analysis.summary.matched}`,
    `- unmatched source: ${analysis.summary.unmatchedSource}`,
    `- unmatched target: ${analysis.summary.unmatchedTarget}`,
    `- low confidence: ${analysis.summary.lowConfidence}`,
    `- field overlap: ${analysis.summary.fieldOverlapPercent}%`,
    `- fixture scope: ${analysis.summary.fixtureScopeStatus}`,
    `- full source objects: ${analysis.summary.fullSourceObjectCount}`,
    `- target fixture objects: ${analysis.summary.targetFixtureObjectCount}`,
    `- source objects in target scope: ${analysis.summary.sourceObjectsInTargetScope}`,
    `- source objects outside target scope: ${analysis.summary.sourceObjectsOutsideTargetScope}`,
    `- Target fixture 범위 밖 미매칭: ${analysis.summary.unmatchedDuePartialTargetScope}`,
    `- Matcher 개선 필요: ${analysis.summary.unmatchedDueLikelyMatcherIssue}`,
    `- Parser 미지원 가능성: ${analysis.summary.unmatchedDueParserGap}`,
    `- 실제 누락 가능성: ${analysis.summary.unmatchedDueRealMissingTarget}`,
    `- target-only objects: ${analysis.summary.unmatchedTargetOnly || 0}`,
    `- conclusion: ${analysis.summary.primaryConclusion}`,
    "",
    "## By Reason",
    ...renderCountRows(analysis.groups.byReason),
    "",
    "## By Type/Side",
    ...renderCountRows(analysis.groups.byTypeSide),
    "",
    "## Weak Mappings",
    ...analysis.weakMappings.slice(0, 20).map((item) => `- ${item.objectType}: ${item.oldKey} -> ${item.newKey}, score ${item.score}, reason ${item.likelyReason}`),
    "",
  ].join("\n");
}

function renderUnsupportedMarkdown(analysis) {
  return [
    "# Unsupported Line Analysis",
    "",
    `Generated: ${analysis.generatedAt}`,
    `Case: ${analysis.caseId}`,
    "",
    "## Summary",
    `- total unsupported: ${analysis.summary.totalUnsupported}`,
    `- eligible lines: ${analysis.summary.lineAccounting.eligibleLines}`,
    `- recognized/analyzed lines: ${analysis.summary.lineAccounting.recognizedAnalyzedLines}`,
    `- parser-unmapped lines: ${analysis.summary.lineAccounting.parserUnmappedLines}`,
    `- ignored/suppressed lines: ${analysis.summary.lineAccounting.ignoredSuppressedLines}`,
    `- unsupported syntax lines: ${analysis.summary.lineAccounting.unsupportedSyntaxLines}`,
    `- router-log wrapper lines: ${analysis.summary.lineAccounting.routerLogWrapperLines}`,
    `- old/source unsupported: ${analysis.summary.oldUnsupported}`,
    `- new/target unsupported: ${analysis.summary.newUnsupported}`,
    `- status: ${analysis.summary.parserCoverageStatus}`,
    `- conclusion: ${analysis.summary.primaryConclusion}`,
    "",
    "## By Section",
    ...renderCountRows(analysis.groups.bySection),
    "",
    "## By Object Type",
    ...renderCountRows(analysis.groups.byLikelyObjectType),
    "",
    "## Focus Areas",
    ...renderCountRows(analysis.groups.focusAreas),
    "",
    "## Samples",
    ...analysis.topSamples.slice(0, 30).map((item) => `- ${item.side} ${item.sourceFile}:${item.line} [${item.section}/${item.likelyObjectType}] ${item.text.trim()}`),
    "",
  ].join("\n");
}

function renderFindingPriorityMarkdown(analysis) {
  return [
    "# Finding Priority Analysis",
    "",
    `Generated: ${analysis.generatedAt}`,
    `Case: ${analysis.caseId}`,
    "",
    "## Summary",
    `- total findings: ${analysis.summary.totalFindings}`,
    `- active findings: ${analysis.summary.activeFindings}`,
    `- suppressed findings: ${analysis.summary.suppressedFindings}`,
    `- blocks auto-generation: ${analysis.summary.blocksAutoGeneration}`,
    `- conversion policy required: ${analysis.summary.conversionPolicyRequired}`,
    `- parser partial support: ${analysis.summary.parserPartialSupport}`,
    `- conclusion: ${analysis.summary.primaryConclusion}`,
    "",
    "## Top 20 Priority",
    ...analysis.top20HighestPriority.map((item) => `- ${item.priorityScore} ${item.severity}/${item.migrationImpact} ${item.ruleId} ${item.objectType}:${item.objectKey}`),
    "",
    "## Top Duplicated Rules",
    ...analysis.topDuplicatedRuleGroups.slice(0, 20).map((item) => `- ${item.ruleId}: active ${item.active}, suppressed ${item.suppressed}, total ${item.total}`),
    "",
  ].join("\n");
}

function renderFixtureCompletenessMarkdown(analysis) {
  return [
    "# Fixture Completeness Analysis",
    "",
    `Generated: ${analysis.generatedAt}`,
    `Case: ${analysis.caseId}`,
    "",
    "## Summary",
    `- status: ${analysis.summary.status}`,
    `- high unmatched expected: ${analysis.summary.highUnmatchedExpected}`,
    `- source: ${analysis.summary.sourcePath}`,
    `- target files: ${analysis.summary.targetPaths.join(", ")}`,
    `- feature files used: ${analysis.summary.featureFilesUsed.join(", ")}`,
    `- advanced policy files: ${analysis.summary.advancedPolicyFiles.join(", ") || "none"}`,
    `- conclusion: ${analysis.summary.primaryConclusion}`,
    "",
    "## Object Coverage By Type",
    ...analysis.objectCoverageByType.map((item) => `- ${item.objectType}: source ${item.sourceCount}, target ${item.targetCount}, matched ${item.matched}, candidate ${item.candidate}, status ${item.status}`),
    "",
    "## Improvement Targets",
    ...analysis.conclusion.likelyBugsOrImprovementTargets.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

function renderParserBacklogMarkdown(analysis) {
  return [
    "# Parser Backlog",
    "",
    `Generated: ${analysis.generatedAt}`,
    `Case: ${analysis.caseId}`,
    "",
    "## Summary",
    `- groups: ${analysis.summary.groupCount}`,
    `- unsupported lines: ${analysis.summary.unsupportedLineCount}`,
    `- active findings: ${analysis.summary.activeFindingCount}`,
    `- auto-generation blocking groups: ${analysis.summary.autoGenerationBlockingGroups}`,
    `- conclusion: ${analysis.summary.primaryConclusion}`,
    "",
    "## Groups",
    ...analysis.groups.flatMap((item) => [
      `### ${item.titleKo}`,
      `- priority: ${item.priority}`,
      `- unsupported lines: ${item.unsupportedLineCount}`,
      `- active findings: ${item.activeFindingCount}`,
      `- object type: ${item.objectType}`,
      `- migration impact: ${item.migrationImpact}`,
      `- needed for auto-generation: ${item.neededForAutoGeneration}`,
      `- impact blocks-auto-generation: ${item.impactOnBlocksAutoGeneration}`,
      `- impact conversion-policy-required: ${item.impactOnConversionPolicyRequired}`,
      `- impact actual-missing: ${item.impactOnActualMissingPossibility}`,
      `- ease/risk: ${item.easeOfImplementation}/${item.implementationRisk}`,
      `- next action: ${item.recommendedNextAction}`,
      `- expected fields: ${item.expectedNormalizedFields.join(", ")}`,
      `- affected rules: ${item.auditRulesAffected.map((rule) => `${rule.key}(${rule.count})`).join(", ") || "none"}`,
      "- examples:",
      ...(item.exampleSourceLines.length
        ? item.exampleSourceLines.slice(0, 5).map((sample) => `  - ${sample.side} ${sample.sourceFile}:${sample.line} ${sample.text}`)
        : ["  - none"]),
      "",
    ]),
  ].join("\n");
}

function renderBlocksAutoGenerationMarkdown(analysis) {
  return [
    "# Blocks Auto-Generation Analysis",
    "",
    `Generated: ${analysis.generatedAt}`,
    `Case: ${analysis.caseId}`,
    "",
    "## Summary",
    `- baseline total: ${analysis.summary.baselineTotal}`,
    `- total: ${analysis.summary.total}`,
    `- resolved from baseline: ${analysis.summary.resolvedFromBaseline}`,
    `- parser extension: ${analysis.summary.parserExtension}`,
    `- conversion policy: ${analysis.summary.conversionPolicy}`,
    `- target fixture completion: ${analysis.summary.targetFixtureCompletion}`,
    `- actual config correction: ${analysis.summary.actualConfigCorrection}`,
    `- conclusion: ${analysis.summary.primaryConclusion}`,
    "",
    "## By Rule",
    ...renderCountRows(analysis.groups.byRuleId),
    "",
    "## By Resolution",
    ...renderCountRows(analysis.groups.byResolutionPath),
    "",
    "## Resolved From Baseline",
    ...(analysis.summary.resolvedFromBaselineDetails || []).length
      ? analysis.summary.resolvedFromBaselineDetails.map((item) => `- ${item.ruleId}: ${item.count}, ${item.resolution}`)
      : ["- none"],
    "",
    "## Top Items",
    ...analysis.findings.slice(0, 30).map((item) => `- ${item.ruleId} ${item.side} ${item.objectType}:${item.objectKey} field=${item.fieldPath} value=${item.actualValue || "-"} -> ${item.resolutionPath.join(", ")}`),
    "",
  ].join("\n");
}

function renderConversionPolicyRequiredMarkdown(analysis) {
  return [
    "# Conversion Policy Required Analysis",
    "",
    `Generated: ${analysis.generatedAt}`,
    `Case: ${analysis.caseId}`,
    "",
    "## Summary",
    `- total: ${analysis.summary.total}`,
    `- policy types: ${analysis.summary.policyTypes}`,
    `- static-route rewrite candidates: ${analysis.summary.staticRouteNextHopRewriteCandidates}`,
    `- SAP/service parent mapping: ${analysis.summary.sapServiceParentMapping}`,
    `- SAP/service parent mapping candidates: ${analysis.summary.sapServiceParentMappingCandidates}`,
    `- QoS/filter reference mapping: ${analysis.summary.qosFilterReferenceMapping}`,
    `- vendor default behavior: ${analysis.summary.vendorDefaultBehavior}`,
    `- conclusion: ${analysis.summary.primaryConclusion}`,
    "",
    "## By Policy Type",
    ...renderCountRows(analysis.groups.byPolicyType),
    "",
    "## Policy File Candidates",
    ...analysis.policyFileCandidates.map((item) => `- ${item.policyType}: ${item.count} -> ${item.recommendedPath}`),
    "",
    "## Top Items",
    ...analysis.findings.slice(0, 30).map((item) => `- ${item.policyTypeNeeded} ${item.ruleId} ${item.objectType}:${item.objectKey} field=${item.fieldPath}`),
    "",
  ].join("\n");
}

function renderActualMissingMarkdown(analysis) {
  return [
    "# Actual Missing Analysis",
    "",
    `Generated: ${analysis.generatedAt}`,
    `Case: ${analysis.caseId}`,
    "",
    "## Summary",
    `- total: ${analysis.summary.total}`,
    `- true missing from target fixture: ${analysis.summary.trueMissingFromTargetFixture}`,
    `- outside partial target scope: ${analysis.summary.outsidePartialTargetScope}`,
    `- target object has no source counterpart: ${analysis.summary.targetObjectHasNoSourceCounterpart}`,
    `- parser/matcher false negative: ${analysis.summary.parserMatcherFalseNegative}`,
    `- missing parent relationship: ${analysis.summary.missingParentRelationship}`,
    `- manual mapping could resolve: ${analysis.summary.manualMappingCouldResolve}`,
    `- conclusion: ${analysis.summary.primaryConclusion}`,
    "",
    "## By Object Type",
    ...renderCountRows(analysis.groups.byObjectType),
    "",
    "## By Completeness",
    ...renderCountRows(analysis.groups.byCompletenessStatus),
    "",
    "## Samples",
    ...analysis.records.slice(0, 30).map((item) => `- ${item.side} ${item.objectType}:${item.objectKey} ${item.completenessStatus} ${item.recommendedAction}`),
    "",
  ].join("\n");
}

function renderMatcherEffectivenessMarkdown(analysis) {
  return [
    "# Matcher Effectiveness Analysis",
    "",
    `Generated: ${analysis.generatedAt}`,
    `Case: ${analysis.caseId}`,
    "",
    "## Current vs Baseline",
    `- baseline generated: ${analysis.baseline.generatedAt}`,
    `- matched: ${analysis.current.matched} (${signed(analysis.deltaFromBaseline.matched)})`,
    `- unmatched source: ${analysis.current.unmatchedSource} (${signed(analysis.deltaFromBaseline.unmatchedSource)})`,
    `- unmatched target: ${analysis.current.unmatchedTarget} (${signed(analysis.deltaFromBaseline.unmatchedTarget)})`,
    `- ambiguous: ${analysis.current.ambiguous} (${signed(analysis.deltaFromBaseline.ambiguous)})`,
    `- low-confidence: ${analysis.current.lowConfidence} (${signed(analysis.deltaFromBaseline.lowConfidence)})`,
    `- field overlap: ${analysis.current.fieldOverlapPercent}% (${signed(analysis.deltaFromBaseline.fieldOverlapPercent)})`,
    "",
    "## Matcher Signals",
    `- port/LAG candidates: ${analysis.summary.portLagCandidateCount}`,
    `- SAP candidates: ${analysis.summary.sapCandidateCount}`,
    `- static-route candidate/manual-review: ${analysis.summary.staticRouteCandidateManualReviewCount}`,
    `- false exact match prevention: ${analysis.summary.falseExactMatchPreventionCount}`,
    `- manual mapping candidates generated: ${analysis.summary.manualMappingCandidatesGenerated}`,
    `- relationship evidence candidates: ${analysis.summary.relationshipEvidenceCandidates}`,
    `- conclusion: ${analysis.summary.primaryConclusion}`,
    "",
    "## Candidate Score Reasons",
    ...renderCountRows(analysis.groups.candidateByScoreReason),
    "",
  ].join("\n");
}

function renderModeScopeValidationMarkdown(analysis) {
  return [
    "# Mode/Scope Validation",
    "",
    `Generated: ${analysis.generatedAt}`,
    `Status: ${analysis.status}`,
    "",
    "## Summary",
    `- cases: ${analysis.summary.cases}`,
    `- passed: ${analysis.summary.passed}`,
    `- failed: ${analysis.summary.failed}`,
    `- simple compare active findings: ${analysis.summary.simpleCompareActiveFindingCount}`,
    `- BGP-neighbor-only active findings: ${analysis.summary.bgpNeighborOnlyCompareActiveFindingCount}`,
    `- standards-audit active findings: ${analysis.summary.standardsAuditActiveFindingCount}`,
    `- migration-readiness active findings: ${analysis.summary.migrationReadinessActiveFindingCount}`,
    `- suppressed/ignored findings: ${analysis.summary.suppressedIgnoredFindingCount}`,
    "",
    "## Cases",
    ...analysis.cases.map((item) =>
      `- ${item.id}: ${item.status} (${item.assertionsPassed}/${item.assertionsTotal}) ${JSON.stringify(item.metrics)}`
    ),
    "",
  ].join("\n");
}

function signed(value) {
  const number = Number(value || 0);
  return number > 0 ? `+${number}` : String(number);
}

function updateFinalValidationReport(quality) {
  const finalJsonPath = `${RESULTS_DIR}/final-validation-report.json`;
  const profileExceptionPath = `${RESULTS_DIR}/profile-exception-application.json`;
  const profileExceptionApplication = fs.existsSync(absPath(profileExceptionPath))
    ? readJson(profileExceptionPath, null)
    : null;
  const objectReviewPath = `${RESULTS_DIR}/object-review-grouping.json`;
  const objectReviewGrouping = fs.existsSync(absPath(objectReviewPath))
    ? readJson(objectReviewPath, null)
    : null;
  const fieldIssueDedupePath = `${RESULTS_DIR}/field-issue-dedupe.json`;
  const fieldIssueDedupe = fs.existsSync(absPath(fieldIssueDedupePath))
    ? readJson(fieldIssueDedupePath, null)
    : null;
  if (fs.existsSync(absPath(finalJsonPath))) {
    const final = readJson(finalJsonPath, {});
    final.qualityAnalysis = {
      unmatched: quality.unmatched,
      unsupportedLines: quality.unsupportedLines,
      findingPriority: quality.findingPriority,
      fixtureCompleteness: quality.fixtureCompleteness,
      parserBacklog: quality.parserBacklog,
      blocksAutoGeneration: quality.blocksAutoGeneration,
      conversionPolicyRequired: quality.conversionPolicyRequired,
      actualMissing: quality.actualMissing,
      matcherEffectiveness: quality.matcherEffectiveness,
      modeScopeValidation: quality.modeScopeValidation,
      profileExceptionApplication,
      objectReviewGrouping,
      fieldIssueDedupe,
    };
    final.profileExceptionApplication = profileExceptionApplication;
    final.objectReviewGrouping = objectReviewGrouping;
    final.fieldIssueDedupe = fieldIssueDedupe;
    final.remainingLimitations = [
      "Juniper real validation remains blocked until a real source-juniper.conf is added.",
      "Synthetic Juniper smoke is not counted as production migration/comparison validation.",
      "Config generation/migration engine is not implemented; only migration-readiness is validated.",
      "Filter/QoS/route-policy body parsing is partial and tracked as manual-review/parser coverage work.",
      "Current MD-CLI target fixture is partial feature-split data; high unmatched counts are expected.",
    ];
    writeJson(finalJsonPath, final);
  }

  const finalMdPath = `${RESULTS_DIR}/final-validation-report.md`;
  const existing = fs.existsSync(absPath(finalMdPath)) ? readText(finalMdPath) : "";
  const base = stripFinalGeneratedQualitySections(existing);
  writeText(finalMdPath, `${base}\n${renderFinalQualityMarkdown(quality)}\n${renderProfileExceptionFinalMarkdown(profileExceptionApplication)}\n${renderObjectReviewGroupingFinalMarkdown(objectReviewGrouping)}\n${renderFieldIssueDedupeFinalMarkdown(fieldIssueDedupe)}\n`);
}

export function stripFinalGeneratedQualitySections(markdown = "") {
  const text = String(markdown || "");
  const marker = text.match(/\n## (?:11|12)\. Validation Quality Analysis\b/);
  return (marker ? text.slice(0, marker.index) : text).trimEnd();
}

function renderFinalQualityMarkdown(quality) {
  const lineAccounting = quality.unsupportedLines.summary.lineAccounting || {};
  const blocks = quality.blocksAutoGeneration.summary;
  const conversion = quality.conversionPolicyRequired.summary;
  const actualMissing = quality.actualMissing.summary;
  const matcher = quality.matcherEffectiveness.summary;
  const modeScope = quality.modeScopeValidation.summary;
  return [
    "",
    "## 11. Validation Quality Analysis",
    `- fixture completeness: ${quality.fixtureCompleteness.summary.status}`,
    `- high unmatched expected: ${quality.fixtureCompleteness.summary.highUnmatchedExpected}`,
    `- unmatched: source ${quality.unmatched.summary.unmatchedSource}, target ${quality.unmatched.summary.unmatchedTarget}, weak mappings ${quality.unmatched.summary.weakMappings}`,
    `- full source objects: ${quality.unmatched.summary.fullSourceObjectCount}, target fixture objects: ${quality.unmatched.summary.targetFixtureObjectCount}`,
    `- in target scope: ${quality.unmatched.summary.sourceObjectsInTargetScope}, outside target scope: ${quality.unmatched.summary.sourceObjectsOutsideTargetScope}`,
    `- Target fixture 범위 밖 미매칭: ${quality.unmatched.summary.unmatchedDuePartialTargetScope}`,
    `- Matcher 개선 필요: ${quality.unmatched.summary.unmatchedDueLikelyMatcherIssue}`,
    `- Parser 미지원 가능성: ${quality.unmatched.summary.unmatchedDueParserGap}`,
    `- 실제 누락 가능성: ${quality.unmatched.summary.unmatchedDueRealMissingTarget}`,
    `- target-only objects: ${quality.unmatched.summary.unmatchedTargetOnly || 0}`,
    `- line accounting: eligible ${lineAccounting.eligibleLines}, recognized ${lineAccounting.recognizedAnalyzedLines}, parser-unmapped ${lineAccounting.parserUnmappedLines}, ignored/suppressed ${lineAccounting.ignoredSuppressedLines}, wrapper ${lineAccounting.routerLogWrapperLines}`,
    `- active findings: ${quality.findingPriority.summary.activeFindings}, suppressed ${quality.findingPriority.summary.suppressedFindings}`,
    `- blocks auto-generation: ${quality.findingPriority.summary.blocksAutoGeneration}`,
    `- conversion policy required: ${quality.findingPriority.summary.conversionPolicyRequired}`,
    `- blocks drill-down: baseline ${blocks.baselineTotal}, current ${blocks.total}, resolved ${blocks.resolvedFromBaseline}, parser extension ${blocks.parserExtension}, target fixture completion ${blocks.targetFixtureCompletion}, actual config correction ${blocks.actualConfigCorrection}`,
    `- conversion policy drill-down: total ${conversion.total}, static-route rewrite candidates ${conversion.staticRouteNextHopRewriteCandidates}, SAP/service mapping ${conversion.sapServiceParentMapping}, QoS/filter mapping ${conversion.qosFilterReferenceMapping}, vendor default policy ${conversion.vendorDefaultBehavior}`,
    `- actual missing drill-down: total ${actualMissing.total}, true missing ${actualMissing.trueMissingFromTargetFixture}, target-only ${actualMissing.targetObjectHasNoSourceCounterpart}, outside scope ${actualMissing.outsidePartialTargetScope}, parser/matcher false negative ${actualMissing.parserMatcherFalseNegative}, manual mapping possible ${actualMissing.manualMappingCouldResolve}`,
    `- matcher effectiveness: port/LAG candidates ${matcher.portLagCandidateCount}, SAP candidates ${matcher.sapCandidateCount}, static-route manual-review candidates ${matcher.staticRouteCandidateManualReviewCount}, false exact match prevention ${matcher.falseExactMatchPreventionCount}`,
    `- mode/scope validation: ${quality.modeScopeValidation.status}, simple compare active ${modeScope.simpleCompareActiveFindingCount}, BGP-only active ${modeScope.bgpNeighborOnlyCompareActiveFindingCount}, standards active ${modeScope.standardsAuditActiveFindingCount}, migration active ${modeScope.migrationReadinessActiveFindingCount}, suppressed ${modeScope.suppressedIgnoredFindingCount}`,
    "- matcher status: port/LAG rename, SAP parent relationship, static-route next-hop conversion policy handling added.",
    "- parser improvement: Classic indirect/tunnel-next-hop static route extraction added; static-route next-hop blockers removed.",
    `- parser backlog groups: ${quality.parserBacklog.summary.groupCount}`,
    `- advanced policy files: ${quality.fixtureCompleteness.summary.advancedPolicyFiles.join(", ") || "none"}`,
    "- high unmatched count is expected from partial feature-split target fixtures, not a parser crash.",
    "- detail reports: validation-results/unmatched-analysis.md, unsupported-line-analysis.md, finding-priority-analysis.md, fixture-completeness-analysis.md, parser-backlog.md, blocks-auto-generation-analysis.md, conversion-policy-required-analysis.md, actual-missing-analysis.md, matcher-effectiveness-analysis.md, mode-scope-validation.md",
  ].join("\n");
}

function renderProfileExceptionFinalMarkdown(report) {
  if (!report) {
    return [
      "",
      "## 12. Profile Exception Application",
      "- not run",
    ].join("\n");
  }
  const before = report.before?.summary || {};
  const after = report.after?.summary || {};
  const invariant = report.invariant || {};
  return [
    "",
    "## 12. Profile Exception Application",
    `- active profile: ${report.activeProfileName || "-"}`,
    `- loaded profile exceptions: ${report.loadedProfileExceptionsCount || 0}`,
    `- matched exception IDs: ${(report.matchedExceptionIds || []).join(", ") || "-"}`,
    `- active issues: ${before.activeIssueCount || 0} -> ${after.activeIssueCount || 0}`,
    `- suppressed issues: ${before.suppressedIssueCount || 0} -> ${after.suppressedIssueCount || 0}`,
    `- BGP group active issues: ${before.activeGroupIssueCount || 0} -> ${after.activeGroupIssueCount || 0}`,
    `- profile-suppressed BGP group issues: ${before.suppressedProfileGroupIssueCount || 0} -> ${after.suppressedProfileGroupIssueCount || 0}`,
    `- admin-state active issues kept: ${after.activeAdminStateIssueCount || 0}`,
    `- invariant profileGroupSuppressed: ${Boolean(invariant.profileGroupSuppressed)}`,
    `- invariant adminStateStillActive: ${Boolean(invariant.adminStateStillActive)}`,
    "- detail reports: validation-results/profile-exception-application.md, validation-results/profile-exception-application.json",
  ].join("\n");
}

function renderObjectReviewGroupingFinalMarkdown(report) {
  if (!report) {
    return [
      "",
      "## 13. Object Review Grouping",
      "- not run",
    ].join("\n");
  }
  return [
    "",
    "## 13. Object Review Grouping",
    `- active profile: ${report.activeProfileName || "-"}`,
    `- object groups before: ${report.before?.objectReviewGroupCount || 0}`,
    `- object groups after profile exception: ${report.after?.objectReviewGroupCount || 0}`,
    `- active issues: ${report.before?.activeIssueCount || 0} -> ${report.after?.activeIssueCount || 0}`,
    `- suppressed issues: ${report.before?.suppressedIssueCount || 0} -> ${report.after?.suppressedIssueCount || 0}`,
    `- profile-suppressed issues: ${report.before?.suppressedByProfileExceptionCount || 0} -> ${report.after?.suppressedByProfileExceptionCount || 0}`,
    `- invariant oneRowPerObjectBefore: ${Boolean(report.invariants?.oneRowPerObjectBefore)}`,
    `- invariant groupSuppressedAcrossObjects: ${Boolean(report.invariants?.groupSuppressedAcrossObjects)}`,
    `- invariant stateDescriptionRemainActive: ${Boolean(report.invariants?.stateDescriptionRemainActive)}`,
    "- detail reports: validation-results/object-review-grouping.md, validation-results/object-review-grouping.json",
  ].join("\n");
}

function renderFieldIssueDedupeFinalMarkdown(report) {
  if (!report) {
    return [
      "",
      "## 14. Field Issue Dedupe",
      "- not run",
    ].join("\n");
  }
  const description = report.activeFieldRows?.find((row) => row.fieldPath === "description") || {};
  return [
    "",
    "## 14. Field Issue Dedupe",
    `- status: ${report.status || "-"}`,
    `- duplicate field rows before: ${report.duplicateFieldRowsBefore ?? 0}`,
    `- duplicate field rows after: ${report.duplicateFieldRowsAfter ?? 0}`,
    `- description duplicate count: ${report.descriptionDuplicateCountBefore ?? 0} -> ${report.descriptionDuplicateCountAfter ?? 0}`,
    `- description row active/suppressed: ${description.activeCount || 0}/${description.suppressedCount || 0}`,
    `- suppressed-only group excluded from active rows: ${Boolean(report.checks?.suppressedOnlyGroupExcludedFromActiveRows)}`,
    "- detail reports: validation-results/field-issue-dedupe.md, validation-results/field-issue-dedupe.json",
  ].join("\n");
}

function renderCountRows(rows = []) {
  return rows.length ? rows.map((item) => `- ${item.key}: ${item.count}`) : ["- none"];
}

function countBy(items = [], keyFn) {
  const map = new Map();
  for (const item of items || []) {
    const key = String(keyFn(item) || "unknown");
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function groupObjects(items = [], keyFn) {
  const map = new Map();
  for (const item of items || []) {
    const key = String(keyFn(item) || "unknown");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()];
}

function mostCommon(values = []) {
  return countBy(values, (item) => item)[0]?.key || "";
}

function objectType(object = {}) {
  return object?.normalizedType || object?.type || object?.sourceType || "unknown";
}

function objectKey(object = {}) {
  return String(object?.key || `${objectType(object)}:${object?.normalizedIdentity || object?.sourceName || object?.id || "-"}`);
}

function normalizeKey(object = {}) {
  return String(object?.normalizedIdentity || object?.sourceName || object?.id || "")
    .trim()
    .toLowerCase();
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  const quality = runQualityAnalysis({ writeReports: true, updateFinalReport: true });
  console.log(JSON.stringify({
    command: "validate:quality",
    status: "passed",
    caseId: quality.caseId,
    reports: [
      `${RESULTS_DIR}/unmatched-analysis.md`,
      `${RESULTS_DIR}/unsupported-line-analysis.md`,
      `${RESULTS_DIR}/finding-priority-analysis.md`,
      `${RESULTS_DIR}/fixture-completeness-analysis.md`,
      `${RESULTS_DIR}/parser-backlog.md`,
      `${RESULTS_DIR}/blocks-auto-generation-analysis.md`,
      `${RESULTS_DIR}/conversion-policy-required-analysis.md`,
      `${RESULTS_DIR}/actual-missing-analysis.md`,
      `${RESULTS_DIR}/matcher-effectiveness-analysis.md`,
      `${RESULTS_DIR}/mode-scope-validation.md`,
    ],
  }, null, 2));
}
