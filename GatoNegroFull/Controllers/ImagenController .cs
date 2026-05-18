using AutoMapper;
using WatsApp.Controllers.Base;
using WatsApp.Models;
using WatsApp.Repository;

namespace WatsApp.Controllers;

public class ImagenController(IWebHostEnvironment env, IRepository<Imagen> repo, IMapper mapper)
    : BaseController<Imagen, ImagenUploadDto>(env, repo, mapper, "GatoNegro_Galeria", "GatoNegro/galeria.json")
{
    // Métodos específicos para la entidad Imagen si es necesario.
}