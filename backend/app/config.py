import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev_secret_key_change_me")
    
    # SQLAlchemy Configuration
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "postgresql://pms:pms_password@localhost:5432/pms_db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Secrets for token encryption
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev_jwt_secret_key_change_me")
    REFRESH_TOKEN_SECRET_KEY = os.getenv(
        "REFRESH_TOKEN_SECRET_KEY", "dev_refresh_token_secret_key_change_me"
    )
    
    # Redis configuration for rate limiting and lockouts
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Flask Smorest OpenAPI Docs Config (sets up automatic Swagger docs)
    API_TITLE = "Project Management System API"
    API_VERSION = "v1"
    OPENAPI_VERSION = "3.0.3"
    OPENAPI_URL_PREFIX = "/"
    OPENAPI_SWAGGER_UI_PATH = "/api/v1/swagger-ui"
    OPENAPI_SWAGGER_UI_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"
    
    # CORS
    CORS_HEADERS = "Content-Type"
