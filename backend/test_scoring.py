from models import TrainMovement

from scoring import calculate_schedule_score


def minutes(hour, minute=0):
    return hour * 60 + minute


# ---------------------------------------------------------
# Test schedule
# ---------------------------------------------------------

schedule = [
    {
        "task_id": "M001",
        "asset_id": "T-102",
        "section": "S1",
        "start": minutes(0),
        "end": minutes(2),
        "duration": 120,
        "priority": "critical",
    }
]


trains = [
    TrainMovement(
        train_id="12001",
        section="S1",
        arrival=minutes(2, 10),
        departure=minutes(2, 25),
        priority="normal",
    )
]


# ---------------------------------------------------------
# Calculate score
# ---------------------------------------------------------

result = calculate_schedule_score(
    schedule=schedule,
    train_movements=trains,
    safety_buffer_before=10,
    safety_buffer_after=10,
)


print()
print("==============================================")
print("          RAILGENIE SCORING TEST")
print("==============================================")

print()

print(
    "Overall Score:",
    result["score"],
)

print(
    "Priority Score:",
    result["priority_score"],
)

print(
    "Train Impact:",
    result["train_impact"],
    "minutes",
)

print(
    "Safety Score:",
    result["safety_score"],
)

print()


# ---------------------------------------------------------
# Assertions
# ---------------------------------------------------------

assert result["priority_score"] == 100.0, (
    "❌ Critical priority score is incorrect."
)

assert result["train_impact"] == 0, (
    "❌ Unexpected train impact."
)

assert result["safety_score"] == 100.0, (
    "❌ Safety score should be 100."
)

assert result["score"] == 100.0, (
    "❌ Overall score should be 100."
)


print("✅ Priority scoring PASSED")
print("✅ Train-impact scoring PASSED")
print("✅ Safety scoring PASSED")
print("✅ Overall scoring PASSED")
print()