# DebtPricing – debt purchase/sale pricing services (.NET)

* `DebtPricing.Api` – ASP.NET Core Web API (controllers + EF Core + SQL Server)
* `PricingEngine.Checks` – console project that checks the pricing math, validation rules and JSON binding
  against the worked example (`dotnet run --project PricingEngine.Checks`, no database needed)

## Run

1. Install the .NET 8 SDK (newer SDKs also work; to move to .NET 9/10 change `TargetFramework` and the EF Core package majors).
2. Set `ConnectionStrings:DefaultConnection` in `DebtPricing.Api/appsettings.json`.
3. Create the table with **either**
   * `DebtPricing.Api/Sql/001_create_pricing_models.sql` (also inserts the sample model `AutoLoan-Standard`), **or**
   * EF migrations: `dotnet ef migrations add InitialCreate --project DebtPricing.Api` then `dotnet ef database update --project DebtPricing.Api`
     (do not use both on the same database).
4. Configure Keycloak (see **Authentication** below).
5. `dotnet run --project DebtPricing.Api --launch-profile http` -> Swagger UI at http://localhost:5080/swagger
   (the launch profile sets `ASPNETCORE_ENVIRONMENT=Development`, which enables Swagger and allows an http Keycloak).
   Keycloak uses port 8080, so the API listens on 5080 (http) / 7080 (https).

Another database? Replace `UseSqlServer` in `Program.cs` and the EF provider package.

## Concepts

* A **pricing model** is one row of `PricingModels` (the base-assumptions table) and is identified by its unique `Name`.
  The pricing endpoints receive that name and read every rate from the row.
* All rates are **fractions**: `0.27` = 27%.
* `EffectiveDiscountRate = BaseRate + CreditSpread + PrepaymentAdjustment + LiquidityPremium` (computed, not stored).
* `JuniorShare = 1 - SeniorShare` (computed, not stored).
* Price = `Nominal / (1 + rate) ^ MaturityYears`, rounded to 2 decimals (away from zero). Fractional years are allowed.
  * Simple pricing: nominal = pool nominal, rate = effective discount rate.
  * Tranche pricing: nominal = pool nominal x tranche share, rate = `SeniorDiscountRate` or `JuniorDiscountRate`.
* `RegulatoryRateCap` never changes a price; it only sets `exceedsRegulatoryCap` and adds a warning.
* `ServicingFeeRate` is stored for reference only (the servicing fee is deducted from collections, not from the price).
* Inactive models (`IsActive = false`) cannot be used for pricing.

## Endpoints

| Method | Route | Purpose | Role |
|---|---|---|---|
| GET | `/api/pricing-models?activeOnly=false` | list models | user or admin |
| GET | `/api/pricing-models/{id}` | one model | user or admin |
| POST | `/api/pricing-models` | create (201) | admin |
| PUT | `/api/pricing-models/{id}` | replace (all fields required) | admin |
| DELETE | `/api/pricing-models/{id}` | delete (204) | admin |
| POST | `/api/pricing/simple` | simple price | user or admin |
| POST | `/api/pricing/tranche` | price of the Senior or Junior tranche | user or admin |

Errors: `401` missing/invalid token, `403` token valid but role missing, `400` validation, `404` unknown id / model name, `409` duplicate name, `422` model inactive.

### Create a model

```json
POST /api/pricing-models
{
  "name": "AutoLoan-Standard",
  "description": "Standard auto-loan receivables model",
  "baseRate": 0.27,
  "creditSpread": 0.03,
  "prepaymentAdjustment": 0.01,
  "liquidityPremium": 0.02,
  "regulatoryRateCap": 0.30,
  "servicingFeeRate": 0.012,
  "seniorShare": 0.80,
  "seniorDiscountRate": 0.28,
  "juniorDiscountRate": 0.45,
  "isActive": true
}
```

Validation: every rate in [0, 1]; `0 < seniorShare < 1`; `seniorDiscountRate <= juniorDiscountRate`.

### Simple pricing

```json
POST /api/pricing/simple
{ "pricingModelName": "AutoLoan-Standard", "nominalValue": 1000000000, "maturityYears": 1 }
```
→ `discountRate` 0.33, `purchasePrice` **751879699.25**, `exceedsRegulatoryCap` true (33% > 30%).

### Tranche pricing

