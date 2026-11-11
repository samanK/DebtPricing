# Debt Pricing Project: Context Handoff

This file summarises the design, decisions, code layout, configuration and current status of the
debt purchase/sale pricing project. It is a handoff document, not a verbatim chat transcript.
Place it at the root of the project folder so Cowork can read it.

Language note: the business domain and the regulatory warnings are Persian. The code, API and UI are in English.
Rates are stored and transmitted as fractions (0.27 = 27%). Money is in Toman.

---

## 1. Business context

- Client: an automotive financing (leasing/instalment-sales) company partnered with Saman Bank (Iran).
- Goal: a "Debt Trading" platform in which customers can buy and sell auto-loan instalment receivables
  at a discount. This lets the company raise financing from customers at specific times, and lets buyers
  earn more than their purchase price at maturity.
- Legal basis referenced in the methodology document: the "debt purchase" (خرید دین) contract approved by
  the Money and Credit Council (شورای پول و اعتبار), session 1128, 25/5/1390. The regulatory rate cap is set
  by that council, not by the central bank alone.
- Core legal condition: only real receivables backed by a real sale (for example vehicle delivery) may be
  discounted. Otherwise the transaction risks being treated as hidden interest (ribā).
- Pricing must not be presented as interest on money. The price is the purchase price of a receivable.

## 2. Pricing methodology

### 2.1 Five-layer discount rate (simple pricing)

Effective discount rate = Base rate + Credit risk premium + Prepayment adjustment + Liquidity premium

1. Base rate (time value), in the ceiling approved for the asset class.
2. Credit risk premium, based on the pool's historical default rate.
3. Prepayment adjustment (similar to CPR), because early settlement shortens the receivables' life.
4. Liquidity premium, because the secondary market for these assets is shallow in Iran.
5. Servicing fee: the collection agent's fee, deducted from collections. It is NOT part of the price.

### 2.2 Price formula

    Purchase price = Nominal value / (1 + rate) ^ years

### 2.3 Tranche structure

The pool is split into two tranches:

- Senior: first claim on collections, lower risk, lower discount rate.
- Junior (subordinated): absorbs first losses, higher discount rate, behaves like a risk-bearing investment.

Tranche nominal = pool nominal x tranche share; tranche price = tranche nominal / (1 + tranche rate) ^ years.

### 2.4 Worked example (used in tests and sample data)

Inputs: nominal 1,000,000,000 Toman, maturity 1 year.

| Case | Rate | Purchase price (Toman) | Note |
|---|---|---|---|
| Simple, effective 33% | 33% | 751,879,699.25 | exceeds 30% cap |
| Simple, effective 30% | 30% | 769,230,769.23 | at cap |
| Senior tranche (80% share) | 28% | 625,000,000.00 | within cap |
| Junior tranche (20% share) | 45% | 137,931,034.48 | exceeds cap |

Senior + Junior total = 762,931,034.48 Toman.

### 2.5 Regulatory cap behaviour

The cap never changes a price. It only sets `exceedsRegulatoryCap` and adds a Persian warning in the response.
Rounding: 2 decimal places, away from zero.

### 2.6 Policy decisions and open questions

- Whether the junior tranche is sold to third parties or retained by the company as a first-loss buffer is undecided.
- Two structural paths were analysed:
  - Path 1, bilateral debt purchase: fits the current licence, but cannot become a repeatable public marketplace without
    raising the question of whether it is a security.
  - Path 2, securitisation through a licensed special-purpose vehicle (SPV) regulated by the Securities and Exchange
    Organization (سازمان بورس): supports a real marketplace. Regulatory coordination between the central bank and the
    SEO is still incomplete, so legal advice is required.
- Legal and tax review is required before launch.

## 3. System architecture

    +---------------------+        Bearer token         +----------------------+
    | Next.js UI (3000)   | --------------------------> | .NET API (5080/7080) |
    | Auth.js + server    |   server-side fetch only    | ASP.NET Core 8, EF   |
    | actions, RSC        |                             | Core, SQL Server     |
    +----------+----------+                             +----------+-----------+
               |  OIDC (authorization code + PKCE)                 | JWKS / issuer
               v                                                   v
    +--------------------------------------------------------------------------+
    |  Keycloak 26.x (8080), realm: debt-pricing                               |
    |  clients: debt-pricing-api (roles), debt-pricing-ui (confidential),      |
    |           debt-pricing-swagger (optional, public, PKCE)                  |
    +--------------------------------------------------------------------------+

Ports: API http 5080 / https 7080. UI 3000. Keycloak 8080.

## 4. Deliverables

