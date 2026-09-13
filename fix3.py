import json, pathlib
p = pathlib.Path("package.json")
data = json.loads(p.read_text())
data["allowScripts"] = {
    "@prisma/client@5.22.0": True,
    "prisma@5.22.0": True,
    "@prisma/engines@5.22.0": True,
    "esbuild@0.28.2": True
}
p.write_text(json.dumps(data, indent=2) + "\n")
print("OK")
