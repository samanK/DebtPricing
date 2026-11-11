using System.Text.Json.Serialization;
using DebtPricing.Api.Data;
using DebtPricing.Api.Security;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var keycloak = KeycloakOptions.Load(builder.Configuration);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services
    .AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        // Emit Persian text as-is instead of \uXXXX escapes (safe for an application/json API).
        o.JsonSerializerOptions.Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
    });

builder.Services.AddKeycloakAuthentication(keycloak);
builder.Services.AddDebtPricingAuthorization();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddKeycloakSwagger(keycloak);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.OAuthClientId(keycloak.SwaggerClientId);
        options.OAuthUsePkce();
        options.OAuthScopes("openid", "profile");
    });
}

app.UseHttpsRedirection();

// Order matters: authentication first, then authorization, then the endpoints.
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
