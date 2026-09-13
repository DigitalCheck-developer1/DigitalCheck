import pathlib

new_config = '''/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F5F1",
        ink: "#14171C",
        "ink-soft": "#3A3F47",
        line: "#E3E0D8",
        accent: {
          DEFAULT: "#1F6F64",
          soft: "#E4EFEC",
          deep: "#123F38",
        },
        severity: {
          high: "#B4483F",
          medium: "#C97A3D",
          low: "#3F7D8F",
        },
        score: {
          critical: "#B4483F",
          weak: "#C97A3D",
          good: "#3F7D8F",
          strong: "#1F6F64",
          excellent: "#2F7A4F",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["IBM Plex Sans", "Helvetica Neue", "Arial", "sans-serif"],
      },
      maxWidth: {
        prose: "68ch",
      },
    },
  },
  plugins: [],
};
'''

pathlib.Path("tailwind.config.js").write_text(new_config)

old_ts = pathlib.Path("tailwind.config.ts")
if old_ts.exists():
    old_ts.unlink()
    print("Rimosso tailwind.config.ts")

print("OK: creato tailwind.config.js")
