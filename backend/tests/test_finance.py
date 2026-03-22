import math
import pytest
from app.utils.finance import (
    calculate_discount_viability,
    DiscountRiskLevel,
)

def test_calculate_discount_viability_normal():
    # current_price=100, fixed=1000, variable=40, target_profit=500
    report = calculate_discount_viability(
        current_price=100.0,
        fixed_costs=1000.0,
        variable_costs=40.0,
        target_profit=500.0
    )
    
    assert report.current_price == 100.0
    assert report.base_contribution_margin == 60.0
    assert report.base_breakeven_volume == 16.67

    assert len(report.tiers) == 3
    t1 = report.tiers[0]
    assert t1.discount_pct == 0.10
    assert t1.discounted_price == 90.0
    assert t1.contribution_margin == 50.0  # 90 - 40
    assert t1.is_viable is True
    assert t1.breakeven_volume == 20.0  # 1000 / 50
    assert t1.required_volume == 30.0   # 1500 / 50
    # base BEP = 16.666..., req_vol = 30.0
    # multiple = 30 / 16.666 = 1.8
    assert math.isclose(t1.volume_multiple, 1.8)
    assert t1.risk_level == DiscountRiskLevel.MEDIUM

def test_calculate_discount_viability_unviable():
    # Price = 50, Var = 40. A 30% discount makes price 35 (below cost).
    report = calculate_discount_viability(
        current_price=50.0,
        fixed_costs=1000.0,
        variable_costs=40.0,
        target_profit=100.0
    )
    t3 = report.tiers[2] # 30%
    assert t3.discount_pct == 0.30
    assert t3.is_viable is False
    assert math.isinf(t3.breakeven_volume)
    assert t3.risk_level == DiscountRiskLevel.HIGH

def test_calculate_discount_viability_exceptions():
    with pytest.raises(ValueError, match="positive"):
        calculate_discount_viability(0, 100, 40, 50)
    with pytest.raises(ValueError, match="negative"):
        calculate_discount_viability(100, -100, 40, 50)
    with pytest.raises(ValueError, match="greater than variable_costs"):
        calculate_discount_viability(50, 100, 50, 50)
