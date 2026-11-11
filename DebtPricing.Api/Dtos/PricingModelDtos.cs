using System.ComponentModel.DataAnnotations;
using DebtPricing.Api.Domain;

namespace DebtPricing.Api.Dtos;

/// <summary>Body for creating (POST) or fully replacing (PUT) a pricing model. Rates are fractions: 0.27 = 27%.</summary>
public class PricingModelRequest : IValidatableObject
{
    [StringLength(100, MinimumLength = 1)]
    public required string Name { get; set; }

    [StringLength(500)]
    public string? Description { get; set; }

    [Range(typeof(decimal), "0", "1")] public required decimal BaseRate { get; set; }
    [Range(typeof(decimal), "0", "1")] public required decimal CreditSpread { get; set; }
    [Range(typeof(decimal), "0", "1")] public required decimal PrepaymentAdjustment { get; set; }
    [Range(typeof(decimal), "0", "1")] public required decimal LiquidityPremium { get; set; }
    [Range(typeof(decimal), "0", "1")] public required decimal RegulatoryRateCap { get; set; }
    [Range(typeof(decimal), "0", "1")] public required decimal ServicingFeeRate { get; set; }

    [Range(typeof(decimal), "0", "1")] public required decimal SeniorShare { get; set; }
    [Range(typeof(decimal), "0", "1")] public required decimal SeniorDiscountRate { get; set; }
    [Range(typeof(decimal), "0", "1")] public required decimal JuniorDiscountRate { get; set; }

    public bool IsActive { get; set; } = true;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Name))
        {
            yield return new ValidationResult("Name must not be blank.", new[] { nameof(Name) });
        }

        if (SeniorShare <= 0m || SeniorShare >= 1m)
        {
            yield return new ValidationResult(
                "SeniorShare must be greater than 0 and less than 1 (the junior share is 1 - SeniorShare).",
                new[] { nameof(SeniorShare) });
        }

        if (SeniorDiscountRate > JuniorDiscountRate)
        {
            yield return new ValidationResult(
                "SeniorDiscountRate must not exceed JuniorDiscountRate (the junior tranche absorbs first losses and must yield at least as much).",
                new[] { nameof(SeniorDiscountRate), nameof(JuniorDiscountRate) });
        }
    }
}

public record PricingModelResponse(
    int Id,
    string Name,
    string? Description,
    decimal BaseRate,
    decimal CreditSpread,
    decimal PrepaymentAdjustment,
    decimal LiquidityPremium,
    decimal EffectiveDiscountRate,
    decimal RegulatoryRateCap,
    decimal ServicingFeeRate,
    decimal SeniorShare,
    decimal JuniorShare,
    decimal SeniorDiscountRate,
    decimal JuniorDiscountRate,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc)
{
    public static PricingModelResponse From(PricingModel m) => new(
        m.Id,
        m.Name,
        m.Description,
        m.BaseRate,
        m.CreditSpread,
        m.PrepaymentAdjustment,
        m.LiquidityPremium,
        m.EffectiveDiscountRate,
        m.RegulatoryRateCap,
        m.ServicingFeeRate,
        m.SeniorShare,
        m.JuniorShare,
        m.SeniorDiscountRate,
        m.JuniorDiscountRate,
        m.IsActive,
        m.CreatedAtUtc,
        m.UpdatedAtUtc);
}
