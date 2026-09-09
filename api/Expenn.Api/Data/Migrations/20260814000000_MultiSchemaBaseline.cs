using System;
using Expenn.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Expenn.Api.Data.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260814000000_MultiSchemaBaseline")]
    public partial class MultiSchemaBaseline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(name: "identity");
            migrationBuilder.EnsureSchema(name: "organizations");
            migrationBuilder.EnsureSchema(name: "travel");
            migrationBuilder.EnsureSchema(name: "expenses");
            migrationBuilder.EnsureSchema(name: "documents");

            // Preserve pre-module installations by parking their public-schema
            // tables while the domain-owned baseline is created below.
            migrationBuilder.Sql(
                """
                CREATE SCHEMA IF NOT EXISTS legacy;
                DO $$
                DECLARE table_name TEXT;
                BEGIN
                    FOREACH table_name IN ARRAY ARRAY[
                        'organization', 'user', 'verification', 'team', 'account',
                        'invitation', 'member', 'session', 'team_member', 'trips',
                        'documents', 'expenses', 'travel_approvals',
                        'trip_traveler', 'expense_comment'
                    ]
                    LOOP
                        IF to_regclass(format('public.%I', table_name)) IS NOT NULL
                           AND to_regclass(format('legacy.%I', table_name)) IS NULL THEN
                            EXECUTE format('ALTER TABLE public.%I SET SCHEMA legacy', table_name);
                        END IF;
                    END LOOP;
                END
                $$;
                """);

            migrationBuilder.CreateTable(
                name: "organization",
                schema: "organizations",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    slug = table.Column<string>(type: "text", nullable: false),
                    logo = table.Column<string>(type: "text", nullable: true),
                    account_type = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "user",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    email_verified = table.Column<bool>(type: "boolean", nullable: false),
                    image = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "verification",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    identifier = table.Column<string>(type: "text", nullable: false),
                    value = table.Column<string>(type: "text", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_verification", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "team",
                schema: "organizations",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    organization_id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_team", x => x.id);
                    table.ForeignKey(
                        name: "FK_team_organization_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "organizations",
                        principalTable: "organization",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "account",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    account_id = table.Column<string>(type: "text", nullable: false),
                    provider_id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    access_token = table.Column<string>(type: "text", nullable: true),
                    refresh_token = table.Column<string>(type: "text", nullable: true),
                    id_token = table.Column<string>(type: "text", nullable: true),
                    access_token_expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    refresh_token_expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    scope = table.Column<string>(type: "text", nullable: true),
                    password = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_account", x => x.id);
                    table.ForeignKey(
                        name: "FK_account_user_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "invitation",
                schema: "organizations",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    organization_id = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    inviter_id = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    accepted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invitation", x => x.id);
                    table.ForeignKey(
                        name: "FK_invitation_organization_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "organizations",
                        principalTable: "organization",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_invitation_user_inviter_id",
                        column: x => x.inviter_id,
                        principalSchema: "identity",
                        principalTable: "user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "member",
                schema: "organizations",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    organization_id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_member", x => x.id);
                    table.ForeignKey(
                        name: "FK_member_organization_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "organizations",
                        principalTable: "organization",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_member_user_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "session",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    token = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ip_address = table.Column<string>(type: "text", nullable: true),
                    user_agent = table.Column<string>(type: "text", nullable: true),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    active_organization_id = table.Column<string>(type: "text", nullable: true),
                    active_team_id = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_session", x => x.id);
                    table.ForeignKey(
                        name: "FK_session_user_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "team_member",
                schema: "organizations",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    team_id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_team_member", x => x.id);
                    table.ForeignKey(
                        name: "FK_team_member_team_team_id",
                        column: x => x.team_id,
                        principalSchema: "organizations",
                        principalTable: "team",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_team_member_user_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "trips",
                schema: "travel",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    organization_id = table.Column<string>(type: "text", nullable: false),
                    team_id = table.Column<string>(type: "text", nullable: true),
                    name = table.Column<string>(type: "text", nullable: false),
                    destination = table.Column<string>(type: "text", nullable: false),
                    start_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    end_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    budget = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    currency = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trips", x => x.id);
                    table.ForeignKey(
                        name: "FK_trips_organization_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "organizations",
                        principalTable: "organization",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_trips_team_team_id",
                        column: x => x.team_id,
                        principalSchema: "organizations",
                        principalTable: "team",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "documents",
                schema: "documents",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    organization_id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    trip_id = table.Column<string>(type: "text", nullable: true),
                    title = table.Column<string>(type: "text", nullable: false),
                    kind = table.Column<string>(type: "text", nullable: false),
                    storage_key = table.Column<string>(type: "text", nullable: true),
                    file_url = table.Column<string>(type: "text", nullable: true),
                    file_name = table.Column<string>(type: "text", nullable: true),
                    mime_type = table.Column<string>(type: "text", nullable: true),
                    size = table.Column<int>(type: "integer", nullable: true),
                    issuer = table.Column<string>(type: "text", nullable: true),
                    holder_name = table.Column<string>(type: "text", nullable: true),
                    document_number = table.Column<string>(type: "text", nullable: true),
                    issue_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    expiry_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    is_sensitive = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_documents", x => x.id);
                    table.ForeignKey(
                        name: "FK_documents_organization_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "organizations",
                        principalTable: "organization",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_documents_trips_trip_id",
                        column: x => x.trip_id,
                        principalSchema: "travel",
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_documents_user_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "expenses",
                schema: "expenses",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    organization_id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    trip_id = table.Column<string>(type: "text", nullable: true),
                    merchant = table.Column<string>(type: "text", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    currency = table.Column<string>(type: "text", nullable: false),
                    category = table.Column<string>(type: "text", nullable: false),
                    expense_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    receipt_file_url = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    payment_method = table.Column<string>(type: "text", nullable: true),
                    reimbursable = table.Column<bool>(type: "boolean", nullable: false),
                    extraction = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expenses", x => x.id);
                    table.ForeignKey(
                        name: "FK_expenses_organization_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "organizations",
                        principalTable: "organization",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_expenses_trips_trip_id",
                        column: x => x.trip_id,
                        principalSchema: "travel",
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_expenses_user_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "travel_approvals",
                schema: "travel",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    organization_id = table.Column<string>(type: "text", nullable: false),
                    trip_id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    purpose = table.Column<string>(type: "text", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    decided_by_id = table.Column<string>(type: "text", nullable: true),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_travel_approvals", x => x.id);
                    table.ForeignKey(
                        name: "FK_travel_approvals_trips_trip_id",
                        column: x => x.trip_id,
                        principalSchema: "travel",
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_travel_approvals_user_decided_by_id",
                        column: x => x.decided_by_id,
                        principalSchema: "identity",
                        principalTable: "user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_travel_approvals_user_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "trip_traveler",
                schema: "travel",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    organization_id = table.Column<string>(type: "text", nullable: false),
                    trip_id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trip_traveler", x => x.id);
                    table.ForeignKey(
                        name: "FK_trip_traveler_trips_trip_id",
                        column: x => x.trip_id,
                        principalSchema: "travel",
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_trip_traveler_user_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "expense_comment",
                schema: "expenses",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    expense_id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    body = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expense_comment", x => x.id);
                    table.ForeignKey(
                        name: "FK_expense_comment_expenses_expense_id",
                        column: x => x.expense_id,
                        principalSchema: "expenses",
                        principalTable: "expenses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_expense_comment_user_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_account_user_id",
                table: "account",
                schema: "identity",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "documents_org_kind_idx",
                table: "documents",
                schema: "documents",
                columns: new[] { "organization_id", "kind" });

            migrationBuilder.CreateIndex(
                name: "documents_org_user_idx",
                table: "documents",
                schema: "documents",
                columns: new[] { "organization_id", "user_id" });

            migrationBuilder.CreateIndex(
                name: "IX_documents_trip_id",
                table: "documents",
                schema: "documents",
                column: "trip_id");

            migrationBuilder.CreateIndex(
                name: "IX_documents_user_id",
                table: "documents",
                schema: "documents",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "expense_comment_expense_idx",
                table: "expense_comment",
                schema: "expenses",
                column: "expense_id");

            migrationBuilder.CreateIndex(
                name: "IX_expense_comment_user_id",
                table: "expense_comment",
                schema: "expenses",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "expenses_org_status_idx",
                table: "expenses",
                schema: "expenses",
                columns: new[] { "organization_id", "status" });

            migrationBuilder.CreateIndex(
                name: "expenses_user_date_idx",
                table: "expenses",
                schema: "expenses",
                columns: new[] { "user_id", "expense_date" });

            migrationBuilder.CreateIndex(
                name: "IX_expenses_trip_id",
                table: "expenses",
                schema: "expenses",
                column: "trip_id");

            migrationBuilder.CreateIndex(
                name: "IX_invitation_inviter_id",
                table: "invitation",
                schema: "organizations",
                column: "inviter_id");

            migrationBuilder.CreateIndex(
                name: "IX_invitation_organization_id",
                table: "invitation",
                schema: "organizations",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_member_user_id",
                table: "member",
                schema: "organizations",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "member_org_user_idx",
                table: "member",
                schema: "organizations",
                columns: new[] { "organization_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_slug",
                table: "organization",
                schema: "organizations",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_session_token",
                table: "session",
                schema: "identity",
                column: "token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_session_user_id",
                table: "session",
                schema: "identity",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "team_org_name_idx",
                table: "team",
                schema: "organizations",
                columns: new[] { "organization_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_team_member_user_id",
                table: "team_member",
                schema: "organizations",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "team_member_team_user_idx",
                table: "team_member",
                schema: "organizations",
                columns: new[] { "team_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_travel_approvals_decided_by_id",
                table: "travel_approvals",
                schema: "travel",
                column: "decided_by_id");

            migrationBuilder.CreateIndex(
                name: "IX_travel_approvals_user_id",
                table: "travel_approvals",
                schema: "travel",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "travel_approvals_org_status_idx",
                table: "travel_approvals",
                schema: "travel",
                columns: new[] { "organization_id", "status" });

            migrationBuilder.CreateIndex(
                name: "travel_approvals_trip_user_idx",
                table: "travel_approvals",
                schema: "travel",
                columns: new[] { "trip_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trip_traveler_user_id",
                table: "trip_traveler",
                schema: "travel",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "trip_traveler_org_user_idx",
                table: "trip_traveler",
                schema: "travel",
                columns: new[] { "organization_id", "user_id" });

            migrationBuilder.CreateIndex(
                name: "trip_traveler_trip_user_idx",
                table: "trip_traveler",
                schema: "travel",
                columns: new[] { "trip_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "trips_org_status_idx",
                table: "trips",
                schema: "travel",
                columns: new[] { "organization_id", "status" });

            migrationBuilder.CreateIndex(
                name: "trips_team_status_idx",
                table: "trips",
                schema: "travel",
                columns: new[] { "team_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_user_email",
                table: "user",
                schema: "identity",
                column: "email",
                unique: true);

            // Copy legacy rows in dependency order, then remove the temporary
            // schema. The table layouts match the previous single-schema
            // baseline, so IDs and relationships are preserved exactly.
            migrationBuilder.Sql(
                """
                DO $$
                DECLARE mapping TEXT[];
                BEGIN
                    FOREACH mapping SLICE 1 IN ARRAY ARRAY[
                        ARRAY['organization', 'organizations'],
                        ARRAY['user', 'identity'],
                        ARRAY['verification', 'identity'],
                        ARRAY['team', 'organizations'],
                        ARRAY['account', 'identity'],
                        ARRAY['invitation', 'organizations'],
                        ARRAY['member', 'organizations'],
                        ARRAY['session', 'identity'],
                        ARRAY['team_member', 'organizations'],
                        ARRAY['trips', 'travel'],
                        ARRAY['documents', 'documents'],
                        ARRAY['expenses', 'expenses'],
                        ARRAY['travel_approvals', 'travel'],
                        ARRAY['trip_traveler', 'travel'],
                        ARRAY['expense_comment', 'expenses']
                    ]
                    LOOP
                        IF to_regclass(format('legacy.%I', mapping[1])) IS NOT NULL THEN
                            EXECUTE format(
                                'INSERT INTO %I.%I SELECT * FROM legacy.%I',
                                mapping[2], mapping[1], mapping[1]
                            );
                        END IF;
                    END LOOP;
                END
                $$;
                DROP SCHEMA IF EXISTS legacy CASCADE;

                -- Collapse pre-public migration history to this maintained
                -- baseline. EF records MultiSchemaBaseline after Up succeeds.
                DELETE FROM public."__EFMigrationsHistory"
                WHERE "MigrationId" <> '20260814000000_MultiSchemaBaseline';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "account",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "documents",
                schema: "documents");

            migrationBuilder.DropTable(
                name: "expense_comment",
                schema: "expenses");

            migrationBuilder.DropTable(
                name: "invitation",
                schema: "organizations");

            migrationBuilder.DropTable(
                name: "member",
                schema: "organizations");

            migrationBuilder.DropTable(
                name: "session",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "team_member",
                schema: "organizations");

            migrationBuilder.DropTable(
                name: "travel_approvals",
                schema: "travel");

            migrationBuilder.DropTable(
                name: "trip_traveler",
                schema: "travel");

            migrationBuilder.DropTable(
                name: "verification",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "expenses",
                schema: "expenses");

            migrationBuilder.DropTable(
                name: "trips",
                schema: "travel");

            migrationBuilder.DropTable(
                name: "user",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "team",
                schema: "organizations");

            migrationBuilder.DropTable(
                name: "organization",
                schema: "organizations");

            migrationBuilder.Sql(
                """
                DROP SCHEMA IF EXISTS documents;
                DROP SCHEMA IF EXISTS expenses;
                DROP SCHEMA IF EXISTS travel;
                DROP SCHEMA IF EXISTS organizations;
                DROP SCHEMA IF EXISTS identity;
                """);
        }
    }
}
