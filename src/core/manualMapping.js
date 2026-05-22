const MANUAL_MAP_STORAGE_KEY = "networkConfigWorkbench.manualMap";

export function normalizeManualMap(manualMap = {}) {
  if (!manualMap || typeof manualMap !== "object") return {};

  return Object.fromEntries(
    Object.entries(manualMap)
      .filter(([oldObjectId, newObjectId]) => oldObjectId && newObjectId)
      .map(([oldObjectId, newObjectId]) => [
        String(oldObjectId),
        String(newObjectId),
      ])
  );
}

export function setManualMapping(manualMap = {}, oldObjectId, newObjectId) {
  if (!oldObjectId || !newObjectId) {
    return normalizeManualMap(manualMap);
  }

  return {
    ...normalizeManualMap(manualMap),
    [String(oldObjectId)]: String(newObjectId),
  };
}

export function removeManualMapping(manualMap = {}, oldObjectId) {
  const normalized = normalizeManualMap(manualMap);

  if (!oldObjectId) return normalized;

  delete normalized[String(oldObjectId)];
  return normalized;
}

export function clearManualMappings() {
  return {};
}

export function saveManualMapToLocalStorage(manualMap = {}) {
  const normalized = normalizeManualMap(manualMap);
  localStorage.setItem(MANUAL_MAP_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadManualMapFromLocalStorage() {
  try {
    return normalizeManualMap(
      JSON.parse(localStorage.getItem(MANUAL_MAP_STORAGE_KEY) || "{}")
    );
  } catch {
    return {};
  }
}

export function clearManualMapFromLocalStorage() {
  localStorage.removeItem(MANUAL_MAP_STORAGE_KEY);
}

export function applyManualSelectionToStorage(oldObjectId, newObjectId) {
  const currentManualMap = loadManualMapFromLocalStorage();

  const nextManualMap = setManualMapping(
    currentManualMap,
    oldObjectId,
    newObjectId
  );

  return saveManualMapToLocalStorage(nextManualMap);
}