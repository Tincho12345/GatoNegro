using AutoMapper;
using WatsApp.Models;
using WatsApp.Repository;
using Microsoft.AspNetCore.Mvc;

namespace WatsApp.Controllers.Base;

public abstract class BaseController<TEntity, TUploadDto> : Controller
    where TEntity : class, IEntity, new()
    where TUploadDto : class
{
    protected readonly IRepository<TEntity> _repository;
    protected readonly IMapper _mapper;
    protected readonly string _jsonPath;
    protected readonly string _cloudinaryFolder;

    protected BaseController(IWebHostEnvironment env, IRepository<TEntity> repository, IMapper mapper, string folder, string subPath)
    {
        _repository = repository;
        _mapper = mapper;
        _cloudinaryFolder = folder;
        _jsonPath = Path.Combine(env.WebRootPath, "images", subPath);
    }

    [HttpPost]
    public virtual async Task<IActionResult> Upload([FromForm] TUploadDto dto)
    {
        if (dto == null) return Json(new { success = false, message = "Datos inválidos." });

        // 1. Extraer el archivo (usamos reflexión para buscar la propiedad IFormFile en el DTO)
        var fileProp = typeof(TUploadDto).GetProperties().FirstOrDefault(p => p.PropertyType == typeof(IFormFile));
        var file = fileProp?.GetValue(dto) as IFormFile;

        if (file == null || file.Length == 0)
            return Json(new { success = false, message = "La imagen es obligatoria." });

        // 2. Mapear DTO a Entidad
        var entity = _mapper.Map<TEntity>(dto);

        // 3. Guardar vía Repositorio
        bool resultado = await _repository.AddAsync(entity, file, _cloudinaryFolder, _jsonPath);

        return Json(new
        {
            success = resultado,
            message = resultado ? "Operación exitosa." : "Error al procesar en la nube."
        });
    }

    [HttpPost]
    public virtual async Task<IActionResult> Delete(string id)
    {
        if (string.IsNullOrEmpty(id)) return Json(new { success = false, message = "ID inválido." });

        bool eliminado = await _repository.DeleteAsync(id, _jsonPath);
        return Json(new { success = eliminado, message = eliminado ? "Eliminado." : "Error." });
    }
}