const PSGC_BASE = "https://cdn.jsdelivr.net/gh/Tenasia/ph-psgc@2026-Q2/psgc";
let indexPromise;
const areaPromises = new Map();

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load Philippine location data (${response.status}).`);
  return response.json();
}

export function loadPsgcIndex() {
  if (!indexPromise) indexPromise = readJson(`${PSGC_BASE}/index.json`);
  return indexPromise;
}

export function loadPsgcArea(code) {
  if (!code) return Promise.resolve(null);
  if (!areaPromises.has(code)) areaPromises.set(code, readJson(`${PSGC_BASE}/areas/${code}.json`));
  return areaPromises.get(code);
}

export const PSGC_SOURCE_URL = "https://github.com/Tenasia/ph-psgc";
