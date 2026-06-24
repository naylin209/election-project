from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from app.db import get_db

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "").strip()

        db = get_db()
        with db.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, email, password_hash, first_name, last_name, role, status
                FROM "user"
                WHERE email = %s
                """,
                (email,)
            )
            user = cur.fetchone()

        if not user:
            flash("Invalid email or password.")
            return render_template("login.html")

        if user["status"] != "active":
            flash("This account is not active.")
            return render_template("login.html")

        if password != user["password_hash"]:
            flash("Invalid email or password.")
            return render_template("login.html")

        session["user_id"] = user["user_id"]
        session["email"] = user["email"]
        session["first_name"] = user["first_name"]
        session["last_name"] = user["last_name"]
        session["role"] = user["role"]

        if user["role"] == "admin":
            return redirect(url_for("auth.admin_dashboard"))
        elif user["role"] == "employee":
            return redirect(url_for("auth.employee_dashboard"))
        elif user["role"] == "officer":
            return redirect(url_for("auth.officer_dashboard"))
        else:
            return redirect(url_for("auth.member_dashboard"))

    return render_template("login.html")


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("auth.login"))


@auth_bp.route("/test-db")
def test_db():
    db = get_db()
    with db.cursor() as cur:
        cur.execute("SELECT current_database() AS db_name, current_user AS db_user;")
        result = cur.fetchone()

    return f"""
    <h1>Database Connection Works</h1>
    <p>Database: {result['db_name']}</p>
    <p>User: {result['db_user']}</p>
    <p><a href='/'>Back Home</a></p>
    """


def require_login():
    return "user_id" in session


@auth_bp.route("/admin/dashboard")
def admin_dashboard():
    if not require_login():
        return redirect(url_for("auth.login"))
    if session.get("role") != "admin":
        return "Forbidden", 403

    return render_template("dashboard.html", title="Admin Dashboard")


@auth_bp.route("/employee/dashboard")
def employee_dashboard():
    if not require_login():
        return redirect(url_for("auth.login"))
    if session.get("role") != "employee":
        return "Forbidden", 403

    return render_template("dashboard.html", title="Employee Dashboard")


@auth_bp.route("/officer/dashboard")
def officer_dashboard():
    if not require_login():
        return redirect(url_for("auth.login"))
    if session.get("role") != "officer":
        return "Forbidden", 403

    return render_template("dashboard.html", title="Officer Dashboard")


@auth_bp.route("/member/dashboard")
def member_dashboard():
    if not require_login():
        return redirect(url_for("auth.login"))
    if session.get("role") != "member":
        return "Forbidden", 403

    return render_template("dashboard.html", title="Member Dashboard")