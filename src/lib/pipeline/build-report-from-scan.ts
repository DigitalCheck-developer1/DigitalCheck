import { prisma } from "@/lib/db/prisma";
import { fromDbBusinessType, fromDbSeverity } from "@/lib/db/enum-map";
import { scoreLabel } from "@/lib/scoring/weights";
import type { CategoryKey, DigitalCheckReport, IssueCategory } from "@/types";

export async function buildReportFromScan(scanId: string): Promise<DigitalCheckReport | null> {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { site: true, scores: true, issues: true, recommendations: { orderBy: { priority: "asc" } } },
  });

  if (!scan || scan.status !== "COMPLETED" || scan.overallScore == null) return null;

  return {
    requestedUrl: scan.site.url,
    businessType: fromDbBusinessType(scan.site.businessType),
    goal: scan.site.goal as DigitalCheckReport["goal"],
    generatedAt: (scan.completedAt ?? scan.startedAt).toISOString(),
    pagesAnalyzed: scan.pagesCrawled,
    overallScore: scan.overallScore,
    categoryScores: scan.scores.map((s) => ({
      category: s.category as CategoryKey,
      score: s.score,
      weight: s.weight,
      verified: true,
    })),
    issues: scan.issues.map((i) => ({
      title: i.title,
      description: i.description,
      whyItMatters: i.whyItMatters,
      evidence: i.evidence ?? undefined,
      recommendation: i.recommendation,
      severity: fromDbSeverity(i.severity),
      category: i.category as IssueCategory,
    })),
    strengths: scan.strengths,
    recommendedActions: scan.recommendations.map((r) => r.title),
    businessImpactSummary:
      scan.businessImpactSummary ?? `Punteggio complessivo: ${scan.overallScore}/100 (${scoreLabel(scan.overallScore)}).`,
    aiAnalysis: null,
    unverifiable: scan.unverifiable,
  };
}
