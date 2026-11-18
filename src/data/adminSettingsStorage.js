import { openAdminDatabase } from "./adminDatabase";

const LEGACY_KEYS = {
  schedule: "motopots-operating-hours",
  availability: "motopots-store-availability",
  status: "motopots-store-status",
  employees: "motopots-employees",
  shifts: "motopots-shifts",
};
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STORE_TIME_ZONE = "Asia/Manila";

const runStore = async (storeName, mode, operation) => {
  const database = await openAdminDatabase();
  return new Promise((resolve, reject) => {
    let result;
    let transaction;

    try {
      transaction = database.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      if (request) {
        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => reject(request.error || new Error(`Unable to access the ${storeName} store.`));
      }
    } catch (error) {
      database.close();
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error(`The ${storeName} transaction failed.`));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error(`The ${storeName} transaction was aborted.`));
    };
  });
};

const readLocalJson = (key) => {
  const raw = localStorage.getItem(key);
  return raw === null ? undefined : JSON.parse(raw);
};

const writeLocalJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const isIndexedDbUnavailable = (error) => error?.message === "IndexedDB is unavailable.";

const migrateSettingRecord = async (id, value) => {
  try {
    await runStore("settings", "readwrite", (store) => store.put({ id, value }));
  } catch (error) {
    console.error(`Unable to migrate the saved ${id} setting to IndexedDB.`, error);
  }
};

const validateSchedule = (schedule) => {
  if (schedule === null || schedule === undefined) return null;
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
    throw new Error("The saved operating schedule is invalid.");
  }

  const normalized = {};
  WEEKDAYS.slice(1).concat(WEEKDAYS[0]).forEach((day) => {
    const entry = schedule[day];
    if (!entry || typeof entry.enabled !== "boolean") {
      throw new Error(`The saved operating schedule for ${day} is invalid.`);
    }
    normalized[day] = {
      enabled: entry.enabled,
      opening: typeof entry.opening === "string" ? entry.opening : "",
      closing: typeof entry.closing === "string" ? entry.closing : "",
    };
  });
  return normalized;
};

const getClockParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

