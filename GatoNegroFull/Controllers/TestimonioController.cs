using AutoMapper;
using GatoNegroFull.Controllers.Base;
using GatoNegroFull.Models;
using GatoNegroFull.Repository;

namespace GatoNegroFull.Controllers;

public class TestimonioController(IWebHostEnvironment env, IRepository<Testimonio> repo, IMapper mapper)
    : BaseController<Testimonio, TestimonioUploadDto>(env, repo, mapper, "GatoNegro_Testimonios", "Comentarios/comentarios.json")
{
    // Métodos específicos para la entidad Testimonio si es necesario.
}