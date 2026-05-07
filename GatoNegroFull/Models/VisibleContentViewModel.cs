namespace GatoNegroFull.Models;

public class VisibleContentViewModel
{
    public bool PuedeEditar { get; set; }
    public bool PuedeVer { get; set; }
    public string[] Images { get; set; } = [];
    public string ImageFolder { get; set; } = string.Empty;
}
