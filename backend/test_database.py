from database import get_connection


try:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT current_database();")
            result = cur.fetchone()

    print("==============================================")
    print("       RAILGENIE DATABASE TEST")
    print("==============================================")
    print()
    print("Connected database:", result[0])
    print()
    print("✅ PostgreSQL connection PASSED")

except Exception as e:
    print("❌ PostgreSQL connection FAILED")
    print(e)