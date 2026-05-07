using System.Globalization;
using GatoNegroFull;
using GatoNegroFull.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Configuración de Cultura
var cultura = new CultureInfo("es-AR");
CultureInfo.DefaultThreadCurrentCulture = cultura;
CultureInfo.DefaultThreadCurrentUICulture = cultura;

// LLAMADA ÚNICA A LOS SERVICIOS (Aquí se inyecta todo lo del archivo anterior)
ServiceConfiguration.ConfigureServices(builder.Services, builder.Configuration);

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseSession();
app.UseRouting();

// Tu lógica de redirección
app.Use(async (context, next) =>
{
    if (context.Request.Path == "/" || context.Request.Path == "/index.html")
    {
        context.Response.Redirect("/Home/Index");
        return;
    }
    await next();
});

app.UseAuthentication();
app.UseAuthorization();

// MAPEOS (Lo que hace que las rutas funcionen)
app.MapHub<ChatHub>("/chatHub"); // SignalR
app.MapStaticAssets();           // Archivos optimizados

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();