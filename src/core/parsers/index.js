// src/core/parsers/index.js
import { parseCiscoIosXeConfig } from "./ciscoIosXeParser.js";
import { parseNokiaMdCliConfig } from "./nokiaMdCliParser.js";
import { parseNokiaClassicConfig } from "./nokiaClassicParser.js";

export const PARSER_IDS = {
  NOKIA_CLASSIC: "nokia-classic",
  NOKIA_MD_CLI: "nokia-md-cli",
  CISCO_IOS_XE: "cisco-ios-xe",
  JUNIPER_SET: "juniper-set",
  ARISTA_EOS: "arista-eos",
};

export function createParserContext({
  vendor,
  profile,
  configText,
  side,
}) {
  return {
    vendor,
    profile,
    configText,
    side,

    lines: typeof configText === "string"
      ? configText.split(/\r?\n/)
      : [],

    objects: [],
    warnings: [],
    errors: [],
  };
}

export function createNormalizedObject({
  id,
  vendor,
  sourceType,
  sourceName,
  normalizedType,
  normalizedIdentity,
  rawLines = [],
  fields = {},
}) {
  return {
    id,

    vendor,

    sourceType,
    sourceName,

    normalizedType,
    normalizedIdentity,

    description: null,

    ipAddress: null,
    prefix: null,

    peerIp: null,
    peerAs: null,

    fields,

    rawLines,
  };
}

export function createParserResult(context) {
  return {
    vendor: context.vendor,
    side: context.side,

    objects: context.objects || [],
    warnings: context.warnings || [],
    errors: context.errors || [],
  };
}

export function parseConfigByVendor(context) {
  switch (context.vendor) {
    case PARSER_IDS.CISCO_IOS_XE:
      context.objects = parseCiscoIosXeConfig(context.configText);
      return createParserResult(context);

    case PARSER_IDS.NOKIA_MD_CLI:
      context.objects = parseNokiaMdCliConfig(context.configText);
      return createParserResult(context);

    case PARSER_IDS.JUNIPER_SET:
      return createParserResult(context);

    case PARSER_IDS.ARISTA_EOS:
      return createParserResult(context);

    case PARSER_IDS.NOKIA_CLASSIC: {
      const result = parseNokiaClassicConfig(context.configText, {
        side: context.side,
      });

      context.objects = Array.isArray(result.objects) ? result.objects : [];
      context.warnings.push(...(result.warnings || []));
      context.errors.push(...(result.errors || []));

      return createParserResult(context);
    }

    default:
      context.warnings.push(
        `Unknown parser vendor: ${context.vendor}`
      );

      return createParserResult(context);
  }
}