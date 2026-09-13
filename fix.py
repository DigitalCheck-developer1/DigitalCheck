import pathlib

def replace(path, old, new):
    p = pathlib.Path(path)
    text = p.read_text()
    if old not in text:
        print("ATTENZIONE: pattern non trovato in " + path)
        return
    p.write_text(text.replace(old, new, 1))
    print("OK: " + path)

replace(
    "src/lib/analysis/seo-analyzer.ts",
    '  const home = crawl.pages[0];\n  const $ = cheerio.load(home.html);',
    '  const home = crawl.pages[0];\n  if (!home) {\n    throw new Error("Impossibile analizzare: nessuna pagina disponibile nel crawl.");\n  }\n  const $ = cheerio.load(home.html);',
)

replace(
    "src/lib/crawler/crawler.ts",
    '  const internalLinks = extractInternalLinks(result.pages[0].html, origin).slice(',
    '  const internalLinks = extractInternalLinks(result.pages[0]?.html ?? "", origin).slice(',
)

replace(
    "src/lib/crawler/crawler.ts",
    '  while ((match = hrefPattern.exec(html)) !== null) {\n    try {\n      const resolved = new URL(match[1], origin);',
    '  while ((match = hrefPattern.exec(html)) !== null) {\n    const href = match[1];\n    if (!href) continue;\n    try {\n      const resolved = new URL(href, origin);',
)

replace(
    "src/lib/security/ssrf-guard.ts",
    '  const [a, b] = parts;',
    '  const a = parts[0] ?? 0;\n  const b = parts[1] ?? 0;',
)
