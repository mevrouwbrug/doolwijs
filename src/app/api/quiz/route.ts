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

/**
 * Thema per wereld. Elke wereld dekt ALLE DIA-taalverzorgingsonderwerpen op toenemend niveau:
 * werkwoordsvormen, hoofdletters, leestekens/interpunctie, spelling.
 * Progressie: Wereld 1–3 = 1F (fundamenteel), Wereld 4–8 = 2F (streefniveau).
 */
const worldConfig: Record<number, { niveau: "1F" | "2F"; thema: string }> = {
  1: {
    niveau: "1F",
    thema:
      "Mix taalverzorging 1F-basis: (1) persoonsvorm tegenwoordige tijd stam+t bij hij/zij/het, " +
      "(2) hoofdletters bij begin van een zin en eigennamen van personen, " +
      "(3) punt aan het einde van een zin. Eenvoudige, korte zinnen.",
  },
  2: {
    niveau: "1F",
    thema:
      "Mix taalverzorging 1F: (1) persoonsvorm enkelvoud vs. meervoud (het kind speelt / de kinderen spelen), " +
      "(2) jij-inversie zonder t (Loop jij? – niet Loopt jij?), " +
      "(3) komma bij opsomming (Jan, Lisa en Tom gingen...), " +
      "(4) hoofdletters bij namen van steden en landen.",
  },
  3: {
    niveau: "1F",
    thema:
      "Mix taalverzorging 1F: (1) verleden tijd regelmatige werkwoorden ('t kofschip: werkte, speelde, fietste), " +
      "(2) vraagteken aan het einde van een vraagzin, " +
      "(3) uitroepteken bij een uitroep, " +
      "(4) hoofdletters bij namen van talen en volken.",
  },
  4: {
    niveau: "2F",
    thema:
      "Mix taalverzorging 2F: (1) verleden tijd onregelmatige werkwoorden (liep, zag, deed, reed, bracht), " +
      "(2) komma voor voegwoord in samengestelde zin (Hij sliep, want hij was moe.), " +
      "(3) hoofdletters bij titels van boeken en films, " +
      "(4) dubbele punt bij opsomming na aankondiging.",
  },
  5: {
    niveau: "2F",
    thema:
      "Mix taalverzorging 2F: (1) voltooid deelwoord ge+stam+d of ge+stam+t ('t kofschip: gewerkt, gebeld, geleefd), " +
      "(2) hoofdletters bij aanspreekvormen (u, jij in formele tekst), " +
      "(3) komma na bijwoordelijke bepaling aan het begin (Gisteren, ging hij naar school.), " +
      "(4) correcte spelling samengestelde woorden.",
  },
  6: {
    niveau: "2F",
    thema:
      "Mix taalverzorging 2F: (1) persoonsvorm + voltooid deelwoord gecombineerd (Hij heeft gewerkt. / Zij waren gelopen.), " +
      "(2) komma in bijzin (Als het regent, blijf ik thuis.), " +
      "(3) hoofdletters bij namen van organisaties en instellingen, " +
      "(4) leestekens bij directe rede (aanhalingstekens, komma).",
  },
  7: {
    niveau: "2F",
    thema:
      "Mix taalverzorging 2F-breed: wissel af tussen (1) alle werkwoordsvormen (pv, vt, vd), " +
      "(2) alle hoofdletterregels (zinsbegin, namen, titels, talen, aanspreekvormen), " +
      "(3) alle leestekens (punt, komma, vraagteken, uitroepteken, dubbele punt, aanhalingstekens). " +
      "Zorg dat elke vraag een ander taalverzorgingsonderwerp test.",
  },
  8: {
    niveau: "2F",
    thema:
      "DIA-toetsniveau: vrije mix van ALLES – persoonsvorm, verleden tijd, voltooid deelwoord, hoofdletters (alle regels), " +
      "interpunctie (alle leestekens). Dit zijn de zwaarste vragen, vergelijkbaar met de eindtoets basisschool.",
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

  // excludeVragen bevat nu voorbeeldZINNEN (de opties), niet vraag-stammen.
  // Stuur de laatste 120 zinnen mee zodat de LLM andere werkwoorden/namen kiest.
  const recentSentences = excludeVragen.slice(-120);
  const excludeText =
    recentSentences.length > 0
      ? `\n\nCRUCIAAL – NOOIT HERHALEN: De volgende voorbeeldzinnen zijn al eerder gebruikt in dit spel. Gebruik NOOIT dezelfde zin, hetzelfde werkwoord in dezelfde context, of dezelfde namen. Kies compleet andere werkwoorden, namen en situaties:\n${recentSentences
          .map((v, i) => `${i + 1}. "${v}"`)
          .join("\n")}`
      : "";

  const systemPrompt = `Je bent een expert in taalverzorging voor de basisschool (groep 7-8, kinderen van 11-12 jaar). Je genereert meerkeuzevragen in de stijl van de DIA-toets taalverzorging, afgestemd op referentieniveaus 1F en 2F.

ONDERWERPEN die je door elkaar moet gebruiken (DIA taalverzorging):
1. Werkwoordsvormen: persoonsvorm tegenwoordige tijd (stam+t bij hij/zij/het), jij-inversie (geen t), enkelvoud vs. meervoud
2. Verleden tijd: regelmatig ('t kofschip → stam+te of stam+de), onregelmatig (liep, zag, deed, bracht)
3. Voltooid deelwoord: ge+stam+d of ge+stam+t ('t kofschip)
4. Hoofdletters: begin van een zin, eigennamen van personen/steden/landen/talen, titels van boeken/films
5. Leestekens/interpunctie: punt, vraagteken, uitroepteken, komma (opsomming, bijzin, na bijwoordelijke bepaling), dubbele punt, aanhalingstekens

VASTE REGELS:
- Doelgroep: basisschool groep 7-8, dyslexie-vriendelijk (korte zinnen, duidelijke fouten).
- Vraagstelling: "Welke zin is juist geschreven?" of "Welk woord past in de zin?" of "Welke zin heeft een fout?" (DIA-stijl).
- Precies 4 opties (A t/m D) per vraag. Elke optie is één complete zin OF één los woord.
- Precies één optie is correct. Drie veelgemaakte, herkenbare fouten.
- De vier opties binnen één vraag moeten allemaal ANDERS zijn (nooit twee identieke opties).
- feedbackBijFout: SOCRATISCH – nooit het juiste antwoord geven. Leg uit wat er fout is + geef een tip (max 2 zinnen).
- VARIATIE: gebruik steeds andere werkwoorden, namen, situaties. Nooit dezelfde voorbeeldzin twee keer.
- Als je ${count} vragen genereert: laat elke vraag een ANDER taalverzorgingsonderwerp testen (zie lijst boven).

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
      "feedbackBijFout": "Socratische tip (max 2 zinnen)."
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

    // Server-side deduplicatie: vergelijk op de volledige vraag-inhoud (vraag + alle opties),
    // niet alleen de vraagstam (die is vaak identiek bij DIA-stijl).
    const excludeSentenceSet = new Set(excludeVragen.map((v) => v.trim().toLowerCase()));
    const seenInBatch = new Set<string>();

    const questions: CurrentQuestion[] = rawVragen
      .map((v) => {
        const q = validateQuestion(v);
        if (!q) return null;

        // Volledige vingerafdruk: vraag + alle opties gesorteerd
        const fullKey = (q.vraag.trim() + "|" + q.opties.map((o) => o.text.trim()).sort().join("|")).toLowerCase();
        if (seenInBatch.has(fullKey)) return null;
        seenInBatch.add(fullKey);

        // Check of de opties al eerder zijn gebruikt (elke optie-zin moet nieuw zijn)
        const optionTexts = q.opties.map((o) => o.text.trim().toLowerCase());
        const allOptionsUsed = optionTexts.every((t) => excludeSentenceSet.has(t));
        if (allOptionsUsed) return null;

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
