import json
import re
from pathlib import Path

files = [
    Path("supabase/seed/war_missions_seed.sql"),
    Path("supabase/war_missions_full_import.sql"),
]

json_block = re.compile(r"\$json\$(.*?)\$json\$::jsonb", re.DOTALL)

for path in files:
    sql = path.read_text(encoding="utf-8-sig")

    def fix_json_block(match):
        body = match.group(1)

        # This is the actual bug: dollar-quoted JSON still contains escaped quotes.
        fixed_body = body.replace('\\"', '"')

        try:
            json.loads(fixed_body)
        except Exception as exc:
            print(f"\nFAILED JSON CHECK in {path}")
            print(fixed_body[:500])
            raise exc

        return f"$json${fixed_body}$json$::jsonb"

    sql = json_block.sub(fix_json_block, sql)

    # Remove earlier word-workaround leftovers if they exist.
    sql = sql.replace("competitive visibility", "community discovery")
    sql = sql.replace("visible competitive events", "open launch events")
    sql = sql.replace("public competitive events", "open launch events")

    path.write_text(sql, encoding="utf-8")
    print(f"Fixed and validated JSONB blocks in {path}")
