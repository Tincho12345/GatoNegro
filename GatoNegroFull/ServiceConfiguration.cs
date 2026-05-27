using WatsApp.Models;
using WatsApp.Repository;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using System.IO;

namespace WatsApp
{
    public static class ServiceConfiguration
    {
        public static void ConfigureServices(IServiceCollection services, IConfiguration configuration)
        {
            // 1. MVC + JSON
            services.AddControllersWithViews()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                });

            // 2. Clientes y Accesores
            services.AddHttpClient();
            services.AddHttpContextAccessor();

            // 3. Seguridad y Cookies
            services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
                .AddCookie(options =>
                {
                    options.Cookie.HttpOnly = true;
                    options.ExpireTimeSpan = TimeSpan.FromMinutes(60);
                    options.LoginPath = "/Home/Login";
                    options.SlidingExpiration = true;
                });

            // 4. Sesión
            services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromMinutes(30);
                options.Cookie.IsEssential = true;
            });

            // 5. Herramientas y Repositorios
            services.AddAutoMapper(typeof(ServiceConfiguration));
            services.Configure<CloudinarySettings>(configuration.GetSection("Cloudinary"));
            services.AddScoped(typeof(IRepository<>), typeof(TestimonioRepository<>));

            // 6. SignalR (Solo registro, no mapeo)
            services.AddSignalR();

            // 7. Base de Datos - SQLite Dinámica (Validada con control de excepciones)
            string finalDbPath;

            if (Directory.GetCurrentDirectory().Contains("somee", StringComparison.OrdinalIgnoreCase))
            {
                // Obtenemos de forma dinámica el directorio padre para no errarle a la ruta del disco
                string rootDir = Directory.GetParent(Directory.GetCurrentDirectory())?.FullName
                                 ?? Directory.GetCurrentDirectory();

                string carpetaProtected = Path.Combine(rootDir, "Protected.tinchoservmetalurgicos.somee.com");
                string rutaSeguraVisible = Path.Combine(carpetaProtected, "chat.db");
                string rutaLimboOculto = Path.Combine(Directory.GetCurrentDirectory(), "chat.db");

                // Si por alguna razón la carpeta protegida no existe o no es accesible, creamos una local segura
                if (!Directory.Exists(carpetaProtected))
                {
                    carpetaProtected = Path.Combine(Directory.GetCurrentDirectory(), "App_Data");
                    Directory.CreateDirectory(carpetaProtected);
                    rutaSeguraVisible = Path.Combine(carpetaProtected, "chat.db");
                }

                // MUDANZA CON CONTROL TOTAL
                if (File.Exists(rutaLimboOculto) && !File.Exists(rutaSeguraVisible))
                {
                    try
                    {
                        File.Copy(rutaLimboOculto, rutaSeguraVisible, overwrite: false);
                    }
                    catch (Exception ex)
                    {
                        // Si falla por permisos, dejamos que use el limbo temporal para que la web siga online
                        System.Diagnostics.Debug.WriteLine($"Error de copiado: {ex.Message}");
                    }
                }

                // Si el copiado fue exitoso y el archivo existe en el destino seguro, lo usamos
                finalDbPath = File.Exists(rutaSeguraVisible) ? rutaSeguraVisible : rutaLimboOculto;
            }
            else
            {
                // Entorno Local (Tu computadora)
                finalDbPath = Path.Combine(Directory.GetCurrentDirectory(), "chat.db");
            }

            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlite($"Data Source={finalDbPath}"));
        }
    }
}