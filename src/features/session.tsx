import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ApiError, api } from "@/api/client";
import type { Account, Preferences } from "@/api/types";
import { useTheme } from "./theme";

type SessionBody = { data: { user: Account; csrf_token: string } };

/** The signed-in account, or null when there is no session. */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return (await api.get<{ data: Account }>("/me")).data;
      } catch (e) {
        if (e instanceof ApiError && e.unauthorized) return null;
        throw e;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useIsPro() {
  return useMe().data?.plan === "pro";
}

export function usePreferences() {
  const me = useMe().data;
  return useQuery({
    queryKey: ["preferences"],
    queryFn: async () => (await api.get<{ data: Preferences }>("/me/preferences")).data,
    enabled: !!me,
    staleTime: 5 * 60_000,
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Preferences>) => (await api.patch<{ data: Preferences }>("/me/preferences", patch)).data,
    onMutate: (patch) => {
      const prev = qc.getQueryData<Preferences>(["preferences"]);
      if (prev) qc.setQueryData(["preferences"], { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _p, ctx) => ctx?.prev && qc.setQueryData(["preferences"], ctx.prev),
    onSuccess: (data) => qc.setQueryData(["preferences"], data),
  });
}

/** Account settings win over the local theme once they load. */
export function useSyncThemeFromAccount() {
  const prefs = usePreferences().data;
  const setTheme = useTheme((s) => s.setTheme);
  useEffect(() => {
    if (prefs && prefs.theme !== useTheme.getState().theme) setTheme(prefs.theme);
  }, [prefs, setTheme]);
}

function useSessionMutation(path: string, method: "post" | "patch" = "post") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, string>) => (await api[method]<SessionBody>(path, body)).data.user,
    onSuccess: (user) => {
      // A new session can belong to a different account: drop every private cache.
      qc.clear();
      qc.setQueryData(["me"], user);
    },
  });
}

export const useLogin = () => useSessionMutation("/auth/login");
export const useSignup = () => useSessionMutation("/auth/signup");
export const useUpdateAccount = () => useSessionMutation("/me", "patch");

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/auth/logout"),
    onSettled: () => {
      qc.clear();
      qc.setQueryData(["me"], null);
    },
  });
}

/** Only relative, same-origin paths are accepted as a post-login destination. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function RequireAuth() {
  const me = useMe();
  const loc = useLocation();
  if (me.isPending) return <div className="main" aria-busy="true" />;
  if (!me.data) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <Outlet />;
}

/** Signed-in users skip the login and signup pages. */
export function GuestOnly() {
  const me = useMe();
  const loc = useLocation();
  if (me.isPending) return null;
  if (me.data) return <Navigate to={safeNext(new URLSearchParams(loc.search).get("next"))} replace />;
  return <Outlet />;
}
