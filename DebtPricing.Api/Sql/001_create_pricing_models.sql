-- SQL Server. Run this script OR use EF Core migrations (dotnet ef migrations add InitialCreate) -- not both.
-- All rates are fractions: 0.27 = 27%.

IF OBJECT_ID(N'dbo.PricingModels', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PricingModels
    (
        Id                    INT IDENTITY(1,1) NOT NULL,
        Name                  NVARCHAR(100)     NOT NULL,
        Description           NVARCHAR(500)     NULL,

        BaseRate              DECIMAL(9,6)      NOT NULL,
        CreditSpread          DECIMAL(9,6)      NOT NULL,
        PrepaymentAdjustment  DECIMAL(9,6)      NOT NULL,
        LiquidityPremium      DECIMAL(9,6)      NOT NULL,
        RegulatoryRateCap     DECIMAL(9,6)      NOT NULL,
        ServicingFeeRate      DECIMAL(9,6)      NOT NULL,

        SeniorShare           DECIMAL(9,6)      NOT NULL,
        SeniorDiscountRate    DECIMAL(9,6)      NOT NULL,
        JuniorDiscountRate    DECIMAL(9,6)      NOT NULL,

        IsActive              BIT               NOT NULL CONSTRAINT DF_PricingModels_IsActive DEFAULT (1),
        CreatedAtUtc          DATETIME2(7)      NOT NULL,
        UpdatedAtUtc          DATETIME2(7)      NOT NULL,

        CONSTRAINT PK_PricingModels PRIMARY KEY (Id),
        CONSTRAINT UQ_PricingModels_Name UNIQUE (Name),
        CONSTRAINT CK_PricingModels_Rates CHECK (
                BaseRate BETWEEN 0 AND 1 AND CreditSpread BETWEEN 0 AND 1
            AND PrepaymentAdjustment BETWEEN 0 AND 1 AND LiquidityPremium BETWEEN 0 AND 1
            AND RegulatoryRateCap BETWEEN 0 AND 1 AND ServicingFeeRate BETWEEN 0 AND 1
            AND SeniorDiscountRate BETWEEN 0 AND 1 AND JuniorDiscountRate BETWEEN 0 AND 1),
        CONSTRAINT CK_PricingModels_SeniorShare CHECK (SeniorShare > 0 AND SeniorShare < 1),
        CONSTRAINT CK_PricingModels_TrancheRates CHECK (SeniorDiscountRate <= JuniorDiscountRate)
    );
END
GO

-- Sample row = the worked example from the methodology document
IF NOT EXISTS (SELECT 1 FROM dbo.PricingModels WHERE Name = N'AutoLoan-Standard')
BEGIN
    INSERT INTO dbo.PricingModels
        (Name, Description, BaseRate, CreditSpread, PrepaymentAdjustment, LiquidityPremium,
         RegulatoryRateCap, ServicingFeeRate, SeniorShare, SeniorDiscountRate, JuniorDiscountRate,
         IsActive, CreatedAtUtc, UpdatedAtUtc)
    VALUES
        (N'AutoLoan-Standard', N'Standard auto-loan receivables model (worked example)',
         0.27, 0.03, 0.01, 0.02,
         0.30, 0.012, 0.80, 0.28, 0.45,
         1, SYSUTCDATETIME(), SYSUTCDATETIME());
END
GO
