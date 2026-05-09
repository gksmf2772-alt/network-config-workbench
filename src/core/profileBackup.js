// src/core/profileBackup.js

const PROFILE_STORE_NAME = "profiles";

async function findWorkbenchDbName() {
  if (!indexedDB.databases) {
    return "networkConfigWorkbench";
  }

  const dbs = await indexedDB.databases();
  const found = dbs.find((db) =>
    db.name && db.name.toLowerCase().includes("networkconfig")
  );

  return found?.name || "networkConfigWorkbench";
}

function openDb(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROFILE_STORE_NAME)) {
        db.createObjectStore(PROFILE_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

function readAllProfiles(db) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(PROFILE_STORE_NAME)) {
      resolve([]);
      return;
    }

    const tx = db.transaction(PROFILE_STORE_NAME, "readonly");
    const store = tx.objectStore(PROFILE_STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

function putProfiles(db, profiles) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(PROFILE_STORE_NAME)) {
      reject(new Error(`IndexedDB store '${PROFILE_STORE_NAME}'가 없습니다.`));
      return;
    }

    const tx = db.transaction(PROFILE_STORE_NAME, "readwrite");
    const store = tx.objectStore(PROFILE_STORE_NAME);

    profiles.forEach((profile) => {
      if (!profile.id) {
        profile.id = crypto.randomUUID();
      }
      store.put(profile);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (error) {
        reject(new Error("JSON 파일 형식이 올바르지 않습니다."));
      }
    };

    reader.readAsText(file, "utf-8");
  });
}

export async function exportProfiles() {
  const dbName = await findWorkbenchDbName();
  const db = await openDb(dbName);

  try {
    const profiles = await readAllProfiles(db);

    const backup = {
      type: "network-config-workbench-profile-backup",
      version: 1,
      dbName,
      exportedAt: new Date().toISOString(),
      profiles,
    };

    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`network-config-profiles-${date}.json`, backup);

    return profiles.length;
  } finally {
    db.close();
  }
}

export async function importProfilesFromFile(file, { overwrite = true } = {}) {
  const backup = await readJsonFile(file);

  const profiles = Array.isArray(backup)
    ? backup
    : Array.isArray(backup.profiles)
      ? backup.profiles
      : null;

  if (!profiles) {
    throw new Error("가져올 profiles 배열을 찾지 못했습니다.");
  }

  const validProfiles = profiles.filter(
    (profile) => profile && typeof profile === "object"
  );

  if (!validProfiles.length) {
    throw new Error("가져올 수 있는 프로파일이 없습니다.");
  }

  const dbName = backup.dbName || await findWorkbenchDbName();
  const db = await openDb(dbName);

  try {
    if (!overwrite) {
      const existing = await readAllProfiles(db);
      const existingIds = new Set(existing.map((profile) => profile.id));

      validProfiles.forEach((profile) => {
        if (!profile.id || existingIds.has(profile.id)) {
          profile.id = crypto.randomUUID();
        }
      });
    }

    await putProfiles(db, validProfiles);
    return validProfiles.length;
  } finally {
    db.close();
  }
}