"""
WSGI entry point for production (gunicorn).

Usage on the VM:
    gunicorn -w 2 -b 0.0.0.0:3000 wsgi:application

-w 2   → 2 worker processes (handles concurrent requests)
-b     → bind address and port
"""

from app import create_app

application = create_app()

if __name__ == "__main__":
    application.run()
