import type { CurrentQuestion } from "./types";

export interface FetchQuestionParams {
  /** Referentieniveau: 1F (fundamenteel) of 2F (streefniveau) */
  niveau: "1F" | "2F";
  /** Bij true: vraag iets makkelijker (adaptief na fout) */
  easier?: boolean;
}

/**
 * Haalt één meerkeuzevraag taalverzorging op van de LLM via onze API.
 * Bij fout of geen API-key valt de frontend terug op de dummy questionBank.
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
        easier: params.easier ?? false,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CurrentQuestion;
    return data;
  } catch {
    return null;
  }
}
