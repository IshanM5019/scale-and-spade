"""
Profit computation logic — P&L summaries and linear trend forecasting.
All pure Python, no external paid APIs needed.
"""
from collections import defaultdict
from datetime import date
from typing import Any

from app.models.profit import ProfitSummary, ProfitForecast, ForecastPoint


def compute_summary(entries: list[dict[str, Any]]) -> list[ProfitSummary]:
    """
    Groups profit entries by year-month and computes P&L per period.
    """
    monthly: dict[str, dict[str, float]] = defaultdict(lambda: {"revenue": 0.0, "expense": 0.0})

    for entry in entries:
        period = str(entry["entry_date"])[:7]  # "YYYY-MM"
        if entry["entry_type"] == "revenue":
            monthly[period]["revenue"] += float(entry["amount"])
        else:
            monthly[period]["expense"] += float(entry["amount"])

    summaries = []
    for period in sorted(monthly.keys()):
        revenue = monthly[period]["revenue"]
        expenses = monthly[period]["expense"]
        net = revenue - expenses
        margin = (net / revenue * 100) if revenue > 0 else None
        summaries.append(
            ProfitSummary(
                period=period,
                total_revenue=revenue,
                total_expenses=expenses,
                net_profit=net,
                profit_margin_pct=round(margin, 2) if margin is not None else None,
            )
        )
    return summaries


def compute_forecast(entries: list[dict[str, Any]], months_ahead: int = 3) -> ProfitForecast:
    """
    Simple linear trend forecast using least-squares regression.
    No ML library needed — pure Python math.
    """
    summaries = compute_summary(entries)

    if len(summaries) < 2:
        # Not enough data — return zeros
        from datetime import date
        import calendar
        forecast_points = []
        today = date.today()
        for i in range(1, months_ahead + 1):
            month = (today.month + i - 1) % 12 + 1
            year = today.year + (today.month + i - 1) // 12
            forecast_points.append(
                ForecastPoint(
                    month=f"{year}-{month:02d}",
                    predicted_revenue=0.0,
                    predicted_expenses=0.0,
                    predicted_profit=0.0,
                )
            )
        return ProfitForecast(forecast=forecast_points)

    # Build x (index) and y (values) series
    n = len(summaries)
    x = list(range(n))
    rev_y = [s.total_revenue for s in summaries]
    exp_y = [s.total_expenses for s in summaries]

    def linear_fit(xs: list[float], ys: list[float]):
        """Returns (slope, intercept) via least-squares."""
        x_mean = sum(xs) / len(xs)
        y_mean = sum(ys) / len(ys)
        numerator = sum((xi - x_mean) * (yi - y_mean) for xi, yi in zip(xs, ys))
        denominator = sum((xi - x_mean) ** 2 for xi in xs)
        slope = numerator / denominator if denominator != 0 else 0
        intercept = y_mean - slope * x_mean
        return slope, intercept

    rev_slope, rev_intercept = linear_fit(x, rev_y)
    exp_slope, exp_intercept = linear_fit(x, exp_y)

    # Parse last period to compute the next months
    last_period = summaries[-1].period  # "YYYY-MM"
    last_year, last_month = int(last_period[:4]), int(last_period[5:7])

    forecast_points = []
    for i in range(1, months_ahead + 1):
        xi = n + i - 1
        pred_rev = max(rev_slope * xi + rev_intercept, 0)
        pred_exp = max(exp_slope * xi + exp_intercept, 0)
        pred_profit = pred_rev - pred_exp

        month = (last_month + i - 1) % 12 + 1
        year = last_year + (last_month + i - 1) // 12
        forecast_points.append(
            ForecastPoint(
                month=f"{year}-{month:02d}",
                predicted_revenue=round(pred_rev, 2),
                predicted_expenses=round(pred_exp, 2),
                predicted_profit=round(pred_profit, 2),
            )
        )

    return ProfitForecast(forecast=forecast_points)
