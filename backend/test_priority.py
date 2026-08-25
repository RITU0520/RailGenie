from models import (
    OptimizationRequest,
    MaintenanceTask,
    TimeWindow,
)

from optimizer import optimize_schedule


def minutes(hour, minute=0):
    return hour * 60 + minute


# ---------------------------------------------------------
# Priority scheduling test
# ---------------------------------------------------------
#
# Two maintenance tasks compete for the SAME section.
#
# M001 = Critical
# M002 = Low
#
# Both require 120 minutes.
# Both have the same availability window.
#
# RailGenie should prefer the critical task earlier.
# ---------------------------------------------------------

request = OptimizationRequest(

    planning_date="2026-08-27",

    planning_start=minutes(0),

    planning_end=minutes(8),

    maintenance_tasks=[

        # -------------------------------------------------
        # Critical task
        # -------------------------------------------------

        MaintenanceTask(
            task_id="M001",

            asset_id="T-102",

            asset_type="Track",

            section="S1",

            duration=120,

            priority="critical",

            available_windows=[
                TimeWindow(
                    start=minutes(0),
                    end=minutes(8),
                )
            ],
        ),

        # -------------------------------------------------
        # Low-priority task
        # -------------------------------------------------

        MaintenanceTask(
            task_id="M002",

            asset_id="T-118",

            asset_type="Track",

            section="S1",

            duration=120,

            priority="low",

            available_windows=[
                TimeWindow(
                    start=minutes(0),
                    end=minutes(8),
                )
            ],
        ),
    ],

    train_movements=[],
)


# ---------------------------------------------------------
# Run optimizer
# ---------------------------------------------------------

result = optimize_schedule(request)


print()
print("==============================================")
print("          RAILGENIE PRIORITY TEST")
print("==============================================")

print()
print("Status:", result["status"])
print("Message:", result.get("message", ""))

print()


for item in result["schedule"]:

    start = item["start"]
    end = item["end"]

    print("----------------------------------------------")

    print(
        f"{item['task_id']} | "
        f"{item['asset_id']} | "
        f"{item['section']}"
    )

    print(
        "Priority:",
        item["priority"]
    )

    print(
        "Time:",
        f"{start // 60:02d}:{start % 60:02d}",
        "→",
        f"{end // 60:02d}:{end % 60:02d}",
    )


print("----------------------------------------------")


# ---------------------------------------------------------
# Basic validation
# ---------------------------------------------------------

assert result["status"] in (
    "optimal",
    "feasible",
), "❌ Optimizer failed."


assert len(result["schedule"]) == 2, (
    "❌ Expected 2 scheduled tasks."
)


# ---------------------------------------------------------
# Find tasks
# ---------------------------------------------------------

critical_task = next(
    item
    for item in result["schedule"]
    if item["task_id"] == "M001"
)

low_task = next(
    item
    for item in result["schedule"]
    if item["task_id"] == "M002"
)


# ---------------------------------------------------------
# Verify same-section tasks do not overlap
# ---------------------------------------------------------

assert (
    critical_task["end"] <= low_task["start"]
    or low_task["end"] <= critical_task["start"]
), (
    "❌ Maintenance tasks overlap."
)


assert critical_task["start"] < low_task["start"], (
    "❌ Critical task was not prioritized."
)


print()
print("✅ Critical task prioritized")
print("✅ Priority-aware optimization PASSED")