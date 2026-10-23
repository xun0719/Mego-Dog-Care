"""以當次開藥內容建立來源鍵；不改寫就醫快照，也不需要搬動既有資料。"""
import hashlib
import json

from fastapi import HTTPException

SOURCE_FIELDS = ("name", "instructions", "timesPerDay", "startDate", "endDate", "mealTiming", "notes")


def prescription_key(medication: dict) -> str:
    # 忽略只供畫面使用的來源鍵／療程 ID；字串前後空白不會變成另一份處方。
    values = {key: medication.get(key) for key in SOURCE_FIELDS}
    values = {key: value.strip() if isinstance(value, str) else value for key, value in values.items()}
    return hashlib.sha256(json.dumps(values, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def require_prescription(visit: dict, key: str) -> None:
    if not any(prescription_key(item) == key for item in visit.get("medications", [])):
        raise HTTPException(409, "當次開藥內容已變更，請返回就醫紀錄重新選擇。")


def with_course_links(visit: dict, courses=()) -> list[dict]:
    linked = {item["medicalVisitMedicationKey"]: str(item["_id"]) for item in courses if item.get("medicalVisitMedicationKey")}
    return [
        {**item, "sourceMedicationKey": key, "linkedMedicationId": linked.get(key)}
        for item in visit.get("medications", [])
        for key in [prescription_key(item)]
    ]
