from models import (
    MaintenanceTask,
    TrainMovement,
    TimeWindow,
)


task = MaintenanceTask(
    task_id="M001",
    asset_id="T-102",
    asset_type="Track",
    section="S1",
    duration=120,
    priority="critical",
    available_windows=[
        TimeWindow(
            start=0,
            end=360
        )
    ]
)


train = TrainMovement(
    train_id="12001",
    section="S1",
    arrival=130,
    departure=145
)


print("Maintenance Task:")
print(task)

print("\nTrain Movement:")
print(train)