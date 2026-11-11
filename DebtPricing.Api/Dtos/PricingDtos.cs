using System.ComponentModel.DataAnnotations;
using DebtPricing.Api.Domain;

namespace DebtPricing.Api.Dtos;

public abstract class PricingRequestBase : IValidatableObject
{
    /// <summary>Name of the pricing model (row in PricingModels) whose rates should be used.</summary>
    public required string PricingModelName { get; set; }

    /// <summary>Nominal (face) value of the receivable pool, in Toman.</summary>
    public required decimal NominalValue { get; set; }

    /// <summary>Time to maturity in years (fractions allowed, e.g. 0.5).</summary>
    public required decimal MaturityYears { get; set; }

    public virtual IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(PricingModelName))
        {
            yield return new ValidationResult("PricingModelName must not be blank.", new[] { nameof(PricingModelName) });
        }

        if (NominalValue <= 0m)
        {
            yield return new ValidationResult("NominalValue must be greater than 0.", new[] { nameof(NominalValue) });
        }

        if (MaturityYears <= 0m || MaturityYears > 50m)
        {
            yield return new ValidationResult("MaturityYears must be greater than 0 and at most 50.", new[] { nameof(MaturityYears) });
        }
    }
}

public class SimplePricingRequest : PricingRequestBase
{
}

public class TranchePricingRequest : PricingRequestBase
{
    /// <summary>"Senior" or "Junior".</summary>
    public required TrancheType TrancheType { get; set; }

    public override IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        foreach (var result in base.Validate(validationContext))
        {
            yield return result;
        }

        if (!Enum.IsDefined(typeof(TrancheType), TrancheType))
        {
            yield return new ValidationResult("TrancheType must be 'Senior' or 'Junior'.", new[] { nameof(TrancheType) });
        }
    }
}

public record SimplePricingResponse(
    string PricingModelName,
    decimal NominalValue,
    decimal MaturityYears,
    decimal DiscountRate,
    decimal PurchasePrice,
    decimal BuyerProfitAtMaturity,
    decimal RegulatoryRateCap,
    bool ExceedsRegulatoryCap,
    IReadOnlyList<string> Warnings);

public record TranchePricingResponse(
    string PricingModelName,
    TrancheType TrancheType,
    decimal PoolNominalValue,
    decimal TrancheShare,
    decimal TrancheNominalValue,
    decimal MaturityYears,
    decimal DiscountRate,
    decimal PurchasePrice,
    decimal BuyerProfitAtMaturity,
    decimal RegulatoryRateCap,
    bool ExceedsRegulatoryCap,
    IReadOnlyList<string> Warnings);
