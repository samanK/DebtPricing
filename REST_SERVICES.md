# DebtPricing API: REST Services

Base URL (local): `http://localhost:5080` (HTTPS 7080). Swagger: `/swagger`.
Auth: `Authorization: Bearer <Keycloak access token>`. Roles come from the `debt-pricing-api` client roles.
Rates are fractions (0.27 = 27%). Money is in Toman.

| Policy | Allowed roles |
|---|---|
| `PricingUser` | `pricing-user` or `pricing-admin` |
| `PricingAdmin` | `pricing-admin` only |

Common errors: 400 validation (automatic model validation), 401 missing or invalid token, 403 valid token without the role, 404 unknown model or id, 409 duplicate name, 422 inactive model.

---

## 1. Pricing models: `/api/pricing-models`

Controller: `Controllers/PricingModelsController.cs`

| Method | Route | Policy | Success | Notes |
|---|---|---|---|---|
| GET | `/api/pricing-models?activeOnly=false` | PricingUser | 200, array of `PricingModelResponse` | Ordered by `Name`. `activeOnly=true` returns only active models. |
| GET | `/api/pricing-models/{id:int}` | PricingUser | 200, `PricingModelResponse` | 404 if not found. |
| POST | `/api/pricing-models` | PricingAdmin | 201 Created, `PricingModelResponse` | Body: `PricingModelRequest`. 409 if the name exists. |
| PUT | `/api/pricing-models/{id:int}` | PricingAdmin | 200, `PricingModelResponse` | Full replacement, all fields required. 404 if not found. 409 if the name belongs to another model. |
| DELETE | `/api/pricing-models/{id:int}` | PricingAdmin | 204 No Content | 404 if not found. |

Name handling: the name is trimmed before the uniqueness check and the save.

### PricingModelRequest (POST and PUT body)

| Field | Type | Rules |
|---|---|---|
| `Name` | string, required | 1 to 100 characters, not blank, unique |
| `Description` | string, optional | max 500 characters |
| `BaseRate` | decimal, required | 0 to 1 |
| `CreditSpread` | decimal, required | 0 to 1 |
| `PrepaymentAdjustment` | decimal, required | 0 to 1 |
| `LiquidityPremium` | decimal, required | 0 to 1 |
| `RegulatoryRateCap` | decimal, required | 0 to 1 |
| `ServicingFeeRate` | decimal, required | 0 to 1 |
| `SeniorShare` | decimal, required | greater than 0 and less than 1 |
| `SeniorDiscountRate` | decimal, required | 0 to 1, must not exceed `JuniorDiscountRate` |
| `JuniorDiscountRate` | decimal, required | 0 to 1 |
| `IsActive` | bool, optional | default `true` |

### PricingModelResponse

`Id`, `Name`, `Description`, `BaseRate`, `CreditSpread`, `PrepaymentAdjustment`, `LiquidityPremium`, `EffectiveDiscountRate` (computed), `RegulatoryRateCap`, `ServicingFeeRate`, `SeniorShare`, `JuniorShare` (computed, 1 - SeniorShare), `SeniorDiscountRate`, `JuniorDiscountRate`, `IsActive`, `CreatedAtUtc`, `UpdatedAtUtc`.

---

## 2. Pricing services: `/api/pricing`

Controller: `Controllers/PricingController.cs`. Both endpoints are POST and require PricingUser.
The model is looked up by `pricingModelName` (trimmed). 404 if it does not exist, 422 if it is inactive.

### POST `/api/pricing/simple`

Formula: `PurchasePrice = NominalValue / (1 + DiscountRate) ^ MaturityYears`

Request (`SimplePricingRequest`):

| Field | Type | Rules |
|---|---|---|
| `PricingModelName` | string, required | not blank |
| `NominalValue` | decimal, required | greater than 0 (pool face value, Toman) |
| `MaturityYears` | decimal, required | greater than 0 and at most 50 (fractions allowed) |

Response (`SimplePricingResponse`): `PricingModelName`, `NominalValue`, `MaturityYears`, `DiscountRate`, `PurchasePrice`, `BuyerProfitAtMaturity`, `RegulatoryRateCap`, `ExceedsRegulatoryCap`, `Warnings` (string array, Persian warning when the cap is exceeded).

### POST `/api/pricing/tranche`

Formula: `TrancheNominal = PoolNominal x TrancheShare`, `PurchasePrice = TrancheNominal / (1 + TrancheRate) ^ MaturityYears`

Request (`TranchePricingRequest`): the same fields as the simple request, plus:

| Field | Type | Rules |
|---|---|---|
| `TrancheType` | enum, required | `Senior` or `Junior` |

Response (`TranchePricingResponse`): `PricingModelName`, `TrancheType`, `PoolNominalValue`, `TrancheShare`, `TrancheNominalValue`, `MaturityYears`, `DiscountRate`, `PurchasePrice`, `BuyerProfitAtMaturity`, `RegulatoryRateCap`, `ExceedsRegulatoryCap`, `Warnings`.

The regulatory cap never changes a price. It only sets `ExceedsRegulatoryCap` and adds a warning. Results are rounded to 2 decimal places, away from zero.

---

## Summary

| # | Method | Route | Policy |
|---|---|---|---|
| 1 | GET | `/api/pricing-models` | PricingUser |
| 2 | GET | `/api/pricing-models/{id}` | PricingUser |
| 3 | POST | `/api/pricing-models` | PricingAdmin |
| 4 | PUT | `/api/pricing-models/{id}` | PricingAdmin |
| 5 | DELETE | `/api/pricing-models/{id}` | PricingAdmin |
| 6 | POST | `/api/pricing/simple` | PricingUser |
| 7 | POST | `/api/pricing/tranche` | PricingUser |

Seven endpoints in total.

## Notes

- The source is in `DebtPricing.Api/Controllers/`. The pricing math is in `Services/PricingEngine.cs`. Request and response types are in `Dtos/`.
- `PROJECT_CONTEXT.md` (section 4.1) lists the same endpoints. The controllers and DTOs above were read directly from the source.
- The API controllers were not compiled in the original sandbox (per `PROJECT_CONTEXT.md`, section 6). Verify against a real `dotnet build` and Swagger.
