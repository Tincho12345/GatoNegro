using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WatsApp.Migrations
{
    /// <inheritdoc />
    public partial class AgregarTablaCloudinaryResources : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CloudinaryResources",
                columns: table => new
                {
                    Hash = table.Column<string>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    PublicId = table.Column<string>(type: "TEXT", nullable: false),
                    UseCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudinaryResources", x => x.Hash);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CloudinaryResources");
        }
    }
}
