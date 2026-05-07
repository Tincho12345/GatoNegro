using AutoMapper;
using GatoNegroFull.Controllers.Base;
using GatoNegroFull.Models;
using GatoNegroFull.Repository;

namespace GatoNegroFull.Controllers;

public class ImagenController(IWebHostEnvironment env, IRepository<Imagen> repo, IMapper mapper)
    : BaseController<Imagen, ImagenUploadDto>(env, repo, mapper, "GatoNegro_Galeria", "GatoNegro/galeria.json")
{
    // Métodos específicos para la entidad Imagen si es necesario.
}