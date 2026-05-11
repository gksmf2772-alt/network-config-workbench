// src/core/normalizer.js

import {
  createParserContext,
  parseConfigByVendor,
} from "./parsers/index.js";

export function normalizeConfig({
  vendor,
  profile,
  configText,
  side = "old",
}) {
  const context = createParserContext({
    vendor,
    profile,
    configText,
    side,
  });

  return parseConfigByVendor(context);
}