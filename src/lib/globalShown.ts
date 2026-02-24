/**
 * Globale tracker voor vragen die al zijn gesteld – over ALLE werelden en levels.
 * Opgeslagen in localStorage zodat geen enkele vraag twee keer voorkomt.
 *
 * We slaan twee dingen op:
 * - fingerprints: unieke combinatie van vraag + alle optieteksten (voor exacte client-side match)
 * - usedSentences: alle voorbeeldzinnen uit de opties (voor LLM-exclusie, zodat de LLM
 *   dezelfde zinnen niet hergebruikt, maar WEL dezelfde vraagstam mag gebruiken)
 */

const GLOBAL_SHOWN_KEY = "doolwijs-global-shown-v2";

export interface GlobalShown {
  fingerprints: string[];
  usedSentences: string[];
}

export function getGlobalShown(): GlobalShown {
  if (typeof window === "undefined") return { fingerprints: [], usedSentences: [] };
  try {
    const raw = localStorage.getItem(GLOBAL_SHOWN_KEY);
    if (!raw) return { fingerprints: [], usedSentences: [] };
    const data = JSON.parse(raw) as GlobalShown;
    if (!Array.isArray(data.fingerprints) || !Array.isArray(data.usedSentences)) {
      return { fingerprints: [], usedSentences: [] };
    }
    return data;
  } catch {
    return { fingerprints: [], usedSentences: [] };
  }
}

/**
 * Voeg een beantwoorde vraag toe aan de globale tracker.
 * @param fingerprint Unieke combinatie van vraag + optieteksten
 * @param sentences   Alle optie-teksten van de vraag (de voorbeeldzinnen)
 */
export function addToGlobalShown(fingerprint: string, sentences: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const current = getGlobalShown();
    if (current.fingerprints.includes(fingerprint)) return;
    const newSentences = sentences
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !current.usedSentences.includes(s));
    const updated: GlobalShown = {
      fingerprints: [...current.fingerprints, fingerprint],
      usedSentences: [...current.usedSentences, ...newSentences],
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
