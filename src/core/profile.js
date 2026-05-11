import { normalizeLegacyProfile, serializeLegacyProfile } from "../adapters/legacyProfileAdapter.js";

export { normalizeLegacyProfile, serializeLegacyProfile };

export {
  VENDOR_IDS,
  LEGACY_VENDOR_IDS,
  VENDOR_PRESET_IDS,
  VENDOR_PRESETS,
  DEFAULT_VENDOR_PRESET_ID,
  getVendorPresetById,
  getDefaultVendorPreset,
  getVendorPresetByLegacyVendor,
  resolveVendorPreset,
  buildVendorPresetSnapshot,
  applyVendorPresetToProfile,
  ensureVendorPresetFields,
  getLegacyVendorFromPresetId,
  getPresetIdFromLegacyVendor,
} from "./vendorPresets.js";