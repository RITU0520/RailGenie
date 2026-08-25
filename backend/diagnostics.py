from typing import List, Dict, Any

from models import MaintenanceTask, TrainMovement


# =========================================================
# TIME OVERLAP
# =========================================================

def intervals_overlap(
    start_a: int,
    end_a: int,
    start_b: int,
    end_b: int,
) -> bool:
    """
    Return True when two time intervals overlap.
    """

    return (
        start_a < end_b
        and start_b < end_a
    )


# =========================================================
# PROTECTED TRAIN INTERVAL
# =========================================================

def protected_train_interval(
    train: TrainMovement,
    safety_buffer_before: int,
    safety_buffer_after: int,
):
    """
    Return the protected interval around a train movement.
    """

    return (
        train.arrival - safety_buffer_before,
        train.departure + safety_buffer_after,
    )


# =========================================================
# AVAILABLE WINDOW CHECK
# =========================================================

def has_duration_in_window(
    task: MaintenanceTask,
) -> bool:
    """
    Check whether the task duration can fit inside at least
    one of its declared availability windows.
    """

    for window in task.available_windows:

        available_duration = (
            window.end - window.start
        )

        if available_duration >= task.duration:
            return True

    return False


# =========================================================
# TRAIN CONFLICT CHECK
# =========================================================

def find_train_conflicts(
    task: MaintenanceTask,
    trains: List[TrainMovement],
    safety_buffer_before: int,
    safety_buffer_after: int,
) -> List[Dict[str, Any]]:
    """
    Find train protected intervals that could prevent
    a maintenance task from being scheduled.

    This is a diagnostic helper, not an optimizer.
    """

    conflicts = []

    for train in trains:

        if train.section != task.section:
            continue

        protected_start, protected_end = (
            protected_train_interval(
                train,
                safety_buffer_before,
                safety_buffer_after,
            )
        )

        for window in task.available_windows:

            # If the protected interval consumes the whole
            # availability window, report it.
            if (
                protected_start <= window.start
                and protected_end >= window.end
            ):
                conflicts.append({
                    "train_id": train.train_id,
                    "section": train.section,
                    "protected_start": protected_start,
                    "protected_end": protected_end,
                    "window_start": window.start,
                    "window_end": window.end,
                    "reason": (
                        "Train protected interval "
                        "covers the maintenance window."
                    ),
                })

    return conflicts


# =========================================================
# SLOT ANALYSIS
# =========================================================

def calculate_safe_slots(
    task: MaintenanceTask,
    trains: List[TrainMovement],
    safety_buffer_before: int,
    safety_buffer_after: int,
) -> List[Dict[str, int]]:
    """
    Calculate safe continuous time slots for a maintenance
    task inside its availability windows.

    The function does not optimize. It only explains the
    available space.
    """

    section_trains = [
        train
        for train in trains
        if train.section == task.section
    ]

    safe_slots = []

    for window in task.available_windows:

        blocked_intervals = []

        for train in section_trains:

            protected_start, protected_end = (
                protected_train_interval(
                    train,
                    safety_buffer_before,
                    safety_buffer_after,
                )
            )

            if intervals_overlap(
                window.start,
                window.end,
                protected_start,
                protected_end,
            ):
                blocked_intervals.append(
                    (
                        max(
                            window.start,
                            protected_start,
                        ),
                        min(
                            window.end,
                            protected_end,
                        ),
                    )
                )

        blocked_intervals.sort()

        cursor = window.start

        for blocked_start, blocked_end in blocked_intervals:

            if blocked_start > cursor:

                safe_slots.append({
                    "start": cursor,
                    "end": blocked_start,
                    "duration": (
                        blocked_start - cursor
                    ),
                })

            cursor = max(
                cursor,
                blocked_end,
            )

        if cursor < window.end:

            safe_slots.append({
                "start": cursor,
                "end": window.end,
                "duration": (
                    window.end - cursor
                ),
            })

    return safe_slots


# =========================================================
# TASK DIAGNOSTIC
# =========================================================

