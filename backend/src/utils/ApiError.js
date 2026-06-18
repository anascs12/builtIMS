class ApiError extends Error {
  constructor(statusCode, message, details = null, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.details    = details;
    this.code       = code;
    this.isApiError = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details, code)  { return new ApiError(400, message, details, code); }
  static unauthorized(message = 'Unauthorized', code) { return new ApiError(401, message, null, code); }
  static forbidden(message = 'Forbidden')    { return new ApiError(403, message); }
  static notFound(message = 'Not found')     { return new ApiError(404, message); }
  static conflict(message, code)             { return new ApiError(409, message, null, code); }
  static tooMany(message = 'Too many requests') { return new ApiError(429, message); }
  static internal(message = 'Internal server error') { return new ApiError(500, message); }
}

module.exports = ApiError;