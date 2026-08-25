from pydantic import BaseModel, Field
from typing import List, Optional


class TimeWindow(BaseModel):
    start: int = Field(..., ge=0, le=1439)
    end: int = Field(..., ge=0, le=1439)

    def duration(self) -> int:
        return self.end - self.start


class TrainMovement(BaseModel):
    train_id: str
    section: str

    # Minutes from midnight
    arrival: int = Field(..., ge=0, le=1439)
    departure: int = Field(..., ge=0, le=1439)

    priority: str = "normal"


class MaintenanceTask(BaseModel):
    task_id: str
    asset_id: str
    asset_type: str

    section: str

    duration: int = Field(..., gt=0)
    priority: str = "medium"

    available_windows: List[TimeWindow] = []

    # Optional preferred start time
    preferred_start: Optional[int] = None


class OptimizationRequest(BaseModel):
    planning_date: str

    maintenance_tasks: List[MaintenanceTask]

    train_movements: List[TrainMovement]

    planning_start: int = Field(
        default=0,
        ge=0,
        le=1439
    )

    planning_end: int = Field(
        default=1439,
        ge=0,
        le=1439
    )

    # ---------------------------------------------------------
    # Safety buffers around train movements
    # ---------------------------------------------------------
    #
    # Example:
    #
    # Train: 02:10 → 02:25
    #
    # before = 10 minutes
    # after  = 10 minutes
    #
    # Protected interval:
    # 02:00 → 02:35
    # ---------------------------------------------------------

    safety_buffer_before: int = Field(
        default=10,
        ge=0,
        le=120
    )

    safety_buffer_after: int = Field(
        default=10,
        ge=0,
        le=120
    )