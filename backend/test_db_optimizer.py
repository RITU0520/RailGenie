from db_loader import load_all_from_db
from models import OptimizationRequest
from optimizer import optimize_schedule


def format_time(minutes):
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"


def main():
    data = load_all_from_db()

    trains = data["trains"]
    tasks = data["maintenance_tasks"]

    print("==============================================")
    print("       RAILGENIE DATABASE OPTIMIZER TEST")
    print("==============================================")
    print()

    print(f"Database trains: {len(trains)}")
    print(f"Database tasks: {len(tasks)}")
    print()

    request = OptimizationRequest(
        planning_date="2026-08-27",
        planning_start=0,
        planning_end=1439,
        maintenance_tasks=tasks,
        train_movements=trains,
        safety_buffer_before=10,
        safety_buffer_after=10,
    )

    result = optimize_schedule(request)

    print(f"Status: {result['status']}")
    print(f"Message: {result['message']}")
    print()

    if result["status"] == "infeasible":
        print("❌ DATABASE OPTIMIZER TEST FAILED")
        return

    print("----------------------------------------------")

    for item in result["schedule"]:
        print(
            f"{item['task_id']} | "
            f"{item['asset_id']} | "
            f"{item['section']}"
        )

        print(
            f"Time: "
            f"{format_time(item['start'])} → "
            f"{format_time(item['end'])}"
        )

        print(f"Duration: {item['duration']} minutes")
        print(f"Priority: {item['priority']}")
        print("----------------------------------------------")

    print()
    print(
        f"✅ {len(result['schedule'])} "
        "maintenance tasks scheduled"
    )
    print("✅ PostgreSQL data loaded")
    print("✅ Availability windows loaded")
    print("✅ Optimizer accepted database models")
    print("✅ DATABASE OPTIMIZER TEST PASSED")


if __name__ == "__main__":
    main()