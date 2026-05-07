using AutoMapper;
using GatoNegroFull.Models;

namespace GatoNegroFull.Mapper;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<ImagenUploadDto, Imagen>();
        CreateMap<TestimonioUploadDto, Testimonio>();
    }
}