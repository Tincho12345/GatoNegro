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

    public ChatController(IHubContext<ChatHub> hubContext, IConfiguration config)
    {
        _hubContext = hubContext;
        var account = new Account(
            config["Cloudinary:CloudName"],
            config["Cloudinary:ApiKey"],
            config["Cloudinary:ApiSecret"]
        );
        _cloudinary = new Cloudinary(account);
    }

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
    public async Task<IActionResult> SaveMessage(string? text, string user, IFormFile? imageFile, string? replyToId, string? replyToUser, string? replyToText)
    {
        try
        {
            string? fileUrl = null;
            bool isVideo = false;

            // 1. Subida de Archivos
            if (imageFile != null && imageFile.Length > 0)
            {
                double fileSizeMb = imageFile.Length / 1024.0 / 1024.0;
                string extension = Path.GetExtension(imageFile.FileName).ToLower();
                string[] videoExtensions = { ".mp4", ".mov", ".avi", ".wmv", ".mkv" };
                isVideo = videoExtensions.Contains(extension);

                if (fileSizeMb > 10)
                {
                    return Json(new { success = false, message = $"El archivo ({fileSizeMb:F1}MB) excede el límite de 10MB." });
                }

                using var stream = imageFile.OpenReadStream();

                if (isVideo)
                {
                    var uploadParams = new VideoUploadParams()
                    {
                        File = new FileDescription(imageFile.FileName, stream),
                        Folder = "chat_gato_negro"
                    };
                    var result = await _cloudinary.UploadAsync(uploadParams);
                    fileUrl = result?.SecureUrl?.ToString();
                }
                else
                {
                    var uploadParams = new ImageUploadParams()
                    {
                        File = new FileDescription(imageFile.FileName, stream),
                        Folder = "chat_gato_negro",
                        Transformation = new Transformation().Quality("auto").FetchFormat("auto")
                    };
                    var result = await _cloudinary.UploadAsync(uploadParams);
                    fileUrl = result?.SecureUrl?.ToString();
                }
            }

            // 2. Obtener datos de usuario para la foto (UserPhoto es requerida)
            var usersJson = System.IO.File.ReadAllText(_usersJsonPath);
            var allUsers = JsonSerializer.Deserialize<List<UserData>>(usersJson) ?? new List<UserData>();
            var currentUser = allUsers.FirstOrDefault(u => u.user == user);
            string userPhotoUrl = currentUser?.photoUrl ?? "https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png";

            // 3. Crear el mensaje con las propiedades estrictamente existentes
            var messages = GetMessages();
            var newMessage = new ChatMessage
            {
                Id = Guid.NewGuid().ToString(),
                User = user,
                UserPhoto = userPhotoUrl,
                Text = text ?? (fileUrl != null ? (isVideo ? "🎥 Video" : "📷 Imagen") : ""),
                ImageUrl = fileUrl,
                ReplyToId = replyToId,
                ReplyToUser = replyToUser,
                ReplyToText = replyToText
                // He eliminado 'Time' y 'Timestamp' porque no existen en tu clase
            };

            messages.Add(newMessage);
            SaveMessages(messages);

            // 4. Notificar vía SignalR
            await _hubContext.Clients.All.SendAsync("ReceiveMessageUpdate");

            return Json(new { success = true });
        }
        catch (Exception ex)
        {
            return Json(new { success = false, message = "Error: " + ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> UpdateMessage(string editId, string text, string user)
    {
        var messages = GetMessages();
        var msg = messages.FirstOrDefault(m => m.Id == editId);
        if (msg == null) return Json(new { success = false, message = "No encontrado" });

        if (msg.User == user || user == "Admin")
        {
            msg.Text = text;
            SaveMessages(messages);
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
            await _hubContext.Clients.All.SendAsync("ReceiveMessageUpdate");
            return Json(new { success = true });
        }
        return Json(new { success = false, message = "No autorizado" });
    }

    [HttpPost]
    public IActionResult SetSessionUser(string userName)
    {
        HttpContext.Session.SetString("ChatUser", userName);
        string role = (userName.ToLower() == "admin") ? "Admin" : "User";
        HttpContext.Session.SetString("ChatRole", role);
        return Json(new { success = true });
    }

    [HttpPost]
    public async Task<IActionResult> RegisterUser(string newUser, string newPass, IFormFile userPhoto)
    {
        if (string.IsNullOrEmpty(newUser) || string.IsNullOrEmpty(newPass))
            return Json(new { success = false, message = "Datos incompletos" });

        var json = System.IO.File.ReadAllText(_usersJsonPath);
        var users = JsonSerializer.Deserialize<List<UserData>>(json) ?? new List<UserData>();

        if (users.Any(u => u.user == newUser))
            return Json(new { success = false, message = "El usuario ya existe" });

        string uploadedImageUrl = "https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png";

        if (userPhoto != null && userPhoto.Length > 0)
        {
            try
            {
                using var stream = userPhoto.OpenReadStream();
                var uploadParams = new ImageUploadParams()
                {
                    File = new FileDescription(userPhoto.FileName, stream),
                    Folder = "perfiles_gato_negro",
                    Transformation = new Transformation().Width(200).Height(200).Crop("fill").Gravity("face")
                };
                var uploadResult = await _cloudinary.UploadAsync(uploadParams);
                uploadedImageUrl = uploadResult?.SecureUrl?.ToString() ?? uploadedImageUrl;
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error en avatar: " + ex.Message });
            }
        }

        users.Add(new UserData { user = newUser, pass = newPass, role = "User", photoUrl = uploadedImageUrl });
        System.IO.File.WriteAllText(_usersJsonPath, JsonSerializer.Serialize(users, new JsonSerializerOptions { WriteIndented = true }));
        return Json(new { success = true });
    }

    [HttpPost]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return Json(new { success = true });
    }
}