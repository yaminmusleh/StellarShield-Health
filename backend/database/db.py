
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is missing from backend/.env"
        )

    return psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row
    )


def test_connection():
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT
                current_database() AS database,
                version() AS version
            """
        ).fetchone()


if __name__ == "__main__":
    try:
        result = test_connection()
        print("PostgreSQL connection successful!")
        print("Database:", result["database"])
        print("Version:", result["version"])

    except Exception as error:
        print("PostgreSQL connection failed:")
        print(error)
