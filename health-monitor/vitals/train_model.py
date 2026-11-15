from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json

import joblib
import numpy as np    
import pandas as pd
import sklearn

from sklearn.ensemble import IsolationForest
from sklearn.model_selection import GroupShuffleSplit


folder = Path(__file__).parent
source_file = folder / "vitals_combined.csv"
output_folder = folder / "model_outputs"

features = ["HR", "PULSE", "RESP", "SpO2"]

if not source_file.exists():
    raise SystemExit(
        "Place train_model.py beside vitals_combined.csv."
    )

# Load original measurements before imputation.
data = pd.read_csv(
    source_file,
    dtype={"recording_id": "string"},
)

data.columns = data.columns.str.strip()

required = ["recording_id", "Time [s]", *features]

missing = [
    column for column in required
    if column not in data.columns
]

if missing:
    raise SystemExit(
        "Missing columns: " + ", ".join(missing)
    )

original_rows = len(data)

data["recording_id"] = (
    data["recording_id"]
    .str.strip()
    .replace("", pd.NA)
)

for column in ["Time [s]", *features]:
    data[column] = pd.to_numeric(
        data[column],
        errors="coerce",
    )

# Keep complete original measurements.
finite_rows = np.isfinite(
    data[["Time [s]", *features]].to_numpy(dtype=float)
).all(axis=1)

usable = data.loc[
    finite_rows & data["recording_id"].notna()
].copy()

if usable["recording_id"].nunique() < 2:
    raise SystemExit(
        "At least two complete recording groups are required."
    )

# Hold out approximately 20% of the recording groups.
splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=42,
)

train_index, test_index = next(
    splitter.split(
        usable,
        groups=usable["recording_id"],
    )
)

train_data = usable.iloc[train_index].copy()
test_data = usable.iloc[test_index].copy()

train_ids = sorted(
    train_data["recording_id"].unique().tolist()
)
test_ids = sorted(
    test_data["recording_id"].unique().tolist()
)

assert set(train_ids).isdisjoint(test_ids)

# Fit using training recordings only.
model = IsolationForest(
    n_estimators=200,
    contamination="auto",
    random_state=42,
)

model.fit(train_data[features])

# Score the held-out recordings.
test_data["model_score"] = model.decision_function(
    test_data[features]
)

test_data["flagged"] = (
    model.predict(test_data[features]) == -1
)

trained_at = datetime.now(timezone.utc).isoformat()

source_hash = hashlib.sha256(
    source_file.read_bytes()
).hexdigest()

report = {
    "trained_at": trained_at,
    "source": "BIDMC / PhysioNet terrestrial hospital recordings",
    "source_sha256": source_hash,
    "sklearn_version": sklearn.__version__,
    "features": features,
    "input_rows": original_rows,
    "excluded_incomplete_or_invalid_rows": (
        original_rows - len(usable)
    ),
    "train_rows": len(train_data),
    "test_rows": len(test_data),
    "train_recording_ids": train_ids,
    "test_recording_ids": test_ids,
    "test_flagged_rows": int(test_data["flagged"].sum()),
    "test_flagged_percentage": float(
        test_data["flagged"].mean() * 100
    ),
    "limitations": [
        (
            "Recording groups are disjoint; distinct patient "
            "identities were not verified."
        ),
        (
            "Reference anomaly labels are unavailable; accuracy, "
            "precision and recall were not calculated."
        ),
        (
            "One held-out split gives exploratory results; clinical "
            "and astronaut applicability require validation."
        ),
    ],
}

# Save the trained model and its metadata.
output_folder.mkdir(exist_ok=True)

joblib.dump(
    {
        "schema_version": 1,
        "model": model,
        "features": features,
        "train_recording_ids": train_ids,
        "test_recording_ids": test_ids,
        "source_sha256": source_hash,
        "sklearn_version": sklearn.__version__,
        "trained_at": trained_at,
    },
    output_folder / "vitals_model.joblib",
)

test_data.to_csv(
    output_folder / "heldout_predictions.csv",
    index=False,
    encoding="utf-8-sig",
)

(output_folder / "training_report.json").write_text(
    json.dumps(report, indent=2),
    encoding="utf-8",
)

print("Training completed.")
print("Excluded rows:", original_rows - len(usable))

print(
    "Training recordings:", len(train_ids),
    "| rows:", len(train_data),
)

print(
    "Held-out recordings:", len(test_ids),
    "| rows:", len(test_data),
)

print(
    "Flagged held-out rows:",
    report["test_flagged_rows"],
)

print(
    "Flagged held-out percentage:",
    round(report["test_flagged_percentage"], 2),
)

print("Output folder:", output_folder)

print(
    "Reference anomaly labels are required "
    "to calculate detection accuracy."
)