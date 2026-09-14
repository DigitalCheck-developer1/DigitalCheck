import pathlib
p = pathlib.Path("src/app/page.tsx")
text = p.read_text()
old = '''            <div className="rounded-lg border border-accent bg-accent-soft/40 p-6">
              <h3 className="font-display text-xl">Pro</h3>
              <p className="mt-1 text-sm text-ink-soft">Per monitorare e migliorare nel tempo</p>
              <ul className="mt-4 space-y-2 text-sm text-ink-soft">
                <li>\u2022 Analisi complete e report dettagliato</li>
                <li>\u2022 Monitoraggio periodico e storico punteggi</li>
                <li>\u2022 Analisi AI avanzata</li>
                <li>\u2022 Report PDF, scansioni programmate</li>
              </ul>
              <p className="mt-4 text-sm text-ink-soft">A partire da circa 4,99\u20137,99 \u20ac/mese</p>
            </div>'''
new = '''            <div className="rounded-lg border border-accent bg-accent-soft/40 p-6">
              <h3 className="font-display text-xl">Pro</h3>
              <p className="mt-1 text-sm text-ink-soft">Per non limitarti a sapere cosa non va</p>
              <ul className="mt-4 space-y-2 text-sm text-ink-soft">
                <li>\u2022 Analisi complete e report dettagliato</li>
                <li>\u2022 Monitoraggio automatico periodico</li>
                <li>\u2022 Storico e confronto dei punteggi nel tempo</li>
                <li>\u2022 Report PDF scaricabili e condivisibili</li>
                <li>\u2022 Analisi AI avanzata dei contenuti</li>
                <li>\u2022 Assistente AI: testi e correzioni pronti da incollare</li>
                <li>\u2022 Richiedi il nostro intervento diretto per implementarle</li>
                <li>\u2022 Fino a 10 siti monitorati, 100 scansioni al mese</li>
              </ul>
              <p className="mt-4 text-sm text-ink-soft">9,99 \u20ac/mese</p>
            </div>'''
if old not in text:
    print("ATTENZIONE: pattern non trovato")
else:
    p.write_text(text.replace(old, new, 1))
    print("OK")
