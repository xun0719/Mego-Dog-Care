from datetime import datetime, timezone, timedelta
import pytest
from app.core.policy import monitored_rules
from app.services.health_monitor_service import monitor

def ctx(**overrides):
    base={"period":{"days":30,"startAt":datetime.now(timezone.utc)-timedelta(days=30),"endAt":datetime.now(timezone.utc)},"dailyLogs":{"food":{"recent":[]},"water":{"recent":[]},"energy":{"recent":[]},"stool":{"recent":[]}},"healthEvents":{"recentEvents":[]},"weight":{"series":[]},"medical":{"recentVisits":[]},"medications":{"active":[]},"vaccinations":{"latest":None},"dewormings":{"latest":None}}
    base.update(overrides); return base

def test_multiple_symptoms_and_deterministic():
    now=datetime.now(timezone.utc)
    c=ctx(healthEvents={"recentEvents":[{"type":"vomiting","occurredAt":now},{"type":"low_appetite","occurredAt":now},{"type":"low_energy","occurredAt":now}]})
    a=monitor(c).alerts; b=monitor(c).alerts
    assert any(x.type=="multiple_recent_symptoms" for x in a)
    assert [(x.id,x.type) for x in a]==[(x.id,x.type) for x in b]

def test_streak_non_trigger():
    c=ctx(dailyLogs={"food":{"recent":["low","normal","low"]},"water":{"recent":[]},"energy":{"recent":[]},"stool":{"recent":[]}})
    assert not any(x.type=="food_low_streak" for x in monitor(c).alerts)

def test_due_and_medication_rules():
    now=datetime.now(timezone.utc)
    c=ctx(medications={"active":[{"name":"藥物A","endDate":(now+timedelta(days=1)).date().isoformat()}]},vaccinations={"latest":{"vaccineName":"疫苗","nextDueAt":now+timedelta(days=3)}},dewormings={"latest":None})
    types={x.type for x in monitor(c).alerts}; assert "medication_ending_soon" in types and "vaccination_due" in types

def test_memorial_pet_has_no_forward_looking_care_alerts():
    now=datetime.now(timezone.utc)
    c=ctx(pet={"memorial":True},medical={"recentVisits":[{"id":"v1","followUpAt":now-timedelta(days=2)}]},medications={"active":[{"name":"藥物A","endDate":(now+timedelta(days=1)).date().isoformat()}]},vaccinations={"latest":{"vaccineName":"疫苗","nextDueAt":now+timedelta(days=3)}})
    types={x.type for x in monitor(c).alerts}
    assert not types & {"follow_up_overdue","medication_ending_soon","vaccination_due"}

def logs(**recent):
    base={"food":{"recent":[]},"water":{"recent":[]},"energy":{"recent":[]},"stool":{"recent":[]}}
    base.update({key:{"recent":value} for key,value in recent.items()}); return base

STREAK_CASES=[
    ("food_low_streak",{"food":["low"]*2},False),("food_low_streak",{"food":["low"]*3},True),
    ("food_high_streak",{"food":["high"]*3},False),
    ("water_low_streak",{"water":["low"]*3},True),("water_high_streak",{"water":["high"]*3},True),
    ("energy_low_streak",{"energy":["slightly_low"]*2},False),("energy_low_streak",{"energy":["slightly_low"]*3},True),
    ("stool_hard_streak",{"stool":["hard"]*2},False),("stool_hard_streak",{"stool":["hard"]*3},True),
    ("stool_soft_streak",{"stool":["soft"]*3},True),
    ("stool_watery_streak",{"stool":["watery"]},False),("stool_watery_streak",{"stool":["watery"]*2},True),
]

@pytest.mark.parametrize("alert_type,recent,expected", STREAK_CASES)
def test_streak_thresholds_follow_shared_rules(alert_type, recent, expected):
    """門檻來自 app/core/policy.py 的規則表，與首頁健康觀察同一份來源。"""
    found=any(x.type==alert_type for x in monitor(ctx(dailyLogs=logs(**recent))).alerts)
    assert found is expected

def test_monitored_rules_cover_every_streak_alert():
    """有「持續需留意」級距的規則才會產生 AI 警示；飼料偏多只在首頁提示。"""
    monitored={(rule.category, rule.status) for rule in monitored_rules()}
    assert ("food","high") not in monitored
    assert monitored == {("water","low"),("water","high"),("food","low"),("energy","slightly_low"),("stool","hard"),("stool","soft"),("stool","watery")}
