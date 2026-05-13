export {
  descriptionSimilarity,
  matchNormalizedObjects,
} from "./matchers/objectMatcher.js";

export {
  createObjectComparePlan,
  createComparisonPlan,
  summarizeComparisonPlan,
} from "./comparisonPlan.js";

export {
  compareObjectLines,
  compareObjectPlanLines,
  attachLineMatchesToPlan,
} from "./lineDiff.js";

export {
  DEFAULT_SEMANTIC_LINE_RULES,
  getSemanticLineRules,
  findSemanticLineRule,
} from "./semanticLineRules.js";

export {
  extractComparableFieldsFromLine,
  compareLineFields,
} from "./fieldExtractor.js";

export {
  createFieldSummary,
  summarizeFieldSummary,
} from "./comparisonPlan.js";

export {
  getFieldPoliciesForObjectType,
  getPolicyForField,
  applyFieldPolicies,
} from "./fieldPolicy.js";

export {
  renderComparisonPlanHtml,
} from "./compareRenderer.js";

export {
  normalizeManualMap,
  setManualMapping,
  removeManualMapping,
  clearManualMappings,
  saveManualMapToLocalStorage,
  loadManualMapFromLocalStorage,
  clearManualMapFromLocalStorage,
  applyManualSelectionToStorage,
} from "./manualMapping.js";

export {
  normalizeConfig,
} from "./normalizer.js";