using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Text.Json;
using GatoNegroFull.Models;

namespace GatoNegroFull.Controllers;

public class HomeController(IWebHostEnvironment env) : Controller
{
    private readonly IWebHostEnvironment _env = env;

    // =========================
    // ACCIÓN PRINCIPAL
    // =========================
    public IActionResult Index()
    {
        // 🔹 Hardcodeamos companyId
        string companyId = "Tincho";

        // Guardamos en sesión
        HttpContext.Session.SetString("CompanyId", companyId);

        // 🔹 Cargar testimonios
        var testimonios = CargarTestimonios();

        // 🔹 Devolver la vista real que existe: GatoNegro.cshtml
        return View("GatoNegro", testimonios);
    }

    // =========================
    // MÉTODO AUXILIAR: CARGAR TESTIMONIOS (CORREGIDO)
    // =========================
    private List<Testimonio> CargarTestimonios()
    {
        // 1. Ruta al archivo único centralizado
        var jsonPath = Path.Combine(_env.WebRootPath, "images", "Comentarios", "comentarios.json");
        var testimonios = new List<Testimonio>();

        if (System.IO.File.Exists(jsonPath))
        {
            try
            {
                // 2. Leemos todo el contenido del archivo (que es un array [ ... ])
                var json = System.IO.File.ReadAllText(jsonPath);

                // 3. Deserializamos como LISTA, no como objeto único
                testimonios = JsonSerializer.Deserialize<List<Testimonio>>(json) ?? new List<Testimonio>();

                // 4. No hace falta ajustar la ruta de la imagen aquí porque 
                //    Cloudinary ya guarda la URL completa (https://...)
            }
            catch
            {
                // Si el JSON está mal formado, devolvemos lista vacía
                return new List<Testimonio>();
            }
        }

        return testimonios;
    }

    // =========================
    // CERRAR SESIÓN
    // =========================
    [HttpGet]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync();
        HttpContext.Session.Clear();

        if (Request.Cookies.ContainsKey(".AspNetCore.Session"))
        {
            Response.Cookies.Delete(".AspNetCore.Session");
        }

        return RedirectToAction("Index");
    }

    // =========================
    // PRIVACY
    // =========================
    public IActionResult Privacy()
    {
        return View();
    }

    // =========================
    // ERROR
    // =========================
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel
        {
            RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier
        });
    }

    // =========================
    // ACCESS DENIED
    // =========================
    [HttpGet]
    public IActionResult AccessDenied(string returnUrl)
    {
        ViewData["ReturnUrl"] = returnUrl;
        return View();
    }
}