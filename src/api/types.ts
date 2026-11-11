import type { components } from "./schema";

type S = components["schemas"];

export type Account = S["Account"];
export type PlanLimits = S["PlanLimits"];
export type Plan = S["Plan"];
export type Preferences = S["AccountPreferences"];
export type NotificationPreferences = S["NotificationPreferences"];
export type Subscription = S["BillingSubscription"];
export type SearchResult = S["SearchResult"];
export type SearchResponse = S["SearchResponse"];
export type Dashboard = S["DashboardResponse"];
export type Transaction = S["InsiderTransaction"];
export type ActivityEvent = S["ActivityEvent"];
export type Cluster = S["InsiderCluster"];
export type Fund = S["Fund"];
export type FundProfile = S["FundProfile"];
export type Holding = S["InstitutionalHolding"];
export type PositionChange = S["PositionChange"];
export type Report = S["InstitutionalReport"];
export type Company = S["Company"];
export type FilingSummary = S["FilingSummary"];
export type InsiderProfile = S["InsiderProfile"];
export type InsiderCompany = S["InsiderCompany"];
export type WatchlistItem = S["WatchlistItem"];
export type AlertRule = S["FilingAlertRule"];
export type AlertEvent = S["FilingAlertEvent"];
export type AlertCapabilities = S["FilingAlertCapabilities"];
export type Explanation = S["FilingExplanation"];
export type ScreenerResult = S["ScreenerResult"];
export type ScreenerCondition = S["ScreenerCondition"];
export type ScreenDefinition = S["SavedScreenDefinition"];
export type SavedScreen = S["SavedScreen"];
export type Provenance = S["FilingProvenance"];

export type EntityType = WatchlistItem["entity_type"];

export interface PageMeta {
  total_count: number;
  has_more: boolean;
  next_cursor: string | null;
  limit: number;
  sort: string;
  as_of: string;
}

export interface Page<T, M = unknown> {
  data: T[];
  meta: PageMeta & M;
}
