// src/core/routerLogPreprocessor.js

const CONFIG_START_PATTERNS = [
  /^exit\s+all$/i,
  /^configure$/i,
  /^\/configure\b/i,
  /^configure\s+(?:system|port|lag|router|service|filter|qos|policy-options)\b/i,
  /^(?:port|lag|router|service|interface|static-route-entry|neighbor|subscriber-interface|group-interface|sap)\b/i,
];

const CONFIG_LINE_PATTERNS = [
  ...CONFIG_START_PATTERNS,
  /^(?:system|netconf|rollback|time|script-control|card|mda|connector|router|service|filter|qos|policy-options)\b/i,
  /^(?:description|address|ip\s+address|next-hop|tag|metric|shutdown|no\s+shutdown|admin-state|group|authentication-key|remote-as|peer-as)\b/i,
  /^(?:exit|})$/i,
];

export function preprocessConfigInput({
  text = "",
  vendor = "",
  side = "old",
  forceRouterLog = false,
} = {}) {
  const rawLines = String(text || "").split(/\r?\n/);
  const shouldExtract = forceRouterLog || shouldExtractRouterLog(rawLines, vendor, side);

  if (!shouldExtract) {
    return {
      text: String(text || ""),
      lineMap: rawLines.map((_, index) => index + 1),
      skipped: [],
      diagnostics: {
        inputLineCount: rawLines.length,
        extractedLineCount: rawLines.length,
        wrapperLineCount: 0,
        mode: "raw-config",
      },
    };
  }

  const extracted = [];
  const lineMap = [];
  const skipped = [];
  let configStarted = false;

  rawLines.forEach((rawLine, index) => {
    const originalLine = index + 1;
    const line = String(rawLine || "");
    const trimmed = line.trim();
    const noiseReason = classifyRouterLogNoise(trimmed, {
      configStarted,
      vendor,
    });

    if (!configStarted && isConfigStartLine(trimmed)) {
      configStarted = true;
    }

    if (noiseReason && (!configStarted || isAlwaysSkippableNoise(trimmed))) {
      skipped.push({ line: originalLine, text: line, reason: noiseReason });
      return;
    }

    if (!configStarted && !looksLikeConfigLine(trimmed)) {
      skipped.push({ line: originalLine, text: line, reason: "router-log-wrapper" });
      return;
    }

    if (!trimmed) {
      skipped.push({ line: originalLine, text: line, reason: "empty-wrapper-line" });
      return;
    }

    if (isAlwaysSkippableNoise(trimmed)) {
      skipped.push({ line: originalLine, text: line, reason: classifyRouterLogNoise(trimmed, { configStarted, vendor }) || "router-log-noise" });
      return;
    }

    extracted.push(line);
    lineMap.push(originalLine);
  });

  return {
    text: extracted.join("\n"),
    lineMap,
    skipped,
    diagnostics: {
      inputLineCount: rawLines.length,
      extractedLineCount: extracted.length,
      wrapperLineCount: skipped.length,
      mode: "router-log-extracted",
    },
  };
}

export function shouldExtractRouterLog(lines = [], vendor = "", side = "old") {
  const text = lines.slice(0, 80).join("\n");
  if (side === "old" && vendor === "nokia-classic") return true;
  if (/display-config|admin\s+display-config|show\s+(?:running|configuration|config)/i.test(text)) return true;
  if (/^[A-Z]?:?[\w.-]+[#>]\s+/m.test(text)) return true;
  if (/--More--|Press any key|Last login|Generated\s+\w{3}/i.test(text)) return true;
  return false;
}

export function classifyRouterLogNoise(line = "", { configStarted = false } = {}) {
  const text = String(line || "").trim();
  if (!text) return "empty";
  if (/^[A-Z]?:?[\w.-]+[#>]\s*(?:admin\s+display-config|show|environment|terminal|enable|configure\s+terminal)\b/i.test(text)) {
    return "cli-command-echo";
  }
  if (/^[A-Z]?:?[\w.-]+[#>]\s*$/i.test(text)) return "cli-prompt";
  if (/^(?:Last login|login:|password:|User Access Verification)/i.test(text)) return "login-banner";
  if (/^#\s*(?:TiMOS|All rights reserved|Built on|Generated\b)/i.test(text)) return "generated-header";
  if (/^#-+$/.test(text) || /^-+$/.test(text) || /^=+$/.test(text)) return "separator";
  if (/^echo\s+".*"$/i.test(text)) return "section-echo";
  if (/--More--|Press any key|^\s*\x1b\[[0-9;]*[A-Za-z]/.test(text)) return "paging-artifact";
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(text)) return "timestamp";
  if (!configStarted && /^#/.test(text)) return "header-comment";
  return "";
}

export function isConfigStartLine(line = "") {
  const text = String(line || "").trim();
  return CONFIG_START_PATTERNS.some((pattern) => pattern.test(text));
}

export function looksLikeConfigLine(line = "") {
  const text = String(line || "").trim();
  if (!text) return false;
  return CONFIG_LINE_PATTERNS.some((pattern) => pattern.test(text));
}

function isAlwaysSkippableNoise(line = "") {
  const text = String(line || "").trim();
  return Boolean(
    /^[A-Z]?:?[\w.-]+[#>]/i.test(text) ||
    /^#\s*(?:TiMOS|All rights reserved|Built on|Generated\b)/i.test(text) ||
    /^#-+$/.test(text) ||
    /^echo\s+".*"$/i.test(text) ||
    /--More--|Press any key/.test(text)
  );
}
