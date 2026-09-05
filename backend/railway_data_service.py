"""Optional live Indian Railways data adapter.

RailRadar exposes a live train-running endpoint.
Keep the API key only in the backend .env file.
"""

import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv


# =========================================================
# ENVIRONMENT
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE, override=True)

RAILRADAR_API_KEY = os.getenv("RAILRADAR_API_KEY")

BASE_URL = "https://api.railradar.in/v1"


# =========================================================
# ERROR
# =========================================================

class RailwayDataError(RuntimeError):
    pass


# =========================================================
# LIVE TRAIN
# =========================================================

def get_live_train(
    train_number: str,
    journey_date: str | None = None,
):
    api_key = RAILRADAR_API_KEY

    if not api_key:
        raise RailwayDataError(
            "RAILRADAR_API_KEY is not configured. "
            f"Expected .env at: {ENV_FILE}"
        )

    url = f"{BASE_URL}/trains/{train_number}/live"

    params = []

    if journey_date:
        params.append(f"date={journey_date}")

    params.append("includeCoordinates=true")
    params.append("geometry=false")

    url += "?" + "&".join(params)

    request = Request(
        url,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "User-Agent": "RailGenie/1.0",
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=15) as response:
            payload = json.loads(
                response.read().decode("utf-8")
            )

    except HTTPError as exc:
        body = exc.read().decode(
            "utf-8",
            errors="replace",
        )

        if exc.code == 401:
            raise RailwayDataError(
                f"RailRadar HTTP 401: {body}"
            ) from exc

        if exc.code == 403:
            raise RailwayDataError(
                f"RailRadar HTTP 403: {body}"
            ) from exc

        if exc.code == 404:
            raise RailwayDataError(
                f"RailRadar HTTP 404: {body}"
            ) from exc

        if exc.code == 429:
            raise RailwayDataError(
                f"RailRadar HTTP 429: {body}"
            ) from exc

        raise RailwayDataError(
            f"RailRadar HTTP {exc.code}: {body}"
        ) from exc

    except URLError as exc:
        raise RailwayDataError(
            "Unable to reach the live railway data provider."
        ) from exc

    except json.JSONDecodeError as exc:
        raise RailwayDataError(
            "RailRadar returned invalid JSON."
        ) from exc

    except Exception as exc:
        raise RailwayDataError(
            f"Unexpected live railway API error: {exc}"
        ) from exc

    if not payload.get("success"):
        error = payload.get("error") or {}

        if isinstance(error, dict):
            message = error.get(
                "message",
                "Live railway API request failed.",
            )
        else:
            message = str(error)

        raise RailwayDataError(message)

    data = payload.get("data")

    if not data:
        raise RailwayDataError(
            "RailRadar returned no train data."
        )

    return data


# =========================================================
# NORMALIZE LIVE TRAIN
# =========================================================

def normalize_live_train(
    data: dict,
    fallback_section: str = "UNKNOWN",
) -> dict:

    location = data.get("currentLocation") or {}
    next_halt = data.get("nextHalt") or {}
    train = data.get("train") or {}

    train_number = (
        data.get("trainNumber")
        or train.get("number")
    )

    train_name = (
        data.get("trainName")
        or train.get("name")
    )

    delay = data.get("delayMinutes") or 0

    try:
        delay = int(delay)
    except (TypeError, ValueError):
        delay = 0

    return {
        "train_id": (
            str(train_number)
            if train_number is not None
            else None
        ),
        "train_name": train_name,
        "section": fallback_section,
        "status": data.get("status"),
        "delay_minutes": delay,
        "current_station": location.get("stationCode"),
        "next_station": next_halt.get("stationCode"),
        "latitude": location.get("lat"),
        "longitude": location.get("lng"),
        "speed_kmh": location.get("speedKmh"),
        "last_updated": data.get("lastUpdatedAt"),
        "data_source": "railradar",
    }