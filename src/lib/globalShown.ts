/**
 * Globale tracker voor vragen die al zijn gesteld – over ALLE werelden en levels.
 * Opgeslagen in localStorage zodat geen enkele vraag twee keer voorkomt, ook niet
 * na het herstarten van de game of bij een nieuw level/wereld.
 */

const GLOBAL_SHOWN_KEY = "doolwijs-global-shown";

export interface GlobalShown {
  fingerprints: string[];
  vraagTexts: string[];
}

export function getGlobalShown(): GlobalShown {
  if (typeof window === "undefined") return { fingerprints: [], vraagTexts: [] };
  try {
    const raw = localStorage.getItem(GLOBAL_SHOWN_KEY);
    if (!raw) return { fingerprints: [], vraagTexts: [] };
    return JSON.parse(raw) as GlobalShown;
  } catch {
    return { fingerprints: [], vraagTexts: [] };
  }
}

export function addToGlobalShown(fingerprint: string, vraagText: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getGlobalShown();
    if (current.fingerprints.includes(fingerprint)) return; // al aanwezig
    const updated: GlobalShown = {
      fingerprints: [...current.fingerprints, fingerprint],
      vraagTexts: [...current.vraagTexts, vraagText.trim()],
    };
    localStorage.setItem(GLOBAL_SHOWN_KEY, JSON.stringify(updated));
  } catch {
    // ignore localStorage fouten
  }
}

export function clearGlobalShown(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GLOBAL_SHOWN_KEY);
  } catch {
    // ignore
  }
}
