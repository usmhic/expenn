# syntax=docker/dockerfile:1
# Build context: ./api  (the directory that contains Expenn.Api/)

# ── Restore & Publish ─────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Restore in a separate layer so Docker cache survives source-only changes.
COPY ["Expenn.Api/Expenn.Api.csproj", "Expenn.Api/"]
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore "Expenn.Api/Expenn.Api.csproj"

COPY . .
WORKDIR "/src/Expenn.Api"
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish "Expenn.Api.csproj" \
      -c Release \
      -o /app/publish \
      /p:UseAppHost=false

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

LABEL org.opencontainers.image.title="expenn-api" \
      org.opencontainers.image.source="https://github.com/usmhic/expenn" \
      org.opencontainers.image.description="Expenn .NET API" \
      org.opencontainers.image.authors="usmhic" \
      org.opencontainers.image.licenses="MIT"

# Non-root user — mirrors the pattern used in the web container.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && addgroup --system --gid 1001 dotnet \
 && adduser  --system --uid 1001 --ingroup dotnet dotnetuser

COPY --from=build --chown=1001:1001 /app/publish .

# ── Runtime configuration ─────────────────────────────────────────────────────
# All secrets and connection strings are injected at container-start time via
# environment variables (docker run -e, Compose env_file, Kubernetes secrets).
# The .env file used for local development is intentionally NOT copied here.
#
# Required at runtime:
#   ConnectionStrings__DefaultConnection  PostgreSQL DSN
#   Jwt__Secret                           ≥32-char random secret
#   Jwt__Issuer                           e.g. expenn-api
#   Jwt__Audience                         e.g. expenn-clients
#   Cors__AllowedOrigins__0               e.g. https://app.expenn.com
#
# Optional:
#   ActiveDirectory__Enabled / __Mode / __Ldap* / __TenantId …
#   Oidc__Enabled / __Authority / __ClientId / __ClientSecret …
#   RabbitMq__Enabled / __Host / __Username / __Password …
#   Email__From / __SmtpHost … or Email__ResendApiKey
#   Storage__Endpoint / __AccessKey / __SecretKey / __Bucket …
#   SKIP_MIGRATIONS=true                  Skip EF Core migrations on startup
#
# See the repository-root .env.example and api/README.md.
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:8080/health || exit 1

USER dotnetuser
ENTRYPOINT ["dotnet", "Expenn.Api.dll"]
