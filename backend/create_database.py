
import getpass
import psycopg

DB_NAME = "stellarshield_health"

password = getpass.getpass("PostgreSQL password for user postgres: ")

try:
    with psycopg.connect(
        host="localhost",
        dbname="postgres",
        user="postgres",
        password=password,
        autocommit=True
    ) as connection:

        exists = connection.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (DB_NAME,)
        ).fetchone()

        if not exists:
            connection.execute(f'CREATE DATABASE "{DB_NAME}"')
            print(f"Database '{DB_NAME}' created successfully.")
        else:
            print(f"Database '{DB_NAME}' already exists.")

except Exception as error:
    print("Database creation failed:")
    print(error)
