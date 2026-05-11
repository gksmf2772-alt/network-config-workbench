import { ensureVendorPresetFields } from "../core/vendorPresets.js";

export function normalizeLegacyProfile(profile) {
  if (!profile || typeof profile !== "object") return profile;

  const normalizedProfile = {
    ...profile,
    schemaVersion: profile.schemaVersion || 1,
    lineMappings: profile.lineMappings || {},
    semanticMappings: profile.semanticMappings || {},
    semanticNodeGroups: profile.semanticNodeGroups || {},
    semanticLineGroups: profile.semanticLineGroups || {},
  };

  return ensureVendorPresetFields(normalizedProfile);
}

export function serializeLegacyProfile(profile) {
  return normalizeLegacyProfile(profile);
}