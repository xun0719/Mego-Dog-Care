from app.timezone import now_taipei, TAIPEI
from datetime import datetime, time, timedelta
from app.schemas.ai import AIAlert, HealthMonitorResult
from app.core.policy import continued_days, get_policy

# 連續天數門檻來自 app/core/policy.py 的 HEALTH_TREND_RULES，與首頁健康觀察
# 共用同一張表；此處取「持續需留意」級距，沒有該級距的規則不產生警示。

def _aware(value):
    if isinstance(value, datetime) and value.tzinfo is None: return value.replace(tzinfo=TAIPEI)
    return value
def _end_of_taipei_day(value):
    """用藥結束日是日期欄位，當天整日都應視為仍在療程內。"""
    try:
        return datetime.combine(datetime.fromisoformat(value).date(), time.max, tzinfo=TAIPEI)
    except (TypeError, ValueError):
        return None
def _id(rule, evidence):
    stable = str(evidence.get("lastObservedAt") or evidence.get("endDate") or evidence.get("dueAt") or evidence.get("types") or "current")
    return f"{rule}:{stable}"
def _alert(rule, severity, title, message, evidence):
    first=evidence.get("firstObservedAt"); last=evidence.get("lastObservedAt")
    return AIAlert(id=_id(rule,evidence),type=rule,severity=severity,title=title,message=message,evidence=evidence,firstObservedAt=first,lastObservedAt=last)
def _matched(values, statuses, days):
    return bool(days) and len(values)>=days and all(v in statuses for v in values[-days:])

def _streak(summary, key, low, high, low_status, high_status):
    values=summary.get(key,{}).get("recent",[])
    n=continued_days(key, low_status)
    if _matched(values, low, n): return _alert(f"{key}_low_streak","attention",f"近期{key}偏低",f"最近{n}筆{key}紀錄皆偏低。",{"records":values[-n:]})
    m=continued_days(key, high_status) if high_status else None
    if high and _matched(values, high, m): return _alert(f"{key}_high_streak","attention",f"近期{key}偏高",f"最近{m}筆{key}紀錄皆偏高。",{"records":values[-m:]})
    return None
def monitor(context):
    alerts=[]; logs=context.get("dailyLogs",{}); policy=get_policy()
    for key,low,high,low_status,high_status in (("food",{"low"},set(),"low",None),("water",{"low"},{"high"},"low","high"),("energy",{"slightly_low"},set(),"slightly_low",None)):
        a=_streak(logs,key,low,high,low_status,high_status)
        if a: alerts.append(a)
    stool=logs.get("stool",{}).get("recent",[]); hard=continued_days("stool","hard"); soft=continued_days("stool","soft"); watery=continued_days("stool","watery")
    if _matched(stool,{"hard"},hard):
        alerts.append(_alert("stool_hard_streak","attention","近期排便偏硬",f"最近{hard}筆排便紀錄皆偏硬。",{"records":stool[-hard:]}))
    elif _matched(stool,{"soft"},soft):
        alerts.append(_alert("stool_soft_streak","attention","近期排便偏軟",f"最近{soft}筆排便紀錄皆偏軟。",{"records":stool[-soft:]}))
    elif _matched(stool,{"watery"},watery):
        alerts.append(_alert("stool_watery_streak","attention","近期水狀便紀錄",f"最近 {watery} 筆排便紀錄皆為水狀。",{"records":stool[-watery:]}))
    events=context.get("healthEvents",{}).get("recentEvents",[]); types=[x.get("type") for x in events]
    for typ in sorted(set(types)):
        if types.count(typ)>=policy.repeated_event_count: alerts.append(_alert("repeated_health_event","attention","近期健康異常重複出現",f"最近期間記錄了 {types.count(typ)} 次相同類型的健康異常。",{"type":typ,"count":types.count(typ)}))
    now=now_taipei(); window=now-timedelta(hours=policy.recent_symptom_window_hours)
    recent=[x for x in events if _aware(x.get("occurredAt")) and _aware(x["occurredAt"])>=window]
    distinct=sorted({x.get("type") for x in recent if x.get("type")})
    if len(distinct)>=3: alerts.append(_alert("multiple_recent_symptoms","attention","近期有多種健康異常紀錄",f"最近 {policy.recent_symptom_window_hours} 小時內記錄了多種不同健康異常。",{"windowHours":policy.recent_symptom_window_hours,"types":distinct,"count":len(recent),"events":[{"type":x.get("type"),"occurredAt":x.get("occurredAt")} for x in recent]}))
    severe=[x for x in events if x.get("severity")=="severe"]
    if severe: alerts.append(_alert("severe_health_event","urgent","有嚴重異常紀錄","最近有一筆被標記為嚴重的健康異常紀錄。",{"eventIds":[x.get("id") for x in severe]}))
    series=context.get("weight",{}).get("series",[])
    if len(series)>=2 and series[0].get("weightKg") and series[-1].get("weightKg")<series[0]["weightKg"]:
        pct=(series[-1]["weightKg"]-series[0]["weightKg"])/series[0]["weightKg"]*100
        if pct<=-policy.weight_change_attention_percent: alerts.append(_alert("weight_decrease","attention","近期體重變化",f"此期間紀錄的體重下降約 {abs(pct):.1f}%。",{"changePercent":round(pct,2)}))
    # 已移到回憶的毛孩不再提示回診、療程或疫苗驅蟲到期。
    memorial=bool(context.get("pet",{}).get("memorial"))
    for item in ([] if memorial else context.get("medical",{}).get("recentVisits",[])):
        due=_aware(item.get("followUpAt"))
        if due and due<now and not item.get("followUpCompleted",False): alerts.append(_alert("follow_up_overdue","attention","回診提醒已逾期","有一筆回診日期已超過且尚未完成。",{"dueAt":due,"medicalVisitId":item.get("id")}))
    for item in ([] if memorial else context.get("medications",{}).get("active",[])):
        end=item.get("endDate")
        if end:
            end_date=_end_of_taipei_day(end)
            if end_date and now<=end_date<=now+timedelta(days=policy.medication_ending_soon_days): alerts.append(_alert("medication_ending_soon","info","用藥療程即將結束",f"{item.get('name','用藥')} 的紀錄療程即將結束。",{"medicationName":item.get("name",""),"endDate":end,"daysRemaining":(end_date-now).days}))
    for key,label in (("vaccinations","疫苗"),("dewormings","驅蟲")):
        latest=None if memorial else context.get(key,{}).get("latest")
        due=_aware(latest.get("nextDueAt")) if latest else None
        if due:
            if due<now: alerts.append(_alert(f"{key[:-1]}_due","attention",f"{label}日期已超過",f"{label}的下次預計日期已超過。",{"nextDueAt":due,"status":"overdue"}))
            elif due<=now+timedelta(days=policy.care_due_soon_days): alerts.append(_alert(f"{key[:-1]}_due","info",f"{label}即將到期",f"{label}的下一次預計日期即將到來。",{"nextDueAt":due,"status":"upcoming"}))
    rank={"urgent":0,"attention":1,"info":2}; alerts.sort(key=lambda x:(rank[x.severity],-(x.lastObservedAt.timestamp() if isinstance(x.lastObservedAt,datetime) else 0),x.id))
    return HealthMonitorResult(period=context["period"],alerts=alerts,summary={"total":len(alerts),"info":sum(x.severity=="info" for x in alerts),"attention":sum(x.severity=="attention" for x in alerts),"urgent":sum(x.severity=="urgent" for x in alerts)})
