from database import get_connection


def get_analytics():
    with get_connection() as conn:
        with conn.cursor() as cur:

            cur.execute("""
    SELECT
        COUNT(*) AS total_runs,
        COALESCE(
            AVG(score) FILTER (WHERE status = 'optimal'),
            0
        ) AS average_score
    FROM schedule_runs
""")

            run_row = cur.fetchone()

            cur.execute("""
                SELECT COUNT(*)
                FROM schedule_items
            """)

            total_tasks = cur.fetchone()[0]

            cur.execute("""
                SELECT
                    COUNT(DISTINCT asset_id)
                FROM schedule_items
            """)

            assets_scheduled = cur.fetchone()[0]

            cur.execute("""
                SELECT
                    priority,
                    COUNT(*)
                FROM schedule_items
                GROUP BY priority
                ORDER BY priority
            """)

            priority_rows = cur.fetchall()

            cur.execute("""
                SELECT
                    id,
                    status,
                    score,
                    created_at
                FROM schedule_runs
                ORDER BY id DESC
                LIMIT 10
            """)

            recent_runs = cur.fetchall()

    return {
        "total_runs": run_row[0],
        "average_score": float(run_row[1]),
        "total_tasks_scheduled": total_tasks,
        "assets_scheduled": assets_scheduled,
        "priority_distribution": {
            row[0]: row[1]
            for row in priority_rows
        },
        "recent_runs": [
            {
                "run_id": row[0],
                "status": row[1],
                "score": float(row[2])
                if row[2] is not None
                else None,
                "created_at": row[3].isoformat()
                if row[3]
                else None,
            }
            for row in recent_runs
        ],
    }