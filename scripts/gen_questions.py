#!/usr/bin/env python3
"""Generate interactive questions (data.questions) for every unit content
section that has none. No AI calls: everything is derived from the existing
lesson body (Comprehension/Practice + Answers, word lists, common mistakes).

Usage: python3 scripts/gen_questions.py
"""
import json
import os
import random
import re
import subprocess

random.seed(7)
DB = os.environ.get("SUPABASE_DB_URL") or ""


def q(sql: str) -> str:
    return subprocess.run(
        ["psql", DB, "-At", "-c", sql], capture_output=True, text=True, check=True
    ).stdout


def sections(body: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    cur = None
    for line in (body or "").splitlines():
        m = re.match(r"^##\s+(.*)$", line.strip())
        if m:
            cur = m.group(1).strip()
            out[cur] = []
        elif cur:
            out[cur].append(line.rstrip())
    return out


def numbered(lines: list[str]) -> dict[int, str]:
    res: dict[int, str] = {}
    for l in lines:
        m = re.match(r"^\s*(\d+)[.)]\s*(.+)$", l)
        if m:
            res[int(m.group(1))] = m.group(2).strip()
    return res


def bullets(lines: list[str]) -> list[str]:
    return [re.sub(r"^\s*[-*]\s*", "", l).strip() for l in lines if re.match(r"^\s*[-*]\s+", l)]


def table_rows(lines: list[str]) -> list[list[str]]:
    rows = []
    for l in lines:
        if l.strip().startswith("|"):
            cells = [c.strip() for c in l.strip().strip("|").split("|")]
            if cells and not set("".join(cells)) <= set("-: "):
                rows.append(cells)
    return rows


def qid(n: int) -> str:
    return f"g{n}_{random.randint(1000, 9999)}"


def mcq(prompt, correct, pool, n=0, explanation=None):
    distract = [p for p in dict.fromkeys(pool) if p.strip().lower() != correct.strip().lower()]
    random.shuffle(distract)
    opts = [correct] + distract[:3]
    if len(opts) < 3:
        return None
    random.shuffle(opts)
    item = {"id": qid(n), "type": "mcq", "prompt": prompt, "options": opts,
            "answer": correct, "points": 1}
    if explanation:
        item["explanation"] = explanation
    return item


TF_YES = re.compile(r"^\s*yes\b", re.I)
TF_NO = re.compile(r"^\s*no\b", re.I)


def build(content_type: str, body: str) -> list[dict]:
    s = sections(body)
    qs: list[dict] = []

    # 1) Question + Answers pairs (reading / listening / vocabulary / practice-like)
    ans = numbered(s.get("Answers", []))
    for head in ("Comprehension", "Practice", "Practice questions", "Questions"):
        if head not in s or not ans:
            continue
        items = numbered(s[head])
        pool = list(ans.values())
        for k, prompt in items.items():
            correct = ans.get(k)
            if not correct:
                continue
            if TF_YES.match(correct) or TF_NO.match(correct):
                qs.append({"id": qid(k), "type": "truefalse",
                           "prompt": re.sub(r"^(Is|Are|Was|Were|Do|Does|Did|Has|Have)\b", r"True or false? \1", prompt),
                           "answer": "true" if TF_YES.match(correct) else "false",
                           "points": 1, "explanation": correct})
            else:
                item = mcq(prompt, correct, pool, k)
                if item:
                    qs.append(item)
        break

    # 2) Vocabulary: fill the gap with the right word (multiple choice)
    if content_type == "vocabulary":
        rows = [r for r in table_rows(s.get("Word list", [])) if len(r) >= 4 and r[0].lower() != "word"]
        words = [r[0] for r in rows]
        for i, r in enumerate(rows[:10]):
            word, example = r[0], r[3]
            gap = re.sub(re.escape(word), "______", example, count=1, flags=re.I)
            if "______" not in gap:
                continue
            item = mcq(f"Choose the correct word: {gap}", word, words, 100 + i,
                       explanation=f"{word} — {r[2]}")
            if item:
                qs.append(item)

    # 3) Grammar: pick the correct sentence (from Common Mistakes)
    if content_type == "grammar":
        for i, line in enumerate(s.get("Common Mistakes", [])):
            m = re.match(r"^~~(.+?)~~\s*->\s*(.+)$", line.strip())
            if not m:
                continue
            wrong, right = m.group(1).strip(), m.group(2).strip()
            qs.append({"id": qid(200 + i), "type": "mcq",
                       "prompt": "Which sentence is correct?",
                       "options": random.sample([right, wrong], 2),
                       "answer": right, "points": 1,
                       "explanation": f"Common mistake: {wrong}"})
        rows = [r for r in table_rows(s.get("Form", [])) if len(r) >= 3 and r[0].lower() != "focus"]
        forms = [r[1] for r in rows]
        for i, r in enumerate(rows[:4]):
            item = mcq(f"Which form matches this example?  “{r[2]}”", r[1], forms, 300 + i)
            if item:
                qs.append(item)
        for i, line in enumerate(bullets(s.get("Quick Recap", []))[:3]):
            qs.append({"id": qid(400 + i), "type": "truefalse",
                       "prompt": f"True or false? {line}", "answer": "true", "points": 1})

    # 4) Pronunciation: focus-sound checks + open drills
    if content_type == "pronunciation":
        focus = next((k for k in s if k.startswith("Focus sound")), None)
        words = bullets(s.get("Listen and repeat", []))
        words = [re.split(r"\s[-\u2013\u2014/]", w)[0].strip() for w in words if w.strip()]
        if focus and len(words) >= 4:
            sound = focus.split(":", 1)[-1].strip()
            for i, w in enumerate(words[:5]):
                item = mcq(f"You hear this word with {sound}. Which word is it?  \u201c{w[:2]}\u2026\u201d",
                           w, words, 500 + i)
                if item:
                    qs.append(item)
        for i, prompt in enumerate(numbered(s.get("Practice questions", [])).values()):
            qs.append({"id": qid(600 + i), "type": "text", "prompt": prompt, "points": 2})

    # 5) Speaking: choose the best phrase + open answers
    if content_type == "speaking":
        phrases = bullets(s.get("Useful phrases", []))
        for i, p in enumerate(phrases[:4]):
            item = mcq("Which phrase can you use here to keep the conversation going?", p, phrases, 700 + i)
            if item:
                qs.append(item)
        for i, prompt in enumerate(list(numbered(s.get("Talk about it", [])).values())[:5]):
            qs.append({"id": qid(800 + i), "type": "text", "prompt": prompt, "points": 2})

    return qs


def strip_answers(body: str) -> str:
    return re.sub(r"\n##\s+Answers\b[\s\S]*?(?=\n##\s|\Z)", "\n", body or "")


def main():
    raw = q(
        "select id || E'\\t' || content_type || E'\\t' || replace(coalesce(body,''), E'\\n', '\\\\n') "
        "from unit_contents where jsonb_array_length(coalesce(data->'questions','[]'::jsonb)) = 0;"
    )
    updates = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        cid, ctype, body = line.split("\t", 2)
        body = body.replace("\\n", "\n")
        qs = build(ctype, body)
        if not qs:
            continue
        updates.append((cid, qs, strip_answers(body)))

    print("sections with generated questions:", len(updates))
    for i in range(0, len(updates), 25):
        chunk = updates[i:i + 25]
        stmts = []
        for cid, qs, body in chunk:
            jq = json.dumps(qs, ensure_ascii=False).replace("'", "''")
            jb = body.replace("'", "''")
            stmts.append(
                f"update unit_contents set data = coalesce(data,'{{}}'::jsonb) || jsonb_build_object('questions', '{jq}'::jsonb), "
                f"body = '{jb}' where id = '{cid}';"
            )
        subprocess.run(["psql", DB, "-q", "-c", "\n".join(stmts)], check=True)
        print("updated", i + len(chunk))
    print("DONE")


if __name__ == "__main__":
    main()
