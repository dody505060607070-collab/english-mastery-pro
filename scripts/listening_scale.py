"""Regenerate listening material so difficulty scales from A1.1 up to C2.2."""
import json, os, sys, time, urllib.request

SB = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
AI = os.environ["LOVABLE_API_KEY"]

SPEC = {
    "A1.1": (8, 90, "present simple, be, very common everyday words, short 6-9 word sentences, slow simple exchange"),
    "A1.2": (10, 120, "present simple and basic past, everyday words, short sentences"),
    "A2.1": (12, 160, "past simple, going to, frequency adverbs, simple linking (and, but, because)"),
    "A2.2": (12, 195, "comparatives, present continuous vs simple, simple opinions with short reasons"),
    "B1.1": (14, 235, "present perfect, first conditional, longer sentences, mild colloquial phrasing"),
    "B1.2": (14, 275, "narrative past forms, modals of advice, some phrasal verbs, natural interruptions"),
    "B2.1": (16, 320, "hypotheticals, passive, discourse markers, idiomatic but clear, faster natural rhythm"),
    "B2.2": (16, 375, "abstract topics, concession, hedging, mixed conditionals, richer lexis"),
    "C1.1": (18, 430, "professional/academic register, nuanced stance, inversion, low-frequency collocations, ellipsis and fast turn-taking"),
    "C1.2": (18, 485, "complex argumentation, cleft sentences, irony, dense idiomatic and academic lexis"),
    "C2.1": (20, 545, "near-native pace, layered argument, subtle implicature, sophisticated register shifts, allusions"),
    "C2.2": (22, 610, "expert-level debate, highly idiomatic and abstract, nuanced hedging and rebuttal, very fast natural speech"),
}


def api(path, method="GET", body=None):
    req = urllib.request.Request(
        f"{SB}/rest/v1/{path}", method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}",
                 "Content-Type": "application/json", "Prefer": "return=minimal"})
    with urllib.request.urlopen(req) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def ai_call(prompt):
    req = urllib.request.Request(
        "https://ai.gateway.lovable.dev/v1/chat/completions", method="POST",
        data=json.dumps({
            "model": "google/gemini-2.5-flash",
            "messages": [
                {"role": "system", "content": "You are an expert CEFR listening-material writer. Output markdown only, no commentary."},
                {"role": "user", "content": prompt},
            ],
        }).encode(),
        headers={"Authorization": f"Bearer {AI}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        j = json.loads(r.read())
    return j["choices"][0]["message"]["content"].strip()


def build_prompt(level, unit_title, content_title, old_body):
    turns, words, feats = SPEC[level]
    return f"""Rewrite this CEFR listening lesson so it matches level {level} exactly.

Unit: {unit_title}
Lesson title: {content_title}
Keep the same topic and the same target grammar as the current version below.

LEVEL REQUIREMENTS for {level}:
- Conversation between exactly two named speakers (use real first names, e.g. "Omar" and "Sara"), alternating.
- At least {turns} turns, total transcript length about {words} words (never shorter).
- Language features: {feats}
- Difficulty must clearly be higher than the previous CEFR level and lower than the next one.

Return EXACTLY this markdown structure and nothing else:

## Before you listen
- (two short bullets telling the learner what to listen for, matched to {level})

## Transcript
Name: line
Name: line
(...alternating, every line starts with the speaker name followed by a colon)

## Key phrases
- (5 useful phrases taken from the transcript)

## Comprehension
1. (5 questions of {level} difficulty)

## Answers
1. (short answers matching the questions)

CURRENT VERSION (for topic/grammar reference only):
{old_body[:2500]}
"""


def main():
    rows = api("unit_contents?select=id,title,body,unit_id,units!inner(title,sections!inner(name))&content_type=eq.listening")
    print(f"{len(rows)} listening contents")
    done = 0
    for row in rows:
        level = row["units"]["sections"]["name"]
        if level not in SPEC:
            print("skip level", level)
            continue
        for attempt in range(3):
            try:
                out = ai_call(build_prompt(level, row["units"]["title"], row["title"] or "", row["body"] or ""))
                break
            except Exception as e:  # noqa: BLE001
                print("retry", e)
                time.sleep(4 * (attempt + 1))
        else:
            print("FAILED", row["id"])
            continue
        out = out.replace("```markdown", "").replace("```", "").strip()
        if "## Transcript" not in out:
            print("bad output for", row["id"])
            continue
        api(f"unit_contents?id=eq.{row['id']}", "PATCH", {"body": out})
        done += 1
        print(f"[{done}/{len(rows)}] {level} {row['units']['title'][:40]} -> {len(out)} chars")
    print("done", done)


if __name__ == "__main__":
    main()
