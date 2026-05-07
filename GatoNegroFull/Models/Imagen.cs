namespace GatoNegroFull.Models;

public class Imagen : IEntity
{
    public string Id { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;

    // Ya no hay conflicto: La clase es 'Imagen' y la propiedad es 'ImagenUrl'
    public string ImagenUrl { get; set; } = string.Empty;

    public string PublicId { get; set; } = string.Empty;
}

// DTOs/UploadDto.cs
public class ImagenUploadDto : IUploadDto
{
    public required IFormFile ImageFile { get; set; }

    // Coincide con Imagen.Nombre
    public string Nombre { get; set; } = string.Empty;
}