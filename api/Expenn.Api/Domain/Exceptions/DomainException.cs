namespace Expenn.Api.Domain.Exceptions;

public class DomainException(string message) : Exception(message);

public class NotFoundException(string entity, string id)
    : DomainException($"{entity} '{id}' was not found.");

public class ForbiddenException(string message = "You do not have permission to perform this action.")
    : DomainException(message);

public class ConflictException(string message) : DomainException(message);
