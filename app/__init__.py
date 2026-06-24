import os
import psycopg
from flask import Flask, send_from_directory
from app.config import Config
from app.db import close_db
from app.routes.auth_routes import auth_bp
from app.routes.api_routes import api_bp

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

def init_db():
    def make_conn():
        from psycopg.rows import dict_row
        return psycopg.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            sslmode="require",
            row_factory=dict_row
        )

    try:
        conn = make_conn()
        with conn:
            with conn.cursor() as cur:
                base = os.path.dirname(os.path.dirname(__file__))
                with open(os.path.join(base, "database/DDL_FooFighters.sql")) as f:
                    cur.execute(f.read())
                with open(os.path.join(base, "database/materialized_view.sql")) as f:
                    cur.execute(f.read())
    except Exception as schema_err:
        print(f"Schema skipped: {schema_err}")

    try:
        conn2 = make_conn()
        from database.seed import run_seed
        run_seed(conn2)
        conn2.close()
        print("Seed complete.")
    except Exception as e:
        print(f"Seed failed: {e}")

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    init_db()
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp, url_prefix="/api")
    app.teardown_appcontext(close_db)

    @app.route("/")
    def index():
        return send_from_directory(FRONTEND_DIR, "login.html")

    @app.route("/<path:filename>")
    def serve_frontend(filename):
        return send_from_directory(FRONTEND_DIR, filename)

    return app