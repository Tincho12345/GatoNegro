namespace GatoNegroFull.Repository;

public interface IRepository<T> where T : class
{
    Task<List<T>> GetAllAsync(string jsonPath);
    Task<bool> AddAsync(T nuevoItem, IFormFile imageFile, string folderName, string jsonPath);
    Task<bool> DeleteAsync(string id, string jsonPath);
}