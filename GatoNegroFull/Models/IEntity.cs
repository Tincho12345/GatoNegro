namespace GatoNegroFull.Models;

public interface IEntity
{
    string Id { get; set; }
    string ImagenUrl { get; set; } // Cambiado de 'Imagen' a 'ImagenUrl'
    string PublicId { get; set; }
}