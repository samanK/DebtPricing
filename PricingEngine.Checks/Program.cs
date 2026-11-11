using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using DebtPricing.Api.Security;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;
using DebtPricing.Api.Domain;
using DebtPricing.Api.Dtos;
using DebtPricing.Api.Services;

int failures = 0;
void Check(string name, bool ok, string detail = "")
{
    Console.WriteLine($"{(ok ? "PASS" : "FAIL")}  {name} {detail}");
    if (!ok) failures++;
}

PricingModel Model(decimal b, decimal c, decimal p, decimal l) => new()
{
    Name = "AutoLoan-Standard", BaseRate = b, CreditSpread = c, PrepaymentAdjustment = p, LiquidityPremium = l,
    RegulatoryRateCap = 0.30m, ServicingFeeRate = 0.012m, SeniorShare = 0.80m,
    SeniorDiscountRate = 0.28m, JuniorDiscountRate = 0.45m, IsActive = true
};

// ---- math: the worked example from the document ----
var example = Model(0.27m, 0.03m, 0.01m, 0.02m);

var s = PricingEngine.Simple(example, 1_000_000_000m, 1m);
Check("effective rate = 33%", s.DiscountRate == 0.33m, s.DiscountRate.ToString());
Check("simple price @33%", s.PurchasePrice == 751_879_699.25m, s.PurchasePrice.ToString());
Check("simple exceeds cap @33%", s.ExceedsRegulatoryCap && s.Warnings.Count == 1);

var capped = PricingEngine.Simple(Model(0.27m, 0.01m, 0.01m, 0.01m), 1_000_000_000m, 1m);
Check("simple price @30%", capped.PurchasePrice == 769_230_769.23m, capped.PurchasePrice.ToString());
Check("simple within cap @30%", !capped.ExceedsRegulatoryCap && capped.Warnings.Count == 0);
Check("buyer profit = nominal - price", capped.BuyerProfitAtMaturity == 230_769_230.77m, capped.BuyerProfitAtMaturity.ToString());

var sen = PricingEngine.Tranche(example, TrancheType.Senior, 1_000_000_000m, 1m);
Check("senior price", sen.PurchasePrice == 625_000_000.00m, sen.PurchasePrice.ToString());
Check("senior nominal/share/rate", sen.TrancheNominalValue == 800_000_000m && sen.TrancheShare == 0.80m && sen.DiscountRate == 0.28m);
Check("senior within cap", !sen.ExceedsRegulatoryCap);

var jun = PricingEngine.Tranche(example, TrancheType.Junior, 1_000_000_000m, 1m);
Check("junior price", jun.PurchasePrice == 137_931_034.48m, jun.PurchasePrice.ToString());
Check("junior nominal/share/rate", jun.TrancheNominalValue == 200_000_000m && jun.TrancheShare == 0.20m && jun.DiscountRate == 0.45m);
Check("junior flagged above cap", jun.ExceedsRegulatoryCap && jun.Warnings.Count == 1);
Check("tranche total ~ 762,931,034.48", sen.PurchasePrice + jun.PurchasePrice == 762_931_034.48m, (sen.PurchasePrice + jun.PurchasePrice).ToString());

var half = PricingEngine.Simple(capped.NominalValue == 0 ? example : Model(0.27m, 0.01m, 0.01m, 0.01m), 1_000_000_000m, 0.5m);
Check("fractional year (0.5)", half.PurchasePrice == Math.Round(1_000_000_000m / (decimal)Math.Sqrt(1.30), 2, MidpointRounding.AwayFromZero), half.PurchasePrice.ToString());

try { PricingEngine.PresentValue(1m, 0.3m, 0m); Check("years=0 throws", false); }
catch (ArgumentOutOfRangeException) { Check("years=0 throws", true); }

// ---- validation ----
List<ValidationResult> Validate(object o)
{
    var res = new List<ValidationResult>();
    Validator.TryValidateObject(o, new ValidationContext(o), res, validateAllProperties: true);
    return res;
}

