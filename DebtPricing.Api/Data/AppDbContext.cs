using DebtPricing.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DebtPricing.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<PricingModel> PricingModels => Set<PricingModel>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var e = modelBuilder.Entity<PricingModel>();

        e.ToTable("PricingModels");
        e.HasKey(x => x.Id);

        e.Property(x => x.Name).IsRequired().HasMaxLength(100);
        e.HasIndex(x => x.Name).IsUnique();
        e.Property(x => x.Description).HasMaxLength(500);

        e.Property(x => x.BaseRate).HasPrecision(9, 6);
        e.Property(x => x.CreditSpread).HasPrecision(9, 6);
        e.Property(x => x.PrepaymentAdjustment).HasPrecision(9, 6);
        e.Property(x => x.LiquidityPremium).HasPrecision(9, 6);
        e.Property(x => x.RegulatoryRateCap).HasPrecision(9, 6);
        e.Property(x => x.ServicingFeeRate).HasPrecision(9, 6);
        e.Property(x => x.SeniorShare).HasPrecision(9, 6);
        e.Property(x => x.SeniorDiscountRate).HasPrecision(9, 6);
        e.Property(x => x.JuniorDiscountRate).HasPrecision(9, 6);
    }
}
