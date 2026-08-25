from typing import Dict, List


# ---------------------------------------------------------
# RailGenie scoring weights
# ---------------------------------------------------------
#
# These are prototype weights.
# Later we can tune them using real railway requirements/data.
# ---------------------------------------------------------

PRIORITY_SCORE = {
    "critical": 100,
    "high": 80,
    "medium": 60,
    "low": 40,
}


def calculate_priority_score(
    schedule: List[Dict],
) -> float:
    """
    Calculate the average maintenance-priority score.
    """

    if not schedule:
        return 0.0

    total = 0

    for item in schedule:

        priority = item.get(
            "priority",
            "low",
        ).lower()

        total += PRIORITY_SCORE.get(
            priority,
            40,
        )

    return total / len(schedule)


def calculate_train_impact(
    schedule: List[Dict],
    train_movements: List,
) -> int:
    """
    Calculate train disruption in minutes.

    Current prototype definition:
    Any overlap between maintenance and a train movement
    contributes the overlapping duration.

    Safety-buffer violations are handled separately by
    the optimizer.
    """

    total_impact = 0

    for task in schedule:

        for train in train_movements:

            if task["section"] != train.section:
                continue

            overlap_start = max(
                task["start"],
                train.arrival,
            )

            overlap_end = min(
                task["end"],
                train.departure,
            )

            if overlap_start < overlap_end:

                total_impact += (
                    overlap_end - overlap_start
                )

    return total_impact


def calculate_safety_score(
    schedule: List[Dict],
    train_movements: List,
    safety_buffer_before: int,
    safety_buffer_after: int,
) -> float:
    """
    Calculate a safety score.

    100 = no protected-interval violation
    0   = one or more violations

    The optimizer should normally prevent violations,
    so this acts as an additional evaluation metric.
    """

    for task in schedule:

        for train in train_movements:

            if task["section"] != train.section:
                continue

            protected_start = (
                train.arrival
                - safety_buffer_before
            )

            protected_end = (
                train.departure
                + safety_buffer_after
            )

            overlaps = (
                task["start"] < protected_end
                and task["end"] > protected_start
            )

            if overlaps:
                return 0.0

    return 100.0


def calculate_schedule_score(
    schedule: List[Dict],
    train_movements: List,
    safety_buffer_before: int,
    safety_buffer_after: int,
) -> Dict:
    """
    Calculate an overall RailGenie schedule score.

    Current prototype components:

        Priority
        Train impact
        Safety

    This function does NOT change the optimizer.
    It evaluates the schedule returned by the optimizer.
    """

    if not schedule:

        return {
            "score": 0.0,
            "priority_score": 0.0,
            "train_impact": 0,
            "safety_score": 0.0,
        }

    priority_score = calculate_priority_score(
        schedule
    )

    train_impact = calculate_train_impact(
        schedule,
        train_movements,
    )

    safety_score = calculate_safety_score(
        schedule,
        train_movements,
        safety_buffer_before,
        safety_buffer_after,
    )

    # -----------------------------------------------------
    # Train impact penalty
    # -----------------------------------------------------
    #
    # Every minute of direct train overlap reduces score.
    #
    # In the current optimizer this should normally be 0.
    # -----------------------------------------------------

    train_impact_penalty = min(
        train_impact * 2,
        100,
    )

    # -----------------------------------------------------
    # Weighted score
    # -----------------------------------------------------

    score = (
        priority_score * 0.40
        + safety_score * 0.40
        + (100 - train_impact_penalty) * 0.20
    )

    score = max(
        0.0,
        min(100.0, score),
    )

    return {
        "score": round(score, 2),
        "priority_score": round(
            priority_score,
            2,
        ),
        "train_impact": train_impact,
        "safety_score": round(
            safety_score,
            2,
        ),
    }