var okReq = new SimplePricingRequest { PricingModelName = "AutoLoan-Standard", NominalValue = 1_000_000m, MaturityYears = 1m };
Check("valid simple request", Validate(okReq).Count == 0);
Check("nominal <= 0 rejected", Validate(new SimplePricingRequest { PricingModelName = "x", NominalValue = 0m, MaturityYears = 1m }).Count == 1);
Check("years <= 0 rejected", Validate(new SimplePricingRequest { PricingModelName = "x", NominalValue = 1m, MaturityYears = 0m }).Count == 1);
Check("years > 50 rejected", Validate(new SimplePricingRequest { PricingModelName = "x", NominalValue = 1m, MaturityYears = 51m }).Count == 1);
Check("blank model name rejected", Validate(new SimplePricingRequest { PricingModelName = "  ", NominalValue = 1m, MaturityYears = 1m }).Count == 1);
Check("bad tranche enum rejected", Validate(new TranchePricingRequest { PricingModelName = "x", NominalValue = 1m, MaturityYears = 1m, TrancheType = (TrancheType)9 }).Count == 1);

PricingModelRequest MReq(decimal seniorShare = 0.8m, decimal sen = 0.28m, decimal jun = 0.45m, decimal baseRate = 0.27m) => new()
{
    Name = "M1", BaseRate = baseRate, CreditSpread = 0.03m, PrepaymentAdjustment = 0.01m, LiquidityPremium = 0.02m,
    RegulatoryRateCap = 0.30m, ServicingFeeRate = 0.012m, SeniorShare = seniorShare, SeniorDiscountRate = sen, JuniorDiscountRate = jun
};
Check("valid model request", Validate(MReq()).Count == 0);
Check("SeniorShare = 1 rejected", Validate(MReq(seniorShare: 1m)).Count == 1);
Check("SeniorShare = 0 rejected", Validate(MReq(seniorShare: 0m)).Count == 1);
Check("senior rate > junior rate rejected", Validate(MReq(sen: 0.5m, jun: 0.4m)).Count == 1);
Check("rate > 1 rejected (Range)", Validate(MReq(baseRate: 1.5m)).Count == 1);

// ---- JSON binding behavior (what MVC's System.Text.Json formatter does) ----
var opts = new JsonSerializerOptions(JsonSerializerDefaults.Web);
opts.Converters.Add(new JsonStringEnumConverter());
opts.Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping;

var t = JsonSerializer.Deserialize<TranchePricingRequest>(
    "{\"pricingModelName\":\"AutoLoan-Standard\",\"nominalValue\":1000000000,\"maturityYears\":1,\"trancheType\":\"Junior\"}", opts)!;
Check("JSON string enum 'Junior' binds", t.TrancheType == TrancheType.Junior && t.NominalValue == 1_000_000_000m);

try { JsonSerializer.Deserialize<TranchePricingRequest>("{\"pricingModelName\":\"x\",\"nominalValue\":1}", opts); Check("missing fields rejected", false); }
catch (JsonException) { Check("missing fields rejected (required)", true); }

try { JsonSerializer.Deserialize<TranchePricingRequest>("{\"pricingModelName\":\"x\",\"nominalValue\":1,\"maturityYears\":1,\"trancheType\":\"Mezz\"}", opts); Check("unknown tranche rejected", false); }
catch (JsonException) { Check("unknown tranche string rejected", true); }

var json = JsonSerializer.Serialize(jun, opts);
Check("response serializes enum as string", json.Contains("\"trancheType\":\"Junior\""));
Console.WriteLine(json);


// ---- Keycloak role mapping ----
ClaimsPrincipal Token(params Claim[] claims) => new(new ClaimsIdentity(claims, "test"));
Claim Json(string type, string json) => new(type, json, "JSON");

var kc = Token(
    new Claim("preferred_username", "saman"),
    Json("realm_access", "{\"roles\":[\"offline_access\",\"pricing-user\"]}"),
    Json("resource_access",
        "{\"debt-pricing-api\":{\"roles\":[\"pricing-admin\"]},\"account\":{\"roles\":[\"manage-account\"]}}"));
