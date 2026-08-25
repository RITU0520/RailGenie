from models import (
    OptimizationRequest,
    MaintenanceTask,
    TrainMovement,
    TimeWindow,
)

from optimizer import optimize_schedule


def minutes(h, m=0):
    return h * 60 + m


request = OptimizationRequest(
    planning_date="2026-08-27",

    planning_start=0,
    planning_end=720,  # 00:00 → 12:00

    maintenance_tasks=[
        # -------------------------------------------------
        # M001 — Critical track maintenance
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
                    end=minutes(6),
                )
            ],
        ),

        # -------------------------------------------------
        # M002 — High-priority signal maintenance
        # -------------------------------------------------
        MaintenanceTask(
            task_id="M002",
            asset_id="SG-21",
            asset_type="Signal",
            section="S1",
            duration=60,
            priority="high",
            available_windows=[
                TimeWindow(
                    start=minutes(3),
                    end=minutes(8),
                )
            ],
        ),

        # -------------------------------------------------
        # M003 — High-priority OHE maintenance
        # Different section
        # -------------------------------------------------
        MaintenanceTask(
            task_id="M003",
            asset_id="O-44",
            asset_type="OHE",
            section="S2",
            duration=45,
            priority="high",
            available_windows=[
                TimeWindow(
                    start=minutes(2),
                    end=minutes(7),
                )
            ],
        ),
    ],

    train_movements=[
        # -------------------------------------------------
        # Section S1 trains
        # -------------------------------------------------

        TrainMovement(
            train_id="12001",
            section="S1",
            arrival=minutes(2, 10),
            departure=minutes(2, 25),
            priority="normal",
        ),

        TrainMovement(
            train_id="12002",
            section="S1",
            arrival=minutes(4),
            departure=minutes(4, 20),
            priority="high",
        ),

        # -------------------------------------------------
        # Section S2 train
        # -------------------------------------------------

        TrainMovement(
            train_id="12003",
            section="S2",
            arrival=minutes(3, 30),
            departure=minutes(3, 45),
            priority="normal",
        ),
    ],
)


# ---------------------------------------------------------
# Run optimizer
# ---------------------------------------------------------

result = optimize_schedule(request)


# ---------------------------------------------------------
# Display result
# ---------------------------------------------------------

print()
print("==============================================")
print("       RAILGENIE MULTI-TASK OPTIMIZER")
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
        "Time:",
        f"{start // 60:02d}:{start % 60:02d}",
        "→",
        f"{end // 60:02d}:{end % 60:02d}",
    )

    print(
        "Duration:",
        item["duration"],
        "minutes",
    )

    print(
        "Priority:",
        item["priority"],
    )


print("----------------------------------------------")
print()


# ---------------------------------------------------------
# Automated validation
# ---------------------------------------------------------

assert result["status"] in (
    "optimal",
    "feasible",
), "❌ Optimizer failed."


schedule = result["schedule"]


assert len(schedule) == 3, (
    "❌ Expected 3 maintenance tasks."
)


# ---------------------------------------------------------
# Check each task's availability window
# ---------------------------------------------------------

windows = {
    "M001": (minutes(0), minutes(6)),
    "M002": (minutes(3), minutes(8)),
    "M003": (minutes(2), minutes(7)),
}

durations = {
    "M001": 120,
    "M002": 60,
    "M003": 45,
}


for item in schedule:

    task_id = item["task_id"]

    window_start, window_end = windows[task_id]

    assert item["start"] >= window_start, (
        f"❌ {task_id} starts before its "
        "availability window."
    )

    assert item["end"] <= window_end, (
        f"❌ {task_id} ends after its "
        "availability window."
    )

    assert item["end"] - item["start"] == durations[
        task_id
    ], (
        f"❌ {task_id} duration is incorrect."
    )


# ---------------------------------------------------------
# Check maintenance tasks do not overlap
# ---------------------------------------------------------

for i in range(len(schedule)):

    for j in range(i + 1, len(schedule)):

        first = schedule[i]
        second = schedule[j]

        # Tasks on the same section cannot overlap.
        if first["section"] != second["section"]:
            continue

        no_overlap = (
            first["end"] <= second["start"]
            or second["end"] <= first["start"]
        )

        assert no_overlap, (
            f"❌ {first['task_id']} overlaps "
            f"{second['task_id']}."
        )


# ---------------------------------------------------------
# Check train conflicts
# ---------------------------------------------------------

trains = [
    ("12001", "S1", minutes(2, 10), minutes(2, 25)),
    ("12002", "S1", minutes(4), minutes(4, 20)),
    ("12003", "S2", minutes(3, 30), minutes(3, 45)),
]


for task in schedule:

    for train_id, section, arrival, departure in trains:

        if task["section"] != section:
            continue

        no_conflict = (
            task["end"] <= arrival
            or task["start"] >= departure
        )

        assert no_conflict, (
            f"❌ {task['task_id']} conflicts "
            f"with train {train_id}."
        )


print("✅ 3 maintenance tasks scheduled")
print("✅ Availability windows respected")
print("✅ Maintenance conflicts avoided")
print("✅ Train conflicts avoided")
print("✅ MULTI-TASK TEST PASSED")