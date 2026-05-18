namespace WatsApp.Models;

public class Testimonio : Imagen
{
    public string Cargo { get; set; } = string.Empty;
    public string Comentario { get; set; } = string.Empty;
}

public class TestimonioUploadDto
{
    public required IFormFile ImageFile { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Cargo { get; set; } = string.Empty;
    public string Comentario { get; set; } = string.Empty;
}