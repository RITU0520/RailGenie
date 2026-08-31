import re


def parse_planning_request(text: str):
    text = text.lower().strip()

    result = {
        "train_id": None,
        "train_delay": 0,
        "task_id": None,
        "new_duration": None,
        "new_priority": None,
    }

    # Train delay
    train_match = re.search(
        r"train\s*(\d+).*?(?:delay|delayed).*?(\d+)\s*(?:minutes?|mins?)",
        text,
    )

    if train_match:
        result["train_id"] = train_match.group(1)
        result["train_delay"] = int(train_match.group(2))

    # Also support:
    # "delay 12001 by 30 minutes"
    if not result["train_id"]:
        train_match = re.search(
            r"delay\s+(?:train\s+)?(\d+)\s+by\s+(\d+)",
            text,
        )

        if train_match:
            result["train_id"] = train_match.group(1)
            result["train_delay"] = int(train_match.group(2))

    # Maintenance duration
    # Example:
    # "extend M002 to 90 minutes"
    task_match = re.search(
        r"(?:extend|increase|duration\s+(?:of|to)?)\s+(m\d+)\s+(?:to|by)\s+(\d+)",
        text,
    )

    if task_match:
        result["task_id"] = task_match.group(1).upper()
        result["new_duration"] = int(task_match.group(2))

    # Priority
    priority_match = re.search(
        r"\b(critical|high|medium|low)\s+priority\b",
        text,
    )

    if priority_match:
        result["new_priority"] = priority_match.group(1)

    return result