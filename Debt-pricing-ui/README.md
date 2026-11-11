# Debt Pricing UI (Next.js)

Web UI for the DebtPricing API (.NET): manage pricing models and price receivable pools (simple and per tranche).
Next.js 16 (App Router, Server Components + Server Actions), Auth.js v5 with Keycloak, Tailwind CSS 4, TypeScript.

| Page | Route | Who |
|---|---|---|
| Dashboard | `/` | signed-in users |
| Pricing models (list, detail) | `/pricing-models`, `/pricing-models/{id}` | `pricing-user`, `pricing-admin` |
| Create / edit / delete a model | `/pricing-models/new`, `/pricing-models/{id}/edit` | `pricing-admin` |
| Simple pricing | `/pricing/simple` | `pricing-user`, `pricing-admin` |
| Tranche pricing (Senior or Junior) | `/pricing/tranche` | `pricing-user`, `pricing-admin` |

The UI only hides what a user may not do; the API enforces the roles.

## How it works

* The browser never talks to the .NET API. Server Components and Server Actions call it with the signed-in user's
  Keycloak access token (`Authorization: Bearer ...`), so there is no CORS to configure.
* Tokens live in Auth.js's encrypted, httpOnly session cookie. `GET /api/auth/session` (readable by browser JS) returns
  the user and roles but **not** the tokens.
* The access token is refreshed with the refresh token when it expires. If that fails the user is sent to `/signin`.
* Sign-out also ends the Keycloak SSO session (back-channel logout with the refresh token).
* `src/proxy.ts` (Next 16's replacement for `middleware.ts`) sends unauthenticated users to `/signin`.
  On Next 15 or older rename it to `middleware.ts` and export it as `middleware`.
* Roles are read from the access token exactly like the API does: realm roles plus the roles of the API's own client
  (`resource_access[DEBTPRICING_API_CLIENT_ID].roles`).
* Rates are typed as percentages (27 or 27.5) and sent to the API as fractions (0.27, 0.275) without floating-point noise.
  Persian/Arabic digits and separators are accepted in all numeric fields.

## Setup

Prerequisites: Node.js 20.9+, the DebtPricing API (default http://localhost:5080) and Keycloak (default http://localhost:8080).

### 1. Keycloak

You already have the API client (`debt-pricing-api`) with the client roles `pricing-user` / `pricing-admin` from the API
README. Add one more client for this UI:

1. Clients > Create client: Client ID `debt-pricing-ui`.
2. Client authentication **On**, Standard flow **On**, Direct access grants Off.
3. Valid redirect URIs: `http://localhost:3000/api/auth/callback/keycloak`; Web origins: `http://localhost:3000`.
4. Credentials tab: copy the client secret.
5. Users must hold a client role of `debt-pricing-api`. Keycloak then puts the API in the token's `aud` claim, which the API
   requires. (Realm roles alone work only if you add an **Audience** mapper for `debt-pricing-api` to this client's dedicated scope.)

Shortcut for a throw-away dev realm: Realm settings > Action > Partial import, or `kc.sh start-dev --import-realm`, with
`keycloak/debt-pricing-realm.json`. It contains the clients, the roles and two **test users** (alice / bob, passwords in the file)
and a placeholder client secret - never use it as is outside local development.

### 2. Environment

```bash
cp .env.example .env.local
```

| Variable | Meaning |
|---|---|
| `AUTH_SECRET` | random secret for the session cookie: `openssl rand -base64 32` |
| `AUTH_URL` | public URL of this UI, e.g. `http://localhost:3000` |
| `AUTH_KEYCLOAK_ID` / `AUTH_KEYCLOAK_SECRET` | the `debt-pricing-ui` client ID and secret |
| `AUTH_KEYCLOAK_ISSUER` | `http://localhost:8080/realms/<realm>` (Keycloak older than 17: `.../auth/realms/<realm>`) |
| `DEBTPRICING_API_URL` | base URL of the .NET API |
| `DEBTPRICING_API_CLIENT_ID` | client ID of the API in Keycloak (default `debt-pricing-api`) |

### 3. Run

```bash
npm install
npm run dev        # http://localhost:3000
```

Production: `npm run build && npm start`.

| Script | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript) |
| `npm test` | Vitest: number parsing, validation, role extraction, API error mapping, server actions |

## Production notes

* Serve the UI and Keycloak over https; set `AUTH_URL` to the public https URL and, behind a reverse proxy, `AUTH_TRUST_HOST=true`.
* The API must be reachable from the **Next.js server**. If it uses a private CA or the ASP.NET dev certificate, set
  `NODE_EXTRA_CA_CERTS=/path/to/ca.pem` (or use the http URL locally).
* In Keycloak keep access tokens short (the default 5 minutes is fine). If you enable *Revoke Refresh Token*, parallel requests
  may try to refresh with the same refresh token and the user will be asked to sign in again.
* Warnings returned by the API are Persian and rendered with `dir="auto"`; the rest of the UI is English / LTR.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `/signin` shows "sign-in configuration is invalid" | `AUTH_SECRET` missing, or `AUTH_KEYCLOAK_*` wrong |
| Keycloak: "Invalid parameter: redirect_uri" | redirect URI of the `debt-pricing-ui` client differs from `${AUTH_URL}/api/auth/callback/keycloak` |
| Callback error after login | wrong client secret, or Keycloak not reachable from the Next.js server at `AUTH_KEYCLOAK_ISSUER` |
| "Cannot reach the pricing API" | API not running / wrong `DEBTPRICING_API_URL` / untrusted certificate (see above) |
| "The API did not accept the access token" | token has no `debt-pricing-api` audience (user has no client role of the API client) or the issuer differs from the API's `Keycloak:Authority` (`localhost` vs `127.0.0.1`) |
| "Access denied ... neither pricing-user nor pricing-admin" | the user has no pricing role |
| Login loops on plain-http localhost in some browsers | Keycloak dev mode sets `Secure` cookies; Chrome/Firefox/Edge accept them on http://localhost, others may not - use https |

## Structure

```
src/auth.ts                 Auth.js config: Keycloak provider, token refresh, roles, Keycloak logout
src/proxy.ts                route protection (Next 16 proxy)
src/lib/api.ts              server-only API client (adds the Bearer token)
src/lib/validation.ts       form validation (mirrors the API rules) + live previews
src/lib/numbers.ts          percent <-> fraction, Persian digits
src/actions/*.ts            server actions: model CRUD, simple / tranche pricing
src/components/*.tsx        UI components (forms, calculator, result card, nav)
src/app/**                  pages
keycloak/                   dev realm import
```
