import { NextRequest, NextResponse } from "next/server";
import type { CurrentQuestion } from "@/lib/types";

/**
 * API-route: genereer meerkeuzevragen taalverzorging via LLM (OpenAI).
 *
 * Bij count > 1 worden ALLE vragen voor een level in één keer gegenereerd,
 * zodat ze onderling nooit hetzelfde zijn en nooit overlappen met eerder gestelde vragen.
 *
 * Progressie 1F → 2F over 8 werelden:
 *   Wereld 1 – 1F – Persoonsvorm tegenwoordige tijd (stam + t bij hij/zij)
 *   Wereld 2 – 1F – Persoonsvorm meervoud en jij-vragen (inversie)
 *   Wereld 3 – 1F – Verleden tijd regelmatige werkwoorden ('t kofschip)
 *   Wereld 4 – 2F – Verleden tijd onregelmatige werkwoorden
 *   Wereld 5 – 2F – Voltooid deelwoord (ge+stam+d/t)
 *   Wereld 6 – 2F – Mix persoonsvorm + voltooid deelwoord
 *   Wereld 7 – 2F – Taalverzorging: hoofdletters, leestekens, namen
 *   Wereld 8 – 2F – Toetsniveau: alles gecombineerd
 *
 * Body: {
 *   currentWorld: 1-8,
 *   level: 1-5,
 *   count: 1-8,          ← aantal vragen (standaard 1)
 *   easier?: boolean,    ← adaptief na fout
 *   excludeVragen?: string[]  ← globaal al gestelde vraagteksten
 * }
 */

const worldConfig: Record<number, { niveau: "1F" | "2F"; thema: string }> = {
  1: {
    niveau: "1F",
    thema:
      "Persoonsvorm tegenwoordige tijd: stam + t bij hij/zij/het. Eenvoudige zinnen. Fouten: vergeten t of onjuiste stam.",
  },
  2: {
    niveau: "1F",
    thema:
      "Persoonsvorm enkelvoud vs meervoud (de kinderen ... / het kind ...) en inversievragen met jij (geen t na stam bij inversie: 'Loop jij?').",
  },
  3: {
    niveau: "1F",
    thema:
      "Verleden tijd regelmatige werkwoorden ('t kofschip: stam+te of stam+de). Bijv. werken→werkte, leven→leefde.",
  },
  4: {
    niveau: "2F",
    thema:
      "Verleden tijd onregelmatige werkwoorden (lopen→liep, zien→zag, doen→deed, rijden→reed). Fouten: regelmatige vormen voor onregelmatige werkwoorden.",
  },
  5: {
    niveau: "2F",
    thema:
      "Voltooid deelwoord (ge+stam+d of ge+stam+t, 't kofschip). Bijv. gelopen, gezien, gewerkt, gebeld. Fouten: verkeerde uitgang d/t.",
  },
  6: {
    niveau: "2F",
    thema:
      "Mix persoonsvorm + voltooid deelwoord in langere zinnen. Bijv. 'Hij heeft gisteren hard gewerkt.' Fouten: combinatie van werkwoordsfouten.",
  },
  7: {
    niveau: "2F",
    thema:
      "Taalverzorging: hoofdletters (namen, zinsbegin), kommaplaatsing, punt aan het einde. Fouten in het schrijven van eigennamen of zinsopbouw.",
  },
  8: {
    niveau: "2F",
    thema:
      "Toetsniveau: mix van alles (persoonsvorm, verleden tijd, voltooid deelwoord, hoofdletters). De moeilijkste vragen van het programma.",
  },
};

function validateQuestion(parsed: unknown): CurrentQuestion | null {
  if (!parsed || typeof parsed !== "object") return null;
  const q = parsed as Record<string, unknown>;
  if (
    typeof q.vraag !== "string" ||
    !q.vraag.trim() ||
    !Array.isArray(q.opties) ||
    q.opties.length !== 4
  )
    return null;
  const hasCorrect = (q.opties as unknown[]).some(
    (o) => typeof o === "object" && o !== null && (o as Record<string, unknown>).correct === true
  );
  if (!hasCorrect) return null;
  return q as unknown as CurrentQuestion;
}

