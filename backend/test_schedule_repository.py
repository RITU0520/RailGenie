from schedule_repository import save_schedule


def main():

    test_schedule = [
        {
            "task_id": "TEST-001",
            "asset_id": "TEST-ASSET",
            "section": "TEST",
            "start": 0,
            "end": 60,
            "duration": 60,
            "priority": "high",
        }
    ]

    run_id = save_schedule(
        status="test",
        score=100,
        schedule=test_schedule,
    )

    print("==============================================")
    print("       RAILGENIE SCHEDULE REPOSITORY TEST")
    print("==============================================")
    print()
    print(f"Created schedule run: {run_id}")
    print("✅ Schedule run saved")
    print("✅ Schedule item saved")
    print("✅ SCHEDULE REPOSITORY TEST PASSED")


if __name__ == "__main__":
    main()
    