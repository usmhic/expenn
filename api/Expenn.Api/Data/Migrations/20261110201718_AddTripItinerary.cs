using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Expenn.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTripItinerary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "route_bbox",
                schema: "travel",
                table: "trips",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "route_distance_m",
                schema: "travel",
                table: "trips",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "route_duration_s",
                schema: "travel",
                table: "trips",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "route_geometry",
                schema: "travel",
                table: "trips",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "route_legs",
                schema: "travel",
                table: "trips",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "route_preview",
                schema: "travel",
                table: "trips",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "route_profile",
                schema: "travel",
                table: "trips",
                type: "text",
                nullable: false,
                defaultValue: "driving-car");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "route_updated_at",
                schema: "travel",
                table: "trips",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "trip_stops",
                schema: "travel",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    organization_id = table.Column<string>(type: "text", nullable: false),
                    trip_id = table.Column<string>(type: "text", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    latitude = table.Column<double>(type: "double precision", nullable: false),
                    longitude = table.Column<double>(type: "double precision", nullable: false),
                    arrive_on = table.Column<DateOnly>(type: "date", nullable: true),
                    depart_on = table.Column<DateOnly>(type: "date", nullable: true),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    kind = table.Column<string>(type: "text", nullable: false, defaultValue: "stop"),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trip_stops", x => x.id);
                    table.ForeignKey(
                        name: "FK_trip_stops_trips_trip_id",
                        column: x => x.trip_id,
                        principalSchema: "travel",
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "trip_stops_trip_position_idx",
                schema: "travel",
                table: "trip_stops",
                columns: new[] { "trip_id", "position" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "trip_stops",
                schema: "travel");

            migrationBuilder.DropColumn(
                name: "route_bbox",
                schema: "travel",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "route_distance_m",
                schema: "travel",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "route_duration_s",
                schema: "travel",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "route_geometry",
                schema: "travel",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "route_legs",
                schema: "travel",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "route_preview",
                schema: "travel",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "route_profile",
                schema: "travel",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "route_updated_at",
                schema: "travel",
                table: "trips");
        }
    }
}
