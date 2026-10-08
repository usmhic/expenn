using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Expenn.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddExpenseReviewAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "reimbursed_at",
                schema: "expenses",
                table: "expenses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "review_note",
                schema: "expenses",
                table: "expenses",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "reviewed_at",
                schema: "expenses",
                table: "expenses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "reviewed_by_id",
                schema: "expenses",
                table: "expenses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "submitted_at",
                schema: "expenses",
                table: "expenses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_expenses_reviewed_by_id",
                schema: "expenses",
                table: "expenses",
                column: "reviewed_by_id");

            migrationBuilder.AddForeignKey(
                name: "FK_expenses_user_reviewed_by_id",
                schema: "expenses",
                table: "expenses",
                column: "reviewed_by_id",
                principalSchema: "identity",
                principalTable: "user",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_expenses_user_reviewed_by_id",
                schema: "expenses",
                table: "expenses");

            migrationBuilder.DropIndex(
                name: "IX_expenses_reviewed_by_id",
                schema: "expenses",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "reimbursed_at",
                schema: "expenses",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "review_note",
                schema: "expenses",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "reviewed_at",
                schema: "expenses",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "reviewed_by_id",
                schema: "expenses",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "submitted_at",
                schema: "expenses",
                table: "expenses");
        }
    }
}
