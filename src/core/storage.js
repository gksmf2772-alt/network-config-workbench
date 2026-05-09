export const DATABASE_NAME = "networkConfigWorkbench";
export const DATABASE_VERSION = 1;

export function isIndexedDbAvailable() {
  return typeof indexedDB !== "undefined";
}
