from pathlib import Path
from contextlib import closing
from datetime import date, datetime, timezone
import sqlite3
import json

import numpy as np
import pandas as pd
import streamlit as st


st.set_page_config(
    page_title="Astronaut Health Monitor",
    layout="wide",
)

st.title("Astronaut Health Monitor")

app_folder = Path(__file__).parent
project_folder = app_folder.parent

measurements = ["HR", "PULSE", "RESP", "SpO2"]
flag_columns = [f"{column}_imputed" for column in measurements]


def display_value(value, unit):
    if pd.isna(value):
        return "Unavailable"
    return f"{value:g} {unit}"


# ==================================================
# 1. HEALTH RECORDINGS
# ==================================================

st.header("Health Recordings")
st.caption(
    "BIDMC hospital recordings collected on Earth. "
    "Estimated values use the median of the same recording."
)

data_file = app_folder / "vitals_cleaned.csv"

if not data_file.exists():
    st.error("Run clean_data.py first to create vitals_cleaned.csv.")
    st.stop()

data = pd.read_csv(
    data_file,
    dtype={"recording_id": "string"},
)

required_columns = [
    "recording_id",
    "Time [s]",
    *measurements,
    *flag_columns,
]

missing_columns = [
    column for column in required_columns
    if column not in data.columns
]

if missing_columns:
    st.error(
        "Missing columns: "
        + ", ".join(missing_columns)
        + ". Run clean_data.py again."
    )
    st.stop()

for column in ["Time [s]", *measurements]:
    data[column] = pd.to_numeric(data[column], errors="coerce")

for column in flag_columns:
    data[column] = (
        data[column]
        .astype("string")
        .str.strip()
        .str.lower()
        .eq("true")
        .fillna(False)
    )

recording_ids = sorted(
    data["recording_id"].dropna().unique().tolist()
)

if not recording_ids:
    st.error("No health recordings were found.")
    st.stop()

recording_id = st.selectbox(
    "Choose a health recording",
    options=recording_ids,
)

recording = data.loc[
    data["recording_id"] == recording_id
].sort_values("Time [s]")

times = (
    recording["Time [s]"]
    .dropna()
    .drop_duplicates()
    .tolist()
)

if not times:
    st.error("This recording has no valid timestamps.")
    st.stop()

selected_time = st.select_slider(
    "Choose a time in seconds",
    options=times,
)

reading = recording.loc[
    recording["Time [s]"] == selected_time
].iloc[0]

heart, oxygen, breathing = st.columns(3)

heart.metric(
    "Heart Rate",
    display_value(reading["HR"], "bpm"),
)
oxygen.metric(
    "Oxygen Saturation",
    display_value(reading["SpO2"], "%"),
)
breathing.metric(
    "Respiratory Rate",
    display_value(reading["RESP"], "breaths/min"),
)

estimated = [
    column for column in measurements
    if reading[f"{column}_imputed"]
]

if estimated:
    st.warning(
        "Estimated values at this time: " + ", ".join(estimated)
    )

chart_data = recording.set_index("Time [s]")

heart_tab, oxygen_tab, breathing_tab = st.tabs(
    ["Heart Rate", "Oxygen Saturation", "Respiration"]
)

with heart_tab:
    st.line_chart(chart_data[["HR", "PULSE"]], y_label="bpm")

with oxygen_tab:
    st.line_chart(chart_data[["SpO2"]], y_label="SpO2 (%)")

with breathing_tab:
    st.line_chart(chart_data[["RESP"]], y_label="Breaths/min")

st.caption(
    "Charts include estimated values. "
    "Unavailable means a reading is still missing."
)

quality = pd.DataFrame({
    "Indicator": measurements,
    "Estimated Values": [
        int(recording[f"{column}_imputed"].sum())
        for column in measurements
    ],
    "Remaining Missing Values": [
        int(recording[column].isna().sum())
        for column in measurements
    ],
})

st.subheader("Data Quality")
st.dataframe(quality, hide_index=True)

with st.expander("View health recording data"):
    st.dataframe(recording, hide_index=True)


# ==================================================
# 2. SPACE RADIATION
# ==================================================

