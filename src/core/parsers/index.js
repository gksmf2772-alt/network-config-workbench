// src/core/parsers/index.js
import { parseCiscoIosXeConfig } from "./ciscoIosXeParser.js";
import { parseNokiaMdCliConfig } from "./nokiaMdCliParser.js";
import { parseNokiaClassicConfig } from "./nokiaClassicParser.js";
import { parseJuniperSetConfig } from "./juniperParser.js";

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
  preprocess = null,
}) {
  return {
    vendor,
    profile,
    configText,
    side,
    preprocess,

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
    preprocess: context.preprocess || null,

    objects: context.objects || [],
    warnings: context.warnings || [],
    errors: context.errors || [],
  };
}

export function parseConfigByVendor(context) {
  switch (context.vendor) {
    case PARSER_IDS.CISCO_IOS_XE:
      context.objects = withPolicyPlaceholders(parseCiscoIosXeConfig(context.configText), context);
      return createParserResult(context);

    case PARSER_IDS.NOKIA_MD_CLI:
      context.objects = withPolicyPlaceholders(parseNokiaMdCliConfig(context.configText), context);
      return createParserResult(context);

    case PARSER_IDS.JUNIPER_SET:
      context.objects = withPolicyPlaceholders(parseJuniperSetConfig(context.configText), context);
      return createParserResult(context);
      
    case PARSER_IDS.ARISTA_EOS:
      return createParserResult(context);

    case PARSER_IDS.NOKIA_CLASSIC: {
      const result = parseNokiaClassicConfig(context.configText, {
        side: context.side,
      });

      context.objects = withPolicyPlaceholders(Array.isArray(result.objects) ? result.objects : [], context);
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

function withPolicyPlaceholders(objects = [], context = {}) {
  const existing = new Set((objects || []).map((object) =>
    `${object.normalizedType}:${String(object.normalizedIdentity || "").toLowerCase()}`
  ));
  const placeholders = [];
  for (const object of extractPolicyPlaceholders(context.configText, context.vendor)) {
    const key = `${object.normalizedType}:${String(object.normalizedIdentity || "").toLowerCase()}`;
    if (existing.has(key)) continue;
    existing.add(key);
    placeholders.push(object);
  }
  return [...objects, ...placeholders];
}

function extractPolicyPlaceholders(configText = "", vendor = "") {
  const lines = String(configText || "").split(/\r?\n/);
  const objects = [];

  lines.forEach((rawLine, index) => {
    const text = rawLine.trim();
    if (!text) return;

    const specs = [
      { type: "qos-policy", match: text.match(/\b(?:qos-policy|sap-ingress|sap-egress)\s+"?([^"\s{]+)"?/i) },
      { type: "filter", match: text.match(/\bfilter\s+(?:ip|ipv6)?\s*"?([^"\s{]+)"?/i) },
      { type: "route-policy", match: text.match(/\b(?:policy-statement|route-policy)\s+"?([^"\s{]+)"?/i) },
      { type: "prefix-list", match: text.match(/\bprefix-list\s+"?([^"\s{]+)"?/i) },
      { type: "community", match: text.match(/\bcommunity\s+"?([^"\s{]+)"?/i) },
    ];

    for (const spec of specs) {
      if (!spec.match?.[1]) continue;
      const name = spec.match[1];
      objects.push(createNormalizedObject({
        id: `${vendor || "vendor"}-${spec.type}-${index}-${name}`,
        vendor,
        sourceType: spec.type,
        sourceName: name,
        normalizedType: spec.type,
        normalizedIdentity: name,
        rawLines: [rawLine],
        fields: { name },
      }));
      break;
    }
  });

  return objects;
}
