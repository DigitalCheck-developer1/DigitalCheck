import pathlib

def replace_checked(path, old, new):
    p = pathlib.Path(path)
    text = p.read_text()
    if old not in text:
        print("ATTENZIONE: non trovato in " + path)
        return
    p.write_text(text.replace(old, new, 1))
    print("OK: " + path)

replace_checked(
    "src/lib/ai/content-analyzer.ts",
    'const model = process.env.AI_MODEL || "gemini-2.5-flash";',
    'const model = process.env.AI_MODEL || "gemini-3.6-flash";',
)
replace_checked(
    "src/lib/ai/advisor.ts",
    'const model = process.env.AI_MODEL || "gemini-2.5-flash";',
    'const model = process.env.AI_MODEL || "gemini-3.6-flash";',
)
