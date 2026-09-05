"""Sync configured live train numbers into PostgreSQL.

Usage:
  set RAILRADAR_API_KEY=...
  python live_train_sync.py 12002 12919
"""
import sys
from datetime import datetime

from database import get_connection
from railway_data_service import get_live_train, normalize_live_train, RailwayDataError


def upsert_train(train: dict):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO trains
                    (train_id, train_name, section, arrival, departure,
                     status, delay_minutes, current_station, next_station,
                     latitude, longitude, speed_kmh, last_updated, data_source)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (train_id) DO UPDATE SET
                    train_name = EXCLUDED.train_name,
                    status = EXCLUDED.status,
                    delay_minutes = EXCLUDED.delay_minutes,
                    current_station = EXCLUDED.current_station,
                    next_station = EXCLUDED.next_station,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    speed_kmh = EXCLUDED.speed_kmh,
                    last_updated = EXCLUDED.last_updated,
                    data_source = EXCLUDED.data_source
                """,
                (
                    train["train_id"], train.get("train_name"), train.get("section", "UNKNOWN"),
                    0, 0, train.get("status"), train.get("delay_minutes", 0),
                    train.get("current_station"), train.get("next_station"),
                    train.get("latitude"), train.get("longitude"), train.get("speed_kmh"),
                    train.get("last_updated") or datetime.now().astimezone(), "railradar",
                ),
            )
        conn.commit()


def main():
    numbers = sys.argv[1:]
    if not numbers:
        print("Usage: python live_train_sync.py 12002 12919")
        raise SystemExit(1)

    for number in numbers:
        try:
            data = normalize_live_train(get_live_train(number))
            upsert_train(data)
            print(f"OK {number}: {data.get('status')} delay={data.get('delay_minutes')} min")
        except RailwayDataError as exc:
            print(f"ERROR {number}: {exc}")


if __name__ == "__main__":
    main()
