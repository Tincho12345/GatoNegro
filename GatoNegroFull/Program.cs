using System.Globalization;
using WatsApp;
using WatsApp.Hubs;
using WatsApp.Models; // Asegurate de tener este using para UserData
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Configuración de Cultura
var cultura = new CultureInfo("es-AR");
CultureInfo.DefaultThreadCurrentCulture = cultura;
CultureInfo.DefaultThreadCurrentUICulture = cultura;

// LLAMADA ÚNICA A LOS SERVICIOS
ServiceConfiguration.ConfigureServices(builder.Services, builder.Configuration);

var app = builder.Build();

// ==========================================
// SEEDING: Inicialización automática de usuarios en SQLite
// ==========================================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();

        // Ejecuta las migraciones pendientes automáticamente si hiciera falta
        context.Database.Migrate();

        // 1. Verificamos si el usuario 'Admin' ya existe en la base de datos
        if (!context.Users.Any(u => u.user == "Admin"))
        {
            context.Users.Add(new UserData
            {
                user = "Admin",
                pass = "Admin1234",
                role = "Admin",
                photoUrl = "https://res.cloudinary.com/dh1lvsawt/image/upload/v1776380664/2999d02e-fff8-4792-b62b-e4a8825875ca.png"
            });
        }

        // 2. Verificamos si el usuario 'Martin' ya existe
        if (!context.Users.Any(u => u.user == "Martin"))
        {
            context.Users.Add(new UserData
            {
                user = "Martin",
                pass = "MiContraseña1234", // Corregido el escape unicode de la ñ directamente a texto plano
                role = "User",
                photoUrl = "https://res.cloudinary.com/dh1lvsawt/image/upload/v1778881474/perfiles_gato_negro/MiPerfil_yygtaw.jpg"
            });
        }

        // Si agregamos alguno, guardamos los cambios en SQLite
        context.SaveChanges();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Ocurrió un error al sembrar los usuarios iniciales en la Base de Datos.");
    }
}
// ==========================================

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

// MAPEOS
app.MapHub<ChatHub>("/chatHub"); // SignalR
app.MapStaticAssets();           // Archivos optimizados

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();