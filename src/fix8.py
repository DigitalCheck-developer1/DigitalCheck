import re, pathlib

p = pathlib.Path("src/app/page.tsx")
text = p.read_text()

def replace_checked(old, new):
    global text
    if old not in text:
        print("ATTENZIONE: non trovato ->", old[:50])
    else:
        text = text.replace(old, new, 1)
        print("OK ->", old[:50])

replace_checked(
    "Per monitorare e migliorare nel tempo",
    "Per non limitarti a sapere cosa non va",
)

replace_checked(
    "Monitoraggio periodico e storico punteggi</li>",
    "Monitoraggio automatico periodico</li>\n                <li>\u2022 Storico e confronto dei punteggi nel tempo</li>",
)

replace_checked(
    "Analisi AI avanzata</li>",
    "Analisi AI avanzata dei contenuti</li>\n                <li>\u2022 Assistente AI: testi e correzioni pronti da incollare</li>\n                <li>\u2022 Richiedi il nostro intervento diretto per implementarle</li>",
)

replace_checked(
    "Report PDF, scansioni programmate</li>",
    "Report PDF scaricabili e condivisibili</li>\n                <li>\u2022 Fino a 10 siti monitorati, 100 scansioni al mese</li>",
)

new_text, count = re.subn(r"A partire da circa [^<]*</p>", "9,99 \u20ac/mese</p>", text)
if count == 0:
    print("ATTENZIONE: prezzo non trovato")
else:
    text = new_text
    print("OK -> prezzo aggiornato")

p.write_text(text)
