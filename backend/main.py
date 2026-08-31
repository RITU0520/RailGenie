from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from models import OptimizationRequest
from optimizer import optimize_schedule
from scoring import calculate_schedule_score
from schedule_repository import save_schedule, get_latest_schedule
from analytics_repository import get_analytics
from db_loader import load_all_from_db
from assistant import parse_planning_request

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
    version="0.4.0",
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

class ApplyScheduleRequest(BaseModel):
    status: str
    score: float
    schedule: list[dict]

# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "name": "RailGenie API",
        "status": "running",
        "version": "0.4.0",
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
# DATABASE HEALTH
# =========================================================

@app.get("/api/database/health")
def database_health():

    try:
        data = load_all_from_db()

        return {
            "status": "connected",
            "database": "railgenie",
            "trains": len(data["trains"]),
            "assets": len(data["assets"]),
            "maintenance_tasks": len(
                data["maintenance_tasks"]
            ),
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e),
        }


# =========================================================
# TRAINS
# =========================================================

@app.get("/api/trains")
def get_trains():

    try:
        data = load_all_from_db()

        trains = data["trains"]

        return {
            "count": len(trains),
            "trains": [
                train.model_dump()
                for train in trains
            ],
            "data_source": "postgresql",
        }

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail={
                "message": "Unable to load trains.",
                "error": str(e),
            },
        )


# =========================================================
# TRAINS BY SECTION
# =========================================================

@app.get("/api/trains/section/{section}")
def get_section_trains(section: str):

    try:
        data = load_all_from_db()

        trains = [
            train
            for train in data["trains"]
            if train.section == section
        ]

        return {
            "section": section,
            "count": len(trains),
            "trains": [
                train.model_dump()
                for train in trains
            ],
            "data_source": "postgresql",
        }

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail={
                "message": (
                    "Unable to load trains "
                    "for section."
                ),
                "error": str(e),
            },
        )


# =========================================================
# ASSETS
# =========================================================

@app.get("/api/assets")
def get_assets():

    try:
        data = load_all_from_db()

        assets = data["assets"]

        return {
            "count": len(assets),
            "assets": assets,
            "data_source": "postgresql",
        }

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail={
                "message": "Unable to load assets.",
                "error": str(e),
            },
        )


# =========================================================
# SINGLE ASSET
# =========================================================

@app.get("/api/assets/{asset_id}")
def get_asset_details(asset_id: str):

    try:
        data = load_all_from_db()

        asset = next(
            (
                asset
                for asset in data["assets"]
                if asset["asset_id"] == asset_id
            ),
            None,
        )

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail={
                "message": "Unable to load asset.",
                "error": str(e),
            },
        )

    if asset is None:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Asset {asset_id} "
                "not found."
            ),
        )

    return {
        **asset,
        "data_source": "postgresql",
    }


# =========================================================
# MAINTENANCE TASKS
# =========================================================

@app.get("/api/maintenance-tasks")
def get_maintenance_tasks():

    try:
        data = load_all_from_db()

        tasks = data["maintenance_tasks"]

        return {
            "count": len(tasks),
            "tasks": [
                task.model_dump()
                for task in tasks
            ],
            "data_source": "postgresql",
        }

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail={
                "message": (
                    "Unable to load "
                    "maintenance tasks."
                ),
                "error": str(e),
            },
        )


# =========================================================
# SINGLE MAINTENANCE TASK
# =========================================================

@app.get("/api/maintenance-tasks/{task_id}")
def get_task_details(task_id: str):

    try:
        data = load_all_from_db()

        task = next(
            (
                task
                for task in data["maintenance_tasks"]
                if task.task_id == task_id
            ),
            None,
        )

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail={
                "message": (
                    "Unable to load "
                    "maintenance task."
                ),
                "error": str(e),
            },
        )

    if task is None:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Maintenance task "
                f"{task_id} not found."
            ),
        )

    return {
        **task.model_dump(),
        "data_source": "postgresql",
    }


# =========================================================
# ANALYTICS
# =========================================================

@app.get("/api/analytics")
def analytics():

    try:

        return {
            **get_analytics(),
            "data_source": "postgresql",
        }

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail={
                "message": "Unable to load analytics.",
                "error": str(e),
            },
        )


# =========================================================
# OPTIMIZATION
# =========================================================

