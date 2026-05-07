namespace GatoNegroFull.Models;

public class UserData
{
    // Usamos nombres en minúscula para que mapeen directo con tu users.json actual
    public string user { get; set; } = string.Empty;
    public string pass { get; set; } = string.Empty;
    public string role { get; set; } = "User";

    // Inicializamos con una imagen por defecto de Cloudinary o una local
    // para evitar errores al renderizar en el chat
    public string photoUrl { get; set; } = "https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png";
}