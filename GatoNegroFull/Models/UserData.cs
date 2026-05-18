using System.ComponentModel.DataAnnotations;

namespace WatsApp.Models;

public class UserData
{
    [Key] // Esto le dice a EF Core que 'user' es la clave primaria única
    public string user { get; set; } = string.Empty;
    public string pass { get; set; } = string.Empty;
    public string role { get; set; } = "User";
    public string photoUrl { get; set; } = "https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png";
}