| File | Contents |
|---|---|
| `DebtPricing.zip` | .NET 8 API solution: `DebtPricing.Api` and `PricingEngine.Checks`, plus README |
| `debt-pricing-ui.zip` | Next.js 16 UI project, including `keycloak/debt-pricing-realm.json` and README |
| `روش‌شناسی_قیمت‌گذاری_خرید_و_فروش_دین.docx` | Persian methodology document (RTL, 3 pages) |
| `مدل_قیمت_گذاری_خرید_و_فروش_دین.xlsx` | Excel model with live formulas (assumptions, simple, tranche, servicing-fee sheets) |
| `PROJECT_CONTEXT.md` | this file |

### 4.1 API (`DebtPricing.Api`), ASP.NET Core 8

Folders: `Controllers/`, `Services/PricingEngine.cs` (pure math), `Domain/` (PricingModel, TrancheType),
`Dtos/` (requests, responses, validation), `Data/AppDbContext.cs` (EF Core), `Security/` (Keycloak JWT,
role mapping, policies, Swagger OAuth), `Sql/001_create_pricing_models.sql`, `Properties/launchSettings.json`.

Endpoints:

| Method | Route | Role |
|---|---|---|
| GET | `/api/pricing-models?activeOnly=false` | pricing-user or pricing-admin |
| GET | `/api/pricing-models/{id}` | pricing-user or pricing-admin |
| POST | `/api/pricing-models` | pricing-admin (201) |
| PUT | `/api/pricing-models/{id}` | pricing-admin (all fields required) |
| DELETE | `/api/pricing-models/{id}` | pricing-admin (204) |
| POST | `/api/pricing/simple` | pricing-user or pricing-admin |
| POST | `/api/pricing/tranche` | pricing-user or pricing-admin (`trancheType`: Senior or Junior) |

Error codes: 400 validation, 401 missing or invalid token, 403 valid token without role, 404 unknown model or id,
409 duplicate name, 422 inactive model.

Model fields (PricingModel): Name (unique), Description, BaseRate, CreditSpread, PrepaymentAdjustment,
LiquidityPremium, RegulatoryRateCap, ServicingFeeRate, SeniorShare, SeniorDiscountRate, JuniorDiscountRate,
IsActive, CreatedAtUtc, UpdatedAtUtc. Computed: EffectiveDiscountRate, JuniorShare.

Validation: each rate in [0,1]; 0 < SeniorShare < 1; SeniorDiscountRate <= JuniorDiscountRate; pricing nominal > 0;
maturity in (0, 50] years.

