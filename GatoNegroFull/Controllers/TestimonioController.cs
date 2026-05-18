using AutoMapper;
using WatsApp.Controllers.Base;
using WatsApp.Models;
using WatsApp.Repository;

namespace WatsApp.Controllers;

public class TestimonioController(IWebHostEnvironment env, IRepository<Testimonio> repo, IMapper mapper)
    : BaseController<Testimonio, TestimonioUploadDto>(env, repo, mapper, "GatoNegro_Testimonios", "Comentarios/comentarios.json")
{
    // Métodos específicos para la entidad Testimonio si es necesario.
}