from database import get_connection
from models import TrainMovement, MaintenanceTask, TimeWindow


def load_trains_from_db():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT train_id, section, arrival, departure
                FROM trains
                ORDER BY train_id
            """)
            rows = cur.fetchall()

    return [
        TrainMovement(
            train_id=str(row[0]),
            section=row[1],
            arrival=row[2],
            departure=row[3],
        )
        for row in rows
    ]


def load_assets_from_db():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT asset_id, asset_type, section
                FROM assets
                ORDER BY asset_id
            """)
            rows = cur.fetchall()

    return [
        {
            "asset_id": row[0],
            "asset_type": row[1],
            "section": row[2],
        }
        for row in rows
    ]


def load_tasks_from_db():
    with get_connection() as conn:
        with conn.cursor() as cur:

            cur.execute("""
                SELECT
                    mt.task_id,
                    mt.asset_id,
                    mt.section,
                    mt.duration,
                    mt.priority,
                    a.asset_type
                FROM maintenance_tasks mt
                LEFT JOIN assets a
                    ON mt.asset_id = a.asset_id
                ORDER BY mt.task_id
            """)

            task_rows = cur.fetchall()

            cur.execute("""
                SELECT task_id, start_time, end_time
                FROM maintenance_windows
                ORDER BY task_id, start_time
            """)

            window_rows = cur.fetchall()

    windows_by_task = {}

    for task_id, start_time, end_time in window_rows:
        windows_by_task.setdefault(task_id, []).append(
            TimeWindow(
                start=start_time,
                end=end_time,
            )
        )

    return [
        MaintenanceTask(
            task_id=row[0],
            asset_id=row[1],
            section=row[2],
            duration=row[3],
            priority=row[4],
            asset_type=row[5] or "unknown",
            available_windows=windows_by_task.get(row[0], []),
        )
        for row in task_rows
    ]


def load_all_from_db():
    return {
        "trains": load_trains_from_db(),
        "assets": load_assets_from_db(),
        "maintenance_tasks": load_tasks_from_db(),
    }


if __name__ == "__main__":
    data = load_all_from_db()

    print("==============================================")
    print("       RAILGENIE DATABASE DATA LOADER")
    print("==============================================")
    print()

    print(f"Loaded trains: {len(data['trains'])}")
    print(f"Loaded assets: {len(data['assets'])}")
    print(f"Loaded maintenance tasks: {len(data['maintenance_tasks'])}")

    print()
    print("Trains:")

    for train in data["trains"]:
        print(
            f"{train.train_id} | "
            f"{train.section} | "
            f"{train.arrival} → "
            f"{train.departure}"
        )

    print()
    print("Maintenance tasks:")

    for task in data["maintenance_tasks"]:
        windows = ", ".join(
            f"{w.start}→{w.end}"
            for w in task.available_windows
        )

        print(
            f"{task.task_id} | "
            f"{task.asset_id} | "
            f"{task.section} | "
            f"{task.duration} min | "
            f"{task.priority} | "
            f"windows: {windows}"
        )

    print()
    print("✅ DATABASE DATA LOADER TEST PASSED")