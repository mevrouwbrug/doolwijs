import { NextRequest, NextResponse } from "next/server";
import type { CurrentQuestion } from "@/lib/types";

/**
 * API-route: genereer één meerkeuzevraag taalverzorging via LLM (OpenAI).
 * Doel: basisschool 1F → 2F, in stijl van DIA-toetsen.
 *
 * Body: { niveau: "1F" | "2F", easier?: boolean }
 * - niveau: referentieniveau (1F = fundamenteel, 2F = streefniveau)
 * - easier: bij true iets makkelijker (adaptief na fout)
 */
export async function POST(request: NextRequest) {
  let body: { niveau?: string; easier?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ongeldige body" },
      { status: 400 }
    );
  }

  const niveau = body.niveau === "2F" ? "2F" : "1F";
  const easier = Boolean(body.easier);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY niet geconfigureerd" },
      { status: 503 }
    );
  }

  const systemPrompt = `Je bent een expert in taalverzorging voor het Nederlandse basisonderwijs. Je maakt meerkeuzevragen in de stijl van DIA-toetsen (taalverzorging), geschikt voor referentieniveaus 1F en 2F.

- 1F (fundamenteel): werkwoordspelling (stam, persoonsvorm, ik/jij/hij + t, 't kofschip), eenvoudige spelling, basis interpunctie.
- 2F (streefniveau): moeilijkere werkwoordspelling, lijdende en bedrijvende vorm, lastige spellingskwesties, correcte interpunctie.

Je antwoordt uitsluitend met geldige JSON in dit exacte formaat (geen markdown, geen extra tekst):
{
  "vraag": "De vraagtekst in één zin.",
  "opties": [
    { "id": "A", "text": "Antwoord A", "correct": false },
    { "id": "B", "text": "Antwoord B", "correct": true },
    { "id": "C", "text": "Antwoord C", "correct": false },
    { "id": "D", "text": "Antwoord D", "correct": false }
  ],
  "correctAntwoord": "B",
  "feedbackBijFout": "Korte, duidelijke uitleg (1 zin) die het kind helpt, bijv. verwijzing naar stam of 't kofschip."
}

Regels: precies 4 opties (A t/m D), precies één met "correct": true, correctAntwoord moet de id van de juiste optie zijn. feedbackBijFout in begrijpelijke taal voor een basisschoolleerling.`;

  const userPrompt = easier
    ? `Genereer één meerkeuzevraag taalverzorging op niveau ${niveau}, maar aan de makkelijke kant van dat niveau (geschikt na een fout antwoord).`
    : `Genereer één meerkeuzevraag taalverzorging op referentieniveau ${niveau}.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenAI API error:", res.status, err);
      return NextResponse.json(
        { error: "LLM niet beschikbaar" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "Geen antwoord van LLM" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(raw) as CurrentQuestion;
    if (!parsed.vraag || !Array.isArray(parsed.opties) || parsed.opties.length !== 4) {
      return NextResponse.json(
        { error: "Ongeldig vraagformaat" },
        { status: 502 }
      );
    }

    const correct = parsed.opties.find((o) => o.correct);
    if (!correct) {
      parsed.opties[0].correct = true;
      parsed.correctAntwoord = parsed.opties[0].id;
    } else {
      parsed.correctAntwoord = correct.id;
    }
    if (!parsed.feedbackBijFout) parsed.feedbackBijFout = "Let op de spelling van het werkwoord.";

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("Quiz API error:", e);
    return NextResponse.json(
      { error: "Fout bij ophalen vraag" },
      { status: 500 }
    );
  }
}
