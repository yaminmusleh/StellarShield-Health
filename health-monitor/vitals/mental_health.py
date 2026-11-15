
def calculate_cwi(data):

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


def fatigue_risk(data):

    return (
        data["sleep_hours"] < 6
        and data["stress_score"] > 7
    )
