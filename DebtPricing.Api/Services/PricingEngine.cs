using System.Globalization;
using DebtPricing.Api.Domain;
using DebtPricing.Api.Dtos;

namespace DebtPricing.Api.Services;

/// <summary>
/// Pure pricing math (no database, no HTTP). Price = Nominal / (1 + rate) ^ years.
/// Results are rounded to 2 decimals (away from zero).
/// </summary>
public static class PricingEngine
{
    public static SimplePricingResponse Simple(PricingModel model, decimal nominalValue, decimal maturityYears)
    {
        var rate = model.EffectiveDiscountRate;
        var price = PresentValue(nominalValue, rate, maturityYears);

        var warnings = new List<string>();
        var exceeds = rate > model.RegulatoryRateCap;
        if (exceeds)
        {
            warnings.Add(
                $"نرخ تنزیل مؤثر ({Pct(rate)}) از سقف مصوب ({Pct(model.RegulatoryRateCap)}) بیشتر است؛ " +
                "کارمزد وصول را جدا تعریف کنید یا از قیمت‌گذاری با ساختار ترانش استفاده کنید.");
        }

        return new SimplePricingResponse(
            model.Name,
            Round2(nominalValue),
            maturityYears,
            rate,
            price,
            Round2(nominalValue - price),
            model.RegulatoryRateCap,
            exceeds,
            warnings);
    }

    public static TranchePricingResponse Tranche(
        PricingModel model, TrancheType trancheType, decimal poolNominalValue, decimal maturityYears)
    {
        var isSenior = trancheType == TrancheType.Senior;
        var share = isSenior ? model.SeniorShare : model.JuniorShare;
        var rate = isSenior ? model.SeniorDiscountRate : model.JuniorDiscountRate;

        var trancheNominal = poolNominalValue * share;
        var price = PresentValue(trancheNominal, rate, maturityYears);

        var warnings = new List<string>();
        var exceeds = rate > model.RegulatoryRateCap;
        if (exceeds)
        {
            warnings.Add(isSenior
                ? $"نرخ ترانش ارشد ({Pct(rate)}) از سقف مصوب ({Pct(model.RegulatoryRateCap)}) بیشتر است."
                : $"نرخ ترانش تبعی ({Pct(rate)}) از سقف مصوب ({Pct(model.RegulatoryRateCap)}) بالاتر است؛ " +
                  "این نرخ باید به‌عنوان بازده یک ابزار سرمایه‌گذاری ریسک‌پذیر (نه خرید دین ساده) بررسی و از نظر حقوقی تأیید شود.");
        }

        return new TranchePricingResponse(
            model.Name,
            trancheType,
            Round2(poolNominalValue),
            share,
            Round2(trancheNominal),
            maturityYears,
            rate,
            price,
            Round2(trancheNominal - price),
            model.RegulatoryRateCap,
            exceeds,
            warnings);
    }

    /// <summary>Present value of a single amount due in <paramref name="years"/> years at an annual compound rate.</summary>
    public static decimal PresentValue(decimal nominalValue, decimal annualRate, decimal years)
    {
        if (nominalValue < 0m) throw new ArgumentOutOfRangeException(nameof(nominalValue));
        if (years <= 0m) throw new ArgumentOutOfRangeException(nameof(years));
        if (annualRate <= -1m) throw new ArgumentOutOfRangeException(nameof(annualRate));

        var factor = (decimal)Math.Pow((double)(1m + annualRate), (double)years);
        return Round2(nominalValue / factor);
    }

    private static decimal Round2(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private static string Pct(decimal fraction) =>
        (fraction * 100m).ToString("0.##", CultureInfo.InvariantCulture) + "%";
}
