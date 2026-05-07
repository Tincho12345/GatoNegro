using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using GatoNegroFull.Models;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace GatoNegroFull.Repository;

// Agregamos las restricciones: debe ser una clase, implementar IEntity y tener constructor vacío
public class TestimonioRepository<T> : IRepository<T> where T : class, IEntity, new()
{
    private readonly Cloudinary _cloudinary;

    public TestimonioRepository(IOptions<CloudinarySettings> config)
    {
        var account = new Account(config.Value.CloudName, config.Value.ApiKey, config.Value.ApiSecret);
        _cloudinary = new Cloudinary(account);
    }

    public async Task<List<T>> GetAllAsync(string jsonPath)
    {
        if (!File.Exists(jsonPath)) return new List<T>();

        string json = await File.ReadAllTextAsync(jsonPath);
        return JsonSerializer.Deserialize<List<T>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? new List<T>();
    }

    public async Task<bool> AddAsync(T nuevoItem, IFormFile imageFile, string folderName, string jsonPath)
    {
        if (imageFile == null) return false;

        using var stream = imageFile.OpenReadStream();
        var uploadParams = new ImageUploadParams()
        {
            File = new FileDescription(imageFile.FileName, stream),
            Folder = folderName
        };

        var uploadResult = await _cloudinary.UploadAsync(uploadParams);

        if (uploadResult.Error != null) return false;

        // ACCESO SEGURO Y ESCALABLE: 
        // Gracias a IEntity, ya no necesitamos 'dynamic'.
        nuevoItem.Id = Guid.NewGuid().ToString();
        nuevoItem.ImagenUrl = uploadResult.SecureUrl.ToString(); // Actualizado
        nuevoItem.PublicId = uploadResult.PublicId;

        var lista = await GetAllAsync(jsonPath);
        lista.Add(nuevoItem);

        string nuevoJson = JsonSerializer.Serialize(lista, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(jsonPath, nuevoJson);

        return true;
    }

    public async Task<bool> DeleteAsync(string id, string jsonPath)
    {
        var lista = await GetAllAsync(jsonPath);

        // Buscamos directamente por la propiedad Id definida en IEntity
        var item = lista.FirstOrDefault(t => t.Id == id);

        if (item == null) return false;

        // Eliminación de Cloudinary
        if (!string.IsNullOrEmpty(item.PublicId))
        {
            await _cloudinary.DestroyAsync(new DeletionParams(item.PublicId));
        }

        // Eliminación del JSON
        lista.Remove(item);
        string nuevoJson = JsonSerializer.Serialize(lista, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(jsonPath, nuevoJson);

        return true;
    }
}