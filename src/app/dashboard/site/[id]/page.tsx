"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface ScanHistoryItem {
  id: string;
  status: string;
  overallScore: number | null;
  pagesCrawled: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  issueCount: number;
  highSeverityCount: number;
}

interface SiteDetail {
  id: string;
  url: string;
  businessType: string;
  goal: string;
  monitoringEnabled: boolean;
  scanFrequencyDays: number;
  nextScanAt: string | null;
  scans: ScanHistoryItem[];
}

export default function SiteDetailPage({ params }: { params: { id: string } }) {
  const [site, setSite] = useState<SiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/sites/${params.id}`);
    if (response.ok) setSite(await response.json());
    else setError("Sito non trovato.");
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleScanNow() {
    setScanning(true);
    await fetch(`/api/sites/${params.id}/scan`, { method: "POST" });
    await load();
    setScanning(false);
  }

  async function handleToggleMonitoring() {
    if (!site) return;
    const response = await fetch(`/api/sites/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monitoringEnabled: !site.monitoringEnabled }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Non e' stato possibile aggiornare il monitoraggio.");
      return;
    }
    await load();
  }

  async function handleShare(scanId: string) {
    const response = await fetch(`/api/reports/${scanId}/share`, { method: "POST" });
    const data = await response.json();
    if (response.ok) setShareUrl(data.pdfUrl);
  }

  if (loading) return <div className="p-10 text-center text-ink-soft">Caricamento...</div>;
  if (error || !site) return <div className="p-10 text-center text-severity-high">{error}</div>;

  const latestCompleted = site.scans.find((s) => s.status === "COMPLETED");

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <Link href="/dashboard" className="text-sm text-ink-soft hover:text-ink">
            ← Torna alla dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display text-2xl">{site.url}</h1>
        <p className="mt-1 text-ink-soft">
          {site.businessType} · {site.goal}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleScanNow}
            disabled={scanning}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent-deep disabled:opacity-60"
          >
            {scanning ? "Scansione in corso..." : "Esegui nuova scansione"}
          </button>
          <button
            onClick={handleToggleMonitoring}
            className="rounded-md border border-line px-4 py-2 text-sm hover:border-accent"
          >
            Monitoraggio: {site.monitoringEnabled ? "attivo" : "disattivo"}
          </button>
          {latestCompleted && (
            <>
              <a
                href={`/api/reports/${latestCompleted.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-line px-4 py-2 text-sm hover:border-accent"
              >
                Scarica PDF
              </a>
              <button
                onClick={() => handleShare(latestCompleted.id)}
                className="rounded-md border border-line px-4 py-2 text-sm hover:border-accent"
              >
                Condividi report
              </button>
            </>
          )}
        </div>

        {site.monitoringEnabled && site.nextScanAt && (
          <p className="mt-2 text-sm text-ink-soft">
            Prossima scansione automatica: {new Date(site.nextScanAt).toLocaleDateString("it-IT")}
          </p>
        )}
        {shareUrl && (
          <p className="mt-2 break-all text-sm text-ink-soft">
            Link pubblico: <a href={shareUrl} className="text-accent hover:underline">{shareUrl}</a>
          </p>
        )}

        <h2 className="mt-10 font-display text-xl">Storico scansioni</h2>
        <div className="mt-4 space-y-2">
          {site.scans.length === 0 && <p className="text-ink-soft">Nessuna scansione ancora eseguita.</p>}
          {site.scans.map((scan) => (
            <div key={scan.id} className="flex items-center justify-between rounded-lg border border-line bg-white p-4">
              <div>
                <p className="text-sm text-ink-soft">{new Date(scan.startedAt).toLocaleString("it-IT")}</p>
                <p className="text-sm">
                  {scan.status === "COMPLETED"
                    ? `Score ${scan.overallScore} · ${scan.issueCount} problemi (${scan.highSeverityCount} alta priorita')`
                    : scan.status === "FAILED"
                      ? `Fallito: ${scan.errorMessage}`
                      : scan.status}
                </p>
              </div>
              {scan.status === "COMPLETED" && (
                <a
                  href={`/api/reports/${scan.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-accent hover:underline"
                >
                  PDF
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
