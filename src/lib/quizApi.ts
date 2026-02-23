import type { CurrentQuestion } from "./types";

export interface FetchQuestionParams {
  /** Wereld 1-8: bepaalt het thema en niveau (1F→2F) */
  currentWorld: number;
  /** Level 1-5 binnen de wereld */
  level: number;
  /** Bij true: vraag iets makkelijker (adaptief na fout) */
  easier?: boolean;
  /** Globaal al gestelde vraagteksten – LLM herhaalt ze nooit */
  excludeVragen?: string[];
}

/**
 * Haalt alle vragen voor een level in één keer op bij de LLM.
 * Alle vragen voor het level worden tegelijk gegenereerd zodat ze:
 * - onderling nooit hetzelfde zijn
 * - nooit overlappen met vragen uit eerder gespeelde levels/werelden
 */
export async function fetchQuestionsForLevel(params: {
  currentWorld: number;
  level: number;
  count: number;
  excludeVragen?: string[];
}): Promise<CurrentQuestion[]> {
  try {
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentWorld: Math.max(1, Math.min(8, params.currentWorld)),
        level: Math.max(1, Math.min(5, params.level)),
        count: Math.max(1, Math.min(8, params.count)),
        easier: false,
        excludeVragen: Array.isArray(params.excludeVragen) ? params.excludeVragen : [],
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data.vragen)) return data.vragen as CurrentQuestion[];
    return [];
  } catch {
    return [];
  }
}

/** Haalt één extra (makkelijker) vraag op als adaptief antwoord na een fout. */
export async function fetchQuestion(
  params: FetchQuestionParams
): Promise<CurrentQuestion | null> {
  try {
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentWorld: Math.max(1, Math.min(8, params.currentWorld)),
        level: Math.max(1, Math.min(5, params.level)),
        count: 1,
        easier: params.easier ?? false,
        excludeVragen: Array.isArray(params.excludeVragen) ? params.excludeVragen : [],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CurrentQuestion;
    return data;
  } catch {
    return null;
  }
}
