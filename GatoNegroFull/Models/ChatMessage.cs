namespace GatoNegroFull.Models;

public class ChatMessage
{
    public required string Id { get; set; }
    public required string User { get; set; }
    public required string UserPhoto { get; set; }
    public required string Text { get; set; }
    public DateTime Date { get; set; }
    public string? ReplyToId { get; set; }
    public string? ReplyToUser { get; set; }
    public string? ReplyToText { get; set; }
}