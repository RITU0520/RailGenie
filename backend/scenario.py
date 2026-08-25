from copy import deepcopy
from typing import List, Optional

from models import (
    MaintenanceTask,
    TrainMovement,
)


# =========================================================
# TRAIN DELAY
# =========================================================

def apply_train_delay(
    trains: List[TrainMovement],
    train_id: str,
    delay_minutes: int,
) -> List[TrainMovement]:
    """
    Apply a delay to one train.

    Both arrival and departure are shifted by the
    requested number of minutes.
    """

    if delay_minutes < 0:
        raise ValueError(
            "Delay cannot be negative."
        )

    updated_trains = deepcopy(trains)

    found = False

    for train in updated_trains:

        if train.train_id == train_id:

            train.arrival += delay_minutes
            train.departure += delay_minutes

            found = True
            break

    if not found:
        raise ValueError(
            f"Train {train_id} not found."
        )

    return updated_trains


# =========================================================
# MAINTENANCE DURATION CHANGE
# =========================================================

def apply_duration_change(
    tasks: List[MaintenanceTask],
    task_id: str,
    duration: int,
) -> List[MaintenanceTask]:
    """
    Change the duration of one maintenance task.
    """

    if duration <= 0:
        raise ValueError(
            "Maintenance duration must be greater than zero."
        )

    updated_tasks = deepcopy(tasks)

    found = False

    for task in updated_tasks:

        if task.task_id == task_id:

            task.duration = duration

            found = True
            break

    if not found:
        raise ValueError(
            f"Maintenance task {task_id} not found."
        )

    return updated_tasks


# =========================================================
# PRIORITY CHANGE
# =========================================================

def apply_priority_change(
    tasks: List[MaintenanceTask],
    task_id: str,
    priority: str,
) -> List[MaintenanceTask]:
    """
    Change the priority of one maintenance task.
    """

    allowed_priorities = {
        "critical",
        "high",
        "medium",
        "low",
    }

    normalized_priority = priority.lower()

    if normalized_priority not in allowed_priorities:
        raise ValueError(
            "Priority must be one of: "
            "critical, high, medium, low."
        )

    updated_tasks = deepcopy(tasks)

    found = False

    for task in updated_tasks:

        if task.task_id == task_id:

            task.priority = normalized_priority

            found = True
            break

    if not found:
        raise ValueError(
            f"Maintenance task {task_id} not found."
        )

    return updated_tasks


# =========================================================
# SAFETY BUFFER VALIDATION
# =========================================================

def validate_safety_buffers(
    before: int,
    after: int,
) -> None:
    """
    Validate safety-buffer values before running
    a simulation.
    """

    if before < 0:
        raise ValueError(
            "Safety buffer before train cannot be negative."
        )

    if after < 0:
        raise ValueError(
            "Safety buffer after train cannot be negative."
        )


# =========================================================
# BUILD SCENARIO
# =========================================================

def build_scenario(
    tasks: List[MaintenanceTask],
    trains: List[TrainMovement],
    train_id: Optional[str] = None,
    train_delay: int = 0,
    task_id: Optional[str] = None,
    new_duration: Optional[int] = None,
    new_priority: Optional[str] = None,
    safety_buffer_before: int = 10,
    safety_buffer_after: int = 10,
):
    """
    Create a modified scenario without changing the
    original backend data.

    This is important because every simulation should
    start from the original baseline data.
    """

    validate_safety_buffers(
        safety_buffer_before,
        safety_buffer_after,
    )

    scenario_tasks = deepcopy(tasks)
    scenario_trains = deepcopy(trains)

    # -----------------------------------------------------
    # Train delay
    # -----------------------------------------------------

    if train_id and train_delay > 0:

        scenario_trains = apply_train_delay(
            scenario_trains,
            train_id,
            train_delay,
        )

    # -----------------------------------------------------
    # Duration change
    # -----------------------------------------------------

    if task_id and new_duration is not None:

        scenario_tasks = apply_duration_change(
            scenario_tasks,
            task_id,
            new_duration,
        )

    # -----------------------------------------------------
    # Priority change
    # -----------------------------------------------------

    if task_id and new_priority:

        scenario_tasks = apply_priority_change(
            scenario_tasks,
            task_id,
            new_priority,
        )

    return {
        "tasks": scenario_tasks,
        "trains": scenario_trains,
        "safety_buffer_before": safety_buffer_before,
        "safety_buffer_after": safety_buffer_after,
    }


