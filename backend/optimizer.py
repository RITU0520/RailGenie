from collections import defaultdict

from ortools.sat.python import cp_model

from models import OptimizationRequest


PRIORITY_WEIGHT = {
    "critical": 1000,
    "high": 100,
    "medium": 10,
    "low": 1,
}


def optimize_schedule(request: OptimizationRequest):

    model = cp_model.CpModel()

    tasks = request.maintenance_tasks

    starts = {}
    ends = {}
    intervals = {}

    # ---------------------------------------------------------
    # 1. Create variables
    # ---------------------------------------------------------

    for task in tasks:

        latest_start = (
            request.planning_end - task.duration
        )

        if latest_start < request.planning_start:
            return {
                "status": "infeasible",
                "schedule": [],
                "message": (
                    f"Task {task.task_id} is longer "
                    "than the planning horizon."
                ),
            }

        starts[task.task_id] = model.NewIntVar(
            request.planning_start,
            latest_start,
            f"start_{task.task_id}",
        )

        ends[task.task_id] = model.NewIntVar(
            request.planning_start + task.duration,
            request.planning_end,
            f"end_{task.task_id}",
        )

        model.Add(
            ends[task.task_id]
            == starts[task.task_id] + task.duration
        )

        intervals[task.task_id] = model.NewIntervalVar(
            starts[task.task_id],
            task.duration,
            ends[task.task_id],
            f"interval_{task.task_id}",
        )

    # ---------------------------------------------------------
    # 2. Same-section maintenance cannot overlap
    # ---------------------------------------------------------

    section_intervals = defaultdict(list)

    for task in tasks:
        section_intervals[task.section].append(
            intervals[task.task_id]
        )

    for section_tasks in section_intervals.values():

        if len(section_tasks) > 1:
            model.AddNoOverlap(section_tasks)

    # ---------------------------------------------------------
    # 3. Respect maintenance availability windows
    # ---------------------------------------------------------

    for task in tasks:

        windows = task.available_windows

        if not windows:
            continue

        valid_intervals = []

        for window in windows:

            if window.end <= window.start:
                continue

            if window.end - window.start < task.duration:
                continue

            # Valid START range for this window.
            latest_valid_start = (
                window.end - task.duration
            )

            valid_intervals.append([
                window.start,
                latest_valid_start,
            ])

        if not valid_intervals:

            return {
                "status": "infeasible",
                "schedule": [],
                "message": (
                    f"Task {task.task_id} has no "
                    "valid availability window."
                ),
            }

        model.AddLinearExpressionInDomain(
            starts[task.task_id],
            cp_model.Domain.FromIntervals(
                valid_intervals
            ),
        )

    # ---------------------------------------------------------
    # 4. Train conflicts + safety buffers
    # ---------------------------------------------------------
    #
    # Instead of Boolean conditions, directly restrict the
    # possible maintenance START times.
    #
    # For a train:
    #
    #     02:10 → 02:25
    #
    # Buffer:
    #
    #     10 min before
    #     10 min after
    #
    # Protected interval:
    #
    #     02:00 → 02:35
    #
    # A 60-minute maintenance task can therefore start:
    #
    #     <= 01:00
    #
    # OR
    #
    #     >= 02:35
    #
    # ---------------------------------------------------------

    for task in tasks:

        for train in request.train_movements:

            if task.section != train.section:
                continue

            protected_start = (
                train.arrival
                - request.safety_buffer_before
            )

            protected_end = (
                train.departure
                + request.safety_buffer_after
            )

            duration = task.duration

            # Latest start that finishes BEFORE
            # the protected interval.
            latest_before_start = (
                protected_start - duration
            )

            # Earliest start AFTER the protected interval.
            earliest_after_start = protected_end

            latest_start = (
                request.planning_end - duration
            )

            allowed_start_intervals = []

            # -------------------------------------------------
            # Option 1: maintenance completely before train
            # -------------------------------------------------

            before_end = min(
                latest_before_start,
                latest_start,
            )

            if before_end >= request.planning_start:

                allowed_start_intervals.append([
                    request.planning_start,
                    before_end,
                ])

            # -------------------------------------------------
            # Option 2: maintenance completely after train
            # -------------------------------------------------

            after_start = max(
                earliest_after_start,
                request.planning_start,
            )

            if after_start <= latest_start:

                allowed_start_intervals.append([
                    after_start,
                    latest_start,
                ])

            if not allowed_start_intervals:

                return {
                    "status": "infeasible",
                    "schedule": [],
                    "message": (
                        f"Task {task.task_id} cannot be "
                        f"scheduled around train "
                        f"{train.train_id} with the "
                        "required safety buffer."
                    ),
                }

            # Intersect this train's allowed ranges with
            # the current start-time domain.
            #
            # Re-applying the domain for every conflicting
            # train progressively narrows the valid starts.
            model.AddLinearExpressionInDomain(
                starts[task.task_id],
                cp_model.Domain.FromIntervals(
                    allowed_start_intervals
                ),
            )

    # ---------------------------------------------------------
    # 5. Priority-aware objective
    # ---------------------------------------------------------

    priority_objective = []

    for task in tasks:

        priority = task.priority.lower()

        weight = PRIORITY_WEIGHT.get(
            priority,
            1,
        )

        priority_objective.append(
            starts[task.task_id] * weight
        )

    model.Minimize(
        sum(priority_objective)
    )

    # ---------------------------------------------------------
    # 6. Solve
    # ---------------------------------------------------------

    solver = cp_model.CpSolver()

    solver.parameters.max_time_in_seconds = 10

    status = solver.Solve(model)

    # ---------------------------------------------------------
    # 7. Handle infeasible result
    # ---------------------------------------------------------

    if status not in (
        cp_model.OPTIMAL,
        cp_model.FEASIBLE,
    ):

        return {
            "status": "infeasible",
            "schedule": [],
            "message": (
                "No feasible maintenance schedule "
                "was found."
            ),
        }

    # ---------------------------------------------------------
    # 8. Build schedule
    # ---------------------------------------------------------

    schedule = []

    for task in tasks:

        start = solver.Value(
            starts[task.task_id]
        )

        end = solver.Value(
            ends[task.task_id]
        )

        schedule.append({
            "task_id": task.task_id,
            "asset_id": task.asset_id,
            "section": task.section,
            "start": start,
            "end": end,
            "duration": task.duration,
            "priority": task.priority,
        })

    # ---------------------------------------------------------
    # 9. Return result
    # ---------------------------------------------------------

    return {
        "status": (
            "optimal"
            if status == cp_model.OPTIMAL
            else "feasible"
        ),
        "schedule": schedule,
        "message": (
            "Priority-aware maintenance schedule "
            "generated with train safety buffers."
        ),
    }