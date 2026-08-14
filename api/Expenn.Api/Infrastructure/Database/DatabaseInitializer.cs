using Npgsql;

namespace Expenn.Api.Infrastructure.Database;

/// <summary>
/// Creates the target Postgres database if it doesn't exist yet. EF Core's
/// <c>Database.Migrate()</c> does not reliably create the database itself on the
/// Npgsql provider (unlike SQL Server/SQLite), so this runs first.
/// </summary>
public static class DatabaseInitializer
{
    public static async Task EnsureDatabaseCreatedAsync(string connectionString)
    {
        var targetBuilder = new NpgsqlConnectionStringBuilder(connectionString);
        var databaseName = targetBuilder.Database
            ?? throw new InvalidOperationException("Connection string has no Database specified.");

        // Connect to the "postgres" maintenance database to check/create the target DB —
        // you can't check whether a database exists from inside a connection to it.
        var maintenanceBuilder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            Database = "postgres",
        };

        await using var connection = new NpgsqlConnection(maintenanceBuilder.ConnectionString);
        await connection.OpenAsync();

        await using (var checkCmd = new NpgsqlCommand(
            "SELECT 1 FROM pg_database WHERE datname = @name", connection))
        {
            checkCmd.Parameters.AddWithValue("name", databaseName);
            var exists = await checkCmd.ExecuteScalarAsync() is not null;
            if (exists)
            {
                return;
            }
        }

        // Database names can't be parameterized in DDL — quote the identifier instead.
        var quotedName = databaseName.Replace("\"", "\"\"");
        await using var createCmd = new NpgsqlCommand($"CREATE DATABASE \"{quotedName}\"", connection);
        try
        {
            await createCmd.ExecuteNonQueryAsync();
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.DuplicateDatabase)
        {
            // Another instance won the create race. Migrations will run next.
        }
    }
}
