using System.ComponentModel.DataAnnotations;

namespace WatsApp.Models;

public class CloudinaryResource
{
    [Key] // Declaramos el Hash como Clave Primaria
    public string Hash { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string PublicId { get; set; } = string.Empty;
    public int UseCount { get; set; } = 0;
}