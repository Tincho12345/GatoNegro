using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using WatsApp;
using WatsApp.Hubs;
using WatsApp.Models;

public class ChatController : Controller
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly Cloudinary _cloudinary;
    private readonly string _resourcesJsonPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "assets", "resources.json");

    // 1. CONSTRUCTOR
    public ChatController(IHubContext<ChatHub> hubContext, IConfiguration config, ApplicationDbContext context)
    {
        _hubContext = hubContext;
        _context = context;

        var account = new Account(
            config["Cloudinary:CloudName"],
            config["Cloudinary:ApiKey"],
            config["Cloudinary:ApiSecret"]
        );
        _cloudinary = new Cloudinary(account);
    }

    // ==========================================
    // OBTENER MENSAJES (Para el Frontend)
    // ==========================================
    [HttpGet]
    public async Task<IActionResult> GetChatMessages()
    {
        try
        {
            var mensajes = await _context.ChatMessages
                                         .OrderBy(m => m.Date)
                                         .ToListAsync();

            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = null // Evita que C# convierta las propiedades a camelCase
            };

            return Json(mensajes, options);
        }
        catch (Exception ex)
        {
            return Json(new { success = false, message = ex.Message });
        }
    }

    // ==========================================
    // GUARDAR MENSAJE (Imágenes y Videos)
    // ==========================================
    [HttpPost]
    public async Task<IActionResult> SaveMessage(string? text, string user, IFormFile? imageFile, string? replyToId, string? replyToUser, string? replyToText)
    {
        try
        {
            string? fileUrl = null;
            bool isVideo = false;

            if (imageFile != null && imageFile.Length > 0)
            {
                string fileHash = CalculateHash(imageFile);
                var resources = await GetResourcesAsync();
                var existingResource = resources.FirstOrDefault(r => r.Hash == fileHash);

                string extension = Path.GetExtension(imageFile.FileName).ToLower();
                isVideo = (new[] { ".mp4", ".mov", ".avi" }).Contains(extension);

                if (existingResource != null)
                {
                    fileUrl = existingResource.Url;
                    existingResource.UseCount++;
                    await SaveResourcesAsync(resources);
                }
                else
                {
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

                    resources.Add(new CloudinaryResource
                    {
                        Hash = fileHash,
                        Url = fileUrl ?? "",
                        PublicId = result?.PublicId ?? "",
                        UseCount = 1
                    });
                    await SaveResourcesAsync(resources);
                }
            }

            // Buscamos la foto de perfil real directo en SQLite
            var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.user == user);
            string userPhotoUrl = currentUser?.photoUrl ?? "https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png";

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
                Date = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss")
            };

            _context.ChatMessages.Add(newMessage);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveMessageUpdate");

            return Json(new { success = true });
        }
        catch (Exception ex)
        {
            return Json(new { success = false, message = "Error: " + ex.Message });
        }
    }

    // ==========================================
    // ACTUALIZAR / EDITAR MENSAJE
    // ==========================================
    [HttpPost]
    public async Task<IActionResult> UpdateMessage(string editId, string text, string user)
    {
        // Cambiado a FirstOrDefaultAsync para evitar bloqueos
        var msg = await _context.ChatMessages.FirstOrDefaultAsync(m => m.Id == editId);
        if (msg == null) return Json(new { success = false, message = "No encontrado" });

        if (msg.User == user || user == "Admin")
        {
            msg.Text = text;
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveMessageUpdate");
            return Json(new { success = true });
        }
        return Json(new { success = false, message = "No autorizado" });
    }

    // ==========================================
    // ELIMINAR MENSAJE
    // ==========================================
    [HttpPost]
    public async Task<IActionResult> DeleteMessage(string id, string user)
    {
        // Cambiado a FirstOrDefaultAsync
        var msg = await _context.ChatMessages.FirstOrDefaultAsync(m => m.Id == id);
        if (msg == null) return Json(new { success = false, message = "No encontrado" });

        if (msg.User == user || user == "Admin")
        {
            if (!string.IsNullOrEmpty(msg.ImageUrl))
            {
                var resources = await GetResourcesAsync();
                var res = resources.FirstOrDefault(r => r.Url == msg.ImageUrl);

                if (res != null)
                {
                    res.UseCount--;

                    if (res.UseCount <= 0)
                    {
                        string extension = Path.GetExtension(res.Url).ToLower();
                        bool isVideo = (new[] { ".mp4", ".mov", ".avi", ".mkv", ".webm" }).Contains(extension);

                        var deletionParams = new DeletionParams(res.PublicId)
                        {
                            ResourceType = isVideo ? ResourceType.Video : ResourceType.Image
                        };

                        var result = await _cloudinary.DestroyAsync(deletionParams);

                        if (result.Result == "ok")
                        {
                            resources.Remove(res);
                        }
                        else
                        {
                            resources.Remove(res);
                        }
                    }
                    await SaveResourcesAsync(resources);
                }
            }

            _context.ChatMessages.Remove(msg);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveMessageUpdate");
            return Json(new { success = true });
        }
        return Json(new { success = false, message = "No autorizado" });
    }

    // ==========================================
    // INICIAR SESIÓN (LOGIN)
    // ==========================================
    [HttpPost]
    public async Task<IActionResult> SetSessionUser(string userName, string password)
    {
        if (string.IsNullOrEmpty(userName) || string.IsNullOrEmpty(password))
        {
            return Json(new { success = false, message = "Usuario y contraseña requeridos." });
        }

        var dbUser = await _context.Users.FirstOrDefaultAsync(u => u.user == userName);

        if (dbUser == null || dbUser.pass != password)
        {
            return Json(new { success = false, message = "Usuario o contraseña incorrectos." });
        }

        HttpContext.Session.SetString("ChatUser", dbUser.user);
        HttpContext.Session.SetString("ChatRole", dbUser.role);

        return Json(new { success = true, role = dbUser.role });
    }

    // ==========================================
    // REGISTRAR NUEVO USUARIO
    // ==========================================
    [HttpPost]
    public async Task<IActionResult> RegisterUser(string newUser, string newPass, IFormFile? userPhoto)
    {
        if (string.IsNullOrEmpty(newUser) || string.IsNullOrEmpty(newPass))
            return Json(new { success = false, message = "Datos incompletos" });

        var userExists = await _context.Users.AnyAsync(u => u.user == newUser);
        if (userExists)
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

        var newUserData = new UserData
        {
            user = newUser,
            pass = newPass,
            role = "User",
            photoUrl = uploadedImageUrl
        };

        _context.Users.Add(newUserData);
        await _context.SaveChangesAsync();

        return Json(new { success = true });
    }

    // ==========================================
    // CERRAR SESIÓN
    // ==========================================
    [HttpPost]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return Json(new { success = true });
    }

    // ==========================================
    // ENVIAR AUDIO / NOTA DE VOZ
    // ==========================================
    [HttpPost]
    public async Task<IActionResult> SendAudio(IFormFile audioFile, string user)
    {
        if (audioFile == null || audioFile.Length == 0)
            return Json(new { success = false, message = "Archivo de audio vacío" });

        try
        {
            string? audioUrl = null;
            string fileHash = CalculateHash(audioFile);
            var resources = await GetResourcesAsync();
            var existingResource = resources.FirstOrDefault(r => r.Hash == fileHash);

            if (existingResource != null)
            {
                audioUrl = existingResource.Url;
                existingResource.UseCount++;
                await SaveResourcesAsync(resources);
            }
            else
            {
                using var stream = audioFile.OpenReadStream();
                var uploadParams = new VideoUploadParams()
                {
                    File = new FileDescription(audioFile.FileName, stream),
                    Folder = "chat_audios",
                    Transformation = new Transformation().AudioCodec("mp3")
                };

                var result = await _cloudinary.UploadAsync(uploadParams);
                audioUrl = result?.SecureUrl?.ToString();

                resources.Add(new CloudinaryResource
                {
                    Hash = fileHash,
                    Url = audioUrl ?? "",
                    PublicId = result?.PublicId ?? "",
                    UseCount = 1
                });
                await SaveResourcesAsync(resources);
            }

            var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.user == user);
            string userPhotoUrl = currentUser?.photoUrl ?? "https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png";

            var newMessage = new ChatMessage
            {
                Id = Guid.NewGuid().ToString(),
                User = user,
                UserPhoto = userPhotoUrl,
                Text = "🎤 Nota de voz",
                ImageUrl = audioUrl,
                Date = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss")
            };

            _context.ChatMessages.Add(newMessage);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveMessageUpdate");

            return Json(new { success = true, url = audioUrl });
        }
        catch (Exception ex)
        {
            return Json(new { success = false, message = ex.Message });
        }
    }

    // ==========================================
    // MÉTODOS INTERNOS (Asíncronos)
    // ==========================================
    private async Task<List<CloudinaryResource>> GetResourcesAsync()
    {
        if (!System.IO.File.Exists(_resourcesJsonPath)) return new List<CloudinaryResource>();
        var json = await System.IO.File.ReadAllTextAsync(_resourcesJsonPath);
        return JsonSerializer.Deserialize<List<CloudinaryResource>>(json) ?? new List<CloudinaryResource>();
    }

    private async Task SaveResourcesAsync(List<CloudinaryResource> resources)
    {
        var json = JsonSerializer.Serialize(resources, new JsonSerializerOptions { WriteIndented = true });
        await System.IO.File.WriteAllTextAsync(_resourcesJsonPath, json);
    }

    private string CalculateHash(IFormFile file)
    {
        using var stream = file.OpenReadStream();
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(stream);
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
    }
}