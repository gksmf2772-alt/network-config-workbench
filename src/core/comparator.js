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