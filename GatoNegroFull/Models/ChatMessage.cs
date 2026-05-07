namespace GatoNegroFull.Models;

public class ChatMessage
{
    public string Id { get; set; } = string.Empty;
    public string User { get; set; } = string.Empty;
    // NUEVO: Para persistir la foto en chat.json
    public string UserPhoto { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public DateTime Date { get; set; }

    public string? ReplyToId { get; set; }
    public string? ReplyToUser { get; set; }
    public string? ReplyToText { get; set; }
}