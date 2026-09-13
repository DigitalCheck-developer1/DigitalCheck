"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AdminStats {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  conversionRate: number;
  totalSites: number;
  totalScans: number;
  completedScans: number;
  failedScans: number;
  scanSuccessRate: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Accesso non autorizzato.");
          return;
        }
        setStats(data);
      })
      .catch(() => setError("Non e' stato possibile caricare le statistiche."));
  }, []);

  if (error) return <div className="p-10 text-center text-severity-high">{error}</div>;
  if (!stats) return <div className="p-10 text-center text-ink-soft">Caricamento...</div>;

  const cards: { label: string; value: string | number }[] = [
    { label: "Utenti totali", value: stats.totalUsers },
    { label: "Utenti Free", value: stats.freeUsers },
    { label: "Utenti Pro", value: stats.proUsers },
    { label: "Conversion rate Free→Pro", value: `${stats.conversionRate}%` },
    { label: "Siti monitorati", value: stats.totalSites },
    { label: "Scansioni totali", value: stats.totalScans },
    { label: "Scansioni riuscite", value: stats.completedScans },
    { label: "Scansioni fallite", value: stats.failedScans },
    { label: "Tasso di successo scan", value: `${stats.scanSuccessRate}%` },
  ];

  return (
    <main className="min-h-screen bg-paper px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm text-ink-soft hover:text-ink">
          ← Torna alla dashboard
        </Link>
        <h1 className="mt-2 font-display text-2xl">Metriche di prodotto</h1>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg border border-line bg-white p-4">
              <p className="text-sm text-ink-soft">{c.label}</p>
              <p className="font-display text-2xl">{c.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-ink-soft">
          Non ancora incluso: costo medio per scan e AI/API usage — richiedono di collegare la
          fatturazione del provider AI e di PageSpeed, non disponibile automaticamente via API in
          tutti i provider.
        </p>
      </div>
    </main>
  );
}
