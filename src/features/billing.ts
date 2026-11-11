import { useMutation } from "@tanstack/react-query";
import { ApiError, api } from "@/api/client";
import { toast } from "./ui-store";

const KEY = "fi-checkout-request";

/** The API wants one caller-generated UUID per purchase attempt, reused after errors. */
function requestId(fresh = false): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && !fresh) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function billingMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return "Something went wrong.";
  switch (e.code) {
    case "BILLING_UNAVAILABLE":
      return "Billing isn’t available right now. Please try again later.";
    case "BILLING_ALREADY_EXISTS":
      return "You already have a subscription. Use Manage plan to change it.";
    case "CHECKOUT_PENDING_CONFIRMATION":
      return "Your last checkout is still being confirmed. Check back in a few minutes.";
    case "CHECKOUT_REVIEW_REQUIRED":
      return "Your last checkout needs review. Please contact support.";
    case "BILLING_CUSTOMER_REQUIRED":
      return "There is no billing profile for this account yet.";
    default:
      return e.message;
  }
}

/** Redirects to Stripe-hosted checkout. Completing checkout does not grant Pro by itself. */
export function useCheckout() {
  return useMutation({
    mutationFn: async (interval: "month" | "year") => {
      const post = (id: string) => api.post<{ data: { url: string } }>("/billing/checkout", { interval, request_id: id });
      try {
        return (await post(requestId())).data.url;
      } catch (e) {
        if (e instanceof ApiError && e.code === "CHECKOUT_EXPIRED") return (await post(requestId(true))).data.url;
        throw e;
      }
    },
    onSuccess: (url) => window.location.assign(url),
    onError: (e) => toast(billingMessage(e)),
  });
}

export function usePortal() {
  return useMutation({
    mutationFn: async () => (await api.post<{ data: { url: string } }>("/billing/portal", { request_id: crypto.randomUUID() })).data.url,
    onSuccess: (url) => window.location.assign(url),
    onError: (e) => toast(billingMessage(e)),
  });
}

export const FREE_FEATURES = ["Recent filings feed and cluster activity", "Company, fund and insider profiles", "Watchlist up to 15 items", "3 alert rules (daily digest)", "Screener preview (3 results)"];
export const PRO_FEATURES = ["Everything in Free", "Unlimited watchlist", "Unlimited alert rules with instant email", "Full screener results and saved screens", "Unusual Activity", "Fund Comparison", "12 quarters of history"];

export const FEATURE_TITLE: Record<string, string> = {
  watchlist_items: "You’ve reached the Free watchlist limit",
  alert_rules: "You’ve reached the Free alert rule limit",
  instant_alerts: "Instant alerts are part of Pro",
  screener_results: "See every screener result with Pro",
  saved_screens: "Saved screens are part of Pro",
  unusual_activity_results: "Unusual Activity is part of Pro",
  fund_compare: "Compare more funds with Pro",
};
