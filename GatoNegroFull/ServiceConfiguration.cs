using GatoNegroFull.Models;
using GatoNegroFull.Repository;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Text.Json;

namespace GatoNegroFull
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
            services.AddHttpContextAccessor(); // Limpio, sin duplicados

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
        }
    }
}