from pathlib import Path

import pandas as pd

folder = Path(__file__).parent
data_file = folder / "vitals_combined.csv"

data = pd.read_csv(
    data_file,
    dtype={"recording_id": "string"},
)

columns = ["HR", "PULSE", "RESP", "SpO2"]

for column in columns:
    data[column] = pd.to_numeric(data[column], errors="coerce")

    was_missing = data[column].isna()

    recording_median = data.groupby(
        "recording_id"
    )[column].transform("median")

    data[column] = data[column].fillna(recording_median)

    was_filled = was_missing & data[column].notna()
    data[f"{column}_imputed"] = was_filled

    print(
        f"{column}: "
        f"filled={was_filled.sum()}, "
        f"remaining_missing={data[column].isna().sum()}"
    )

output_file = folder / "vitals_cleaned.csv"
data.to_csv(output_file, index=False, encoding="utf-8-sig")

print("Saved:", output_file)