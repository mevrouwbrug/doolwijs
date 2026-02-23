import type { CurrentQuestion } from "./types";

export interface FetchQuestionParams {
  /** Referentieniveau: 1F of 2F */
  niveau: "1F" | "2F";
  /** Level 1-5 */
  level: number;
  /** Bij true: vraag iets makkelijker (adaptief na fout) */
  easier?: boolean;
  /** Vraagteksten die al gesteld zijn deze level – LLM genereert andere vraag */
  excludeVragen?: string[];
}

/**
 * Haalt één meerkeuzevraag taalverzorging op van de LLM via onze API.
 * Level wordt meegestuurd zodat elk level nieuwe vragen krijgt.
 */
export async function fetchQuestion(
  params: FetchQuestionParams
): Promise<CurrentQuestion | null> {
  try {
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      niveau: params.niveau,
      level: Math.max(1, Math.min(5, params.level)),
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
