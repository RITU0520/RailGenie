from models import (
    OptimizationRequest,
    MaintenanceTask,
    TrainMovement,
    TimeWindow,
)

from optimizer import optimize_schedule


def minutes(hour, minute=0):
    return hour * 60 + minute


request = OptimizationRequest(

    planning_date="2026-08-27",

    planning_start=minutes(2),

    planning_end=minutes(5),

    maintenance_tasks=[

        MaintenanceTask(
            task_id="M001",
            asset_id="T-102",
            asset_type="Track",
            section="S1",
            duration=60,
            priority="critical",

            available_windows=[
                TimeWindow(
                    start=minutes(2),
                    end=minutes(5),
                )
            ],
        )
    ],

    train_movements=[

        TrainMovement(
            train_id="12001",
            section="S1",
            arrival=minutes(2, 10),
            departure=minutes(2, 25),
            priority="normal",
        )
    ],

    safety_buffer_before=10,
    safety_buffer_after=10,
)


# ---------------------------------------------------------
# Run optimizer
# ---------------------------------------------------------

result = optimize_schedule(request)


print()
print("==============================================")
print("      RAILGENIE STRONG SAFETY BUFFER TEST")
print("==============================================")
print()

print("Status:", result["status"])
print("Message:", result.get("message", ""))
print()


assert result["status"] in (
    "optimal",
    "feasible",
), "❌ No feasible schedule found."


assert len(result["schedule"]) == 1, (
    "❌ Expected one maintenance task."
)


task = result["schedule"][0]


start = task["start"]
end = task["end"]


print(
    "Maintenance:",
    f"{start // 60:02d}:{start % 60:02d}",
    "→",
    f"{end // 60:02d}:{end % 60:02d}",
)


# ---------------------------------------------------------
# Protected train interval
# ---------------------------------------------------------

train_arrival = minutes(2, 10)
train_departure = minutes(2, 25)

buffer_before = 10
buffer_after = 10

protected_start = (
    train_arrival - buffer_before
)

protected_end = (
    train_departure + buffer_after
)


print(
    "Protected:",
    f"{protected_start // 60:02d}:"
    f"{protected_start % 60:02d}",
    "→",
    f"{protected_end // 60:02d}:"
    f"{protected_end % 60:02d}",
)


# ---------------------------------------------------------
# Verify maintenance does not overlap protected interval
# ---------------------------------------------------------

no_conflict = (
    end <= protected_start
    or start >= protected_end
)


assert no_conflict, (
    "❌ Maintenance overlaps the protected "
    "train interval."
)


# ---------------------------------------------------------
# Strong assertion
# ---------------------------------------------------------
#
# Because the maintenance is only available from 02:00
# and the protected interval ends at 02:35, the earliest
# valid 60-minute block is:
#
# 02:35 → 03:35
#
# ---------------------------------------------------------

assert start == protected_end, (
    "❌ Optimizer did not move maintenance "
    "to the first slot after the safety buffer."
)


assert end == protected_end + 60, (
    "❌ Maintenance duration is incorrect."
)


print()
print("==============================================")
print("✅ Protected interval respected")
print("✅ Maintenance starts after buffer")
print("✅ Earliest safe slot selected")
print("✅ Strong safety-buffer test PASSED")
print("==============================================")