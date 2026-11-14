
-- =========================================
-- ASTRONAUTS
-- =========================================

CREATE TABLE IF NOT EXISTS astronauts (
    participant_code TEXT PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    date_of_birth DATE,
    nationality TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================
-- MEDICAL STAFF
-- =========================================

CREATE TABLE IF NOT EXISTS medical_staff (
    staff_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================
-- MEDICAL HISTORY
-- =========================================

CREATE TABLE IF NOT EXISTS medical_history (
    history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    participant_code TEXT NOT NULL REFERENCES astronauts(participant_code),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    category TEXT,
    description TEXT,
    recorded_by BIGINT REFERENCES medical_staff(staff_id)
);


-- =========================================
-- DAILY WELLBEING CHECK-INS
-- =========================================

CREATE TABLE IF NOT EXISTS daily_checkins (
    participant_code TEXT NOT NULL REFERENCES astronauts(participant_code),
    checkin_date DATE NOT NULL,
    vision_report TEXT,
    vision_note TEXT,
    mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
    mood_note TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    mood_scale TEXT,
    stress_score INTEGER CHECK (stress_score BETWEEN 1 AND 10),
    sleep_hours NUMERIC(4,2),
    sleep_quality TEXT,
    earth_longing TEXT,
    exercised BOOLEAN,
    crew_issues TEXT,
    free_notes TEXT,
    PRIMARY KEY (participant_code, checkin_date)
);


-- =========================================
-- MEMORY TEST RESULTS
-- =========================================

CREATE TABLE IF NOT EXISTS memory_results (
    test_id UUID PRIMARY KEY,
    participant_code TEXT NOT NULL REFERENCES astronauts(participant_code),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    target_words JSONB NOT NULL,
    recalled_text TEXT,
    correct_count INTEGER DEFAULT 0,
    extra_count INTEGER DEFAULT 0,
    total_words INTEGER DEFAULT 0
);


-- =========================================
-- VITAL SIGNS
-- =========================================

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


-- =========================================
-- SLEEP MONITORING
-- =========================================

CREATE TABLE IF NOT EXISTS sleep_records (
    sleep_record_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recording_id TEXT NOT NULL,
    onset_seconds NUMERIC NOT NULL,
    duration_seconds NUMERIC NOT NULL,
    stage TEXT NOT NULL
);


-- =========================================
-- RADIATION EXPOSURE
-- =========================================

CREATE TABLE IF NOT EXISTS radiation_exposure (
    radiation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reading_timestamp TIMESTAMPTZ NOT NULL,
    instrument_id TEXT,
    absorbed_dose_rate NUMERIC,
    instrument TEXT,
    spacecraft TEXT
);


-- =========================================
-- HEALTH ALERTS
-- =========================================

CREATE TABLE IF NOT EXISTS health_alerts (
    alert_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    participant_code TEXT REFERENCES astronauts(participant_code),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    alert_type TEXT NOT NULL,
    severity TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    resolved_at TIMESTAMPTZ
);


-- =========================================
-- SPACESUIT MANAGEMENT
-- =========================================

CREATE TABLE IF NOT EXISTS spacesuits (
    suit_id TEXT PRIMARY KEY,
    serial_number TEXT UNIQUE NOT NULL,
    suit_model TEXT,
    participant_code TEXT REFERENCES astronauts(participant_code),
    operational_status TEXT DEFAULT 'available',
    battery_capacity_wh NUMERIC(10,2),
    last_maintenance TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================
-- SPACESUIT LIVE MONITORING
-- =========================================

CREATE TABLE IF NOT EXISTS suit_telemetry (
    telemetry_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    suit_id TEXT NOT NULL REFERENCES spacesuits(suit_id),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    battery_percentage NUMERIC(5,2),
    battery_temperature NUMERIC(5,2),
    battery_voltage NUMERIC(8,2),
    suit_temperature NUMERIC(5,2),
    coolant_temperature NUMERIC(6,2),
    cabin_pressure NUMERIC(10,3),
    oxygen_level NUMERIC(6,2),
    co2_level NUMERIC(8,2),
    is_charging BOOLEAN DEFAULT FALSE,
    communication_status TEXT
);


-- =========================================
-- SPACESUIT CHARGING SESSIONS
-- =========================================

CREATE TABLE IF NOT EXISTS suit_charging_sessions (
    charging_session_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    suit_id TEXT REFERENCES spacesuits(suit_id),
    charging_date TIMESTAMPTZ DEFAULT NOW(),
    battery_level NUMERIC(5,2),
    working_time_hours NUMERIC(5,2),
    charging_status TEXT
);


-- =========================================
-- DATABASE INDEXES
-- =========================================

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

CREATE INDEX IF NOT EXISTS idx_suit_telemetry_suit_time
ON suit_telemetry(suit_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS mental_health_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    participant_code TEXT NOT NULL REFERENCES astronauts(participant_code),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    mood_score INTEGER,
    stress_score INTEGER,
    sleep_hours NUMERIC(4,2),
    sleep_quality INTEGER,
    exercise_minutes INTEGER,
    social_score INTEGER,
    workload_score INTEGER,
    homesick_score INTEGER,

    psychological_score NUMERIC(5,2)
);

ALTER TABLE mental_health_logs
ADD COLUMN IF NOT EXISTS health_status TEXT;

ALTER TABLE mental_health_logs
ADD COLUMN IF NOT EXISTS fatigue_risk BOOLEAN DEFAULT FALSE;