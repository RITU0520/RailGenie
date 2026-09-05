import json
from pathlib import Path

from database import get_connection


DATA_DIR = Path(__file__).parent / "data"


def load_json(filename):
    with open(DATA_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)


def migrate():
    trains = load_json("trains.json")
    assets = load_json("assets.json")
    tasks = load_json("maintenance_tasks.json")

    with get_connection() as conn:
        with conn.cursor() as cur:

            # Clear existing imported data
            cur.execute("DELETE FROM schedule_items")
            cur.execute("DELETE FROM schedule_runs")
            cur.execute("DELETE FROM maintenance_windows")
            cur.execute("DELETE FROM maintenance_tasks")
            cur.execute("DELETE FROM assets")
            cur.execute("DELETE FROM trains")

            # -------------------------------------------------
            # Trains
            # -------------------------------------------------

            for train in trains:
                cur.execute(
                    """
                    INSERT INTO trains
                        (train_id, train_name, section, arrival, departure, data_source)
                    VALUES
                        (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (train_id) DO NOTHING
                    """,
                    (
                        str(train["train_id"]),
                        train.get("train_name"),
                        train["section"],
                        train["arrival"],
                        train["departure"],
                        "seed",
                    ),
                )

            # -------------------------------------------------
            # Assets
            # -------------------------------------------------

            for asset in assets:
                cur.execute(
                    """
                    INSERT INTO assets
                        (asset_id, asset_type, section)
                    VALUES
                        (%s, %s, %s)
                    ON CONFLICT (asset_id) DO NOTHING
                    """,
                    (
                        asset["asset_id"],
                        asset.get("asset_type"),
                        asset["section"],
                    ),
                )

            # -------------------------------------------------
            # Maintenance tasks
            # -------------------------------------------------

            window_count = 0

            for task in tasks:

                cur.execute(
                    """
                    INSERT INTO maintenance_tasks
                        (
                            task_id,
                            asset_id,
                            section,
                            duration,
                            priority,
                            preferred_start
                        )
                    VALUES
                        (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (task_id)
                    DO UPDATE SET
                        asset_id = EXCLUDED.asset_id,
                        section = EXCLUDED.section,
                        duration = EXCLUDED.duration,
                        priority = EXCLUDED.priority,
                        preferred_start = EXCLUDED.preferred_start
                    """,
                    (
                        task["task_id"],
                        task["asset_id"],
                        task["section"],
                        task["duration"],
                        task["priority"],
                        task.get("preferred_start"),
                    ),
                )

                # -------------------------------------------------
                # Maintenance availability windows
                # -------------------------------------------------

                for window in task.get(
                    "available_windows",
                    []
                ):
                    cur.execute(
                        """
                        INSERT INTO maintenance_windows
                            (
                                task_id,
                                start_time,
                                end_time
                            )
                        VALUES
                            (%s, %s, %s)
                        """,
                        (
                            task["task_id"],
                            window["start"],
                            window["end"],
                        ),
                    )

                    window_count += 1

        conn.commit()

    print("==============================================")
    print("       RAILGENIE DATA MIGRATION")
    print("==============================================")
    print()

    print(f"Trains migrated: {len(trains)}")
    print(f"Assets migrated: {len(assets)}")
    print(f"Maintenance tasks migrated: {len(tasks)}")
    print(f"Maintenance windows migrated: {window_count}")

    print()
    print("✅ JSON → PostgreSQL migration PASSED")


if __name__ == "__main__":
    migrate()