st.divider()
st.header("Space Radiation — NASA RadLab")
st.caption(
    "Historical ISS instrument readings from March 1, 2022. "
    "These measurements are independent of the hospital recordings."
)

radiation_file = (
    project_folder
    / "radiation"
    / "iss_dostel_2022-03-01.csv"
)

if not radiation_file.exists():
    st.warning("The radiation CSV file was not found.")
else:
    radiation = pd.read_csv(radiation_file)

    radiation["timestamp"] = pd.to_datetime(
        radiation["timestamp"],
        errors="coerce",
        utc=True,
    )
    radiation["absorbed_dose_rate"] = pd.to_numeric(
        radiation["absorbed_dose_rate"],
        errors="coerce",
    )

    instruments = sorted(
        radiation["instrument"].dropna().unique().tolist()
    )

    if not instruments:
        st.info("No radiation instruments were found.")
    else:
        instrument = st.selectbox(
            "Choose a radiation instrument",
            options=instruments,
        )

        instrument_data = radiation.loc[
            radiation["instrument"] == instrument
        ].sort_values("timestamp")

        valid_radiation = instrument_data.dropna(
            subset=["timestamp", "absorbed_dose_rate"]
        )

        if valid_radiation.empty:
            st.info("No valid readings were found for this instrument.")
        else:
            latest = valid_radiation.iloc[-1]

            st.metric(
                "Latest Recorded Absorbed Dose Rate",
                f"{latest['absorbed_dose_rate']:.2f} µGy/hour",
            )
            st.caption(
                f"Recorded at {latest['timestamp']} — historical data."
            )

            st.line_chart(
                valid_radiation.set_index("timestamp")[
                    ["absorbed_dose_rate"]
                ],
                y_label="Absorbed dose rate (µGy/hour)",
            )

            with st.expander("View radiation data"):
                st.dataframe(instrument_data, hide_index=True)


# ==================================================
# 3. SLEEP RECORDINGS
# ==================================================

st.divider()
st.header("Sleep Monitoring")
st.caption(
    "Sleep-EDF recordings collected on Earth. "
    "These recordings are independent of the other datasets."
)

sleep_file = project_folder / "sleep" / "sleep_stages.csv"

if not sleep_file.exists():
    st.warning("sleep_stages.csv was not found.")
else:
    sleep_data = pd.read_csv(sleep_file)

    sleep_data["duration_seconds"] = pd.to_numeric(
        sleep_data["duration_seconds"],
        errors="coerce",
    )

    sleep_ids = sorted(
        sleep_data["recording_id"].dropna().unique().tolist()
    )

    if not sleep_ids:
        st.info("No sleep recordings were found.")
    else:
        sleep_id = st.selectbox(
            "Choose a sleep recording",
            options=sleep_ids,
        )

        selected_sleep = sleep_data.loc[
            sleep_data["recording_id"] == sleep_id
        ].copy()

        valid_sleep = selected_sleep.loc[
            selected_sleep["duration_seconds"].gt(0)
        ]

        sleeping_stages = [
            "Sleep stage 1",
            "Sleep stage 2",
            "Sleep stage 3",
            "Sleep stage 4",
            "Sleep stage R",
        ]

        asleep_seconds = valid_sleep.loc[
            valid_sleep["stage"].isin(sleeping_stages),
            "duration_seconds",
        ].sum()

        awake_seconds = valid_sleep.loc[
            valid_sleep["stage"] == "Sleep stage W",
            "duration_seconds",
        ].sum()

        unknown_seconds = valid_sleep.loc[
            ~valid_sleep["stage"].isin(
                sleeping_stages + ["Sleep stage W"]
            ),
            "duration_seconds",
        ].sum()

        asleep, awake = st.columns(2)

        asleep.metric(
            "Total Annotated Sleep",
            f"{asleep_seconds / 3600:.2f} hours",
        )
        awake.metric(
            "Annotated Wakefulness",
            f"{awake_seconds / 3600:.2f} hours",
        )

        st.caption(
            "Wakefulness includes awake periods across the full recording."
        )

        if unknown_seconds > 0:
            st.info(
                f"Unclassified time: {unknown_seconds / 60:.1f} minutes. "
                "Excluded from sleep and wake totals."
            )

        stage_hours = (
            valid_sleep.groupby("stage")["duration_seconds"]
            .sum()
            .div(3600)
            .rename("Hours")
        )

        st.bar_chart(stage_hours, y_label="Hours")

        st.caption(
            "Stages 1–4: non-REM sleep. "
            "R: REM sleep. W: wakefulness. ?: unclassified."
        )

        with st.expander("View sleep annotations"):
            st.dataframe(selected_sleep, hide_index=True)


