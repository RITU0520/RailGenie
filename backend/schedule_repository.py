from database import get_connection


def save_schedule(
    status,
    score,
    schedule,
    priority_score=None,
    train_impact=None,
    safety_score=None,
):
    with get_connection() as conn:
        with conn.cursor() as cur:

            cur.execute(
                """
                INSERT INTO schedule_runs
                    (
                        status,
                        score,
                        priority_score,
                        train_impact,
                        safety_score
                    )
                VALUES
                    (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    status,
                    score,
                    priority_score,
                    train_impact,
                    safety_score,
                ),
            )

            run_id = cur.fetchone()[0]

            for item in schedule:
                cur.execute(
                    """
                    INSERT INTO schedule_items
                        (
                            run_id,
                            task_id,
                            asset_id,
                            section,
                            start_time,
                            end_time,
                            duration,
                            priority
                        )
                    VALUES
                        (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        run_id,
                        item["task_id"],
                        item["asset_id"],
                        item["section"],
                        item["start"],
                        item["end"],
                        item["duration"],
                        item["priority"],
                    ),
                )

        conn.commit()

    return run_id
def get_latest_schedule():
    with get_connection() as conn:
        with conn.cursor() as cur:

            cur.execute("""
                    SELECT
                        id,
                        status,
                        score,
                        priority_score,
                        train_impact,
                        safety_score,
                        created_at
                    FROM schedule_runs
                    ORDER BY id DESC
                    LIMIT 1
                """)

            run = cur.fetchone()

            if not run:
                return None

            cur.execute("""
                SELECT
                    task_id,
                    asset_id,
                    section,
                    start_time,
                    end_time,
                    duration,
                    priority
                FROM schedule_items
                WHERE run_id = %s
                ORDER BY start_time
            """, (run[0],))

            rows = cur.fetchall()

    schedule = [
        {
            "task_id": row[0],
            "asset_id": row[1],
            "section": row[2],
            "start": row[3],
            "end": row[4],
            "duration": row[5],
            "priority": row[6],
        }
        for row in rows
    ]

    return {
    "run_id": run[0],
    "status": run[1],
    "score": (
        float(run[2])
        if run[2] is not None
        else None
    ),
    "priority_score": (
        float(run[3])
        if run[3] is not None
        else None
    ),
    "train_impact": (
        float(run[4])
        if run[4] is not None
        else None
    ),
    "safety_score": (
        float(run[5])
        if run[5] is not None
        else None
    ),
    "created_at": (
        run[6].isoformat()
        if run[6]
        else None
    ),
    "schedule": [
        {
            "task_id": row[0],
            "asset_id": row[1],
            "section": row[2],
            "start": row[3],
            "end": row[4],
            "duration": row[5],
            "priority": row[6],
        }
        for row in rows
    ],
}