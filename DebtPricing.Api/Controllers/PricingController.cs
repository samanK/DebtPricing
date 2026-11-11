using DebtPricing.Api.Data;
using DebtPricing.Api.Domain;
using DebtPricing.Api.Dtos;
using DebtPricing.Api.Security;
using DebtPricing.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DebtPricing.Api.Controllers;

/// <summary>Pricing services. The rates come from the pricing model selected by name.</summary>
[ApiController]
[Route("api/pricing")]
[Authorize(Policy = Policies.PricingUser)]
public class PricingController : ControllerBase
{
    private readonly AppDbContext _db;

    public PricingController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Simple pricing: Nominal / (1 + effective discount rate) ^ years.</summary>
    [HttpPost("simple")]
    public async Task<ActionResult<SimplePricingResponse>> Simple(
        [FromBody] SimplePricingRequest request, CancellationToken ct)
    {
        var model = await FindModelAsync(request.PricingModelName, ct);
        if (model is null)
        {
            return NotFound(ModelNotFoundProblem(request.PricingModelName));
        }

        if (!model.IsActive)
        {
            return UnprocessableEntity(ModelInactiveProblem(model.Name));
        }

        return Ok(PricingEngine.Simple(model, request.NominalValue, request.MaturityYears));
    }

    /// <summary>
    /// Tranche pricing: prices the Senior or Junior tranche of the pool.
    /// Tranche nominal = pool nominal x tranche share; price = tranche nominal / (1 + tranche rate) ^ years.
    /// </summary>
    [HttpPost("tranche")]
    public async Task<ActionResult<TranchePricingResponse>> Tranche(
        [FromBody] TranchePricingRequest request, CancellationToken ct)
    {
        var model = await FindModelAsync(request.PricingModelName, ct);
        if (model is null)
        {
            return NotFound(ModelNotFoundProblem(request.PricingModelName));
        }

        if (!model.IsActive)
        {
            return UnprocessableEntity(ModelInactiveProblem(model.Name));
        }

        return Ok(PricingEngine.Tranche(model, request.TrancheType, request.NominalValue, request.MaturityYears));
    }

    private async Task<PricingModel?> FindModelAsync(string name, CancellationToken ct)
    {
        var trimmed = name.Trim();
        return await _db.PricingModels.AsNoTracking().FirstOrDefaultAsync(m => m.Name == trimmed, ct);
    }

    private static ProblemDetails ModelNotFoundProblem(string name) => new()
    {
        Status = StatusCodes.Status404NotFound,
        Title = "Pricing model not found",
        Detail = $"No pricing model named '{name}' exists."
    };

    private static ProblemDetails ModelInactiveProblem(string name) => new()
    {
        Status = StatusCodes.Status422UnprocessableEntity,
        Title = "Pricing model is inactive",
        Detail = $"The pricing model '{name}' is inactive and cannot be used for pricing."
    };
}
