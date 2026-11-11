using DebtPricing.Api.Data;
using DebtPricing.Api.Domain;
using DebtPricing.Api.Dtos;
using DebtPricing.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DebtPricing.Api.Controllers;

/// <summary>CRUD for the base-assumption table (one row per named pricing model).</summary>
[ApiController]
[Route("api/pricing-models")]
[Authorize(Policy = Policies.PricingUser)]
public class PricingModelsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PricingModelsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PricingModelResponse>>> GetAll(
        [FromQuery] bool activeOnly = false, CancellationToken ct = default)
    {
        IQueryable<PricingModel> query = _db.PricingModels.AsNoTracking();
        if (activeOnly)
        {
            query = query.Where(m => m.IsActive);
        }

        var items = await query.OrderBy(m => m.Name).ToListAsync(ct);
        return Ok(items.Select(PricingModelResponse.From));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PricingModelResponse>> GetById(int id, CancellationToken ct)
    {
        var model = await _db.PricingModels.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id, ct);
        if (model is null)
        {
            return NotFound();
        }

        return Ok(PricingModelResponse.From(model));
    }

    [HttpPost]
    [Authorize(Policy = Policies.PricingAdmin)]
    public async Task<ActionResult<PricingModelResponse>> Create(
        [FromBody] PricingModelRequest request, CancellationToken ct)
    {
        var name = request.Name.Trim();
        if (await _db.PricingModels.AnyAsync(m => m.Name == name, ct))
        {
            return Conflict(NameTakenProblem(name));
        }

        var now = DateTime.UtcNow;
        var model = new PricingModel { CreatedAtUtc = now, UpdatedAtUtc = now };
        Apply(model, request, name);

        _db.PricingModels.Add(model);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = model.Id }, PricingModelResponse.From(model));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.PricingAdmin)]
    public async Task<ActionResult<PricingModelResponse>> Update(
        int id, [FromBody] PricingModelRequest request, CancellationToken ct)
    {
        var model = await _db.PricingModels.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (model is null)
        {
            return NotFound();
        }

        var name = request.Name.Trim();
        if (await _db.PricingModels.AnyAsync(m => m.Name == name && m.Id != id, ct))
        {
            return Conflict(NameTakenProblem(name));
        }

        Apply(model, request, name);
        model.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(PricingModelResponse.From(model));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Policies.PricingAdmin)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var model = await _db.PricingModels.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (model is null)
        {
            return NotFound();
        }

        _db.PricingModels.Remove(model);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void Apply(PricingModel model, PricingModelRequest r, string trimmedName)
    {
        model.Name = trimmedName;
        model.Description = r.Description;
        model.BaseRate = r.BaseRate;
        model.CreditSpread = r.CreditSpread;
        model.PrepaymentAdjustment = r.PrepaymentAdjustment;
        model.LiquidityPremium = r.LiquidityPremium;
        model.RegulatoryRateCap = r.RegulatoryRateCap;
        model.ServicingFeeRate = r.ServicingFeeRate;
        model.SeniorShare = r.SeniorShare;
        model.SeniorDiscountRate = r.SeniorDiscountRate;
        model.JuniorDiscountRate = r.JuniorDiscountRate;
        model.IsActive = r.IsActive;
    }

    private static ProblemDetails NameTakenProblem(string name) => new()
    {
        Status = StatusCodes.Status409Conflict,
        Title = "Pricing model name already exists",
        Detail = $"A pricing model named '{name}' already exists."
    };
}
