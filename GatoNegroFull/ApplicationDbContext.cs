using Microsoft.EntityFrameworkCore;
using WatsApp.Models;

namespace WatsApp;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    // Esta va a ser tu tabla de mensajes en la base de datos SQLite
    public DbSet<ChatMessage> ChatMessages { get; set; }
    public DbSet<UserData> Users { get; set; }
}