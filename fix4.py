import json, pathlib
p = pathlib.Path("package.json")
data = json.loads(p.read_text())
data["scripts"]["build"] = "prisma generate && next build"
p.write_text(json.dumps(data, indent=2) + "\n")
print("OK")