KeycloakRoleMapper.AddRoleClaims(kc, "debt-pricing-api");
Check("realm role mapped", kc.IsInRole("pricing-user") && kc.IsInRole("offline_access"));
Check("own client role mapped", kc.IsInRole("pricing-admin"));
Check("other client's roles NOT mapped", !kc.IsInRole("manage-account"));
var before = kc.FindAll(ClaimTypes.Role).Count();
KeycloakRoleMapper.AddRoleClaims(kc, "debt-pricing-api");
Check("mapping is idempotent (no duplicate roles)", kc.FindAll(ClaimTypes.Role).Count() == before, before.ToString());

var bad = Token(Json("realm_access", "{not json"), Json("resource_access", "[1,2]"));
KeycloakRoleMapper.AddRoleClaims(bad, "debt-pricing-api");
Check("malformed / unexpected claims grant nothing", !bad.FindAll(ClaimTypes.Role).Any());

var none = Token(new Claim("sub", "1"));
KeycloakRoleMapper.AddRoleClaims(none, "debt-pricing-api");
Check("token without role claims is fine", !none.FindAll(ClaimTypes.Role).Any());

var wrongClient = Token(Json("resource_access", "{\"debt-pricing-api\":{\"roles\":[\"pricing-admin\"]}}"));
KeycloakRoleMapper.AddRoleClaims(wrongClient, "some-other-api");
Check("client roles only read for the configured client", !wrongClient.IsInRole("pricing-admin"));

// ---- Authorization policies (real ASP.NET Core authorization service) ----
var services = new ServiceCollection();
services.AddLogging();
services.AddDebtPricingAuthorization();
using var provider = services.BuildServiceProvider();
var authz = provider.GetRequiredService<IAuthorizationService>();

async Task<bool> Allowed(ClaimsPrincipal p, string policy) => (await authz.AuthorizeAsync(p, null, policy)).Succeeded;

ClaimsPrincipal WithRole(string role) => Token(new Claim(ClaimTypes.Role, role));
var admin = WithRole(Roles.PricingAdmin);
var user = WithRole(Roles.PricingUser);
var noRole = Token(new Claim("sub", "1"));
var anonymous = new ClaimsPrincipal(new ClaimsIdentity());

Check("admin passes PricingAdmin", await Allowed(admin, Policies.PricingAdmin));
Check("admin passes PricingUser", await Allowed(admin, Policies.PricingUser));
Check("user passes PricingUser", await Allowed(user, Policies.PricingUser));
Check("user FAILS PricingAdmin", !await Allowed(user, Policies.PricingAdmin));
Check("authenticated, no role FAILS PricingUser", !await Allowed(noRole, Policies.PricingUser));
Check("anonymous FAILS PricingUser", !await Allowed(anonymous, Policies.PricingUser));
Check("anonymous FAILS PricingAdmin", !await Allowed(anonymous, Policies.PricingAdmin));
var policyProvider = provider.GetRequiredService<IAuthorizationPolicyProvider>();
Check("fallback policy requires authentication", await policyProvider.GetFallbackPolicyAsync() is not null);

// ---- Keycloak configuration validation ----
KeycloakOptions Load(Dictionary<string, string?> values) =>
    KeycloakOptions.Load(new ConfigurationBuilder().AddInMemoryCollection(values).Build());

var good = Load(new() { ["Keycloak:Authority"] = "http://localhost:8080/realms/debt-pricing", ["Keycloak:Audience"] = "debt-pricing-api" });
Check("valid config loads (defaults: https required, swagger client)", good.RequireHttpsMetadata && good.SwaggerClientId == "debt-pricing-swagger");

bool Throws(Dictionary<string, string?> values) { try { Load(values); return false; } catch (InvalidOperationException) { return true; } }
Check("missing section rejected", Throws(new() { ["Other:X"] = "1" }));
Check("relative/blank Authority rejected", Throws(new() { ["Keycloak:Authority"] = "realms/x", ["Keycloak:Audience"] = "a" }));
Check("blank Audience rejected", Throws(new() { ["Keycloak:Authority"] = "http://localhost:8080/realms/x", ["Keycloak:Audience"] = " " }));

Console.WriteLine(failures == 0 ? "\nALL CHECKS PASSED" : $"\n{failures} CHECK(S) FAILED");
return failures;
