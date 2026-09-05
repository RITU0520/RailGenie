from pydantic import BaseModel, Field
from typing import List, Optional


# =========================================================
# TIME WINDOW
# =========================================================

class TimeWindow(BaseModel):
    start: int = Field(..., ge=0, le=1439)
    end: int = Field(..., ge=0, le=1439)

    def duration(self) -> int:
        return self.end - self.start


# =========================================================
# TRAIN MOVEMENT
# =========================================================

class TrainMovement(BaseModel):
    train_id: str
    section: str

    # Optional live / enriched train information
    train_name: Optional[str] = None
    status: Optional[str] = None
    delay_minutes: int = 0

    current_station: Optional[str] = None
    next_station: Optional[str] = None

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed_kmh: Optional[float] = None

    last_updated: Optional[str] = None

    # PostgreSQL by default.
    # Changed to "railradar" when live data is applied.
    data_source: str = "postgresql"

    # Minutes from midnight
    arrival: int = Field(
        ...,
        ge=0,
        le=1439,
    )

    departure: int = Field(
        ...,
        ge=0,
        le=1439,
    )

    priority: str = "normal"


# =========================================================
# MAINTENANCE TASK
# =========================================================

class MaintenanceTask(BaseModel):
    task_id: str
    asset_id: str

    # PostgreSQL currently does not have asset_type.
    # Keep it optional so existing database records work.
    asset_type: Optional[str] = None

    section: str

    duration: int = Field(
        ...,
        gt=0,
    )

    priority: str = "medium"

    available_windows: List[TimeWindow] = []

    # Optional preferred start time
    preferred_start: Optional[int] = None


# =========================================================
# OPTIMIZATION REQUEST
# =========================================================

class OptimizationRequest(BaseModel):
    planning_date: str

    maintenance_tasks: List[MaintenanceTask]

    train_movements: List[TrainMovement]

    planning_start: int = Field(
        default=0,
        ge=0,
        le=1439,
    )

    planning_end: int = Field(
        default=1439,
        ge=0,
        le=1439,
    )

    # =====================================================
    # SAFETY BUFFERS
    # =====================================================
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
    #

    safety_buffer_before: int = Field(
        default=10,
        ge=0,
        le=120,
    )

    safety_buffer_after: int = Field(
        default=10,
        ge=0,
        le=120,
    )