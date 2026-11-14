
from statistics import mean


def calculate_cwi(data):
    """Calculate Crew Wellbeing Index (0-100)."""

    mood = data["mood_score"] * 10
    sleep = data["sleep_quality"] * 10
    stress = (10 - data["stress_score"]) * 10
    social = data["social_score"] * 10
    exercise = min(data["exercise_minutes"], 60) / 60 * 100

    cwi = (
        mood * 0.25
        + sleep * 0.25
        + stress * 0.20
        + social * 0.15
        + exercise * 0.15
    )

    return round(cwi, 2)


def health_status(cwi):
    if cwi >= 80:
        return "Excellent"
    elif cwi >= 60:
        return "Good"
    elif cwi >= 40:
        return "Warning"
    return "High Risk"


def fatigue_risk(log):
    """Flag a possible fatigue concern."""

    return (
        log["sleep_hours"] is not None
        and log["stress_score"] is not None
        and log["sleep_hours"] < 6
        and log["stress_score"] > 7
    )


def weekly_analysis(logs):
    """Calculate weekly averages from available measurements."""

    if not logs:
        return None

    def safe_average(field):
        values = [
            float(log[field])
            for log in logs
            if log.get(field) is not None
        ]
        return round(mean(values), 2) if values else None

    return {
        "avg_mood": safe_average("mood_score"),
        "avg_sleep": safe_average("sleep_hours"),
        "avg_stress": safe_average("stress_score"),
        "avg_cwi": safe_average("psychological_score"),
        "records_count": len(logs)
    }