const timeToMinutes = (time) => {
  if (!/^\d{2}:\d{2}$/.test(time || "")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const getScheduledStatus = (schedule, date = new Date()) => {
  if (!schedule) return "closed";
  const clock = getClockParts(date);
  const entry = schedule[clock.weekday];
  if (!entry?.enabled) return "closed";
  const opening = timeToMinutes(entry.opening);
  const closing = timeToMinutes(entry.closing);
  const current = Number(clock.hour) * 60 + Number(clock.minute);
  return opening !== null && closing !== null && closing > opening && current >= opening && current < closing
    ? "open"
    : "closed";
};

const getNextScheduledTransition = (schedule, scheduledStatus, date = new Date()) => {
  if (!schedule) return null;
  const clock = getClockParts(date);
  const currentMinutes = Number(clock.hour) * 60 + Number(clock.minute);
  const action = scheduledStatus === "open" ? "close" : "open";
  const [year, month, day] = [Number(clock.year), Number(clock.month), Number(clock.day)];

  for (let offset = 0; offset <= 7; offset += 1) {
    const targetDate = new Date(Date.UTC(year, month - 1, day + offset));
    const weekday = WEEKDAYS[targetDate.getUTCDay()];
    const entry = schedule[weekday];
    if (!entry?.enabled) continue;

    const time = action === "open" ? entry.opening : entry.closing;
    const minutes = timeToMinutes(time);
    if (minutes === null || (offset === 0 && minutes <= currentMinutes)) continue;

    const dateKey = [
      targetDate.getUTCFullYear(),
      String(targetDate.getUTCMonth() + 1).padStart(2, "0"),
      String(targetDate.getUTCDate()).padStart(2, "0"),
    ].join("-");
    return { action, date: dateKey, day: weekday, time };
  }
  return null;
};

const normalizeAvailability = (value) => {
  if (value === "open" || value === "closed") return { mode: "manual", status: value };
  if (value?.mode === "manual" && (value.status === "open" || value.status === "closed")) {
    return { mode: "manual", status: value.status };
  }
  return { mode: "automatic" };
};

const emitStorageChange = (key, oldValue, newValue) => {
  window.dispatchEvent(new StorageEvent("storage", {
    key,
    oldValue,
    newValue,
    storageArea: window.localStorage,
  }));
};

const publishStoreStatus = (status) => {
  const oldValue = localStorage.getItem(LEGACY_KEYS.status);
  localStorage.setItem(LEGACY_KEYS.status, status);
  emitStorageChange(LEGACY_KEYS.status, oldValue, status);
  window.dispatchEvent(new CustomEvent("motopots-store-status-updated", { detail: { status } }));
};

export const readSchedule = async () => {
  try {
    const saved = await runStore("settings", "readonly", (store) => store.get("schedule"));
    if (saved?.value) return validateSchedule(saved.value);
    const legacy = readLocalJson(LEGACY_KEYS.schedule);
    const normalized = validateSchedule(legacy);
    if (normalized) await migrateSettingRecord("schedule", normalized);
    return normalized;
  } catch (error) {
    const legacy = readLocalJson(LEGACY_KEYS.schedule);
    if (legacy !== undefined) {
      const normalized = validateSchedule(legacy);
      await migrateSettingRecord("schedule", normalized);
      return normalized;
    }
    if (isIndexedDbUnavailable(error)) return null;
    throw error;
  }
};

export const saveSchedule = async (schedule) => {
  const normalized = validateSchedule(schedule);
  if (!normalized) throw new Error("A weekly operating schedule is required.");

  try {
    await runStore("settings", "readwrite", (store) => store.put({ id: "schedule", value: normalized }));
    writeLocalJson(LEGACY_KEYS.schedule, normalized);
  } catch (databaseError) {
    try {
      writeLocalJson(LEGACY_KEYS.schedule, normalized);
    } catch (storageError) {
      throw new Error(
        `Unable to save the operating schedule: ${storageError.message || databaseError.message}`,
        { cause: storageError },
      );
    }
  }

  const availability = await readStoreAvailability();
  publishStoreStatus(availability.status);
  window.dispatchEvent(new CustomEvent("motopots-settings-updated", { detail: { section: "schedule" } }));
};

export const readStoreAvailability = async () => {
  let savedAvailability;
  let hasDatabaseRecord = false;
  try {
    const saved = await runStore("settings", "readonly", (store) => store.get("store-status"));
    if (saved?.value !== undefined) {
      savedAvailability = normalizeAvailability(saved.value);
      hasDatabaseRecord = true;
    }
  } catch (error) {
    const legacyAvailability = readLocalJson(LEGACY_KEYS.availability);
    if (legacyAvailability !== undefined) {
      savedAvailability = normalizeAvailability(legacyAvailability);
    } else {
      const legacyStatus = localStorage.getItem(LEGACY_KEYS.status);
      if (legacyStatus === "open" || legacyStatus === "closed") {
        savedAvailability = { mode: "manual", status: legacyStatus };
      } else if (isIndexedDbUnavailable(error)) {
        savedAvailability = { mode: "automatic" };
      } else {
        throw error;
      }
    }
  }

  if (!savedAvailability) {
    const legacyAvailability = readLocalJson(LEGACY_KEYS.availability);
    const legacyStatus = localStorage.getItem(LEGACY_KEYS.status);
    savedAvailability = legacyAvailability !== undefined
      ? normalizeAvailability(legacyAvailability)
      : (legacyStatus === "open" || legacyStatus === "closed")
        ? { mode: "manual", status: legacyStatus }
        : { mode: "automatic" };
  }
  if (!hasDatabaseRecord && (savedAvailability.mode === "manual" || readLocalJson(LEGACY_KEYS.availability) !== undefined)) {
    await migrateSettingRecord("store-status", savedAvailability);
  }

  const schedule = await readSchedule();
  const scheduledStatus = getScheduledStatus(schedule);
  const status = savedAvailability.mode === "manual" ? savedAvailability.status : scheduledStatus;
  return {
    ...savedAvailability,
    status,
    schedule,
    scheduledStatus,
    nextTransition: getNextScheduledTransition(schedule, scheduledStatus),
  };
};

export const readStoreStatus = async () => {
  try {
    return (await readStoreAvailability()).status;
  } catch (error) {
    console.error("Unable to read store availability; treating the store as closed.", error);
    return "closed";
  }
};

export const saveStoreStatus = async (status) => {
  const availability = status === "open" || status === "closed"
    ? { mode: "manual", status }
    : { mode: "automatic" };
  const schedule = await readSchedule();
  const scheduledStatus = getScheduledStatus(schedule);
  const actualStatus = availability.mode === "manual" ? availability.status : scheduledStatus;

  try {
    await runStore("settings", "readwrite", (store) => store.put({ id: "store-status", value: availability }));
    writeLocalJson(LEGACY_KEYS.availability, availability);
  } catch (databaseError) {
    try {
      writeLocalJson(LEGACY_KEYS.availability, availability);
    } catch (storageError) {
      throw new Error(
        `Unable to save store availability: ${storageError.message || databaseError.message}`,
        { cause: storageError },
      );
    }
  }

  publishStoreStatus(actualStatus);
  window.dispatchEvent(new CustomEvent("motopots-settings-updated", { detail: { section: "availability" } }));
};

const readCollection = async (storeName, legacyKey) => {
  try {
    const saved = await runStore(storeName, "readonly", (store) => store.getAll());
    if (saved?.length) return saved;
    const legacy = readLocalJson(legacyKey);
    if (Array.isArray(legacy) && legacy.length) {
      await saveCollection(storeName, legacyKey, legacy);
      return legacy;
    }
    return [];
  } catch (error) {
    const legacy = readLocalJson(legacyKey);
    if (Array.isArray(legacy)) return legacy;
    if (isIndexedDbUnavailable(error)) return [];
    throw error;
  }
};

const saveCollection = async (storeName, legacyKey, records) => {
  try {
    await runStore(storeName, "readwrite", (store) => {
      store.clear();
      records.forEach((record) => store.put(record));
    });
    writeLocalJson(legacyKey, records);
  } catch (databaseError) {
    try {
      writeLocalJson(legacyKey, records);
    } catch (storageError) {
      throw new Error(
        `Unable to save ${storeName}: ${storageError.message || databaseError.message}`,
        { cause: storageError },
      );
    }
  }
};

export const readEmployees = () => readCollection("employees", LEGACY_KEYS.employees);
export const saveEmployees = (employees) => saveCollection("employees", LEGACY_KEYS.employees, employees);
export const readShifts = () => readCollection("shifts", LEGACY_KEYS.shifts);
export const saveShifts = (shifts) => saveCollection("shifts", LEGACY_KEYS.shifts, shifts);

export const saveEmployeeSchedule = async (employees, shifts) => {
  try {
    const database = await openAdminDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(["employees", "shifts"], "readwrite");
      const employeeStore = transaction.objectStore("employees");
      const shiftStore = transaction.objectStore("shifts");
      employeeStore.clear();
      shiftStore.clear();
      employees.forEach((employee) => employeeStore.put(employee));
      shifts.forEach((shift) => shiftStore.put(shift));
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error("Unable to update employee records."));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error || new Error("The employee update was aborted."));
      };
    });
    writeLocalJson(LEGACY_KEYS.employees, employees);
    writeLocalJson(LEGACY_KEYS.shifts, shifts);
  } catch (databaseError) {
    try {
      writeLocalJson(LEGACY_KEYS.employees, employees);
      writeLocalJson(LEGACY_KEYS.shifts, shifts);
    } catch (storageError) {
      throw new Error(
        `Unable to update employee records: ${storageError.message || databaseError.message}`,
        { cause: storageError },
      );
    }
  }
};
