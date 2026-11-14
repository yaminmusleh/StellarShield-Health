from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
import sqlite3

import joblib
import numpy as np
import pandas as pd
import sklearn
from flask import Flask, jsonify, request

from mental_health import calculate_cwi, health_status, fatigue_risk
from ai_health_summary import generate_health_summary

app = Flask(__name__)

APP = Path(__file__).parent
PROJECT = APP.parent
DB = APP / "daily_checkins.db"
MEASUREMENTS = ["HR", "PULSE", "RESP", "SpO2"]
FLAGS = [f"{c}_imputed" for c in MEASUREMENTS]


def clean(df):
    """NaN is not valid JSON, so convert it to null."""
    return df.astype(object).where(df.notna(), None).to_dict("records")


def load_vitals():
    df = pd.read_csv(APP / "vitals_cleaned.csv", dtype={"recording_id": "string"})
    for c in ["Time [s]", *MEASUREMENTS]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    for c in FLAGS:
        df[c] = df[c].astype("string").str.strip().str.lower().eq("true").fillna(False)
    return df


vitals = load_vitals()

saved_model = joblib.load(APP / "model_outputs" / "vitals_model.joblib")
if saved_model["sklearn_version"] != sklearn.__version__:
    raise RuntimeError("Retrain the model with this Python environment.")
model = saved_model["model"]


@app.get("/api/ping")
def ping():
    return jsonify(ok=True)


# ---------- Vitals ----------
@app.get("/api/recordings")
def recordings():
    ids = sorted(vitals["recording_id"].dropna().unique().tolist())
    return jsonify(ids)


@app.get("/api/recordings/<rec_id>")
def recording(rec_id):
    rec = vitals[vitals["recording_id"] == rec_id].sort_values("Time [s]")
    if rec.empty:
        return jsonify(error="Recording not found"), 404
    return jsonify(clean(rec))


@app.get("/api/recordings/<rec_id>/anomalies")
def anomalies(rec_id):
    rec = vitals[vitals["recording_id"] == rec_id].sort_values("Time [s]")
    if rec.empty:
        return jsonify(error="Recording not found"), 404

    ok = ~rec[FLAGS].any(axis=1) & np.isfinite(rec[MEASUREMENTS].to_numpy(dtype=float)).all(axis=1)
    rows = rec.loc[ok].copy()
    if rows.empty:
        return jsonify(analysed=0, unusual=0, rows=[])

    rows["model_score"] = model.decision_function(rows[MEASUREMENTS])
    rows["unusual"] = model.predict(rows[MEASUREMENTS]) == -1
    return jsonify(
        analysed=len(rows),
        unusual=int(rows["unusual"].sum()),
        held_out=rec_id in saved_model["test_recording_ids"],
        rows=clean(rows[["Time [s]", *MEASUREMENTS, "model_score", "unusual"]]),
    )


# ---------- Radiation ----------
@app.get("/api/radiation")
def radiation():
    df = pd.read_csv(PROJECT / "radiation" / "iss_dostel_2022-03-01.csv")
    df["absorbed_dose_rate"] = pd.to_numeric(df["absorbed_dose_rate"], errors="coerce")
    df = df.dropna(subset=["timestamp", "absorbed_dose_rate"])
    instrument = request.args.get("instrument")
    if instrument:
        df = df[df["instrument"] == instrument]
    return jsonify(
        instruments=sorted(df["instrument"].dropna().unique().tolist()),
        rows=clean(df[["timestamp", "instrument", "absorbed_dose_rate"]]),
    )


# ---------- Sleep ----------
@app.get("/api/sleep/<rec_id>")
def sleep(rec_id):
    df = pd.read_csv(PROJECT / "sleep" / "sleep_stages.csv")
    df["duration_seconds"] = pd.to_numeric(df["duration_seconds"], errors="coerce")
    df = df[(df["recording_id"].astype(str) == rec_id) & (df["duration_seconds"] > 0)]
    hours = (df.groupby("stage")["duration_seconds"].sum() / 3600).round(2)
    return jsonify(stage_hours=hours.to_dict())


# ---------- Daily check-in ----------
NUMERIC = ["mood_score", "stress_score", "sleep_hours", "sleep_quality",
           "social_score", "exercise_minutes", "workload_score", "homesick_score"]


@app.post("/api/checkins")
def save_checkin():
    d = request.get_json(silent=True) or {}
    code = str(d.get("participant_code", "")).strip()
    bad = [k for k in NUMERIC if not isinstance(d.get(k), (int, float))]
    if not code or bad:
        return jsonify(error="Invalid input", fields=bad or ["participant_code"]), 400

    entry = {
        "participant_code": code,
        "checkin_date": d.get("checkin_date") or datetime.now().date().isoformat(),
        "vision_report": d.get("vision_report", "No change reported"),
        "vision_note": str(d.get("vision_note", "")).strip(),
        "mood_score": d["mood_score"],
        "mood_note": str(d.get("free_notes", "")).strip(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "mood_scale": 10,
        **{k: d[k] for k in NUMERIC if k != "mood_score"},
        "earth_longing": d.get("earth_longing", "Not answered"),
        "exercised": d.get("exercised", "Not answered"),
        "crew_issues": d.get("crew_issues", "Not answered"),
        "free_notes": str(d.get("free_notes", "")).strip(),
    }

    cwi = calculate_cwi(entry)
    status = health_status(cwi)
    fatigue = fatigue_risk(entry)

    cols = list(entry)
    updates = ", ".join(f"{c} = excluded.{c}" for c in cols
                        if c not in ("participant_code", "checkin_date"))
    with closing(sqlite3.connect(DB, timeout=10)) as con, con:
        con.execute(
            f"""INSERT INTO daily_checkins ({", ".join(cols)})
                VALUES ({", ".join("?" for _ in cols)})
                ON CONFLICT(participant_code, checkin_date) DO UPDATE SET {updates}""",
            tuple(entry[c] for c in cols),
        )

    summary = generate_health_summary(entry, cwi, status, fatigue, None)
    return jsonify(cwi=cwi, status=status, fatigue=bool(fatigue), summary=summary)


@app.get("/api/checkins")
def list_checkins():
    code = request.args.get("participant_code", "").strip()
    with closing(sqlite3.connect(DB, timeout=10)) as con:
        df = pd.read_sql_query(
            "SELECT * FROM daily_checkins WHERE participant_code = ? ORDER BY checkin_date",
            con, params=(code,),
        )
    return jsonify(clean(df))


if __name__ == "__main__":
    app.run(port=8000, debug=True)