# American Dream Election System

A web-based election platform for professional societies (IEEE, ACM, etc.) built with Flask and PostgreSQL.

**Team:** ISTE-432 FooFighters

## Live Demo

[https://election-project-2w22.onrender.com/](https://election-project-2w22.onrender.com)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3 / Flask |
| Database | PostgreSQL (psycopg3) |
| Frontend | Vanilla JS + Tailwind CSS |
| Auth | Flask sessions + bcrypt |
| Server | Gunicorn (production) |

---

## Architecture

Strict 3-layer separation:

```
HTTP Request
    ↓
app/routes/api_routes.py      ← REST layer: HTTP in/out, owns transactions (with db:)
    ↓
app/services/                 ← Business layer: role checks, validation, state rules
    ↓
app/repositories/             ← Data layer: raw parameterized SQL only
    ↓
PostgreSQL
```

**Transaction boundaries** are owned exclusively by the route layer using psycopg3's `with db:` context manager, which auto-commits on success and rolls back on any exception.

**N+1 queries** are eliminated via JOIN queries in the repository layer. Candidates are fetched with their offices in a single query; options are fetched with their initiatives in a single query. Grouping happens in Python.

---

## Advanced Database Features

| Feature | Where |
|---|---|
| Materialized views | `mv_candidate_results`, `mv_initiative_results` — pre-computed vote tallies |
| Stored procedure | `refresh_election_results()` — refreshes both materialized views atomically |
| SELECT FOR UPDATE | `get_election_for_update()` in `election_repository.py` — prevents concurrent ballot edits |
| Parameterized queries | All SQL uses `%s` placeholders throughout repositories |

---

## Project Structure

```
election-system/
├── app/
│   ├── __init__.py              # App factory, blueprint registration, static file serving
│   ├── config.py                # Config from .env
│   ├── db.py                    # psycopg3 connection with dict_row
│   ├── routes/
│   │   └── api_routes.py        # All REST endpoints
│   ├── services/
│   │   ├── auth_service.py      # Login, password verification
│   │   ├── ballot_service.py    # Election creation, ballot save/publish
│   │   ├── voting_service.py    # Vote submission (role + society + duplicate checks)
│   │   ├── election_service.py  # Role-based election listing + ballot fetch
│   │   ├── results_service.py   # Results access with role restrictions
│   │   └── user_service.py      # Admin user management
│   └── repositories/
│       ├── election_repository.py
│       ├── office_repository.py
│       ├── initiative_repository.py
│       ├── candidate_repository.py
│       ├── vote_repository.py
│       ├── society_repository.py
│       └── user_repository.py
├── frontend/
│   ├── login.html
│   ├── dashboard.html / dashboard.js
│   ├── ballot.html / ballot.js
│   ├── ballot-editor.html / ballot-editor.js
│   ├── results.html / results.js
│   ├── participation.html / participation.js
│   ├── pending-tasks.html / pending-tasks.js
│   ├── admin.html / admin.js
│   ├── settings.html / settings.js
│   └── components.js            # Shared navbar, footer, alerts
├── database/
│   ├── DDL_FooFighters.sql      # Schema
│   ├── materialized_view.sql    # Materialized views + stored procedure
│   ├── migrations/              # Migration scripts
│   └── seed.py                  # Test data loader
├── tests/
│   └── test_*.py                # Unit tests (29 tests)
├── wsgi.py                      # Gunicorn entry point
├── run.py                       # Dev server entry point
├── requirements.txt
└── .env                         # Not committed — see setup below
```

---

## Roles & Access

| Role | Access |
|---|---|
| `member` | Vote on active elections in their society; view results of completed elections |
| `officer` | Vote + view voter participation (who voted/who hasn't) + view completed election results |
| `employee` | Assigned to societies; build & publish ballots, view results, view participation, manage pending tasks |
| `admin` | Everything + manage users, societies, employee assignments, audit logs, and reports |

---

## Election States

```
draft → active → completed
```

- **draft**: ballot can be edited by employees/admins
- **active**: members/officers can vote; ballot is locked; each user can only vote once
- **completed**: voting closed; results visible to employees, admins, and officers

---

## API Endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/logout` | Auth | Logout |
| GET | `/api/me` | Auth | Current user info |
| PUT | `/api/me` | Auth | Update own name |
| PUT | `/api/me/password` | Auth | Change own password |
| GET | `/api/elections` | Auth | List elections (role-filtered) |
| POST | `/api/elections` | Employee/Admin | Create election |
| GET | `/api/elections/<id>` | Auth | Get election + full ballot |
| PUT | `/api/elections/<id>/ballot` | Employee/Admin | Save ballot (draft only) |
| POST | `/api/elections/<id>/publish` | Employee/Admin | Publish election |
| GET | `/api/elections/<id>/voted` | Auth | Check if current user has voted |
| POST | `/api/elections/<id>/vote` | Member/Officer | Submit vote |
| GET | `/api/elections/<id>/results` | Employee/Admin/Officer | View results |
| GET | `/api/elections/participation` | Officer/Employee/Admin | Turnout stats + member roster for active elections |
| GET | `/api/elections/pending` | Employee | Draft elections in assigned societies needing a ballot |
| GET | `/api/elections/<id>/members` | Officer/Employee/Admin | Per-election member voted/not-voted roster |
| GET | `/api/societies` | Admin/Employee | List societies |
| POST | `/api/societies` | Admin | Create society |
| GET | `/api/societies/assignments` | Admin | List employee–society assignments |
| GET | `/api/users` | Admin | List all users |
| POST | `/api/users` | Admin | Create user |
| PUT | `/api/users/<id>` | Admin | Update user (status, role, etc.) |
| POST | `/api/users/<id>/societies` | Admin | Assign employee to society |
| DELETE | `/api/users/<id>/societies/<sid>` | Admin | Remove employee from society |
| GET | `/api/audit` | Admin | Ballot edit events + vote activity log |
| GET | `/api/reports` | Admin | System-wide stats + per-society stats |

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd election-system
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment

Create a `.env` file (never commit this):

```
DATABASE_URL=postgresql://user:password@host/dbname
SECRET_KEY=your-secret-key
FLASK_ENV=development
```

### 3. Set up the database

```bash
psql -U postgres -f database/DDL_FooFighters.sql
psql -U postgres -f database/materialized_view.sql
python3 database/seed.py
```

### 4. Run

```bash
# Development
python3 run.py

# Production (Gunicorn)
gunicorn -w 2 -b 0.0.0.0:3000 "app:create_app()"
```

---

## Test Users (after running seed.py)

All passwords: `password123`

| Email | Name | Role | Society |
|---|---|---|---|
| `admin@example.com` | Admin User | admin | — |
| `employee@example.com` | Emma Ployee | employee | IEEE + ACM |
| `officer@example.com` | Oliver Ficer | officer | IEEE |
| `member@example.com` | Mary Member | member | IEEE |
| `member2@example.com` | Mark Two | member | ACM |

---

## Running Tests

```bash
python3 -m pytest tests/ -v
```

29 unit tests covering services and repositories.