# ==================================================
# 4. DAILY WELLBEING AND VISION
# ==================================================

st.divider()
st.header("Daily Wellbeing and Vision Check-in")
st.caption(
    "User-entered observations saved locally on this computer."
)

database_file = app_folder / "daily_checkins.db"

new_columns = {
    "mood_scale": "INTEGER NOT NULL DEFAULT 5",
    "stress_score": "INTEGER",
    "sleep_hours": "REAL",
    "sleep_quality": "INTEGER",
    "earth_longing": "TEXT",
    "exercised": "TEXT",
    "crew_issues": "TEXT",
    "free_notes": "TEXT",
}

with closing(sqlite3.connect(database_file, timeout=10)) as connection:
    with connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS daily_checkins (
                participant_code TEXT NOT NULL,
                checkin_date TEXT NOT NULL,
                vision_report TEXT NOT NULL,
                vision_note TEXT NOT NULL,
                mood_score INTEGER NOT NULL,
                mood_note TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (participant_code, checkin_date)
            )
        """)

        existing_columns = {
            row[1]
            for row in connection.execute(
                "PRAGMA table_info(daily_checkins)"
            )
        }

        for column, definition in new_columns.items():
            if column not in existing_columns:
                connection.execute(
                    f"ALTER TABLE daily_checkins "
                    f"ADD COLUMN {column} {definition}"
                )

        # Translate responses saved by the earlier bilingual form.
        for column in ["earth_longing", "exercised", "crew_issues"]:
            connection.execute(
                f"""
                UPDATE daily_checkins
                SET {column} = CASE
                    WHEN {column} LIKE 'Not answered / %'
                        THEN 'Not answered'
                    WHEN {column} LIKE 'Yes / %'
                        THEN 'Yes'
                    WHEN {column} LIKE 'No / %'
                        THEN 'No'
                    ELSE {column}
                END
                WHERE {column} LIKE 'Not answered / %'
                   OR {column} LIKE 'Yes / %'
                   OR {column} LIKE 'No / %'
                """
            )

participant_code = st.text_input(
    "Participant Code",
    placeholder="Example: TEST001",
    max_chars=40,
    key="wellbeing_participant",
).strip()

st.caption(
    "Use a TEST code for practice entries. "
    "Saving again for the same participant and date updates that record."
)

with st.form("expanded_daily_checkin"):
    checkin_date = st.date_input(
        "Check-in Date",
        value=date.today(),
        max_value=date.today(),
    )

    st.subheader("Daily Wellbeing")

    mood_score = st.slider(
        "How is your mood today?",
        min_value=1,
        max_value=10,
        value=5,
        help="1 = Very low mood. 10 = Very good mood.",
    )

    stress_score = st.slider(
        "How would you rate your stress level today?",
        min_value=1,
        max_value=10,
        value=5,
        help="1 = Very low stress. 10 = Very high stress.",
    )

    sleep_hours = st.number_input(
        "How many hours did you sleep in the last 24 hours?",
        min_value=0.0,
        max_value=24.0,
        value=7.0,
        step=0.5,
    )

    sleep_quality = st.slider(
        "How would you rate your sleep quality?",
        min_value=1,
        max_value=10,
        value=5,
        help="1 = Very poor sleep quality. 10 = Very good sleep quality.",
    )

    answer_options = ["Not answered", "Yes", "No"]

    earth_longing = st.selectbox(
        "Do you feel homesick or miss life on Earth?",
        options=answer_options,
    )

    exercised = st.selectbox(
        "Did you exercise today?",
        options=answer_options,
    )

    crew_issues = st.selectbox(
        "Did you experience any difficulties with the crew today?",
        options=answer_options,
    )

    free_notes = st.text_area(
        "Additional Notes",
        placeholder="Share any other observations about your day.",
        max_chars=2000,
    )

    st.subheader("Vision")

    vision_report = st.selectbox(
        "Have you noticed any changes in your vision today?",
        options=[
            "No change reported",
            "Blurred vision",
            "Difficulty focusing",
            "Other change",
        ],
    )

    vision_note = st.text_area(
        "Vision Observations",
        placeholder="Describe any changes you noticed.",
        max_chars=1000,
    )

    submitted = st.form_submit_button("Save Daily Check-in")

if submitted:
    if not participant_code:
        st.error("Enter a participant code before saving.")
    else:
        entry = {
            "participant_code": participant_code,
            "checkin_date": checkin_date.isoformat(),
            "vision_report": vision_report,
            "vision_note": vision_note.strip(),
            "mood_score": mood_score,
            "mood_note": free_notes.strip(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "mood_scale": 10,
            "stress_score": stress_score,
            "sleep_hours": sleep_hours,
            "sleep_quality": sleep_quality,
            "earth_longing": earth_longing,
            "exercised": exercised,
            "crew_issues": crew_issues,
            "free_notes": free_notes.strip(),
        }

        columns = list(entry)
        column_names = ", ".join(columns)
        placeholders = ", ".join("?" for column in columns)

        updates = ", ".join(
            f"{column} = excluded.{column}"
            for column in columns
            if column not in ["participant_code", "checkin_date"]
        )

        with closing(
            sqlite3.connect(database_file, timeout=10)
        ) as connection:
            with connection:
                connection.execute(
                    f"""
                    INSERT INTO daily_checkins ({column_names})
                    VALUES ({placeholders})
                    ON CONFLICT(participant_code, checkin_date)
                    DO UPDATE SET {updates}
                    """,
                    tuple(entry.values()),
                )

        st.success("Your daily check-in has been saved.")

if participant_code:
    with closing(
        sqlite3.connect(database_file, timeout=10)
    ) as connection:
        checkins = pd.read_sql_query(
            """
            SELECT *
            FROM daily_checkins
            WHERE participant_code = ?
            ORDER BY checkin_date
            """,
            connection,
            params=(participant_code,),
        )

    st.subheader("Saved Check-ins")

    if checkins.empty:
        st.info("No records have been saved for this participant yet.")
    else:
        st.dataframe(checkins, hide_index=True)

        st.caption(
            "The mood_scale column identifies the rating scale. "
            "Older records use 5; new records use 10. "
            "Empty fields in older records were not collected."
        )

        st.download_button(
            "Download Check-ins as CSV",
            data=checkins.to_csv(index=False).encode("utf-8-sig"),
            file_name="daily_wellbeing_checkins.csv",
            mime="text/csv",
        )


# ==================================================
# 5. AI — UNUSUAL READING DETECTION
# ==================================================

st.divider()
st.header("AI — Unusual Reading Detection")
st.caption(
    "Exploratory statistical analysis of the selected health recording. "
    "The model is fitted and evaluated on this same recording. "
    "Results have no clinical validation."
)

try:
    from sklearn.ensemble import IsolationForest
except ImportError:
    st.info(
        "Install the AI library in the terminal: "
        "py -m pip install scikit-learn"
    )
else:
    has_estimates = recording[flag_columns].any(axis=1)

    has_valid_numbers = np.isfinite(
        recording[measurements].to_numpy(dtype=float)
    ).all(axis=1)

    analysis_data = recording.loc[
        ~has_estimates & has_valid_numbers
    ].copy()

    excluded_count = len(recording) - len(analysis_data)

    st.caption(
        f"Recording: {recording_id} | "
        f"Complete original rows: {len(analysis_data)} | "
        f"Excluded rows: {excluded_count}"
    )

    if len(analysis_data) < 2:
        st.info("More complete original readings are needed.")
    else:
        features = analysis_data[measurements]

        model = IsolationForest(
            n_estimators=100,
            contamination="auto",
            random_state=42,
        )

        predictions = model.fit_predict(features)

        analysis_data["model_score"] = (
            model.decision_function(features)
        )
        analysis_data["unusual"] = predictions == -1

        unusual_rows = analysis_data.loc[
            analysis_data["unusual"]
        ]

        total, flagged = st.columns(2)

        total.metric("Readings Analysed", len(analysis_data))
        flagged.metric("Unusual Readings", len(unusual_rows))

        st.line_chart(
            analysis_data.set_index("Time [s]")[["model_score"]],
            y_label="Model score",
        )

        selected_result = analysis_data.loc[
            analysis_data["Time [s]"] == selected_time
        ]

        if selected_result.empty:
            st.info(
                "The selected time contains estimated or invalid "
                "measurements and was excluded."
            )
        elif bool(selected_result.iloc[0]["unusual"]):
            st.warning(
                "The selected reading differs from the pattern "
                "learned from this recording."
            )
        else:
            st.info(
                "The selected reading was not flagged by this model."
            )

        with st.expander("View Flagged Readings"):
            st.dataframe(
                unusual_rows[
                    ["Time [s]", *measurements, "model_score"]
                ],
                hide_index=True,
            )

            import json
import random
import re
import uuid


st.divider()
st.header("Cognitive Performance — Memory")
st.caption(
    "Practice task: remember five words, hide them, then recall them. "
    "This task is self-paced and has no clinical validation."
)

memory_database = app_folder / "daily_checkins.db"

with closing(
    sqlite3.connect(memory_database, timeout=10)
) as connection:
    with connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS memory_results (
                test_id TEXT PRIMARY KEY,
                participant_code TEXT NOT NULL,
                completed_at TEXT NOT NULL,
                target_words TEXT NOT NULL,
                recalled_text TEXT NOT NULL,
                correct_count INTEGER NOT NULL,
                extra_count INTEGER NOT NULL,
                total_words INTEGER NOT NULL
            )
        """)

