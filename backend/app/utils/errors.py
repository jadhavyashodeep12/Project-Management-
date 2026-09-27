class AppException(Exception):
    def __init__(self, status_code: int, code: str, message: str, details=None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details

class ValidationException(AppException):
    def __init__(self, message: str = "Validation failed", details=None):
        super().__init__(422, "VALIDATION_ERROR", message, details)

class AuthenticationException(AppException):
    def __init__(self, message: str = "Authentication credentials missing or invalid"):
        super().__init__(401, "UNAUTHENTICATED", message)

class AuthorizationException(AppException):
    def __init__(self, message: str = "You do not have permission to access this resource"):
        super().__init__(403, "FORBIDDEN", message)

class NotFoundException(AppException):
    def __init__(self, message: str = "The requested resource was not found"):
        super().__init__(404, "NOT_FOUND", message)

class ConflictException(AppException):
    def __init__(self, message: str = "A resource conflict occurred"):
        super().__init__(409, "CONFLICT", message)
