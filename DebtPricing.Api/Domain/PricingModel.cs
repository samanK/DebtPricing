using System.ComponentModel.DataAnnotations.Schema;

namespace DebtPricing.Api.Domain;

/// <summary>
/// One named set of base assumptions ("pricing model"). The pricing services receive the
/// model's Name and read every rate from this row. All rates are stored as fractions
/// (0.27 = 27%).
/// </summary>
public class PricingModel
{
    public int Id { get; set; }

    /// <summary>Unique name used by the pricing services to select this model.</summary>
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    // --- Discount-rate components (simple pricing) ---
    public decimal BaseRate { get; set; }
    public decimal CreditSpread { get; set; }
    public decimal PrepaymentAdjustment { get; set; }
    public decimal LiquidityPremium { get; set; }

    /// <summary>Regulatory ceiling used only for the "exceeds cap" flag; it never changes the price.</summary>
    public decimal RegulatoryRateCap { get; set; }

    /// <summary>Annual collection-servicing fee. Stored for reference; it is deducted from collections, not from the price.</summary>
    public decimal ServicingFeeRate { get; set; }

    // --- Tranche structure ---
    public decimal SeniorShare { get; set; }
    public decimal SeniorDiscountRate { get; set; }
    public decimal JuniorDiscountRate { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    /// <summary>Base + credit spread + prepayment + liquidity.</summary>
    [NotMapped]
    public decimal EffectiveDiscountRate => BaseRate + CreditSpread + PrepaymentAdjustment + LiquidityPremium;

    [NotMapped]
    public decimal JuniorShare => 1m - SeniorShare;
}
