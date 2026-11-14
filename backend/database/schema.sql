
CREATE TABLE IF NOT EXISTS astronauts (
    participant_code TEXT PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    date_of_birth DATE,
    nationality TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS missions (
    mission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mission_name TEXT NOT NULL,
    destination TEXT,
    start_date DATE,
    end_date DATE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_assignments (
    assignment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    participant_code TEXT NOT NULL REFERENCES astronauts(participant_code),
    mission_id BIGINT NOT NULL REFERENCES missions(mission_id),
    role TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (participant_code, mission_id)
);

CREATE TABLE IF NOT EXISTS medical_staff (
    staff_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_history (
    history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    participant_code TEXT NOT NULL REFERENCES astronauts(participant_code),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category TEXT,
    description TEXT,
    recorded_by BIGINT REFERENCES medical_staff(staff_id)
);

CREATE TABLE IF NOT EXISTS daily_checkins (
    participant_code TEXT NOT NULL REFERENCES astronauts(participant_code),
    checkin_date DATE NOT NULL,
    vision_report TEXT,
    vision_note TEXT,
    mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
    mood_note TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mood_scale TEXT,
    stress_score INTEGER CHECK (stress_score BETWEEN 1 AND 10),
    sleep_hours NUMERIC(4, 2),
    sleep_quality TEXT,
    earth_longing TEXT,
    exercised BOOLEAN,
    crew_issues TEXT,
    free_notes TEXT,
    PRIMARY KEY (participant_code, checkin_date)
);

CREATE TABLE IF NOT EXISTS memory_results (
    test_id UUID PRIMARY KEY,
    participant_code TEXT NOT NULL REFERENCES astronauts(participant_code),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_words JSONB NOT NULL,
    recalled_text TEXT,
    correct_count INTEGER NOT NULL DEFAULT 0,
    extra_count INTEGER NOT NULL DEFAULT 0,
    total_words INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vital_signs (
    vital_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recording_id TEXT NOT NULL,
    time_seconds NUMERIC NOT NULL,
    heart_rate NUMERIC,
    pulse NUMERIC,
    respiration NUMERIC,
    spo2 NUMERIC,
    heart_rate_imputed BOOLEAN DEFAULT FALSE,
    pulse_imputed BOOLEAN DEFAULT FALSE,
    respiration_imputed BOOLEAN DEFAULT FALSE,
    spo2_imputed BOOLEAN DEFAULT FALSE,
    UNIQUE (recording_id, time_seconds)
);

CREATE TABLE IF NOT EXISTS sleep_records (
    sleep_record_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recording_id TEXT NOT NULL,
    onset_seconds NUMERIC NOT NULL,
    duration_seconds NUMERIC NOT NULL,
    stage TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS radiation_exposure (
    radiation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reading_timestamp TIMESTAMPTZ NOT NULL,
    instrument_id TEXT,
    absorbed_dose_rate NUMERIC,
    instrument TEXT,
    spacecraft TEXT
);

CREATE TABLE IF NOT EXISTS health_alerts (
    alert_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    participant_code TEXT REFERENCES astronauts(participant_code),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    alert_type TEXT NOT NULL,
    severity TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_checkins_date
    ON daily_checkins(checkin_date);

CREATE INDEX IF NOT EXISTS idx_memory_participant
    ON memory_results(participant_code);

CREATE INDEX IF NOT EXISTS idx_medical_history_participant
    ON medical_history(participant_code);

CREATE INDEX IF NOT EXISTS idx_vital_recording
    ON vital_signs(recording_id);

CREATE INDEX IF NOT EXISTS idx_sleep_recording
    ON sleep_records(recording_id);

CREATE INDEX IF NOT EXISTS idx_radiation_timestamp
    ON radiation_exposure(reading_timestamp);

CREATE INDEX IF NOT EXISTS idx_alerts_participant
    ON health_alerts(participant_code);
