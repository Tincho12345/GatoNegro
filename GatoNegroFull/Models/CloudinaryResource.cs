namespace WatsApp.Models;

public class CloudinaryResource
{
    public string Hash { get; set; } = string.Empty; // Identificador único del contenido
    public string Url { get; set; } = string.Empty;  // URL de Cloudinary
    public string PublicId { get; set; } = string.Empty; // Necesario para borrar de Cloudinary
    public int UseCount { get; set; } = 0;           // Cuántos mensajes la usan
}
