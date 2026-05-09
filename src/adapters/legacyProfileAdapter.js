export function normalizeLegacyProfile(profile) {
  if (!profile || typeof profile !== "object") return profile;
  return {
    ...profile,
    schemaVersion: profile.schemaVersion || 1,
    lineMappings: profile.lineMappings || {},
    semanticMappings: profile.semanticMappings || {},
    semanticNodeGroups: profile.semanticNodeGroups || {},
    semanticLineGroups: profile.semanticLineGroups || {},
  };
}

export function serializeLegacyProfile(profile) {
  return normalizeLegacyProfile(profile);
}
