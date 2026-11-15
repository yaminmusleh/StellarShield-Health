
from pathlib import Path
from db import get_connection

SCHEMA_FILE = Path(__file__).with_name("schema.sql")

try:
    sql = SCHEMA_FILE.read_text(encoding="utf-8")

    with get_connection() as connection:
        connection.execute(sql, prepare=False)

    print("Database schema applied successfully!")

except Exception as error:
    print("Could not apply the database schema:")
    print(error)
