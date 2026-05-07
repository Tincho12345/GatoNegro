using GatoNegroFull.Models;
using GatoNegroFull.Hubs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Text.Json;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

public class ChatController : Controller
{
    private readonly string _chatJsonPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "assets", "chat.json");
    private readonly string _usersJsonPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "assets", "users.json");
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly Cloudinary _cloudinary;

    // Inyectamos IConfiguration para leer las credenciales de Cloudinary que pasaste
    public ChatController(IHubContext<ChatHub> hubContext, IConfiguration config)
    {
        _hubContext = hubContext;

        // Configuración de Cloudinary usando tus datos de appsettings.json
        var account = new Account(
            config["Cloudinary:CloudName"],
            config["Cloudinary:ApiKey"],
            config["Cloudinary:ApiSecret"]
        );
        _cloudinary = new Cloudinary(account);
    }

    // --- MÉTODOS DE APOYO ---
    private List<ChatMessage> GetMessages()
    {
        if (!System.IO.File.Exists(_chatJsonPath)) return new List<ChatMessage>();
        var json = System.IO.File.ReadAllText(_chatJsonPath);
        return JsonSerializer.Deserialize<List<ChatMessage>>(json) ?? new List<ChatMessage>();
    }

    private void SaveMessages(List<ChatMessage> messages)
    {
        var json = JsonSerializer.Serialize(messages, new JsonSerializerOptions { WriteIndented = true });
        System.IO.File.WriteAllText(_chatJsonPath, json);
    }

    [HttpPost]
    public async Task<IActionResult> SaveMessage(string text, string user, string? replyToId)
    {
        var messages = GetMessages();

        // 1. Buscamos la foto del usuario en users.json
        string userPhotoUrl = "https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png";

        if (System.IO.File.Exists(_usersJsonPath))
        {
            var usersJson = System.IO.File.ReadAllText(_usersJsonPath);
            // Usamos tu clase UserData que ya tiene 'photoUrl'
            var users = JsonSerializer.Deserialize<List<UserData>>(usersJson);
            var foundUser = users?.FirstOrDefault(u => u.user == user);

            if (foundUser != null)
            {
                userPhotoUrl = foundUser.photoUrl;
            }
        }

        // 2. Creamos el mensaje incluyendo la foto encontrada
        var newMessage = new ChatMessage
        {
            Id = Guid.NewGuid().ToString(),
            User = user,
            UserPhoto = userPhotoUrl, // <--- Ahora sí se mapea correctamente
            Text = text,
            Date = DateTime.Now
        };

        // ... resto de la lógica de ReplyToId ...

        messages.Add(newMessage);
        SaveMessages(messages);

        await _hubContext.Clients.All.SendAsync("ReceiveMessageUpdate");
        return Json(new { success = true });
    }

    [HttpPost]
    public async Task<IActionResult> UpdateMessage(string editId, string text, string user)
    {
        var messages = GetMessages();
        var msg = messages.FirstOrDefault(m => m.Id == editId);

        if (msg == null) return Json(new { success = false, message = "Mensaje no encontrado" });

        if (msg.User == user || user == "Admin")
        {
            msg.Text = text;
            SaveMessages(messages);

            // NOTIFICAR EN TIEMPO REAL
            await _hubContext.Clients.All.SendAsync("ReceiveMessageUpdate");

            return Json(new { success = true });
        }

        return Json(new { success = false, message = "No autorizado" });
    }

    [HttpPost]
    public async Task<IActionResult> DeleteMessage(string id, string user)
    {
        var messages = GetMessages();
        var msg = messages.FirstOrDefault(m => m.Id == id);

        if (msg == null) return Json(new { success = false, message = "No encontrado" });

        if (msg.User == user || user == "Admin")
        {
            messages.Remove(msg);
            SaveMessages(messages);

            // NOTIFICAR EN TIEMPO REAL
            await _hubContext.Clients.All.SendAsync("ReceiveMessageUpdate");

            return Json(new { success = true });
        }

        return Json(new { success = false, message = "No autorizado" });
    }

    [HttpPost]
    public IActionResult SetSessionUser(string userName)
    {
        try
        {
            HttpContext.Session.SetString("ChatUser", userName);
            string role = (userName.ToLower() == "admin") ? "Admin" : "User";
            HttpContext.Session.SetString("ChatRole", role);
            return Json(new { success = true });
        }
        catch (Exception ex)
        {
            return Json(new { success = false, message = ex.Message });
        }
    }

    // --- LÓGICA DE REGISTRO CON CLOUDINARY ---
    [HttpPost]
    public async Task<IActionResult> RegisterUser(string newUser, string newPass, IFormFile userPhoto)
    {
        if (string.IsNullOrEmpty(newUser) || string.IsNullOrEmpty(newPass))
            return Json(new { success = false, message = "Datos incompletos" });

        var json = System.IO.File.ReadAllText(_usersJsonPath);
        var users = JsonSerializer.Deserialize<List<UserData>>(json) ?? new List<UserData>();

        if (users.Any(u => u.user == newUser))
            return Json(new { success = false, message = "El usuario ya existe" });

        // URL por defecto si no suben foto
        string uploadedImageUrl = "https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png";

        // Subida a Cloudinary
        if (userPhoto != null && userPhoto.Length > 0)
        {
            try
            {
                using var stream = userPhoto.OpenReadStream();
                var uploadParams = new ImageUploadParams()
                {
                    File = new FileDescription(userPhoto.FileName, stream),
                    Folder = "perfiles_gato_negro",
                    // Transformación: Forzamos que sea cuadrada y centrada en la cara
                    Transformation = new Transformation().Width(200).Height(200).Crop("fill").Gravity("face")
                };

                var uploadResult = await _cloudinary.UploadAsync(uploadParams);
                uploadedImageUrl = uploadResult.SecureUrl.ToString();
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error al subir imagen: " + ex.Message });
            }
        }

        // Agregamos el nuevo usuario con su URL de imagen
        users.Add(new UserData
        {
            user = newUser,
            pass = newPass,
            role = "User",
            photoUrl = uploadedImageUrl // Asegúrate de tener esta propiedad en tu clase UserData
        });

        System.IO.File.WriteAllText(_usersJsonPath, JsonSerializer.Serialize(users, new JsonSerializerOptions { WriteIndented = true }));

        return Json(new { success = true });
    }
}