memory_participant = st.text_input(
    "Participant code for the memory test",
    placeholder="Example: TEST001",
    max_chars=40,
    key="memory_participant",
).strip()

# Reset the active task when the participant changes.
memory_test = st.session_state.get("memory_test")

if (
    memory_test is not None
    and memory_test["participant"] != memory_participant
):
    del st.session_state["memory_test"]
    memory_test = None

if memory_test is None:
    st.write(
        "You will see five words. Read them carefully. "
        "When you are ready, hide the words and enter your answer."
    )

    if st.button(
        "Start Memory Test",
        key="start_memory_test",
        disabled=not memory_participant,
    ):
        word_pool = [
            "apple", "river", "chair", "moon", "book",
            "garden", "clock", "pencil", "mountain", "bread",
            "window", "horse", "cloud", "flower", "train",
            "ocean", "candle", "bridge", "lemon", "basket",
            "forest", "mirror", "stone", "bird", "table",
        ]

        st.session_state["memory_test"] = {
            "test_id": str(uuid.uuid4()),
            "participant": memory_participant,
            "words": random.sample(word_pool, 5),
            "stage": "memorize",
        }

        st.rerun()

else:
    st.caption(
        f"Participant: {memory_test['participant']}"
    )

    if memory_test["stage"] == "memorize":
        st.subheader("Remember these words")

        st.info(
            "  •  ".join(
                word.upper()
                for word in memory_test["words"]
            )
        )

        if st.button(
            "Hide Words and Continue",
            key="hide_memory_words",
        ):
            st.session_state["memory_test"]["stage"] = "recall"
            st.rerun()

    elif memory_test["stage"] == "recall":
        with st.form("memory_recall_form"):
            recalled_text = st.text_area(
                "Which words do you remember?",
                placeholder="Separate the words with spaces or commas.",
                max_chars=500,
            )

            st.caption(
                "Use the original English spelling. "
                "Capitalization and word order do not matter."
            )

            submit_memory = st.form_submit_button(
                "Submit Memory Test"
            )

        if submit_memory:
            if not recalled_text.strip():
                st.warning(
                    "Enter your answer, or use the button below "
                    "if you cannot recall any words."
                )
            else:
                st.session_state["memory_test"]["answer"] = (
                    recalled_text.strip()
                )
                st.session_state["memory_test"]["stage"] = "score"
                st.rerun()

        if st.button(
            "I Cannot Recall Any Words",
            key="no_memory_recall",
        ):
            st.session_state["memory_test"]["answer"] = ""
            st.session_state["memory_test"]["stage"] = "score"
            st.rerun()

    elif memory_test["stage"] == "score":
        targets = set(memory_test["words"])

        recalled_words = set(
            re.findall(
                r"[a-z]+",
                memory_test["answer"].lower(),
            )
        )

        correct_words = sorted(targets & recalled_words)
        missed_words = sorted(targets - recalled_words)
        extra_words = sorted(recalled_words - targets)

        completed_at = datetime.now(timezone.utc).isoformat()

        with closing(
            sqlite3.connect(memory_database, timeout=10)
        ) as connection:
            with connection:
                connection.execute(
                    """
                    INSERT OR IGNORE INTO memory_results (
                        test_id,
                        participant_code,
                        completed_at,
                        target_words,
                        recalled_text,
                        correct_count,
                        extra_count,
                        total_words
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        memory_test["test_id"],
                        memory_test["participant"],
                        completed_at,
                        json.dumps(memory_test["words"]),
                        memory_test["answer"],
                        len(correct_words),
                        len(extra_words),
                        len(targets),
                    ),
                )

        st.session_state["memory_test"]["correct"] = correct_words
        st.session_state["memory_test"]["missed"] = missed_words
        st.session_state["memory_test"]["extra"] = extra_words
        st.session_state["memory_test"]["stage"] = "finished"

        st.rerun()

    elif memory_test["stage"] == "finished":
        st.success("Memory test completed and saved.")

        correct_column, extra_column = st.columns(2)

        correct_column.metric(
            "Correct Words",
            f"{len(memory_test['correct'])} / 5",
        )

        extra_column.metric(
            "Extra Words",
            len(memory_test["extra"]),
        )

        st.write(
            "Correct words: "
            + (", ".join(memory_test["correct"]) or "None")
        )
        st.write(
            "Missed words: "
            + (", ".join(memory_test["missed"]) or "None")
        )
        st.write(
            "Extra words: "
            + (", ".join(memory_test["extra"]) or "None")
        )

        if st.button(
            "Start Another Memory Test",
            key="restart_memory_test",
        ):
            del st.session_state["memory_test"]
            st.rerun()

if memory_participant:
    with closing(
        sqlite3.connect(memory_database, timeout=10)
    ) as connection:
        memory_history = pd.read_sql_query(
            """
            SELECT
                completed_at,
                correct_count,
                extra_count,
                total_words
            FROM memory_results
            WHERE participant_code = ?
            ORDER BY completed_at
            """,
            connection,
            params=(memory_participant,),
        )

    if not memory_history.empty:
        st.subheader("Saved Memory Results")
        st.dataframe(memory_history, hide_index=True)

        memory_export = memory_history.copy()
        memory_export.insert(
            0,
            "participant_code",
            memory_participant,
        )

        st.download_button(
            "Download Memory Results as CSV",
            data=memory_export.to_csv(index=False).encode("utf-8-sig"),
            file_name="memory_results.csv",
            mime="text/csv",
        )

        import json
import random
import sqlite3
import uuid

from contextlib import closing
from datetime import datetime, timezone


st.divider()
st.header("Cognitive Performance — Attention")
st.caption(
    "Visual search practice: count a target letter among similar letters. "
    "This task is self-paced and has no clinical validation."
)

attention_database = app_folder / "daily_checkins.db"

with closing(
    sqlite3.connect(attention_database, timeout=10)
) as connection:
    with connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS attention_results (
                test_id TEXT PRIMARY KEY,
                participant_code TEXT NOT NULL,
                completed_at TEXT NOT NULL,
                target_letter TEXT NOT NULL,
                letter_grid TEXT NOT NULL,
                target_count INTEGER NOT NULL,
                submitted_count INTEGER NOT NULL,
                absolute_error INTEGER NOT NULL,
                total_letters INTEGER NOT NULL
            )
        """)

