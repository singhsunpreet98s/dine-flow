namespace DineFlow.Domain.Common;

public enum ResultError { None, NotFound, Validation, Conflict, Unauthorized, Internal }

public class Result<T>
{
    public T? Value { get; }
    public bool IsSuccess { get; }
    public string Message { get; }
    public ResultError ErrorType { get; }

    private Result(T value) { Value = value; IsSuccess = true; Message = string.Empty; ErrorType = ResultError.None; }
    private Result(ResultError type, string message) { IsSuccess = false; ErrorType = type; Message = message; }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(ResultError type, string message) => new(type, message);

    public TOut Match<TOut>(Func<T, TOut> onSuccess, Func<Result<T>, TOut> onFailure)
        => IsSuccess ? onSuccess(Value!) : onFailure(this);
}
