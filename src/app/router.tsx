import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, useRouteError } from "react-router-dom";
import { ErrorState, ProfileSkeleton } from "@/components/ui";
import { GuestOnly, RequireAuth } from "@/features/session";
import { AppLayout, AuthLayout, MarketingLayout } from "./layouts";

const Dashboard = lazy(() => import("@/routes/Dashboard"));
const Activity = lazy(() => import("@/routes/Activity"));
const Funds = lazy(() => import("@/routes/Funds"));
const FundCompare = lazy(() => import("@/routes/Funds").then((m) => ({ default: m.FundCompare })));
const FundProfile = lazy(() => import("@/routes/FundProfile"));
const Insiders = lazy(() => import("@/routes/Insiders"));
const InsiderProfile = lazy(() => import("@/routes/InsiderProfile"));
const Company = lazy(() => import("@/routes/Company"));
const Screener = lazy(() => import("@/routes/Screener"));
const Watchlist = lazy(() => import("@/routes/Watchlist"));
const Alerts = lazy(() => import("@/routes/Alerts"));
const Settings = lazy(() => import("@/routes/Settings"));
const Onboarding = lazy(() => import("@/routes/Onboarding"));
const Landing = lazy(() => import("@/routes/Marketing").then((m) => ({ default: m.Landing })));
const Pricing = lazy(() => import("@/routes/Marketing").then((m) => ({ default: m.Pricing })));
const Methodology = lazy(() => import("@/routes/Marketing").then((m) => ({ default: m.Methodology })));
const Legal = lazy(() => import("@/routes/Marketing").then((m) => ({ default: m.Legal })));
const NotFound = lazy(() => import("@/routes/Marketing").then((m) => ({ default: m.NotFound })));
const Login = lazy(() => import("@/routes/Auth").then((m) => ({ default: m.Login })));
const Signup = lazy(() => import("@/routes/Auth").then((m) => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import("@/routes/Auth").then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("@/routes/Auth").then((m) => ({ default: m.ResetPassword })));

const page = (node: ReactNode) => <Suspense fallback={<ProfileSkeleton />}>{node}</Suspense>;

function RouteError() {
  const error = useRouteError();
  return (
    <div className="card" style={{ margin: 24 }}>
      <ErrorState error={error} retry={() => window.location.reload()} />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <MarketingLayout />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: page(<Landing />) },
      { path: "/pricing", element: page(<Pricing />) },
      { path: "/methodology", element: page(<Methodology />) },
      { path: "/terms", element: page(<Legal doc="terms" />) },
      { path: "/privacy", element: page(<Legal doc="privacy" />) },
      { path: "*", element: page(<NotFound />) },
    ],
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteError />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: "/login", element: page(<Login />) },
          { path: "/signup", element: page(<Signup />) },
        ],
      },
      { path: "/forgot-password", element: page(<ForgotPassword />) },
      { path: "/reset-password", element: page(<ResetPassword />) },
    ],
  },
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      // Public filing data: readable without an account.
      { path: "/activity", element: page(<Activity />), errorElement: <RouteError /> },
      { path: "/funds", element: page(<Funds />), errorElement: <RouteError /> },
      { path: "/funds/compare", element: page(<FundCompare />) },
      { path: "/funds/:cik", element: page(<FundProfile />), errorElement: <RouteError /> },
      { path: "/funds/:cik/:tab", element: page(<FundProfile />), errorElement: <RouteError /> },
      { path: "/insiders", element: page(<Insiders />), errorElement: <RouteError /> },
      { path: "/insiders/:cik", element: page(<InsiderProfile />), errorElement: <RouteError /> },
      { path: "/companies/:ticker", element: page(<Company />), errorElement: <RouteError /> },
      { path: "/companies/:ticker/:tab", element: page(<Company />), errorElement: <RouteError /> },
      { path: "/screener", element: page(<Screener />), errorElement: <RouteError /> },
      {
        element: <RequireAuth />,
        children: [
          { path: "/dashboard", element: page(<Dashboard />), errorElement: <RouteError /> },
          { path: "/onboarding", element: page(<Onboarding />), errorElement: <RouteError /> },
          { path: "/watchlist", element: page(<Watchlist />), errorElement: <RouteError /> },
          { path: "/alerts", element: page(<Alerts />), errorElement: <RouteError /> },
          { path: "/settings", element: <Navigate to="/settings/account" replace /> },
          { path: "/settings/:tab", element: page(<Settings />), errorElement: <RouteError /> },
        ],
      },
    ],
  },
]);
