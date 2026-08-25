from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from models import OptimizationRequest
from optimizer import optimize_schedule
from scoring import calculate_schedule_score

from data_loader import (
    load_trains,
    load_assets,
    load_maintenance_tasks,
    get_asset,
    get_maintenance_task,
    get_trains_by_section,
)

from scenario import build_scenario, scenario_summary
from diagnostics import diagnose_schedule


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(
    title="RailGenie API",
    description=(
        "Railway maintenance block planning, "
        "optimization and what-if simulation API."
    ),
    version="0.3.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# SIMULATION REQUEST MODEL
# =========================================================

class SimulationRequest(BaseModel):
    train_id: Optional[str] = None

    train_delay: int = Field(
        default=0,
        ge=0,
    )

    task_id: Optional[str] = None

    new_duration: Optional[int] = Field(
        default=None,
        gt=0,
    )

    new_priority: Optional[str] = None

    safety_buffer_before: int = Field(
        default=10,
        ge=0,
    )

    safety_buffer_after: int = Field(
        default=10,
        ge=0,
    )

    planning_start: int = Field(
        default=0,
        ge=0,
    )

    planning_end: int = Field(
        default=1439,
        ge=1,
    )

    planning_date: str = "2026-08-27"


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "name": "RailGenie API",
        "status": "running",
        "version": "0.3.0",
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "railgenie-backend",
    }


# =========================================================
# TRAINS
# =========================================================

@app.get("/api/trains")
def get_trains():

    trains = load_trains()

    return {
        "count": len(trains),
        "trains": [
            train.model_dump()
            for train in trains
        ],
    }


@app.get("/api/trains/section/{section}")
def get_section_trains(
    section: str,
):

    trains = get_trains_by_section(
        section
    )

    return {
        "section": section,
        "count": len(trains),
        "trains": [
            train.model_dump()
            for train in trains
        ],
    }


# =========================================================
# ASSETS
# =========================================================

@app.get("/api/assets")
def get_assets():

    assets = load_assets()

    return {
        "count": len(assets),
        "assets": assets,
    }


@app.get("/api/assets/{asset_id}")
def get_asset_details(
    asset_id: str,
):

    asset = get_asset(
        asset_id
    )

    if asset is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Asset {asset_id} "
                "not found."
            ),
        )

    return asset


# =========================================================
# MAINTENANCE TASKS
# =========================================================

@app.get("/api/maintenance-tasks")
def get_maintenance_tasks():

    tasks = load_maintenance_tasks()

    return {
        "count": len(tasks),
        "tasks": [
            task.model_dump()
            for task in tasks
        ],
    }


@app.get(
    "/api/maintenance-tasks/{task_id}"
)
def get_task_details(
    task_id: str,
):

    task = get_maintenance_task(
        task_id
    )

    if task is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Maintenance task "
                f"{task_id} not found."
            ),
        )

    return task.model_dump()


# =========================================================
# OPTIMIZATION
# =========================================================

@app.post("/api/optimize")
def optimize(
    request: OptimizationRequest,
):

    result = optimize_schedule(
        request
    )

    if result["status"] == "infeasible":

        raise HTTPException(
            status_code=422,
            detail=result,
        )

    score = calculate_schedule_score(
        schedule=result["schedule"],
        train_movements=(
            request.train_movements
        ),
        safety_buffer_before=(
            request.safety_buffer_before
        ),
        safety_buffer_after=(
            request.safety_buffer_after
        ),
    )

    return {
        "status": result["status"],
        "message": result["message"],
        "schedule": result["schedule"],
        "score": score,
    }


# =========================================================
# WHAT-IF SIMULATOR
# =========================================================

