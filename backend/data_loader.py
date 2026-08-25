import json
from pathlib import Path
from typing import List

from models import (
    MaintenanceTask,
    TrainMovement,
    TimeWindow,
)


# ---------------------------------------------------------
# Data directory
# ---------------------------------------------------------

DATA_DIR = Path(__file__).resolve().parent / "data"


# ---------------------------------------------------------
# Generic JSON loader
# ---------------------------------------------------------

def load_json(filename: str):
    """
    Load a JSON file from backend/data/.
    """

    file_path = DATA_DIR / filename

    if not file_path.exists():
        raise FileNotFoundError(
            f"Data file not found: {file_path}"
        )

    with open(
        file_path,
        "r",
        encoding="utf-8",
    ) as file:

        return json.load(file)


# ---------------------------------------------------------
# Load trains
# ---------------------------------------------------------

def load_trains() -> List[TrainMovement]:
    """
    Load train movements from trains.json
    and convert them to TrainMovement models.
    """

    data = load_json("trains.json")

    return [
        TrainMovement(
            train_id=item["train_id"],
            section=item["section"],
            arrival=item["arrival"],
            departure=item["departure"],
            priority=item.get(
                "priority",
                "normal",
            ),
        )
        for item in data
    ]


# ---------------------------------------------------------
# Load maintenance tasks
# ---------------------------------------------------------

def load_maintenance_tasks() -> List[MaintenanceTask]:
    """
    Load maintenance tasks from maintenance_tasks.json
    and convert them to MaintenanceTask models.
    """

    data = load_json(
        "maintenance_tasks.json"
    )

    tasks = []

    for item in data:

        windows = [
            TimeWindow(
                start=window["start"],
                end=window["end"],
            )
            for window in item.get(
                "available_windows",
                [],
            )
        ]

        task = MaintenanceTask(
            task_id=item["task_id"],
            asset_id=item["asset_id"],
            asset_type=item["asset_type"],
            section=item["section"],
            duration=item["duration"],
            priority=item.get(
                "priority",
                "medium",
            ),
            available_windows=windows,
            preferred_start=item.get(
                "preferred_start"
            ),
        )

        tasks.append(task)

    return tasks


# ---------------------------------------------------------
# Load assets
# ---------------------------------------------------------

def load_assets():
    """
    Load railway assets from assets.json.

    Assets are currently returned as dictionaries because
    we don't have an Asset Pydantic model yet.
    """

    return load_json("assets.json")


# ---------------------------------------------------------
# Find a specific asset
# ---------------------------------------------------------

def get_asset(asset_id: str):
    """
    Return one asset by asset_id.
    """

    assets = load_assets()

    for asset in assets:

        if asset["asset_id"] == asset_id:
            return asset

    return None


# ---------------------------------------------------------
# Find a specific maintenance task
# ---------------------------------------------------------

def get_maintenance_task(task_id: str):
    """
    Return one maintenance task by task_id.
    """

    tasks = load_maintenance_tasks()

    for task in tasks:

        if task.task_id == task_id:
            return task

    return None


# ---------------------------------------------------------
# Find trains by section
# ---------------------------------------------------------

def get_trains_by_section(
    section: str,
) -> List[TrainMovement]:
    """
    Return all trains operating on a section.
    """

    trains = load_trains()

    return [
        train
        for train in trains
        if train.section == section
    ]


# ---------------------------------------------------------
# Simple test
# ---------------------------------------------------------

if __name__ == "__main__":

    print()
    print("==============================================")
    print("          RAILGENIE DATA LOADER")
    print("==============================================")
    print()

    trains = load_trains()

    print(
        f"Loaded trains: {len(trains)}"
    )

    for train in trains:

        print(
            f"{train.train_id} | "
            f"{train.section} | "
            f"{train.arrival} → "
            f"{train.departure}"
        )

    print()

    tasks = load_maintenance_tasks()

    print(
        f"Loaded maintenance tasks: {len(tasks)}"
    )

    for task in tasks:

        print(
            f"{task.task_id} | "
            f"{task.asset_id} | "
            f"{task.section} | "
            f"{task.duration} min | "
            f"{task.priority}"
        )

    print()

    assets = load_assets()

    print(
        f"Loaded assets: {len(assets)}"
    )

    print()
    print("✅ DATA LOADER TEST PASSED")
    print()