Security: JwtBearer validates issuer, audience (`debt-pricing-api`), lifetime and signature via the realm's keys.
Roles come from `realm_access.roles` and `resource_access["debt-pricing-api"].roles` (other clients' roles are ignored).
Policies: PricingUser (user or admin), PricingAdmin (admin only); fallback policy = authenticated.

Config (`appsettings.json`): ConnectionStrings:DefaultConnection, Keycloak:Authority
(`http://localhost:8080/realms/debt-pricing`), Keycloak:Audience (`debt-pricing-api`), Keycloak:RequireHttpsMetadata
(true; false only in `appsettings.Development.json`), Keycloak:SwaggerClientId (`debt-pricing-swagger`).

### 4.2 UI (`debt-pricing-ui`), Next.js 16.4, React 19, Auth.js v5 beta.32, Tailwind 4, TypeScript 5.9

Key files:
- `src/auth.ts`: Keycloak provider, token refresh before expiry (10 s skew), roles into the session, Keycloak
  back-channel logout on sign-out.
- `src/proxy.ts`: Next 16 proxy (replaces middleware) that protects all pages except `/signin` and `/api/auth`.
- `src/app/api/auth/[...nextauth]/route.ts`: POST via Auth.js; GET for `/session` strips `accessToken` from the response.
- `src/lib/api.ts` (server-only): API client that adds the Bearer token, maps errors, and refuses users without a
  pricing role before calling the API.
- `src/lib/validation.ts`, `src/lib/numbers.ts`: percent to fraction conversion done by shifting the decimal point
  (no float noise), Persian digits, live previews.
- `src/actions/pricing-models.ts`, `src/actions/pricing.ts`: server actions for CRUD and pricing.
- `src/components/*`: forms, calculator, result card, nav, delete confirmation.
- Pages: `/` dashboard, `/signin`, `/pricing-models` (list), `/pricing-models/new`, `/pricing-models/[id]`,
  `/pricing-models/[id]/edit`, `/pricing/simple`, `/pricing/tranche`.

Environment (`.env.local`, from `.env.example`):

    AUTH_SECRET=                      # openssl rand -base64 32
    AUTH_URL=http://localhost:3000
    AUTH_KEYCLOAK_ID=debt-pricing-ui
    AUTH_KEYCLOAK_SECRET=             # from Clients > debt-pricing-ui > Credentials
    AUTH_KEYCLOAK_ISSUER=http://localhost:8080/realms/debt-pricing
    DEBTPRICING_API_URL=http://localhost:5080
    DEBTPRICING_API_CLIENT_ID=debt-pricing-api

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test` (Vitest).

## 5. Keycloak configuration

Realm: `debt-pricing` (not `master`).

- Client `debt-pricing-api`: Client authentication Off, no standard flow, no direct access grants. Client roles:
  `pricing-admin`, `pricing-user`.
- Client `debt-pricing-ui`: Client authentication On (this is what creates the Credentials tab), Standard flow On,
  Direct access grants Off. Valid redirect URI `http://localhost:3000/api/auth/callback/keycloak`. Web origin
  `http://localhost:3000`. PKCE method S256.
- Optional client `debt-pricing-swagger`: public, Standard flow On, PKCE S256, redirect
  `http://localhost:5080/swagger/oauth2-redirect.html`, web origin `http://localhost:5080`.
- Optional service-to-service client: confidential, Service accounts roles On, assign `pricing-user`.
- Users need a CLIENT role of `debt-pricing-api`. Without one, Keycloak omits the API from `aud` and the API
  returns 401 (invalid audience), not 403.
- Access token lifetime: 5 minutes default. Recommended to keep it short.

Dev realm import file: `keycloak/debt-pricing-realm.json`. It contains test users alice (admin) and bob (user),
and a PLACEHOLDER UI client secret. Do not use these passwords or that secret outside local development.
Regenerate the client secret in the UI client's Credentials tab.

## 6. Verification status

| Area | Status |
|---|---|
| Pricing math (simple, tranche, rounding, example values) | Tested (PricingEngine.Checks, 30 checks passed) |
| DTO validation, JSON enum binding, role mapping, policies, Keycloak config validation | Tested with the real ASP.NET authorization engine |
| API controllers, EF Core DbContext, JwtBearer/Swagger wiring | NOT compiled in the sandbox (no NuGet access). Requires `dotnet build` on the developer machine |
| UI typecheck, lint, Vitest (58 tests), `next build` | Pass, including from a clean lockfile install |
| UI end-to-end against real Keycloak 26.8.1 with a mock API | Pass: login, roles, CRUD, pricing, refresh after expiry, sign-out ends Keycloak session |
| UI in a real browser (layout, Persian rendering) | NOT visually verified |
| API against the real .NET server with Keycloak | NOT tested end-to-end (the mock API stood in) |

Known issue reported by the developer: on macOS arm64 `npm run dev` failed with a truncated
`@next/swc-darwin-arm64` binary (fixed by a clean reinstall; `npx next dev --webpack` as a fallback).

## 7. Known limitations and recommended next steps

1. Run `dotnet build` on the API and fix any compile issues. Then apply `Sql/001_create_pricing_models.sql`
   (or EF migrations, not both) and run the API against Keycloak.
2. Run the full UI flow against the real API. Only the mock was used in tests.
3. Rotate the Keycloak UI client secret. Do not reuse the placeholder.
4. No authorization on individual models (any admin can change any model). No audit log of rate changes.
   For a financial product, add an audit table (who changed which rate, when, old and new values).
5. Renaming a model breaks callers that use the name. Consider immutable IDs in the pricing requests.
6. No pagination on the model list.
7. Keycloak "Revoke Refresh Token" can cause the UI to log users out when parallel requests refresh at once.
8. The UI is LTR and English. Persian/RTL UI is not built. Only the API's warnings are Persian.
9. The methodology document and Excel model use the same example numbers as the code tests. Keep them in sync
   when any rule changes.
10. Legal review before production: the debt-purchase contract, the SPV route, the regulatory cap
    (current figure to be confirmed with the Money and Credit Council publications), and tax treatment.
11. Decide whether the junior tranche is sold externally or retained by the company.
12. The sandbox-generated files are not in version control. Initialise git in the project folder.

## 8. Working conventions

- Persian deliverables: RTL Word documents, Tahoma font, `bidiVisual` on tables, `rightToLeft` on runs and `fa-IR` language tags.
- Keep rates as fractions in the API; percentages only in the UI forms.
- The UI proxy is `src/proxy.ts` (Next 16). On Next 15 or older it is `middleware.ts`.
- Use `Keycloak:Authority` in the API and `AUTH_KEYCLOAK_ISSUER` in the UI with exactly the same string
  (watch for `localhost` versus `127.0.0.1`).
- Ports: Keycloak 8080, API 5080, UI 3000. Keep them distinct.

## 9. How to run locally (summary)

1. Start Keycloak (8080) and create the realm, clients, roles and users as described in section 5.
2. Start the API: `dotnet run --project DebtPricing.Api --launch-profile http` (Swagger at http://localhost:5080/swagger).
3. Create `.env.local` in the UI folder from `.env.example`, then `npm install` and `npm run dev`.
4. Open http://localhost:3000 and sign in.
