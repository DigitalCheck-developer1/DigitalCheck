import type { BusinessType as DbBusinessType, IssueSeverity as DbIssueSeverity } from "@prisma/client";
import type { BusinessType, IssueSeverity } from "@/types";

const BUSINESS_TYPE_TO_DB: Record<BusinessType, DbBusinessType> = {
  bnb: "BNB",
  hotel: "HOTEL",
  restaurant: "RESTAURANT",
  shop: "SHOP",
  professional: "PROFESSIONAL",
  other: "OTHER",
};

const BUSINESS_TYPE_FROM_DB: Record<DbBusinessType, BusinessType> = {
  BNB: "bnb",
  HOTEL: "hotel",
  RESTAURANT: "restaurant",
  SHOP: "shop",
  PROFESSIONAL: "professional",
  OTHER: "other",
};

export function toDbBusinessType(value: BusinessType): DbBusinessType {
  return BUSINESS_TYPE_TO_DB[value];
}

export function fromDbBusinessType(value: DbBusinessType): BusinessType {
  return BUSINESS_TYPE_FROM_DB[value];
}

const SEVERITY_TO_DB: Record<IssueSeverity, DbIssueSeverity> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

const SEVERITY_FROM_DB: Record<DbIssueSeverity, IssueSeverity> = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

export function toDbSeverity(value: IssueSeverity): DbIssueSeverity {
  return SEVERITY_TO_DB[value];
}

export function fromDbSeverity(value: DbIssueSeverity): IssueSeverity {
  return SEVERITY_FROM_DB[value];
}
