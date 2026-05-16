const BGP_INHERITABLE_FIELDS = [
  "peer-as",
  "import.policy",
  "export.policy",
  "authentication-key",
  "description",
  "local-address",
  "state",
  "admin-state",
  "family",
  "afi-safi",
];

const FIELD_ALIASES = {
  peerAs: "peer-as",
  "import-policy": "import.policy",
  "export-policy": "export.policy",
  "auth-key": "authentication-key",
};

export function resolveBgpEffectiveObjects(objects = [], {
  includeMetadataObjects = true,
} = {}) {
  const groups = buildBgpGroupMap(objects);
  const resolved = (objects || []).map((object) => {
    if (!isBgpNeighbor(object)) return cloneObject(object);
    return resolveBgpNeighbor(object, groups);
  });

  return includeMetadataObjects
    ? resolved
    : resolved.filter((object) => !object.metadataOnly);
}

export function getBgpEffectiveField(object = {}, field = "") {
  const normalized = normalizeFieldName(field);
  return object.effectiveFields?.[normalized] ?? object.fields?.[normalized] ?? object[normalized] ?? "";
}

export function isBgpInheritedField(object = {}, field = "") {
  const normalized = normalizeFieldName(field);
  return object.fieldSources?.[normalized]?.source === "inherited-group";
}

export function isBgpInheritanceUnresolved(object = {}, field = "") {
  const normalized = normalizeFieldName(field);
  return Boolean(
    object.bgpInheritance?.groupDefinitionMissing &&
    BGP_INHERITABLE_FIELDS.includes(normalized)
  );
}

export function formatBgpFieldSourceKo(source = {}) {
  if (!source || !source.source) return "";
  if (source.source === "inherited-group") return `group ${source.group || "-"}에서 상속`;
  if (source.source === "direct-neighbor") return "직접 설정";
  if (source.source === "missing-group-definition") return "상속 확인 필요";
  if (source.source === "default") return "기본값";
  return source.source;
}

function resolveBgpNeighbor(object = {}, groups = new Map()) {
  const localFields = normalizeFields(object.fields || {});
  const groupName = clean(localFields.group || object.group || "");
  const groupObject = groupName ? groups.get(normalizeKey(groupName)) : null;
  const groupFields = groupObject ? normalizeFields(groupObject.fields || {}) : {};
  const effectiveFields = { ...localFields };
  const fieldSources = {};

  for (const [field, value] of Object.entries(localFields)) {
    if (value == null || value === "") continue;
    fieldSources[field] = {
      source: field === "group" ? "mdcli-group-reference" : "direct-neighbor",
      labelKo: field === "group" ? "그룹 참조" : "직접 설정",
      group: field === "group" ? value : "",
    };
  }

  if (groupObject) {
    for (const field of BGP_INHERITABLE_FIELDS) {
      const groupValue = groupFields[field];
      if (groupValue == null || groupValue === "") continue;
      if (effectiveFields[field] != null && effectiveFields[field] !== "") continue;
      effectiveFields[field] = groupValue;
      fieldSources[field] = {
        source: "inherited-group",
        labelKo: "그룹에서 상속됨",
        group: groupName,
        objectKey: groupObject.normalizedIdentity || groupObject.sourceName || groupName,
      };
    }
  }

  if (groupName && !groupObject) {
    for (const field of BGP_INHERITABLE_FIELDS) {
      if (effectiveFields[field] != null && effectiveFields[field] !== "") continue;
      fieldSources[field] = {
        source: "missing-group-definition",
        labelKo: "상속 확인 필요",
        group: groupName,
      };
    }
  }

  const next = cloneObject(object);
  next.localFields = localFields;
  next.groupReference = groupName;
  next.groupFields = groupFields;
  next.effectiveFields = effectiveFields;
  next.fieldSources = fieldSources;
  next.fields = {
    ...(next.fields || {}),
    ...effectiveFields,
  };
  next.peerAs = effectiveFields["peer-as"] || next.peerAs || null;
  next.peerIp = effectiveFields.neighbor || next.peerIp || null;
  next.description = effectiveFields.description || next.description || null;
  next.bgpInheritance = {
    groupReference: groupName,
    groupResolved: Boolean(groupObject),
    groupDefinitionMissing: Boolean(groupName && !groupObject),
    status: groupName
      ? groupObject
        ? "group-inherited"
        : "inheritance-unresolved"
      : "direct-neighbor",
    labelKo: groupName
      ? groupObject
        ? "그룹 상속"
        : "상속 확인 필요"
      : "직접 설정",
    messageKo: groupName && !groupObject
      ? `neighbor는 group ${groupName}를 참조하지만, 현재 target fixture에서 group 정의를 찾지 못했습니다. partial target 구성일 수 있으므로 상속값 확인이 필요합니다.`
      : "",
  };
  next.structureConversion = groupName ? "mdcli-group-reference" : "";

  return next;
}

function buildBgpGroupMap(objects = []) {
  const groups = new Map();
  for (const object of objects || []) {
    if (!isBgpGroup(object)) continue;
    const key = normalizeKey(object.normalizedIdentity || object.sourceName || object.fields?.group || "");
    if (!key) continue;
    groups.set(key, object);
  }
  return groups;
}

function isBgpNeighbor(object = {}) {
  return object?.normalizedType === "bgp";
}

function isBgpGroup(object = {}) {
  return object?.normalizedType === "bgp-group" || object?.sourceType === "bgp-group";
}

function cloneObject(object = {}) {
  return {
    ...object,
    fields: { ...(object.fields || {}) },
    rawLines: Array.isArray(object.rawLines) ? [...object.rawLines] : [],
  };
}

function normalizeFields(fields = {}) {
  const normalized = {};
  for (const [field, value] of Object.entries(fields || {})) {
    const key = normalizeFieldName(field);
    if (!key) continue;
    normalized[key] = value;
  }
  if (normalized.peerAs && !normalized["peer-as"]) normalized["peer-as"] = normalized.peerAs;
  return normalized;
}

function normalizeFieldName(field = "") {
  const key = String(field || "").trim();
  return FIELD_ALIASES[key] || key;
}

function normalizeKey(value = "") {
  return clean(value).toLowerCase();
}

function clean(value = "") {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}