def diagnose_task(
    task: MaintenanceTask,
    trains: List[TrainMovement],
    safety_buffer_before: int = 10,
    safety_buffer_after: int = 10,
) -> Dict[str, Any]:
    """
    Diagnose the scheduling feasibility of one task.
    """

    result = {
        "task_id": task.task_id,
        "asset_id": task.asset_id,
        "section": task.section,
        "duration": task.duration,
        "status": "unknown",
        "reason": None,
        "details": [],
        "safe_slots": [],
    }

    # -----------------------------------------------------
    # 1. Basic availability check
    # -----------------------------------------------------

    if not task.available_windows:

        result["status"] = "infeasible"

        result["reason"] = (
            "No maintenance availability "
            "window is defined for this task."
        )

        return result

    # -----------------------------------------------------
    # 2. Can duration fit in any raw window?
    # -----------------------------------------------------

    if not has_duration_in_window(task):

        result["status"] = "infeasible"

        result["reason"] = (
            f"{task.task_id} requires "
            f"{task.duration} minutes, but no "
            "availability window is long enough."
        )

        result["details"].append({
            "type": "availability",
            "required_duration": task.duration,
            "windows": [
                {
                    "start": window.start,
                    "end": window.end,
                    "duration": (
                        window.end -
                        window.start
                    ),
                }
                for window in task.available_windows
            ],
        })

        return result

    # -----------------------------------------------------
    # 3. Calculate safe slots
    # -----------------------------------------------------

    safe_slots = calculate_safe_slots(
        task=task,
        trains=trains,
        safety_buffer_before=(
            safety_buffer_before
        ),
        safety_buffer_after=(
            safety_buffer_after
        ),
    )

    result["safe_slots"] = safe_slots

    # -----------------------------------------------------
    # 4. Is there a safe slot large enough?
    # -----------------------------------------------------

    suitable_slots = [
        slot
        for slot in safe_slots
        if slot["duration"] >= task.duration
    ]

    if suitable_slots:

        result["status"] = "feasible"

        result["reason"] = (
            "At least one safe maintenance "
            "slot can accommodate the task."
        )

        result["details"].append({
            "type": "safe_slot",
            "largest_safe_slot": max(
                slot["duration"]
                for slot in safe_slots
            ),
        })

        return result

    # -----------------------------------------------------
    # 5. Safe slots exist but are too short
    # -----------------------------------------------------

    result["status"] = "infeasible"

    largest_slot = (
        max(
            (
                slot["duration"]
                for slot in safe_slots
            ),
            default=0,
        )
    )

    result["reason"] = (
        f"{task.task_id} requires "
        f"{task.duration} minutes, but no "
        f"safe slot is long enough. "
        f"The largest available safe slot "
        f"is {largest_slot} minutes."
    )

    result["details"].append({
        "type": "safety_or_train_conflict",
        "required_duration": task.duration,
        "largest_safe_slot": largest_slot,
        "safety_buffer_before": (
            safety_buffer_before
        ),
        "safety_buffer_after": (
            safety_buffer_after
        ),
    })

    result["train_conflicts"] = (
        find_train_conflicts(
            task=task,
            trains=trains,
            safety_buffer_before=(
                safety_buffer_before
            ),
            safety_buffer_after=(
                safety_buffer_after
            ),
        )
    )

    return result


# =========================================================
# SCHEDULE DIAGNOSTICS
# =========================================================

def diagnose_schedule(
    tasks: List[MaintenanceTask],
    trains: List[TrainMovement],
    safety_buffer_before: int = 10,
    safety_buffer_after: int = 10,
) -> Dict[str, Any]:
    """
    Diagnose all maintenance tasks in a scenario.
    """

    diagnostics = []

    for task in tasks:

        diagnostics.append(
            diagnose_task(
                task=task,
                trains=trains,
                safety_buffer_before=(
                    safety_buffer_before
                ),
                safety_buffer_after=(
                    safety_buffer_after
                ),
            )
        )

    infeasible_tasks = [
        item
        for item in diagnostics
        if item["status"] == "infeasible"
    ]

    return {
        "status": (
            "infeasible"
            if infeasible_tasks
            else "feasible"
        ),
        "tasks": diagnostics,
        "infeasible_tasks": [
            item["task_id"]
            for item in infeasible_tasks
        ],
    }


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
    print("       RAILGENIE DIAGNOSTICS TEST")
    print("==============================================")
    print()

    trains = load_trains()
    tasks = load_maintenance_tasks()

    # -----------------------------------------------------
    # Simulate the problematic M001 duration
    # -----------------------------------------------------

    m001 = next(
        task
        for task in tasks
        if task.task_id == "M001"
    )

    m001.duration = 150

    result = diagnose_task(
        task=m001,
        trains=trains,
        safety_buffer_before=10,
        safety_buffer_after=10,
    )

    print(
        f"Task: {result['task_id']}"
    )

    print(
        f"Duration: {result['duration']} minutes"
    )

    print(
        f"Section: {result['section']}"
    )

    print(
        f"Status: {result['status']}"
    )

    print(
        f"Reason: {result['reason']}"
    )

    print()

    print("Safe slots:")

    for slot in result["safe_slots"]:

        print(
            f"  {slot['start']} → "
            f"{slot['end']} "
            f"({slot['duration']} min)"
        )

    print()

    if result["status"] == "infeasible":

        print(
            "⚠ Diagnostic correctly detected "
            "an infeasible maintenance duration."
        )

    print()
    print("✅ DIAGNOSTICS TEST COMPLETED")
    print()