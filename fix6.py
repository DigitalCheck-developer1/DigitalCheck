import pathlib
p = pathlib.Path("src/app/api/auth/register/route.ts")
text = p.read_text()
old = "organizationName: z.string().trim().min(1).max(120).optional(),"
new = "organizationName: z.string().trim().max(120).optional(),"
if old not in text:
    print("ATTENZIONE: pattern non trovato")
else:
    p.write_text(text.replace(old, new, 1))
    print("OK")