@app.post("/api/simulate")
def simulate(
    request: SimulationRequest,
):

    # -----------------------------------------------------
    # Load baseline data
    # -----------------------------------------------------

    baseline_trains = load_trains()
    baseline_tasks = load_maintenance_tasks()

    # -----------------------------------------------------
    # Validate train
    # -----------------------------------------------------

    if request.train_id:

        train_exists = any(
            train.train_id == request.train_id
            for train in baseline_trains
        )

        if not train_exists:

            raise HTTPException(
                status_code=404,
                detail=(
                    f"Train "
                    f"{request.train_id} "
                    "not found."
                ),
            )

    # -----------------------------------------------------
    # Validate task
    # -----------------------------------------------------

    if request.task_id:

        task_exists = any(
            task.task_id == request.task_id
            for task in baseline_tasks
        )

        if not task_exists:

            raise HTTPException(
                status_code=404,
                detail=(
                    f"Maintenance task "
                    f"{request.task_id} "
                    "not found."
                ),
            )

    # -----------------------------------------------------
    # Validate planning window
    # -----------------------------------------------------

    if (
        request.planning_end
        <= request.planning_start
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "planning_end must be "
                "greater than planning_start."
            ),
        )

    # -----------------------------------------------------
    # Build modified scenario
    # -----------------------------------------------------

    try:

        scenario = build_scenario(
            tasks=baseline_tasks,
            trains=baseline_trains,

            train_id=request.train_id,

            train_delay=request.train_delay,

            task_id=request.task_id,

            new_duration=request.new_duration,

            new_priority=request.new_priority,

            safety_buffer_before=(
                request.safety_buffer_before
            ),

            safety_buffer_after=(
                request.safety_buffer_after
            ),
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    # -----------------------------------------------------
    # Build optimization request
    # -----------------------------------------------------

    optimization_request = OptimizationRequest(
        planning_date=request.planning_date,

        planning_start=request.planning_start,

        planning_end=request.planning_end,

        maintenance_tasks=(
            scenario["tasks"]
        ),

        train_movements=(
            scenario["trains"]
        ),

        safety_buffer_before=(
            scenario["safety_buffer_before"]
        ),

        safety_buffer_after=(
            scenario["safety_buffer_after"]
        ),
    )

    # -----------------------------------------------------
    # Run optimizer
    # -----------------------------------------------------

    result = optimize_schedule(
        optimization_request
    )

    # -----------------------------------------------------
    # INFEASIBLE SCENARIO
    # -----------------------------------------------------

    if result["status"] == "infeasible":

        diagnostics = diagnose_schedule(
            tasks=scenario["tasks"],
            trains=scenario["trains"],
            safety_buffer_before=(
                scenario["safety_buffer_before"]
            ),
            safety_buffer_after=(
                scenario["safety_buffer_after"]
            ),
        )

        return {
            "status": "infeasible",

            "message": (
                "No feasible schedule "
                "was found for this scenario."
            ),

            "changes": scenario_summary(
                baseline_trains,
                scenario["trains"],
                baseline_tasks,
                scenario["tasks"],
            ),

            "diagnostics": diagnostics,

            "baseline": {
                "train_count": len(
                    baseline_trains
                ),
                "task_count": len(
                    baseline_tasks
                ),
            },

            "scenario": {
                "train_count": len(
                    scenario["trains"]
                ),
                "task_count": len(
                    scenario["tasks"]
                ),
            },
        }

    # -----------------------------------------------------
    # Score scenario
    # -----------------------------------------------------

    score = calculate_schedule_score(
        schedule=result["schedule"],

        train_movements=(
            scenario["trains"]
        ),

        safety_buffer_before=(
            scenario["safety_buffer_before"]
        ),

        safety_buffer_after=(
            scenario["safety_buffer_after"]
        ),
    )

    # -----------------------------------------------------
    # Return simulation result
    # -----------------------------------------------------

    return {
        "status": result["status"],

        "message": (
            "What-if scenario "
            "optimized successfully."
        ),

        "changes": scenario_summary(
            baseline_trains,
            scenario["trains"],
            baseline_tasks,
            scenario["tasks"],
        ),

        "schedule": result["schedule"],

        "score": score,

        "scenario": {
            "train_id": request.train_id,

            "train_delay": request.train_delay,

            "task_id": request.task_id,

            "new_duration": request.new_duration,

            "new_priority": request.new_priority,

            "safety_buffer_before": (
                request.safety_buffer_before
            ),

            "safety_buffer_after": (
                request.safety_buffer_after
            ),
        },
    }