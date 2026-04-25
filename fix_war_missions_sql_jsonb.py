import json
import re
from pathlib import Path

files = [
    Path("supabase/seed/war_missions_seed.sql"),
    Path("supabase/war_missions_full_import.sql"),
]

jsonb_literal = re.compile(r"'((?:\\.|[^'])*)'::jsonb")

def convert_jsonb(match):
    raw = match.group(1)

    # Convert SQL/JS-style escaped JSON into real JSON text.
    cleaned = raw.replace('\\"', '"')

    try:
        parsed = json.loads(cleaned)
    except Exception as exc:
        raise RuntimeError(f"Invalid JSONB literal:\n{raw}\n\nCleaned:\n{cleaned}\n\nError: {exc}")

    compact = json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
    return f"$json${compact}$json$::jsonb"

for path in files:
    sql = path.read_text(encoding="utf-8-sig")

    # Remove the wording we already discovered, but this is not the main fix.
    sql = sql.replace("competitive visibility", "community discovery")
    sql = sql.replace("visible competitive events", "open launch events")
    sql = sql.replace("public competitive events", "open launch events")

    fixed = jsonb_literal.sub(convert_jsonb, sql)

    path.write_text(fixed, encoding="utf-8")

    print(f"Fixed {path}")
