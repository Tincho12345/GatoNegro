using AutoMapper;
using WatsApp.Models;

namespace WatsApp.Mapper;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<ImagenUploadDto, Imagen>();
        CreateMap<TestimonioUploadDto, Testimonio>();
    }
}