attention_participant = st.text_input(
    "Participant code for the attention test",
    placeholder="Example: TEST001",
    max_chars=40,
    key="attention_participant",
).strip()

attention_test = st.session_state.get("attention_test")

if (
    attention_test is not None
    and attention_test["participant"] != attention_participant
):
    del st.session_state["attention_test"]
    attention_test = None

if attention_test is None:
    st.write(
        "A grid of letters will appear. "
        "Count how many times the target letter appears."
    )

    if st.button(
        "Start Attention Test",
        key="start_attention_test",
        disabled=not attention_participant,
    ):
        letters = ["E", "F", "P", "R", "T"]
        target = random.choice(letters)
        target_count = random.randint(4, 12)

        distractors = [
            letter for letter in letters
            if letter != target
        ]

        grid_letters = (
            [target] * target_count
            + random.choices(
                distractors,
                k=48 - target_count,
            )
        )

        random.shuffle(grid_letters)

        grid_rows = [
            grid_letters[index:index + 8]
            for index in range(0, 48, 8)
        ]

        st.session_state["attention_test"] = {
            "test_id": str(uuid.uuid4()),
            "participant": attention_participant,
            "target": target,
            "target_count": target_count,
            "grid": grid_rows,
            "stage": "search",
        }

        st.rerun()

