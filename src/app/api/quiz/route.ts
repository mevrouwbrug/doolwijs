import { NextRequest, NextResponse } from "next/server";
import type { CurrentQuestion } from "@/lib/types";

/**
 * API-route: genereer één meerkeuzevraag taalverzorging via LLM (OpenAI).
 * Doel: basisschool 1F → 2F, in stijl van DIA-toetsen.
 *
 * Body: { niveau: "1F" | "2F", easier?: boolean, level?: number }
 * - niveau: referentieniveau
 * - easier: bij true iets makkelijker (adaptief na fout)
 * - level: 1-5, elk level andere vragen/onderwerpen zodat geen herhaling
 */
export async function POST(request: NextRequest) {
  let body: { niveau?: string; easier?: boolean; level?: number };
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
  const level = Math.max(1, Math.min(5, Number(body.level) || 1));
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY niet geconfigureerd" },
      { status: 503 }
    );
  }

  const systemPrompt = `Je bent een expert in taalverzorging voor de basisschool (groep 7, kinderen van 11 jaar). Je maakt meerkeuzevragen in de stijl van de DIA-toets taalverzorging. De vragen zijn geschikt voor leerlingen met dyslexie: eenvoudige taal, korte zinnen, één duidelijk goed antwoord.

BELANGRIJKE REGELS:
- Doelgroep: basisschool groep 7, referentieniveau 1F (start) tot 2F (eind).
- Vraagstelling: gebruik dezelfde formulering als in DIA-toetsen, bijv. "Welke zin is juist geschreven?" of "Welk woord past in de zin?".
- Elke optie is één duidelijke zin of één woord. Geen uitleg in de optie (geen "beide goed", geen "A of B", geen slash zoals "reizen / het reizen").
- Precies één antwoord is goed. De andere drie zijn herkenbaar fout (veelgemaakte fouten: vergeten d of t, verkeerde persoonsvorm).
- Onderwerpen 1F: werkwoordspelling (stam + t bij jij/hij/zij, 't kofschip), eenvoudige zinnen. Onderwerpen 2F: iets moeilijkere werkwoordspelling, verleden tijd, voltooid deelwoord.
- feedbackBijFout: SOCRATISCH. Geef nooit het juiste antwoord. Leg kort uit wat er mis is en geef een tip hoe het kind het kan aanpakken (bijv. "Kijk naar het onderwerp: is het enkelvoud of meervoud? Dan weet je welke vorm je nodig hebt." of "Denk aan de stam. Wat is de ik-vorm? Dan kun je de juiste vorm kiezen."). Twee korte zinnen mag: eerst wat er fout is, dan een tip.

Je antwoordt uitsluitend met geldige JSON in dit exacte formaat (geen markdown, geen extra tekst):
{
  "vraag": "Welke zin is juist geschreven?",
  "opties": [
    { "id": "A", "text": "Volledige zin of één woord.", "correct": false },
    { "id": "B", "text": "Volledige zin of één woord.", "correct": true },
    { "id": "C", "text": "Volledige zin of één woord.", "correct": false },
    { "id": "D", "text": "Volledige zin of één woord.", "correct": false }
  ],
  "correctAntwoord": "B",
  "feedbackBijFout": "Socratisch: uitleg wat er fout is + tip hoe aan te pakken. Nooit het juiste antwoord geven."
}

Regels: precies 4 opties (A t/m D), elk optie "text" is één zin of één woord. Geen haakjes met uitleg in de opties. correctAntwoord is de id van de juiste optie.`;

  const levelFocus: Record<number, string> = {
    1: "Level 1: focus op stam + t (hij/zij + werkwoord), eenvoudige zinnen. Onderwerp: tegenwoordige tijd, ik/jij/hij.",
    2: "Level 2: focus op meervoud/onderwerp (de kinderen ... / het kind ...), of vraag met jij (geen t achter de stam). Andere voorbeelden dan level 1.",
    3: "Level 3: focus op verleden tijd, 't kofschip (wandelen-wandelde, werken-werkte). Andere werkwoorden en zinnen dan level 1 en 2.",
    4: "Level 4: iets moeilijkere werkwoordspelling of voltooid deelwoord (ge+stam+d/t). Andere onderwerpen dan level 1-3.",
    5: "Level 5: mix van 2F, bv. lastige persoonsvorm of interpunctie. Elk level moet andere vragen en andere voorbeelden hebben.",
  };

  const levelInstruction = levelFocus[level] ?? levelFocus[1];
  const userPrompt = easier
    ? `Genereer één meerkeuzevraag taalverzorging voor basisschool groep 7 (11 jaar), niveau ${niveau}, aan de makkelijke kant (na een fout). ${levelInstruction} Gebruik "Welke zin is juist geschreven?" of "Welk woord past in de zin?". Vier duidelijke opties, één goed. feedbackBijFout: socratisch (wat is er fout + tip), nooit het goede antwoord geven.`
    : `Genereer één meerkeuzevraag taalverzorging voor basisschool groep 7 (11 jaar), referentieniveau ${niveau}. BELANGRIJK: dit is level ${level}. ${levelInstruction} Zorg dat de vraag en de voorbeelden ANDERS zijn dan bij andere levels (andere werkwoorden, andere zinnen). Gebruik "Welke zin is juist geschreven?" of "Welk woord past in de zin?". Vier duidelijke opties, één goed. feedbackBijFout: socratisch (uitleg wat er fout is + tip hoe aan te pakken), nooit het juiste antwoord geven.`;

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
    if (!parsed.feedbackBijFout) parsed.feedbackBijFout = "Denk aan de stam van het werkwoord. Wat is de ik-vorm?";

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("Quiz API error:", e);
    return NextResponse.json(
      { error: "Fout bij ophalen vraag" },
      { status: 500 }
    );
  }
}
