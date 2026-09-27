from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
cors = CORS()

# Will be fully initialized with the Flask app context in the factory
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://"  # fallback storage in-memory
)
