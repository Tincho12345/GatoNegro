using Microsoft.AspNetCore.SignalR;

namespace GatoNegroFull.Hubs;

public class ChatHub : Hub
{
    // Este método permite notificar a todos que hay nuevos datos
    public async Task NotifyNewMessage()
    {
        await Clients.All.SendAsync("ReceiveMessageUpdate");
    }
}