else:
    st.caption(
        f"Participant: {attention_test['participant']}"
    )

    if attention_test["stage"] == "search":
        st.subheader(
            f"Count the letter: {attention_test['target']}"
        )

        grid_text = "\n".join(
            "   ".join(row)
            for row in attention_test["grid"]
        )

        st.code(grid_text, language=None)

        with st.form("attention_answer_form"):
            submitted_count = st.number_input(
                "How many times does the target letter appear?",
                min_value=0,
                max_value=48,
                value=0,
                step=1,
            )

            submit_attention = st.form_submit_button(
                "Submit Attention Test"
            )

        if submit_attention:
            absolute_error = abs(
                submitted_count - attention_test["target_count"]
            )

            completed_at = datetime.now(timezone.utc).isoformat()

            with closing(
                sqlite3.connect(attention_database, timeout=10)
            ) as connection:
                with connection:
                    connection.execute(
                        """
                        INSERT OR IGNORE INTO attention_results (
                            test_id,
                            participant_code,
                            completed_at,
                            target_letter,
                            letter_grid,
                            target_count,
                            submitted_count,
                            absolute_error,
                            total_letters
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            attention_test["test_id"],
                            attention_test["participant"],
                            completed_at,
                            attention_test["target"],
                            json.dumps(attention_test["grid"]),
                            attention_test["target_count"],
                            int(submitted_count),
                            absolute_error,
                            48,
                        ),
                    )

            st.session_state["attention_test"]["answer"] = int(
                submitted_count
            )
            st.session_state["attention_test"]["error"] = (
                absolute_error
            )
            st.session_state["attention_test"]["stage"] = "finished"

            st.rerun()

    elif attention_test["stage"] == "finished":
        st.success("Attention test completed and saved.")

        expected, submitted, difference = st.columns(3)

        expected.metric(
            "Actual Target Count",
            attention_test["target_count"],
        )
        submitted.metric(
            "Your Answer",
            attention_test["answer"],
        )
        difference.metric(
            "Absolute Counting Error",
            attention_test["error"],
        )

        if attention_test["error"] == 0:
            st.info("Your answer matches the target count.")
        else:
            st.info(
                "Your answer differs from the target count by "
                f"{attention_test['error']}."
            )

        if st.button(
            "Start Another Attention Test",
            key="restart_attention_test",
        ):
            del st.session_state["attention_test"]
            st.rerun()

if attention_participant:
    with closing(
        sqlite3.connect(attention_database, timeout=10)
    ) as connection:
        attention_history = pd.read_sql_query(
            """
            SELECT
                completed_at,
                target_letter,
                target_count,
                submitted_count,
                absolute_error
            FROM attention_results
            WHERE participant_code = ?
            ORDER BY completed_at
            """,
            connection,
            params=(attention_participant,),
        )

    if not attention_history.empty:
        st.subheader("Saved Attention Results")
        st.dataframe(attention_history, hide_index=True)

        attention_export = attention_history.copy()
        attention_export.insert(
            0,
            "participant_code",
            attention_participant,
        )

        st.download_button(
            "Download Attention Results as CSV",
            data=attention_export.to_csv(
                index=False
            ).encode("utf-8-sig"),
            file_name="attention_results.csv",
            mime="text/csv",
        )    