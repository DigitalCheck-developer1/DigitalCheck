import pathlib
p = pathlib.Path("prisma/schema.prisma")
text = p.read_text()
old = 'generator client {\n  provider = "prisma-client-js"\n}'
new = 'generator client {\n  provider      = "prisma-client-js"\n  binaryTargets = ["native", "rhel-openssl-3.0.x"]\n}'
if old not in text:
    print("ATTENZIONE: pattern non trovato")
else:
    p.write_text(text.replace(old, new, 1))
    print("OK")
