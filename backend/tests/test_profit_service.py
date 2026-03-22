import pytest
from app.services.profit_service import compute_summary, compute_forecast

def test_compute_summary():
    entries = [
        {"entry_date": "2023-01-15T00:00:00", "entry_type": "revenue", "amount": 1000.0},
        {"entry_date": "2023-01-20T00:00:00", "entry_type": "expense", "amount": 400.0},
        {"entry_date": "2023-02-10T00:00:00", "entry_type": "revenue", "amount": 2000.0},
        {"entry_date": "2023-02-15T00:00:00", "entry_type": "expense", "amount": 500.0},
    ]
    summaries = compute_summary(entries)
    assert len(summaries) == 2
    
    assert summaries[0].period == "2023-01"
    assert summaries[0].total_revenue == 1000.0
    assert summaries[0].total_expenses == 400.0
    assert summaries[0].net_profit == 600.0
    assert summaries[0].profit_margin_pct == 60.0

    assert summaries[1].period == "2023-02"
    assert summaries[1].total_revenue == 2000.0
    assert summaries[1].total_expenses == 500.0
    assert summaries[1].net_profit == 1500.0
    assert summaries[1].profit_margin_pct == 75.0

def test_compute_forecast_insufficient_data():
    entries = [{"entry_date": "2023-01-15T00:00:00", "entry_type": "revenue", "amount": 1000.0}]
    forecast = compute_forecast(entries, months_ahead=2)
    assert len(forecast.forecast) == 2
    assert forecast.forecast[0].predicted_revenue == 0.0
    assert forecast.forecast[1].predicted_revenue == 0.0

def test_compute_forecast_trend():
    entries = [
        {"entry_date": "2023-01-01T00:00:00", "entry_type": "revenue", "amount": 1000.0},
        {"entry_date": "2023-01-01T00:00:00", "entry_type": "expense", "amount": 200.0},
        {"entry_date": "2023-02-01T00:00:00", "entry_type": "revenue", "amount": 2000.0},
        {"entry_date": "2023-02-01T00:00:00", "entry_type": "expense", "amount": 400.0},
        {"entry_date": "2023-03-01T00:00:00", "entry_type": "revenue", "amount": 3000.0},
        {"entry_date": "2023-03-01T00:00:00", "entry_type": "expense", "amount": 600.0},
    ]
    forecast = compute_forecast(entries, months_ahead=2)
    assert len(forecast.forecast) == 2
    
    # 2023-04
    assert forecast.forecast[0].month == "2023-04"
    assert forecast.forecast[0].predicted_revenue == 4000.0
    assert forecast.forecast[0].predicted_expenses == 800.0
    assert forecast.forecast[0].predicted_profit == 3200.0
