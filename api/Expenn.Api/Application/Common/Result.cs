namespace Expenn.Api.Application.Common;

/// <summary>
/// Discriminated union that carries either a success value or an error string.
/// Use this as the return type of application-layer handlers instead of throwing.
/// </summary>
public sealed class Result<T>
{
    private readonly T? _value;
    private readonly string? _error;

    private Result(T value)
    {
        IsSuccess = true;
        _value = value;
    }

    private Result(string error)
    {
        IsSuccess = false;
        _error = error;
    }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;

    public T Value => IsSuccess ? _value! : throw new InvalidOperationException("Cannot access Value of a failed Result.");
    public string Error => IsFailure ? _error! : throw new InvalidOperationException("Cannot access Error of a successful Result.");

    public static Result<T> Ok(T value) => new(value);
    public static Result<T> Fail(string error) => new(error);

    public static implicit operator Result<T>(T value) => Ok(value);
}

/// <summary>Non-generic Result for commands that return no value.</summary>
public sealed class Result
{
    private readonly string? _error;

    private Result() { IsSuccess = true; }
    private Result(string error) { IsSuccess = false; _error = error; }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public string Error => IsFailure ? _error! : throw new InvalidOperationException("Cannot access Error of a successful Result.");

    public static Result Ok() => new();
    public static Result Fail(string error) => new(error);
}
