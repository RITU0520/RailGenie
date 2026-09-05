from database import get_connection
from models import TrainMovement, MaintenanceTask


# =========================================================
# LOAD TRAINS
# =========================================================

def load_trains():
    """
    Load train movements from PostgreSQL.

    Actual trains table:
        id
        train_id
        section
        arrival
        departure
    """

    conn = get_connection()

    try:
        cur = conn.cursor()

        cur.execute(
            """
            SELECT
                train_id,
                section,
                arrival,
                departure
            FROM trains
            ORDER BY arrival, train_id
            """
        )

        rows = cur.fetchall()

        trains = []

        for row in rows:
            train_id, section, arrival, departure = row

            trains.append(
                TrainMovement(
                    train_id=str(train_id),
                    section=str(section),
                    arrival=int(arrival),
                    departure=int(departure),
                    data_source="postgresql",
                )
            )

        return trains

    finally:
        conn.close()


# =========================================================
# LOAD MAINTENANCE TASKS
# =========================================================

def load_maintenance_tasks():
    """
    Load maintenance tasks from PostgreSQL.

    Actual maintenance_tasks table:
        id
        task_id
        asset_id
        section
        duration
        priority
        preferred_start
    """

    conn = get_connection()

    try:
        cur = conn.cursor()

        cur.execute(
            """
            SELECT
                task_id,
                asset_id,
                section,
                duration,
                priority,
                preferred_start
            FROM maintenance_tasks
            ORDER BY
                CASE priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                    ELSE 5
                END,
                preferred_start NULLS LAST,
                task_id
            """
        )

        rows = cur.fetchall()

        tasks = []

        for row in rows:
            (
                task_id,
                asset_id,
                section,
                duration,
                priority,
                preferred_start,
            ) = row

            tasks.append(
                MaintenanceTask(
                    task_id=str(task_id),
                    asset_id=str(asset_id),
                    asset_type=None,
                    section=str(section),
                    duration=int(duration),
                    priority=str(priority),
                    preferred_start=(
                        int(preferred_start)
                        if preferred_start is not None
                        else None
                    ),
                )
            )

        return tasks

    finally:
        conn.close()


# =========================================================
# LOAD ALL DATABASE DATA
# =========================================================

def load_all_from_db():
    """
    Load the core RailGenie data from PostgreSQL.
    """

    return {
        "trains": load_trains(),
        "maintenance_tasks": load_maintenance_tasks(),
    }