@app.post("/api/optimize")
def optimize(
    request: OptimizationRequest,
):

    # -----------------------------------------------------
    # Verify PostgreSQL connection
    # -----------------------------------------------------

    try:

        db_data = load_all_from_db()

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail={
                "message": (
                    "PostgreSQL database "
                    "unavailable."
                ),
                "error": str(e),
            },
        )

    # -----------------------------------------------------
    # Validate requested tasks
    # -----------------------------------------------------

    db_tasks = {
        task.task_id
        for task in db_data["maintenance_tasks"]
    }

    missing_tasks = [
        task.task_id
        for task in request.maintenance_tasks
        if task.task_id not in db_tasks
    ]

    if missing_tasks:

        raise HTTPException(
            status_code=404,
            detail={
                "message": (
                    "One or more maintenance "
                    "tasks were not found "
                    "in PostgreSQL."
                ),
                "missing_tasks": missing_tasks,
            },
        )

    # -----------------------------------------------------
    # Validate requested trains
    # -----------------------------------------------------

    db_trains = {
        train.train_id
        for train in db_data["trains"]
    }

    missing_trains = [
        train.train_id
        for train in request.train_movements
        if train.train_id not in db_trains
    ]

    if missing_trains:

        raise HTTPException(
            status_code=404,
            detail={
                "message": (
                    "One or more trains "
                    "were not found "
                    "in PostgreSQL."
                ),
                "missing_trains": missing_trains,
            },
        )

    # -----------------------------------------------------
    # Run optimizer
    # -----------------------------------------------------

    result = optimize_schedule(
        request
    )

    # -----------------------------------------------------
    # Infeasible
    # -----------------------------------------------------

    if result["status"] == "infeasible":

        raise HTTPException(
            status_code=422,
            detail=result,
        )

    # -----------------------------------------------------
    # Calculate score
    # -----------------------------------------------------

    score = calculate_schedule_score(
        schedule=result["schedule"],
        train_movements=request.train_movements,
        safety_buffer_before=(
            request.safety_buffer_before
        ),
        safety_buffer_after=(
            request.safety_buffer_after
        ),
    )

    # -----------------------------------------------------
    # Save successful optimization
    # -----------------------------------------------------

    run_id = save_schedule(
        status=result["status"],
        score=(
            score["score"]
            if isinstance(score, dict)
            else score
        ),
        schedule=result["schedule"],
    )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return {
        "status": result["status"],
        "message": result["message"],
        "schedule": result["schedule"],
        "score": score,
        "run_id": run_id,
        "data_source": "postgresql",
    }


# =========================================================
# WHAT-IF SIMULATOR
# =========================================================

@app.post("/api/simulate")
def simulate(
    request: SimulationRequest,
):

    # -----------------------------------------------------
    # Load baseline data from PostgreSQL
    # -----------------------------------------------------

    try:

        db_data = load_all_from_db()

        baseline_trains = db_data["trains"]

        baseline_tasks = db_data[
            "maintenance_tasks"
        ]

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail={
                "message": (
                    "PostgreSQL database "
                    "unavailable."
                ),
                "error": str(e),
            },
        )

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
    # Build scenario
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
    # Infeasible scenario
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
            "data_source": "postgresql",
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
        "data_source": "postgresql",
    }


# =========================================================
# LATEST OPTIMIZED SCHEDULE
# =========================================================

@app.get("/api/schedule/latest")
def latest_schedule():

    try:

        schedule = get_latest_schedule()

        if schedule is None:

            return {
                "status": "empty",
                "message": (
                    "No optimized schedule found."
                ),
                "schedule": [],
                "data_source": "postgresql",
            }

        return {
            **schedule,
            "data_source": "postgresql",
        }

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail={
                "message": (
                    "Unable to load "
                    "latest schedule."
                ),
                "error": str(e),
            },
        )


# =========================================================
# NATURAL LANGUAGE ASSISTANT
# =========================================================

@app.post("/api/assistant")
def assistant(request: dict):

    text = request.get("message", "").strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Message is required.",
        )

    parsed = parse_planning_request(text)

    if not parsed["train_id"] and not parsed["task_id"]:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Could not understand the planning request.",
                "parsed": parsed,
            },
        )

    # -----------------------------------------------------
    # Convert natural-language request into simulation
    # -----------------------------------------------------

    simulation_request = SimulationRequest(
        train_id=parsed["train_id"],
        train_delay=parsed["train_delay"],
        task_id=parsed["task_id"],
        new_duration=parsed["new_duration"],
        new_priority=parsed["new_priority"],
        safety_buffer_before=10,
        safety_buffer_after=10,
        planning_start=0,
        planning_end=1439,
        planning_date="2026-08-27",
    )

    # -----------------------------------------------------
    # Run the existing What-if optimizer
    # -----------------------------------------------------

    result = simulate(simulation_request)

    return {
        "status": "success",
        "message": text,
        "parsed": parsed,
        "simulation": result,
        "data_source": "postgresql",
    }


# =========================================================
# APPLY OPTIMIZED SCHEDULE
# =========================================================

@app.post("/api/schedule/apply")
def apply_schedule(request: ApplyScheduleRequest):

    if not request.schedule:
        raise HTTPException(
            status_code=400,
            detail="Schedule cannot be empty.",
        )

    try:

        run_id = save_schedule(
            status=request.status,
            score=request.score,
            schedule=request.schedule,
        )

        return {
            "status": "success",
            "message": "Schedule applied successfully.",
            "run_id": run_id,
            "score": request.score,
            "tasks_scheduled": len(request.schedule),
            "data_source": "postgresql",
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail={
                "message": "Unable to apply schedule.",
                "error": str(e),
            },
        )