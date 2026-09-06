using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Expenn.Api.Infrastructure.Security;

/// <summary>
/// Terminal exception handler. Logs the real exception with a correlation id and
/// returns an RFC 7807 payload that carries only that id — stack traces and
/// provider messages (connection strings, SQL, LDAP DNs) never reach a client.
/// </summary>
public sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger,
    IHostEnvironment environment,
    IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var traceId = context.TraceIdentifier;

        var (status, title) = exception switch
        {
            BadHttpRequestException => (StatusCodes.Status400BadRequest, "Malformed request"),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Forbidden"),
            OperationCanceledException when context.RequestAborted.IsCancellationRequested
                => (StatusCodes.Status499ClientClosedRequest, "Client closed request"),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred"),
        };

        if (status >= 500)
            logger.LogError(exception, "Unhandled exception on {Method} {Path} (traceId {TraceId})",
                context.Request.Method, context.Request.Path, traceId);
        else
            logger.LogWarning(exception, "Request failed on {Method} {Path} (traceId {TraceId})",
                context.Request.Method, context.Request.Path, traceId);

        // A cancelled request has no client left to answer.
        if (status == StatusCodes.Status499ClientClosedRequest)
            return true;

        context.Response.StatusCode = status;

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Instance = $"{context.Request.Method} {context.Request.Path}",
            Extensions = { ["traceId"] = traceId },
        };

        // Only a developer machine gets the exception text.
        if (environment.IsDevelopment())
            problem.Detail = exception.ToString();

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = problem,
            Exception = exception,
        });
    }
}