```json
POST /api/pricing/tranche
{ "pricingModelName": "AutoLoan-Standard", "nominalValue": 1000000000, "maturityYears": 1, "trancheType": "Senior" }
```
* Senior → tranche nominal 800,000,000, rate 0.28, `purchasePrice` **625000000.00**
* Junior → tranche nominal 200,000,000, rate 0.45, `purchasePrice` **137931034.48** (flagged above the cap)

## Authentication (Keycloak, OAuth 2.0 / OpenID Connect)

The API is a **resource server**: it accepts `Authorization: Bearer <access token>` issued by Keycloak and validates
signature (realm JWKS), issuer, audience and lifetime. Every endpoint requires a valid token; roles decide what is allowed:

* `pricing-user` - read models, call the pricing services
* `pricing-admin` - everything above + create/update/delete models

### appsettings.json

```json
"Keycloak": {
  "Authority": "http://localhost:8080/realms/debt-pricing",
  "Audience": "debt-pricing-api",
  "RequireHttpsMetadata": true,
  "SwaggerClientId": "debt-pricing-swagger"
}
```

* `Authority` = `http://localhost:8080/realms/<your realm>` (Keycloak older than 17: `http://localhost:8080/auth/realms/<realm>`).
  **Replace `debt-pricing` with your realm name.** The token's `iss` must equal this URL exactly, so mint tokens with the same
  host (`localhost`, not `127.0.0.1`).
* `Audience` = client ID of this API in Keycloak; tokens must list it in `aud`.
* `RequireHttpsMetadata` is `false` only in `appsettings.Development.json`. Use https Keycloak outside development.

### Keycloak setup (admin console, http://localhost:8080)

1. **Realm** - use an existing one or create it (do not use `master` for applications).
2. **API client** `debt-pricing-api` - Clients > Create client. It only represents the API (no login flows needed).
   Open it > **Roles** > create `pricing-user` and `pricing-admin`.
3. **Assign roles** - Users (or Groups) > Role mapping > assign the client roles of `debt-pricing-api`.
   Using client roles of the API client is the simplest option: Keycloak then adds `debt-pricing-api` to `aud`
   automatically (audience-resolve mapper in the default `roles` scope). Realm roles with the same names also work, but you
   must then add an **Audience** mapper (Client scopes > your scope > Add mapper > Audience > included client audience
   `debt-pricing-api`, add to access token).
4. **Swagger client** `debt-pricing-swagger` (only for the Swagger "Authorize" button) - Client authentication **Off** (public),
   Standard flow **On**, Advanced > PKCE method **S256**,
   Valid redirect URIs `http://localhost:5080/swagger/oauth2-redirect.html`, Web origins `http://localhost:5080`.
5. **Other backend services that call this API** - create a confidential client with *Service accounts roles* enabled,
   then Service account roles tab > assign `pricing-user` of `debt-pricing-api`. Get tokens with the `client_credentials` grant.

### Try it

Swagger UI: click **Authorize**, tick `openid`, log in with a Keycloak user that has a role, then call the endpoints.

curl (enable *Direct access grants* on `debt-pricing-swagger` for local testing only):

```bash
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/debt-pricing/protocol/openid-connect/token" \
  -d grant_type=password -d client_id=debt-pricing-swagger \
  -d username=<user> -d password=<password> | jq -r .access_token)

curl -H "Authorization: Bearer $TOKEN" http://localhost:5080/api/pricing-models
```

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| 401, `invalid_audience` | token has no `debt-pricing-api` in `aud` - assign a client role of that client, or add the Audience mapper |
| 401, `IDX10205` / issuer mismatch | token minted via a different URL than `Authority` (`127.0.0.1` vs `localhost`, wrong realm, missing `/auth`) |
| 401, `IDX20803` / cannot load metadata | API cannot reach Keycloak at `Authority`, or `RequireHttpsMetadata=true` with an http URL outside Development |
| 403 | token is valid (the API is in `aud`) but has no `pricing-user`/`pricing-admin` - decode it and check `resource_access.debt-pricing-api.roles` / `realm_access.roles`. Note: with client roles, a user who holds *no* role of the API client gets **401 invalid_audience**, not 403, because Keycloak then omits the API from `aud` (verified against Keycloak 26.8) |
| Swagger login redirect error | redirect URI / web origin on `debt-pricing-swagger` does not match the URL you opened |

Role claims are read from `realm_access.roles` and from `resource_access.<Audience>.roles` only (roles of other clients are ignored).

## Notes

* Renaming a model breaks callers that reference the old name.
* Name matching follows the database collation (case-insensitive on default SQL Server).