export async function POST(request: NextRequest) {
  let body: {
    currentWorld?: number;
    level?: number;
    count?: number;
    easier?: boolean;
    excludeVragen?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }

  const currentWorld = Math.max(1, Math.min(8, Number(body.currentWorld) || 1));
  const level = Math.max(1, Math.min(5, Number(body.level) || 1));
  const count = Math.max(1, Math.min(8, Number(body.count) || 1));
  const easier = Boolean(body.easier);
  const excludeVragen: string[] = Array.isArray(body.excludeVragen)
    ? body.excludeVragen
    : [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY niet geconfigureerd" },
      { status: 503 }
    );
  }

  const config = worldConfig[currentWorld] ?? worldConfig[1];
  const { niveau, thema } = config;

  const levelWithinWorld =
    level <= 2
      ? "begin van deze wereld – iets eenvoudiger"
      : level === 3
        ? "midden van deze wereld"
        : "einde van deze wereld – iets uitdagender";

  const excludeText =
    excludeVragen.length > 0
      ? ` CRUCIAAL: De volgende vraagteksten zijn GLOBAAL al eerder gesteld (andere levels/werelden). Gebruik deze NOOIT – geen identieke tekst, geen dezelfde voorbeeldzinnen: ${excludeVragen
          .slice(-40)
          .map((v) => `"${v}"`)
          .join(" | ")}. Kies ANDERE werkwoorden en zinnen.`
      : "";

  const systemPrompt = `Je bent een expert in taalverzorging voor de basisschool (groep 7-8, kinderen van 11-12 jaar). Je genereert meerkeuzevragen in de stijl van de DIA-toets taalverzorging, afgestemd op referentieniveaus 1F en 2F (Referentiekader taal, SLO/OCW).

VASTE REGELS:
- Doelgroep: basisschool groep 7-8, dyslexie-vriendelijk (eenvoudige taal, korte zinnen).
- Vraagstelling: "Welke zin is juist geschreven?" of "Welk woord past in de zin?" (DIA-stijl).
- Precies 4 opties (A t/m D) per vraag. Elke optie is één complete zin OF één los woord. Geen uitleg in de optie.
- Precies één optie is correct. De andere drie zijn herkenbare spelfouten (veelgemaakte werkwoordsfouten).
- feedbackBijFout: SOCRATISCH. Nooit het juiste antwoord geven. Leg uit wat er fout is + geef een tip (max 2 zinnen).
- VARIATIE: gebruik steeds andere werkwoorden, andere namen, andere situaties. Nooit twee keer dezelfde voorbeeldzin.

Antwoord UITSLUITEND met geldige JSON (geen markdown, geen extra tekst):
{
  "vragen": [
    {
      "vraag": "Welke zin is juist geschreven?",
      "opties": [
        { "id": "A", "text": "Volledige zin of één woord.", "correct": false },
        { "id": "B", "text": "Volledige zin of één woord.", "correct": true },
        { "id": "C", "text": "Volledige zin of één woord.", "correct": false },
        { "id": "D", "text": "Volledige zin of één woord.", "correct": false }
      ],
      "correctAntwoord": "B",
      "feedbackBijFout": "Socratische tip."
    }
  ]
}`;

  const userPrompt = easier
    ? `Genereer ${count} meerkeuzevraag${count > 1 ? "vragen" : ""} taalverzorging voor basisschool groep 7-8, niveau ${niveau}.
Wereld ${currentWorld} van 8 – thema: ${thema}
Level ${level} van 5 (${levelWithinWorld}).
Maak EENVOUDIGERE varianten (na een fout antwoord).${excludeText}
Elke vraag moet UNIEK zijn: andere werkwoorden, andere zinnen, nooit hetzelfde als een andere vraag in deze reeks.`
    : `Genereer ${count} meerkeuzevraag${count > 1 ? "vragen" : ""} taalverzorging voor basisschool groep 7-8, niveau ${niveau}.
Wereld ${currentWorld} van 8 – thema: ${thema}
Level ${level} van 5 (${levelWithinWorld}).${excludeText}
Elke vraag moet UNIEK zijn: andere werkwoorden, andere zinnen, nooit hetzelfde als een andere vraag in deze reeks.`;

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
        temperature: 0.9,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenAI API error:", res.status, err);
      return NextResponse.json({ error: "LLM niet beschikbaar" }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Geen antwoord van LLM" }, { status: 502 });
    }

    const parsed = JSON.parse(raw) as { vragen?: unknown[] };
    const rawVragen = Array.isArray(parsed.vragen) ? parsed.vragen : [parsed];

    const questions: CurrentQuestion[] = rawVragen
      .map((v) => {
        const q = validateQuestion(v);
        if (!q) return null;
        const correct = q.opties.find((o) => o.correct);
        if (correct) q.correctAntwoord = correct.id;
        if (!q.feedbackBijFout)
          q.feedbackBijFout = "Denk aan de stam van het werkwoord. Wat is de ik-vorm?";
        return q;
      })
      .filter((q): q is CurrentQuestion => q !== null);

    if (questions.length === 0) {
      return NextResponse.json({ error: "Ongeldig vraagformaat" }, { status: 502 });
    }

    // count === 1: enkelvoudig antwoord (backward compatible)
    if (count === 1) {
      return NextResponse.json(questions[0]);
    }
    return NextResponse.json({ vragen: questions });
  } catch (e) {
    console.error("Quiz API error:", e);
    return NextResponse.json({ error: "Fout bij ophalen vraag" }, { status: 500 });
  }
}
