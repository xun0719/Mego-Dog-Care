"""回憶模式：保留紀錄、停止提醒、關閉公開身分頁，並阻擋新增紀錄。"""
from types import SimpleNamespace

import pytest
from bson import ObjectId
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api.routes.weights import router as weights_router
from app.schemas import PetMemorialRequest
from app.services import pet_service


def _matches(record, query):
    for key, expected in query.items():
        value = record.get(key)
        if isinstance(expected, dict) and "$in" in expected:
            if value not in expected["$in"]:
                return False
        elif value != expected:
            return False
    return True


class Collection:
    def __init__(self, records=()):
        self.records = [dict(record) for record in records]

    def find_one(self, query, _projection=None):
        return next((record for record in self.records if _matches(record, query)), None)

    def find_one_and_update(self, query, update, return_document=False):
        record = self.find_one(query)
        if not record:
            return None
        record.update(update.get("$set", {}))
        for key in update.get("$unset", {}):
            record.pop(key, None)
        return record

    def update_many(self, query, update):
        matched = [record for record in self.records if _matches(record, query)]
        for record in matched:
            record.update(update.get("$set", {}))
            for key in update.get("$unset", {}):
                record.pop(key, None)
        return SimpleNamespace(modified_count=len(matched))


@pytest.fixture
def memorial_db(monkeypatch):
    pet_id = ObjectId()
    other_pet = str(ObjectId())
    db = SimpleNamespace(
        pets=Collection([{
            "_id": pet_id, "userId": "u1", "name": "小米", "gender": "female", "breed": "柴犬",
            "birthday": "2015-04-02", "arrivalDate": "2015-06-01",
        }]),
        reminders=Collection([
            {"_id": 1, "petId": str(pet_id), "status": "pending"},
            {"_id": 2, "petId": str(pet_id), "status": "snoozed"},
            {"_id": 3, "petId": str(pet_id), "status": "completed"},
            {"_id": 4, "petId": other_pet, "status": "pending"},
        ]),
        lost_pet_profiles=Collection([{"petId": str(pet_id), "enabled": True, "lostMode": False}]),
    )
    monkeypatch.setattr(pet_service, "db", db)
    return str(pet_id), db


def test_memorial_keeps_pet_stops_open_reminders_and_hides_public_identity(memorial_db):
    pet_id, db = memorial_db
    result = pet_service.set_memorial(
        pet_id, "u1", PetMemorialRequest(passedAwayDate="2026-10-01", memorialNote=" 謝謝你陪伴我們 "),
    )
    pet = result["petData"]
    assert pet["memorial"] is True
    assert pet["passedAwayDate"] == "2026-10-01"
    assert pet["memorialNote"] == "謝謝你陪伴我們"
    assert result["stoppedReminderCount"] == 2
    statuses = {record["_id"]: record["status"] for record in db.reminders.records}
    assert statuses == {1: "skipped", 2: "skipped", 3: "completed", 4: "pending"}
    profile = db.lost_pet_profiles.records[0]
    assert profile["enabled"] is False and profile["disabledByMemorial"] is True


@pytest.mark.parametrize("date, message", [
    ("2999-01-01", "離開日期不能晚於今天"),
    ("2015-01-01", "離開日期不能早於生日或到家日"),
])
def test_memorial_rejects_impossible_dates(memorial_db, date, message):
    pet_id, _db = memorial_db
    with pytest.raises(HTTPException) as error:
        pet_service.set_memorial(pet_id, "u1", PetMemorialRequest(passedAwayDate=date))
    assert error.value.status_code == 422 and error.value.detail == message


def test_memorial_requires_pet_owner(memorial_db):
    pet_id, _db = memorial_db
    with pytest.raises(HTTPException) as error:
        pet_service.set_memorial(pet_id, "someone-else", PetMemorialRequest(passedAwayDate="2026-10-01"))
    assert error.value.status_code == 404


def test_restore_reenables_only_profiles_hidden_by_memorial(memorial_db):
    pet_id, db = memorial_db
    db.lost_pet_profiles.records.append({"petId": pet_id, "enabled": False})
    pet_service.set_memorial(pet_id, "u1", PetMemorialRequest(passedAwayDate="2026-10-01"))
    result = pet_service.clear_memorial(pet_id, "u1")
    assert result["petData"]["memorial"] is False
    assert result["petData"]["passedAwayDate"] == ""
    assert [profile["enabled"] for profile in db.lost_pet_profiles.records] == [True, False]
    # 已停止的提醒不會自動恢復，避免突然補發過期通知。
    assert db.reminders.records[0]["status"] == "skipped"


def test_creating_records_for_a_memorial_pet_is_blocked(memorial_db):
    pet_id, _db = memorial_db
    pet_service.set_memorial(pet_id, "u1", PetMemorialRequest(passedAwayDate="2026-10-01"))
    app = FastAPI()
    app.include_router(weights_router, prefix="/api")
    response = TestClient(app).post(
        f"/api/pets/{pet_id}/weights?userId=u1",
        json={"weightKg": 8.2, "measuredAt": "2026-10-02T09:00:00+08:00"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == pet_service.MEMORIAL_BLOCKED_MESSAGE


def test_active_pet_passes_the_guard(memorial_db):
    pet_id, _db = memorial_db
    assert pet_service.ensure_pet_active(pet_id, "u1") is None
