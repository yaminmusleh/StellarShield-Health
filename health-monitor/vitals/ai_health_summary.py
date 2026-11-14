
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai


# Load API key from backend/.env
PROJECT_ROOT = Path(__file__).resolve().parents[2]

load_dotenv(PROJECT_ROOT / "backend" / ".env")

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing from backend/.env")

client = genai.Client(api_key=API_KEY)

MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")


def generate_health_summary(data, cwi, status, fatigue, weekly=None):

    fatigue_text = (
        "Possible fatigue risk detected"
        if fatigue
        else "No fatigue flag detected by the Python screening rule"
    )

    weekly = weekly or {}

    prompt = f"""
    You are an astronaut wellbeing monitoring assistant.

    A Python application has calculated the following results.

    CREW WELLBEING INDEX:
    {cwi}/100

    WELLBEING STATUS:
    {status}

    CURRENT MEASUREMENTS:

    Mood: {data.get('mood_score', 'Not recorded')}/10
    Stress: {data.get('stress_score', 'Not recorded')}/10
    Sleep: {data.get('sleep_hours', 'Not recorded')} hours
    Sleep quality: {data.get('sleep_quality', 'Not recorded')}/10
    Exercise: {data.get('exercise_minutes', 'Not recorded')} minutes
    Social wellbeing: {data.get('social_score', 'Not recorded')}/10
    Workload: {data.get('workload_score', 'Not recorded')}/10
    Homesickness: {data.get('homesick_score', 'Not recorded')}/10

    FATIGUE SCREENING:
    {fatigue_text}

    WEEKLY TRENDS:

    Average mood: {weekly.get('avg_mood', 'Unavailable')}
    Average sleep: {weekly.get('avg_sleep', 'Unavailable')} hours
    Average stress: {weekly.get('avg_stress', 'Unavailable')}
    Average CWI: {weekly.get('avg_cwi', 'Unavailable')}

    YOUR TASK:

    1. SHORT WELLBEING SUMMARY
    Write 2-3 sentences describing the available indicators.

    2. FATIGUE RISK
    Explain the Python fatigue screening result.
    Never change the supplied fatigue result.

    3. RECOMMENDATIONS
    Give three practical recommendations based on the data.

    RULES:

    - Do not diagnose psychological or medical conditions.
    - Do not invent missing measurements.
    - Do not calculate or modify the CWI.
    - Do not contradict the Python fatigue result.
    - Do not make fitness-for-duty decisions.
    - Recommend professional review when concerning
      indicators warrant further assessment.
    - Use clear, professional language.
    """

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt
        )

        if not response.text:
            return "Gemini returned an empty response."

        return response.text

    except Exception as error:
        print("Gemini API error:", error)
        return "AI summary is currently unavailable."
