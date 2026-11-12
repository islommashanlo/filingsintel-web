# FilingsIntel Web

React frontend for **FilingsIntel**, a public-filings intelligence platform: follow corporate insiders (Form 4) and institutional managers (13F), see what they reported, and get alerts on new filings.

It talks to the Rails JSON API in [`fintrack-core-backend`](https://github.com/islommashanlo/fintrack-core-backend) (`docs/api-v1.md`, `docs/openapi.yml`). The layout, tokens and copy follow the FilingsIntel design prototype.

> Data from public SEC filings. Not investment advice.

## Quick start

```bash
npm install
cp .env.example .env
```

Run against fictional sample data, no backend needed:

```bash
VITE_API_MOCK=true npm run dev
```

Run against the real API: start the backend with `FRONTEND_ORIGIN=http://localhost:5173`, set `VITE_API_BASE_URL=http://localhost:3000` in `.env`, then:

```bash
npm run dev
```

In mock mode any email and an 8+ character password signs in.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on `localhost:5173` |
| `npm run build` | Type-check and build to `dist/` |
| `npm run typecheck` / `npm run lint` | TypeScript (strict) / ESLint |
| `npm test` | Vitest unit tests |
| `npm run api:types` | Regenerate `src/api/schema.d.ts` from `api/openapi.yml` |

## Environment

| Variable | Meaning |
| --- | --- |
| `VITE_API_BASE_URL` | Origin of the Rails API. Blank means same origin. |
| `VITE_API_MOCK` | `true` serves fictional data from an in-browser mock (MSW). |

The API uses a cookie session, so the frontend and API must be on the same site (localhost on two ports is fine). The backend only accepts the exact origin in its `FRONTEND_ORIGIN`.

## Stack

React 18, TypeScript (strict), Vite, React Router 6 (lazy routes), TanStack Query, Zustand for small client state, plain CSS on custom-property tokens, MSW for the mock API, Vitest + Testing Library.

## Structure

```
api/openapi.yml     copy of the backend contract; source for generated types
src/
  api/              client (cookies + CSRF), generated schema, query hooks
  app/              router, layouts, global search
  components/       shared UI: DataTable, ActivityRow, ClusterCard, overlays
  features/         session, watchlist/follow, billing, theme, UI store
  lib/              formatters, URL-param state
  mocks/            MSW handlers and fictional fixtures
  routes/           one file per screen
  styles/           tokens.css, global.css
```

## Routes

| Path | Screen | Sign-in |
| --- | --- | --- |
| `/`, `/pricing`, `/methodology`, `/terms`, `/privacy` | Marketing | no |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Auth | no |
| `/activity` | Unified activity feed | no |
| `/insiders`, `/insiders/:cik` | Transactions, clusters, insider profile | no |
| `/funds`, `/funds/:cik/:tab`, `/funds/compare` | Directory, fund profile, comparison | no |
| `/companies/:ticker/:tab` | Company page | no |
| `/screener` | Screener | no (saved screens need Pro) |
| `/dashboard`, `/onboarding`, `/watchlist`, `/alerts`, `/settings/:tab` | Account screens | yes |

Filters and sort are kept in the URL, sorting and pagination are server-side with the API's signed cursors.

## How it works with the API

- **CSRF:** every mutation sends `X-CSRF-Token` from `/auth/csrf`; the token is replaced whenever a response rotates it (login, signup, account change, password reset).
- **Password reset:** the emailed link carries the token in the URL fragment. The page reads it, removes it from history, then submits it.
- **Plan limits:** a `402 PRO_REQUIRED` response opens the upgrade prompt for that feature. Limits shown in the UI come from the account's `limits`.
- **Billing:** upgrade redirects to Stripe-hosted checkout with a persisted request UUID; access follows the verified subscription, never the redirect.
- **Decimals** arrive as strings and are only converted for display. A missing or unusable value renders as `—`, never as zero.

## Theming

Tokens live in `src/styles/tokens.css` for light and `[data-theme="dark"]`. Marketing and auth pages use the "Classic" look (Source Serif 4 headings, navy on white, square corners, ruled tables) by overriding the same tokens under `.mkt`; `.app-look` restores the app palette for the embedded product preview. `index.html` sets `data-theme` before first paint from `localStorage` (`fi-theme`) or the system setting; signed-in accounts sync the choice through `/me/preferences`. Color is semantic: green for purchases and increases, red for sales and decreases, amber for caution, accent for interactive elements, always with a label or sign.

## Product rules

- No recommendation language. Transactions are "Purchase" and "Sale".
- Every filing-derived figure links to its SEC source and shows when it was filed.
- Nothing is invented: features the API does not supply are shown as unavailable.

## Not built yet

These parts of the design depend on backend work that is still pending, so the UI shows an explicit unavailable state instead of sample numbers:

- Activity Scores, "Why this stands out" and the Unusual Activity feed (scoring is inactive)
- Fund comparison and portfolio overlap
- Price charts, news, sectors, market cap, 10b5-1 flags
- Alert triggers other than "new filing", and in-app or push channels
- Google sign-in

Also not in this first cut: Storybook, Playwright end-to-end tests, and pre-rendering of the marketing pages.
