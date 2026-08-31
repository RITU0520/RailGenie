import psycopg
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:root@localhost:5432/railgenie"
)


def get_connection():
    return psycopg.connect(DATABASE_URL)