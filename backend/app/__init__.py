from flask import Flask, jsonify
from flask_smorest import Api
from app.config import Config
from app.extensions import db, migrate, cors, limiter
from app.utils.errors import AppException
import redis

# Global Redis Connection
redis_conn = None

def create_app(config_class=Config):
    global redis_conn
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Import models to register them with SQLAlchemy/Alembic
    # We use an alias to avoid overwriting the local 'app' Flask instance variable
    import app.models as _
    
    # Configure CORS
    cors.init_app(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})


    
    # Configure Limiter storage using Redis
    if app.config.get("REDIS_URL"):
        app.config["RATELIMIT_STORAGE_URI"] = app.config["REDIS_URL"]
    limiter.init_app(app)
    
    # Initialize Redis connection
    try:
        redis_conn = redis.from_url(app.config["REDIS_URL"], decode_responses=True)
        redis_conn.ping()
        app.logger.info("Connected to Redis successfully.")
    except Exception as e:
        app.logger.warning(f"Could not connect to Redis: {e}. Falling back.")
        redis_conn = None

    # Setup Smorest API Swagger Doc
    api = Api(app)
    
    # Register blueprints (imported lazily to avoid circular dependencies)
    from app.controllers.auth import auth_bp
    from app.controllers.users import users_bp
    from app.controllers.projects import projects_bp
    from app.controllers.teams import teams_bp
    from app.controllers.tasks import tasks_bp
    api.register_blueprint(auth_bp)
    api.register_blueprint(users_bp)
    api.register_blueprint(projects_bp)
    api.register_blueprint(teams_bp)
    api.register_blueprint(tasks_bp)


    @app.route("/health")
    def health():
        db_ok = True
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception:
            db_ok = False
        redis_ok = False
        if redis_conn:
            try:
                redis_conn.ping()
                redis_ok = True
            except Exception:
                pass
        return jsonify({
            "status": "healthy" if (db_ok and redis_ok) else "degraded",
            "database": db_ok,
            "redis": redis_ok
        })

    # Centralized Error Handlers
    @app.errorhandler(AppException)
    def handle_app_exception(error):
        response = jsonify({
            "error": {
                "code": error.code,
                "message": error.message,
                "details": error.details
            }
        })
        response.status_code = error.status_code
        return response

    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({
            "error": {
                "code": "NOT_FOUND",
                "message": "Resource not found"
            }
        }), 404

    @app.errorhandler(500)
    def handle_server_error(error):
        app.logger.error(f"Server Error: {error}", exc_info=True)
        return jsonify({
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred on the server"
            }
        }), 500

    return app
