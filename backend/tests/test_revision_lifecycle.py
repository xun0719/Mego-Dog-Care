from datetime import datetime
from types import SimpleNamespace
import pytest
from bson.objectid import ObjectId
from app.timezone import TAIPEI
from app.services import medication_service as medication
from app.services import medical_visit_service as visits
from app.schemas.medical_visit import MedicalVisitRequest
from app.services.ai.app_knowledge import internal_app_results, VERSION
from app.services.ai.rag_context_service import build_knowledge_bundle

@pytest.mark.parametrize("start,time,end,expected", [
    ("2026-10-13", "09:00", "", "2026-10-14T09:00:00+08:00"),
    ("2026-10-01", "17:00", "", "2026-10-13T17:00:00+08:00"),
    ("2026-10-15", "09:00", "", "2026-10-15T09:00:00+08:00"),
    ("2026-10-01", "09:00", "2026-10-13", None),
])
def test_first_medication_reminder_is_future_without_changing_start(monkeypatch, start, time, end, expected):
    monkeypatch.setattr(medication, "now_taipei", lambda: datetime(2026, 10, 13, 15, tzinfo=TAIPEI))
    item = {"startDate": start, "endDate": end}
    result = medication.reminder_date(item, time)
    assert (result.isoformat() if result else None) == expected
    assert item["startDate"] == start

@pytest.mark.parametrize("has_key", [True, False])
@pytest.mark.parametrize("has_photos", [True, False])
def test_copied_visit_new_request_is_distinct_and_retry_idempotent(monkeypatch, has_key, has_photos):
    pet_id = str(ObjectId())
    old = {"_id": ObjectId(), "petId": pet_id, "reason": "original", "attachmentIds": ["bound-photo"] if has_photos else []}
    if has_key: old["clientRequestId"] = "original-request"
    class Records:
        def __init__(self): self.items = [old.copy()]
        def create_index(self, *args, **kwargs): pass
        def find_one(self, query): return next((x for x in self.items if all(x.get(k) == v for k, v in query.items())), None)
        def insert_one(self, item):
            item["_id"] = ObjectId(); self.items.append(item.copy()); return SimpleNamespace(inserted_id=item["_id"])
        def update_one(self, query, changes): self.find_one(query).update(changes["$set"])
    records = Records()
    monkeypatch.setattr(visits, "db", SimpleNamespace(medical_visits=records))
    monkeypatch.setattr(visits, "_ensure_owned_pet", lambda *args: None)
    monkeypatch.setattr(visits, "_sync_timeline", lambda *args: None)
    monkeypatch.setattr(visits, "_sync_follow_up_reminder", lambda *args: None)
    monkeypatch.setattr(visits, "_reminder_state", lambda *args: {})
    monkeypatch.setattr(visits, "source_attachments", lambda *args: [])
    monkeypatch.setattr(visits, "sync_source_attachments", lambda *args: [])
    request = MedicalVisitRequest(visitedAt="2026-10-13T15:00:00+08:00", reason="new reason", clientRequestId="new-copy-request", attachmentIds=[])
    first = visits.create_visit(pet_id, "owner", request)
    retry = visits.create_visit(pet_id, "owner", request)
    assert first["id"] != str(old["_id"])
    assert retry["id"] == first["id"]
    assert first["reason"] == "new reason"
    assert len(records.items) == 2
    assert records.items[0] == old

def test_internal_sources_have_version_ids_and_no_fabricated_public_urls():
    bundle = build_knowledge_bundle(internal_app_results())
    assert len(bundle["evidence"]) == 3
    assert all(source["url"] == "" and source["sourceId"].startswith(f"APP:{VERSION}:") for source in bundle["sourceMap"].values())
    assert "7、15、30" in bundle["evidence"][1]["text"]

def test_untrusted_internal_source_text_and_identifiers_are_rejected():
    result = internal_app_results()
    result[0]["text"] = "fabricated feature"
    bundle = build_knowledge_bundle([result[0], {"text": "bad", "citations": [{"sourceId": "APP:fake"}]}])
    assert bundle["evidence"] == []


def test_function_questions_do_not_send_personal_care_records():
    from app.services.ai.chat_service import general_context_groups
    assert general_context_groups("MEGO 首頁喝水偏少怎麼判斷？") is None
    assert general_context_groups("健康觀察的規則是什麼？") is None
    assert general_context_groups("就醫前摘要包含哪些資料範圍？") is None
    assert general_context_groups("我的狗最近喝水偏少") is not None

def test_medication_end_date_can_be_cleared_to_null():
    from app.schemas.medication import MedicationRequest
    request = MedicationRequest(name="medication", startDate="2026-10-13", endDate=None)
    assert request.endDate == ""