# =========================================================
# SCENARIO SUMMARY
# =========================================================

def scenario_summary(
    baseline_trains: List[TrainMovement],
    scenario_trains: List[TrainMovement],
    baseline_tasks: List[MaintenanceTask],
    scenario_tasks: List[MaintenanceTask],
):
    """
    Return a simple description of what changed.
    """

    changes = []

    # -----------------------------------------------------
    # Train changes
    # -----------------------------------------------------

    baseline_train_map = {
        train.train_id: train
        for train in baseline_trains
    }

    scenario_train_map = {
        train.train_id: train
        for train in scenario_trains
    }

    for train_id, baseline in baseline_train_map.items():

        scenario = scenario_train_map.get(
            train_id
        )

        if not scenario:
            continue

        arrival_change = (
            scenario.arrival -
            baseline.arrival
        )

        departure_change = (
            scenario.departure -
            baseline.departure
        )

        if (
            arrival_change != 0
            or departure_change != 0
        ):
            changes.append({
                "type": "train_delay",
                "train_id": train_id,
                "arrival_change": arrival_change,
                "departure_change": departure_change,
            })

    # -----------------------------------------------------
    # Maintenance changes
    # -----------------------------------------------------

    baseline_task_map = {
        task.task_id: task
        for task in baseline_tasks
    }

    scenario_task_map = {
        task.task_id: task
        for task in scenario_tasks
    }

    for task_id, baseline in baseline_task_map.items():

        scenario = scenario_task_map.get(
            task_id
        )

        if not scenario:
            continue

        if (
            scenario.duration !=
            baseline.duration
        ):
            changes.append({
                "type": "duration_change",
                "task_id": task_id,
                "old_duration": baseline.duration,
                "new_duration": scenario.duration,
            })

        if (
            scenario.priority !=
            baseline.priority
        ):
            changes.append({
                "type": "priority_change",
                "task_id": task_id,
                "old_priority": baseline.priority,
                "new_priority": scenario.priority,
            })

    return changes


# =========================================================
# SIMPLE TEST
# =========================================================

if __name__ == "__main__":

    from data_loader import (
        load_trains,
        load_maintenance_tasks,
    )

    print()
    print("==============================================")
    print("          RAILGENIE SCENARIO TEST")
    print("==============================================")
    print()

    baseline_trains = load_trains()
    baseline_tasks = load_maintenance_tasks()

    # -----------------------------------------------------
    # Example scenario:
    #
    # Train 12001 delayed by 20 minutes
    # M001 duration changed from 120 → 150
    # -----------------------------------------------------

    scenario = build_scenario(
        tasks=baseline_tasks,
        trains=baseline_trains,
        train_id="12001",
        train_delay=20,
        task_id="M001",
        new_duration=150,
        new_priority="critical",
        safety_buffer_before=10,
        safety_buffer_after=10,
    )

    changes = scenario_summary(
        baseline_trains=baseline_trains,
        scenario_trains=scenario["trains"],
        baseline_tasks=baseline_tasks,
        scenario_tasks=scenario["tasks"],
    )

    print(
        f"Baseline trains: "
        f"{len(baseline_trains)}"
    )

    print(
        f"Baseline tasks: "
        f"{len(baseline_tasks)}"
    )

    print()

    print("Scenario changes:")

    for change in changes:
        print(change)

    print()

    delayed_train = next(
        train
        for train in scenario["trains"]
        if train.train_id == "12001"
    )

    changed_task = next(
        task
        for task in scenario["tasks"]
        if task.task_id == "M001"
    )

    print(
        "Train 12001:"
    )

    print(
        f"  {delayed_train.arrival}"
        f" → "
        f"{delayed_train.departure}"
    )

    print()

    print(
        "M001 duration:"
    )

    print(
        f"  {changed_task.duration} minutes"
    )

    print()

    print(
        "Safety buffer:"
    )

    print(
        f"  Before: "
        f"{scenario['safety_buffer_before']} min"
    )

    print(
        f"  After: "
        f"{scenario['safety_buffer_after']} min"
    )

    print()
    print("✅ SCENARIO TEST PASSED")
    print()