from copy import deepcopy
from types import SimpleNamespace
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from unittest.mock import patch
import sys

import pytest
from bson import ObjectId
from fastapi import HTTPException
from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError

from app.schemas.medication import MedicationRequest
from app.services.medication_source import prescription_key, require_prescription, with_course_links


PRESCRIPTION = {
    "name": "藥袋 A", "instructions": "依藥袋說明", "timesPerDay": 2,
    "startDate": "2026-10-17", "endDate": "2026-10-24", "mealTiming": "after", "notes": "",
}


def test_source_key_ignores_display_metadata_but_changes_with_prescription():
    key = prescription_key(PRESCRIPTION)
    assert len(key) == 64
    assert key == prescription_key({**PRESCRIPTION, "name": " 藥袋 A ", "linkedMedicationId": "x", "sourceMedicationKey": "ignored"})
    assert key != prescription_key({**PRESCRIPTION, "timesPerDay": 3})


def test_invalid_source_is_rejected_and_links_remain_attached_to_matching_content():
    key = prescription_key(PRESCRIPTION)
    visit = {"medications": [PRESCRIPTION, {**PRESCRIPTION, "name": "藥袋 B"}]}
    require_prescription(visit, key)
    with pytest.raises(HTTPException) as error:
        require_prescription({"medications": []}, key)
    assert error.value.status_code == 409
    course_id = ObjectId()
    cards = with_course_links(visit, [{"_id": course_id, "medicalVisitMedicationKey": key}])
    assert cards[0]["linkedMedicationId"] == str(course_id)
    assert cards[1]["linkedMedicationId"] is None
    assert "sourceMedicationKey" not in PRESCRIPTION
    assert with_course_links(visit)[0]["linkedMedicationId"] is None


class Collection:
    def __init__(self):
        self.rows = []
        self.indexes = []
        self.race = False
        self.raise_duplicate = False

    def find_one(self, query):
        return next((deepcopy(row) for row in self.rows if all(row.get(key) == value for key, value in query.items())), None)

    def create_index(self, keys, **options):
        self.indexes.append((keys, options))

    def find_one_and_update(self, query, update, **options):
        existing = self.find_one(query)
        if existing:
            return existing
        row = deepcopy(update["$setOnInsert"])
        if self.race:
            row["_id"] = ObjectId()
        self.rows.append(row)
        if self.raise_duplicate:
            raise DuplicateKeyError("concurrent source creation")
        return deepcopy(row)

    def insert_one(self, row):
        self.rows.append(deepcopy(row))


@pytest.fixture
def linked(monkeypatch):
    # 單元測試不連實際 MongoDB，也不在匯入時建立索引。
    spec = spec_from_file_location("medication_service_under_test", Path(__file__).parents[1] / "app/services/medication_service.py")
    service = module_from_spec(spec)
    dependencies = {
        "app.db": SimpleNamespace(db=None),
        "app.services.reminder_service": SimpleNamespace(create_reminder=lambda *_: None),
        "app.services.timeline_service": SimpleNamespace(delete_timeline_item=lambda *_: None, upsert_timeline_item=lambda *_: None),
        "app.services.care_record_support": SimpleNamespace(require_object_id=lambda value, _label: ObjectId(value), require_owned_pet=lambda *_: None, serialize_record=lambda row: row),
    }
    with patch.dict(sys.modules, dependencies):
        spec.loader.exec_module(service)
    pet_id, visit_id = str(ObjectId()), str(ObjectId())
    collection = Collection()
    visit = {"_id": ObjectId(visit_id), "petId": pet_id, "medications": [deepcopy(PRESCRIPTION)]}
    visits = SimpleNamespace(find_one=lambda query: deepcopy(visit) if query == {"_id": visit["_id"], "petId": pet_id} else None)
    monkeypatch.setattr(service, "db", SimpleNamespace(medications=collection, medical_visits=visits))
    ownership_calls = []
    monkeypatch.setattr(service, "pet", lambda pid, uid: ownership_calls.append((pid, uid)))
    sync_calls = []
    monkeypatch.setattr(service, "sync_reminders", lambda row, uid: sync_calls.append((row["_id"], uid)))
    monkeypatch.setattr(service, "sync_timeline", lambda row: None)
    monkeypatch.setattr(service, "ser", lambda row: {**row, "id": str(row["_id"])})
    request = MedicationRequest(
        name="藥袋 A", instructions="確認後的服用說明", timesPerDay=2,
        startDate="2026-10-17", mealTiming="after_meal", medicalVisitId=visit_id,
        medicalVisitMedicationKey=prescription_key(PRESCRIPTION),
    )
    return service, pet_id, visit_id, collection, request, sync_calls, ownership_calls


def test_source_course_is_idempotent_and_does_not_overwrite_existing_course(linked):
    service, pid, _vid, collection, request, sync_calls, _ = linked
    first = service.create(pid, "owner", request)
    collection.rows[0]["status"] = "completed"
    request.name = "重送不應覆寫"
    second = service.create(pid, "owner", request)
    assert first["id"] == second["id"]
    assert second["status"] == "completed"
    assert second["name"] == "藥袋 A"
    assert len(collection.rows) == len(sync_calls) == 1
    assert collection.indexes[0][1]["unique"] is True
    assert not first["reminderEnabled"] and first["reminderTimes"] == []


@pytest.mark.parametrize("duplicate_error", [False, True])
def test_concurrent_creation_returns_the_winning_course_without_duplicate_reminders(linked, duplicate_error):
    service, pid, _vid, collection, request, sync_calls, _ = linked
    collection.race = True
    collection.raise_duplicate = duplicate_error
    result = service.create(pid, "owner", request)
    assert len(collection.rows) == 1
    assert result["id"] == str(collection.rows[0]["_id"])
    assert sync_calls == []


def test_stale_or_wrong_visit_source_cannot_create_a_course(linked):
    service, pid, _vid, collection, request, sync_calls, _ = linked
    request.medicalVisitMedicationKey = "a" * 64
    with pytest.raises(HTTPException) as error:
        service.create(pid, "owner", request)
    assert error.value.status_code == 409
    assert collection.rows == sync_calls == []
    request.medicalVisitId = str(ObjectId())
    with pytest.raises(HTTPException) as error:
        service.create(pid, "owner", request)
    assert error.value.status_code == 400


def test_source_ownership_is_checked_even_for_a_repeated_request(linked, monkeypatch):
    service, pid, _vid, collection, request, sync_calls, _ = linked
    service.create(pid, "owner", request)
    def deny(*_args):
        raise HTTPException(404, "找不到毛孩資料")
    monkeypatch.setattr(service, "pet", deny)
    with pytest.raises(HTTPException):
        service.create(pid, "other-owner", request)
    assert len(collection.rows) == len(sync_calls) == 1


def test_source_key_requires_a_visit_and_cannot_be_changed_during_edit(linked):
    service, pid, _vid, collection, request, _sync, _owner = linked
    with pytest.raises(ValidationError):
        MedicationRequest(name="A", startDate="2026-10-17", medicalVisitMedicationKey="a" * 64)
    created = service.create(pid, "owner", request)
    request.medicalVisitMedicationKey = "b" * 64
    with pytest.raises(HTTPException) as error:
        service.update(created["id"], "owner", request)
    assert error.value.status_code == 400
    assert collection.rows[0]["medicalVisitMedicationKey"] == prescription_key(PRESCRIPTION)
