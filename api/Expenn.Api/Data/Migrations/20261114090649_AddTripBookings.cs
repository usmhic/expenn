using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Expenn.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTripBookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<string>>(
                name: "companions",
                schema: "travel",
                table: "trips",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'::text[]");

            migrationBuilder.AddColumn<string>(
                name: "kind",
                schema: "travel",
                table: "trips",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "business");

            // Trips in personal workspaces were never business trips.
            migrationBuilder.Sql(
                "UPDATE travel.trips SET kind = 'personal' WHERE organization_id IN " +
                "(SELECT id FROM organizations.organization WHERE account_type = 'personal');");

            migrationBuilder.AddColumn<string>(
                name: "booking_id",
                schema: "expenses",
                table: "expenses",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "trip_bookings",
                schema: "travel",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    organization_id = table.Column<string>(type: "text", nullable: false),
                    trip_id = table.Column<string>(type: "text", nullable: false),
                    created_by_id = table.Column<string>(type: "text", nullable: true),
                    kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    provider = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    reference = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    origin = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    destination = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    starts_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ends_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    amount = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    currency = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    paid_by = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    travelers = table.Column<int>(type: "integer", nullable: false),
                    booking_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trip_bookings", x => x.id);
                    table.ForeignKey(
                        name: "FK_trip_bookings_trips_trip_id",
                        column: x => x.trip_id,
                        principalSchema: "travel",
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_trip_bookings_user_created_by_id",
                        column: x => x.created_by_id,
                        principalSchema: "identity",
                        principalTable: "user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "expenses_booking_idx",
                schema: "expenses",
                table: "expenses",
                column: "booking_id");

            migrationBuilder.CreateIndex(
                name: "IX_trip_bookings_created_by_id",
                schema: "travel",
                table: "trip_bookings",
                column: "created_by_id");

            migrationBuilder.CreateIndex(
                name: "trip_bookings_trip_start_idx",
                schema: "travel",
                table: "trip_bookings",
                columns: new[] { "trip_id", "starts_at" });

            migrationBuilder.AddForeignKey(
                name: "FK_expenses_trip_bookings_booking_id",
                schema: "expenses",
                table: "expenses",
                column: "booking_id",
                principalSchema: "travel",
                principalTable: "trip_bookings",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_expenses_trip_bookings_booking_id",
                schema: "expenses",
                table: "expenses");

            migrationBuilder.DropTable(
                name: "trip_bookings",
                schema: "travel");

            migrationBuilder.DropIndex(
                name: "expenses_booking_idx",
                schema: "expenses",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "companions",
                schema: "travel",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "kind",
                schema: "travel",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "booking_id",
                schema: "expenses",
                table: "expenses");
        }
    }
}
