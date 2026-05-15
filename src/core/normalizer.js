// src/core/normalizer.js

import {
  createParserContext,
  parseConfigByVendor,
} from "./parsers/index.js";
import { preprocessConfigInput } from "./routerLogPreprocessor.js";

export function normalizeConfig({
  vendor,
  profile,
  configText,
  side = "old",
}) {
  const preprocess = preprocessConfigInput({
    text: configText,
    vendor,
    side,
    forceRouterLog: Boolean(profile?.preprocess?.forceRouterLog?.[side]),
  });

  const context = createParserContext({
    vendor,
    profile,
    configText: preprocess.text,
    side,
    preprocess,
  });

  return parseConfigByVendor(context);
}
