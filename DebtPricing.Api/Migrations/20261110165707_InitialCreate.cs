using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DebtPricing.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PricingModels",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    BaseRate = table.Column<decimal>(type: "decimal(9,6)", precision: 9, scale: 6, nullable: false),
                    CreditSpread = table.Column<decimal>(type: "decimal(9,6)", precision: 9, scale: 6, nullable: false),
                    PrepaymentAdjustment = table.Column<decimal>(type: "decimal(9,6)", precision: 9, scale: 6, nullable: false),
                    LiquidityPremium = table.Column<decimal>(type: "decimal(9,6)", precision: 9, scale: 6, nullable: false),
                    RegulatoryRateCap = table.Column<decimal>(type: "decimal(9,6)", precision: 9, scale: 6, nullable: false),
                    ServicingFeeRate = table.Column<decimal>(type: "decimal(9,6)", precision: 9, scale: 6, nullable: false),
                    SeniorShare = table.Column<decimal>(type: "decimal(9,6)", precision: 9, scale: 6, nullable: false),
                    SeniorDiscountRate = table.Column<decimal>(type: "decimal(9,6)", precision: 9, scale: 6, nullable: false),
                    JuniorDiscountRate = table.Column<decimal>(type: "decimal(9,6)", precision: 9, scale: 6, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PricingModels", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PricingModels_Name",
                table: "PricingModels",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PricingModels");
        }
    }
}
