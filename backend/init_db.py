from database import get_connection


def create_tables():
    with get_connection() as conn:
        with conn.cursor() as cur:

            cur.execute("""
                CREATE TABLE IF NOT EXISTS trains (
                    id SERIAL PRIMARY KEY,
                    train_id VARCHAR(50) UNIQUE NOT NULL,
                    section VARCHAR(50) NOT NULL,
                    arrival INTEGER NOT NULL,
                    departure INTEGER NOT NULL
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS assets (
                    id SERIAL PRIMARY KEY,
                    asset_id VARCHAR(50) UNIQUE NOT NULL,
                    asset_type VARCHAR(100),
                    section VARCHAR(50) NOT NULL
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS maintenance_tasks (
                    id SERIAL PRIMARY KEY,
                    task_id VARCHAR(50) UNIQUE NOT NULL,
                    asset_id VARCHAR(50) NOT NULL,
                    section VARCHAR(50) NOT NULL,
                    duration INTEGER NOT NULL,
                    priority VARCHAR(20) NOT NULL
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS maintenance_windows (
                    id SERIAL PRIMARY KEY,
                    task_id VARCHAR(50) NOT NULL
                        REFERENCES maintenance_tasks(task_id)
                        ON DELETE CASCADE,
                    start_time INTEGER NOT NULL,
                    end_time INTEGER NOT NULL,
                    CHECK (end_time > start_time)
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS schedule_runs (
                    id SERIAL PRIMARY KEY,
                    status VARCHAR(30) NOT NULL,
                    score NUMERIC(5,2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS schedule_items (
                    id SERIAL PRIMARY KEY,
                    run_id INTEGER REFERENCES schedule_runs(id),
                    task_id VARCHAR(50) NOT NULL,
                    asset_id VARCHAR(50) NOT NULL,
                    section VARCHAR(50) NOT NULL,
                    start_time INTEGER NOT NULL,
                    end_time INTEGER NOT NULL,
                    duration INTEGER NOT NULL,
                    priority VARCHAR(20) NOT NULL
                );
            """)

        conn.commit()

    print("==============================================")
    print("       RAILGENIE DATABASE INITIALIZATION")
    print("==============================================")
    print()
    print("✅ trains table created")
    print("✅ assets table created")
    print("✅ maintenance_tasks table created")
    print("✅ maintenance_windows table created")
    print("✅ schedule_runs table created")
    print("✅ schedule_items table created")
    print()
    print("✅ DATABASE INITIALIZATION PASSED")


if __name__ == "__main__":
    create_tables()