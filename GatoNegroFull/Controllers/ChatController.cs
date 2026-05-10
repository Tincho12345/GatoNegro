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
        try
        {
            if (!System.IO.File.Exists(_chatJsonPath)) return new List<ChatMessage>();

            var json = System.IO.File.ReadAllText(_chatJsonPath);

            // Usamos una opción para que no sea tan estricto con las propiedades si falta alguna
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            return JsonSerializer.Deserialize<List<ChatMessage>>(json, options) ?? new List<ChatMessage>();
        }
        catch (Exception)
        {
            // Si el JSON está corrupto por los cambios de modelo, devolvemos lista vacía
            return new List<ChatMessage>();
        }
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
                string fileHash = CalculateHash(imageFile);
                var resources = GetResources();
                var existingResource = resources.FirstOrDefault(r => r.Hash == fileHash);

                // --- CORRECCIÓN: Mover la detección de extensión aquí arriba ---
                string extension = Path.GetExtension(imageFile.FileName).ToLower();
                isVideo = (new[] { ".mp4", ".mov", ".avi" }).Contains(extension);
                // ---------------------------------------------------------------

                if (existingResource != null)
                {
                    // YA EXISTE: No subimos nada, usamos la URL guardada
                    fileUrl = existingResource.Url;
                    existingResource.UseCount++;
                    SaveResources(resources);
                }
                else
                {
                    // NO EXISTE: Hay que subirlo a Cloudinary
                    using var stream = imageFile.OpenReadStream();
                    RawUploadResult result;

                    if (isVideo)
                    {
                        result = await _cloudinary.UploadAsync(new VideoUploadParams
                        {
                            File = new FileDescription(imageFile.FileName, stream),
                            Folder = "chat_gato_negro"
                        });
                    }
                    else
                    {
                        result = await _cloudinary.UploadAsync(new ImageUploadParams
                        {
                            File = new FileDescription(imageFile.FileName, stream),
                            Folder = "chat_gato_negro",
                            Transformation = new Transformation().Quality("auto").FetchFormat("auto")
                        });
                    }

                    fileUrl = result?.SecureUrl?.ToString();

                    // Registrar el nuevo recurso
                    resources.Add(new CloudinaryResource
                    {
                        Hash = fileHash,
                        Url = fileUrl ?? "",
                        PublicId = result?.PublicId ?? "",
                        UseCount = 1
                    });
                    SaveResources(resources);
                }
            }

            // 2. Obtener datos de usuario para la foto (UserPhoto es requerida)
            var usersJson = System.IO.File.ReadAllText(_usersJsonPath);
            var allUsers = JsonSerializer.Deserialize<List<UserData>>(usersJson) ?? new List<UserData>();
            var currentUser = allUsers.FirstOrDefault(u => u.user == user);
            string userPhotoUrl = currentUser?.photoUrl ?? "https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png";

            // 3. Crear el mensaje
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
                ReplyToText = replyToText,

                // AGREGA ESTA LÍNEA (Asegúrate de que la propiedad exista en tu modelo ChatMessage)
                Date = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss")
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

        // Verificación de autoridad
        if (msg.User == user || user == "Admin")
        {
            if (!string.IsNullOrEmpty(msg.ImageUrl))
            {
                var resources = GetResources();
                // Buscamos el recurso por URL
                var res = resources.FirstOrDefault(r => r.Url == msg.ImageUrl);

                if (res != null)
                {
                    res.UseCount--;

                    if (res.UseCount <= 0)
                    {
                        // Determinar el tipo de recurso para el borrado correcto
                        string extension = Path.GetExtension(res.Url).ToLower();
                        bool isVideo = (new[] { ".mp4", ".mov", ".avi", ".mkv", ".webm" }).Contains(extension);

                        var deletionParams = new DeletionParams(res.PublicId)
                        {
                            ResourceType = isVideo ? ResourceType.Video : ResourceType.Image
                        };

                        // ELIMINACIÓN FÍSICA EN CLOUDINARY
                        var result = await _cloudinary.DestroyAsync(deletionParams);

                        if (result.Result == "ok")
                        {
                            resources.Remove(res);
                        }
                        else
                        {
                            // Opcional: Loguear si el borrado falló pero igual remover de la auditoría 
                            // para no intentar borrarlo siempre si ya no existe en la nube.
                            resources.Remove(res);
                        }
                    }
                    SaveResources(resources);
                }
            }

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

    private readonly string _resourcesJsonPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "assets", "resources.json");

    private List<CloudinaryResource> GetResources()
    {
        if (!System.IO.File.Exists(_resourcesJsonPath)) return new List<CloudinaryResource>();
        var json = System.IO.File.ReadAllText(_resourcesJsonPath);
        return JsonSerializer.Deserialize<List<CloudinaryResource>>(json) ?? new List<CloudinaryResource>();
    }

    private void SaveResources(List<CloudinaryResource> resources)
    {
        var json = JsonSerializer.Serialize(resources, new JsonSerializerOptions { WriteIndented = true });
        System.IO.File.WriteAllText(_resourcesJsonPath, json);
    }

    // Método para calcular el HASH del archivo
    private string CalculateHash(IFormFile file)
    {
        using var stream = file.OpenReadStream();
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(stream);
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
    }
}