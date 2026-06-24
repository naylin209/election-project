import bcrypt

def run_seed(conn):
    pw_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt(10)).decode()

    with conn.cursor() as cur:

        # Societies
        for name, desc in [
            ('IEEE', 'Institute of Electrical and Electronics Engineers'),
            ('ACM',  'Association for Computing Machinery')
        ]:
            cur.execute("SELECT society_id FROM society WHERE name = %s", (name,))
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO society (name, description) VALUES (%s, %s)",
                    (name, desc)
                )

        cur.execute("SELECT society_id, name FROM society")
        societies = {r["name"]: r["society_id"] for r in cur.fetchall()}
        ieee_id = societies["IEEE"]
        acm_id  = societies["ACM"]

        # Users
        users = [
            (None,    "admin@example.com",    "Admin",  "User",   "admin"),
            (None,    "employee@example.com", "Emma",   "Ployee", "employee"),
            (ieee_id, "officer@example.com",  "Oliver", "Ficer",  "officer"),
            (ieee_id, "member@example.com",   "Mary",   "Member", "member"),
            (acm_id,  "member2@example.com",  "Mark",   "Two",    "member"),
        ]
        for society_id, email, first, last, role in users:
            cur.execute("""
                INSERT INTO "user"
                    (society_id, email, password_hash, first_name, last_name, role, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'active')
                ON CONFLICT (email) DO NOTHING
            """, (society_id, email, pw_hash, first, last, role))

        # Employee society assignments
        cur.execute("""SELECT user_id FROM "user" WHERE email = 'employee@example.com'""")
        emp_id = cur.fetchone()["user_id"]
        cur.execute("""SELECT user_id FROM "user" WHERE email = 'admin@example.com'""")
        admin_id = cur.fetchone()["user_id"]

        for sid in (ieee_id, acm_id):
            cur.execute("""
                SELECT 1 FROM employee_society_assignment
                WHERE user_id = %s AND society_id = %s
            """, (emp_id, sid))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO employee_society_assignment (user_id, society_id)
                    VALUES (%s, %s)
                """, (emp_id, sid))

        # Election
        cur.execute("SELECT election_id FROM election WHERE name = 'IEEE 2026 Officer Election'")
        row = cur.fetchone()
        if not row:
            cur.execute("""
                INSERT INTO election
                    (society_id, created_by, name, description, start_date, end_date, status)
                VALUES (%s, %s, 'IEEE 2026 Officer Election',
                        'Annual officer election for IEEE chapter.',
                        '2026-01-01', '2026-12-31', 'active')
                RETURNING election_id
            """, (ieee_id, admin_id))
            row = cur.fetchone()
        election_id = row["election_id"]

        # Offices
        cur.execute("SELECT office_id, title FROM office WHERE election_id = %s ORDER BY display_order", (election_id,))
        offices = cur.fetchall()
        if not offices:
            cur.execute("""
                INSERT INTO office (election_id, title, votes_allowed, allow_write_in, display_order)
                VALUES
                    (%s, 'President',      1, false, 1),
                    (%s, 'Vice President', 1, false, 2),
                    (%s, 'Secretary',      1, true,  3)
                RETURNING office_id, title
            """, (election_id, election_id, election_id))
            offices = cur.fetchall()

        for office in offices:
            oid = office["office_id"]
            title = office["title"]
            cur.execute("SELECT 1 FROM candidate WHERE office_id = %s LIMIT 1", (oid,))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO candidate (office_id, name, title_position, display_order)
                    VALUES
                        (%s, %s || ' Candidate A', 'Engineer', 1),
                        (%s, %s || ' Candidate B', 'Manager',  2)
                """, (oid, title, oid, title))

        # Initiative
        cur.execute("SELECT initiative_id FROM initiative WHERE election_id = %s LIMIT 1", (election_id,))
        row = cur.fetchone()
        if not row:
            cur.execute("""
                INSERT INTO initiative (election_id, title, description, display_order)
                VALUES (%s, 'Bylaw Amendment 1', 'Should we update meeting frequency to monthly?', 1)
                RETURNING initiative_id
            """, (election_id,))
            row = cur.fetchone()
        init_id = row["initiative_id"]

        cur.execute("SELECT 1 FROM initiative_option WHERE initiative_id = %s LIMIT 1", (init_id,))
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO initiative_option (initiative_id, label, display_order)
                VALUES (%s, 'Yes', 1), (%s, 'No', 2), (%s, 'Abstain', 3)
            """, (init_id, init_id, init_id))

    print("Seed complete.")