export const DATABASE_NAME = "networkConfigWorkbench";
export const DATABASE_VERSION = 1;

export function isIndexedDbAvailable() {
  return typeof indexedDB !== "undefined";
}

export function openDatabase() {
  if (!isIndexedDbAvailable()) return Promise.reject(new Error("IndexedDB unavailable"));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
      if (!db.objectStoreNames.contains("profiles")) db.createObjectStore("profiles", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecord(storeName, record, fallbackKey) {
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const current = JSON.parse(localStorage.getItem(fallbackKey) || "[]").filter((item) => item.id !== record.id);
    current.unshift(record);
    localStorage.setItem(fallbackKey, JSON.stringify(current.slice(0, 50)));
  }
}

export async function readRecords(storeName, fallbackKey) {
  try {
    const db = await openDatabase();
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return records.sort((left, right) => right.updatedAt - left.updatedAt);
  } catch {
    return JSON.parse(localStorage.getItem(fallbackKey) || "[]").sort((left, right) => right.updatedAt - left.updatedAt);
  }
}

export async function deleteRecord(storeName, id, fallbackKey) {
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const current = JSON.parse(localStorage.getItem(fallbackKey) || "[]").filter((item) => item.id !== id);
    localStorage.setItem(fallbackKey, JSON.stringify(current));
  }
}
