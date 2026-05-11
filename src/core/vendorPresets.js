// src/core/vendorPresets.js

export const VENDOR_IDS = {
  NOKIA_CLASSIC: "nokia-classic",
  NOKIA_MD_CLI: "nokia-md-cli",
  CISCO_IOS_XE: "cisco-ios-xe",
  JUNIPER_SET: "juniper-set",
  ARISTA_EOS: "arista-eos",
};

export const LEGACY_VENDOR_IDS = {
  NOKIA: "nokia",
  CISCO: "cisco",
  JUNIPER: "juniper",
  ARISTA: "arista",
};

export const VENDOR_PRESET_IDS = {
  NOKIA_CLASSIC_TO_MD_CLI: "nokia-classic-to-md-cli",
  CISCO_IOS_XE_TO_MD_CLI: "cisco-ios-xe-to-md-cli",
  JUNIPER_SET_TO_MD_CLI: "juniper-set-to-md-cli",
  ARISTA_EOS_TO_MD_CLI: "arista-eos-to-md-cli",
};

export const VENDOR_PRESETS = [
  {
    id: VENDOR_PRESET_IDS.NOKIA_CLASSIC_TO_MD_CLI,
    label: "Nokia Classic → Nokia MD-CLI",
    oldVendor: VENDOR_IDS.NOKIA_CLASSIC,
    newVendor: VENDOR_IDS.NOKIA_MD_CLI,
    legacyVendor: LEGACY_VENDOR_IDS.NOKIA,
    description: "Nokia Classic CLI config를 Nokia MD-CLI config와 비교합니다.",
    status: "initial",
  },
  {
    id: VENDOR_PRESET_IDS.CISCO_IOS_XE_TO_MD_CLI,
    label: "Cisco IOS/XE → Nokia MD-CLI",
    oldVendor: VENDOR_IDS.CISCO_IOS_XE,
    newVendor: VENDOR_IDS.NOKIA_MD_CLI,
    legacyVendor: LEGACY_VENDOR_IDS.CISCO,
    description: "Cisco IOS/XE config를 Nokia MD-CLI config와 비교합니다.",
    status: "planned",
  },
  {
    id: VENDOR_PRESET_IDS.JUNIPER_SET_TO_MD_CLI,
    label: "Juniper set → Nokia MD-CLI",
    oldVendor: VENDOR_IDS.JUNIPER_SET,
    newVendor: VENDOR_IDS.NOKIA_MD_CLI,
    legacyVendor: LEGACY_VENDOR_IDS.JUNIPER,
    description: "Juniper set 형식 config를 Nokia MD-CLI config와 비교합니다.",
    status: "planned",
  },
  {
    id: VENDOR_PRESET_IDS.ARISTA_EOS_TO_MD_CLI,
    label: "Arista EOS → Nokia MD-CLI",
    oldVendor: VENDOR_IDS.ARISTA_EOS,
    newVendor: VENDOR_IDS.NOKIA_MD_CLI,
    legacyVendor: LEGACY_VENDOR_IDS.ARISTA,
    description: "Arista EOS config를 Nokia MD-CLI config와 비교합니다.",
    status: "planned",
  },
];

export const DEFAULT_VENDOR_PRESET_ID =
  VENDOR_PRESET_IDS.NOKIA_CLASSIC_TO_MD_CLI;

export function getVendorPresetById(presetId) {
  return VENDOR_PRESETS.find((preset) => preset.id === presetId) || null;
}

export function getDefaultVendorPreset() {
  return getVendorPresetById(DEFAULT_VENDOR_PRESET_ID);
}

export function getVendorPresetByLegacyVendor(legacyVendor) {
  return (
    VENDOR_PRESETS.find((preset) => preset.legacyVendor === legacyVendor) ||
    getDefaultVendorPreset()
  );
}

export function resolveVendorPreset(profile) {
  if (!profile || typeof profile !== "object") {
    return getDefaultVendorPreset();
  }

  const presetId =
    profile.vendorPresetId ||
    profile.vendorPreset?.id ||
    profile.presetId ||
    null;

  if (presetId) {
    return getVendorPresetById(presetId) || getDefaultVendorPreset();
  }

  if (profile.vendor) {
    return getVendorPresetByLegacyVendor(profile.vendor);
  }

  return getDefaultVendorPreset();
}

export function buildVendorPresetSnapshot(preset) {
  const safePreset = preset || getDefaultVendorPreset();

  return {
    id: safePreset.id,
    label: safePreset.label,
    oldVendor: safePreset.oldVendor,
    newVendor: safePreset.newVendor,
    legacyVendor: safePreset.legacyVendor,
  };
}

export function applyVendorPresetToProfile(profile, presetId) {
  const preset = getVendorPresetById(presetId) || getDefaultVendorPreset();

  return {
    ...(profile || {}),
    vendor: preset.legacyVendor,
    vendorPresetId: preset.id,
    oldVendor: preset.oldVendor,
    newVendor: preset.newVendor,
    vendorPreset: buildVendorPresetSnapshot(preset),
  };
}

export function ensureVendorPresetFields(profile) {
  if (!profile || typeof profile !== "object") return profile;

  const preset = resolveVendorPreset(profile);

  return {
    ...profile,

    // 기존 legacyCore.js의 vendorRules 키와 호환
    vendor: profile.vendor || preset.legacyVendor,

    // 신규 preset 기반 구조
    vendorPresetId: profile.vendorPresetId || preset.id,
    oldVendor: profile.oldVendor || preset.oldVendor,
    newVendor: profile.newVendor || preset.newVendor,
    vendorPreset: profile.vendorPreset || buildVendorPresetSnapshot(preset),
  };
}

export function getLegacyVendorFromPresetId(presetId) {
  const preset = getVendorPresetById(presetId) || getDefaultVendorPreset();
  return preset.legacyVendor;
}

export function getPresetIdFromLegacyVendor(legacyVendor) {
  const preset = getVendorPresetByLegacyVendor(legacyVendor);
  return preset.id;
}