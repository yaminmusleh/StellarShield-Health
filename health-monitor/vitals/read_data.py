import csv
from pathlib import Path

folder = Path(__file__).parent
data_file = next(folder.rglob("vitals_combined.csv"))

with data_file.open(encoding="utf-8-sig", newline="") as file:
    reader = csv.DictReader(file)
    columns = reader.fieldnames
    readings = list(reader)

missing_values = {"", "nan", "na", "n/a", "null", "none"}

print("Total rows:", len(readings))
print()

for column in columns:
    missing_count = 0

    for row in readings:
        value = row.get(column)

        if value is None or value.strip().lower() in missing_values:
            missing_count += 1

    percentage = missing_count / len(readings) * 100 if readings else 0

    print(
        f"{column}: {missing_count} missing "
        f"({percentage:.2f}%)"
    )