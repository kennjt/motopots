const DB_NAME = "motopots-admin";
const DB_VERSION = 3;
const STORE_NAMES = ["menu", "settings", "employees", "shifts", "expenses"];

export function openAdminDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      STORE_NAMES.forEach((storeName) => {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: "id" });
        }
      });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error || new Error("Unable to open the admin database."));
    request.onblocked = () => reject(new Error("The admin database upgrade is blocked by another open tab."));
  });
}
