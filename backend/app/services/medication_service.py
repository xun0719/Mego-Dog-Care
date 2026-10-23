from app.timezone import now_taipei, TAIPEI
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from fastapi import HTTPException
from app.db import db
from app.schemas.medication import MedicationRequest
from app.schemas.reminder import ReminderCreateRequest
from app.services.reminder_service import create_reminder
from app.services.timeline_service import delete_timeline_item,upsert_timeline_item
from app.services.care_record_support import require_object_id, require_owned_pet, serialize_record
from app.services.medication_source import require_prescription
def oid(v):
 return require_object_id(v,"用藥紀錄")
def pet(pid,uid):
 return require_owned_pet(pid,uid)
def ser(x):return serialize_record(x)
def source_visit(visit_id,pet_id,uid,key=None):
 if not visit_id:return
 visit=db.medical_visits.find_one({"_id":oid(visit_id),"petId":pet_id})
 if not visit:raise HTTPException(400,"來源就醫紀錄不存在或不屬於目前毛孩")
 pet(pet_id,uid)
 if key:require_prescription(visit,key)
def sync_timeline(x,event="start"):
 title={"start":f"開始{x['name']}用藥療程","completed":f"完成{x['name']}用藥療程","stopped":f"停止{x['name']}用藥療程"}[event]
 upsert_timeline_item(x["petId"],"medication",now_taipei(),title,str(x["_id"]),x.get("instructions", ""))
def reminder_date(item,time):
 start = datetime.fromisoformat(f"{item['startDate']}T{time}:00").replace(tzinfo=TAIPEI)
 now = now_taipei()
 candidate = start if start > now else datetime.combine(now.date(), start.timetz())
 if candidate <= now: candidate += timedelta(days=1)
 if item.get("endDate") and candidate.date() > datetime.fromisoformat(item["endDate"]).date(): return None
 return candidate
def sync_reminders(item,uid):
 existing=list(db.reminders.find({"petId":item["petId"],"sourceType":"medication","sourceId":str(item["_id"])}))
 desired=set(item.get("reminderTimes",[])) if item.get("reminderEnabled") and item.get("status")=="active" else set()
 by_slot={r.get("sourceSlot"):r for r in existing}
 for slot in list(desired):
  scheduled = reminder_date(item, slot)
  if scheduled is None:
   desired.discard(slot)
   continue
  payload={"type":"medication","title":f"{item['name']}服藥提醒","scheduledAt":scheduled,"recurrenceRule":"daily","notes":item.get("instructions", ""),"sourceType":"medication","sourceId":str(item["_id"]),"sourceSlot":slot}
  old=by_slot.get(slot)
  if old:
   db.reminders.update_one({"_id":old["_id"]},{"$set":payload})
  else:
   create_reminder(item["petId"],uid,ReminderCreateRequest(**payload))
 for slot,r in by_slot.items():
  if slot not in desired: db.reminders.delete_one({"_id":r["_id"]})
def list_records(pid,uid,status=None):
 pet(pid,uid);q={"petId":pid};
 if status:q["status"]=status
 return {"records":[ser(x) for x in db.medications.find(q).sort([("startDate",-1),("_id",-1)])]}
def get(rid,uid):
 x=db.medications.find_one({"_id":oid(rid)})
 if not x:raise HTTPException(404,"找不到用藥紀錄")
 pet(x["petId"],uid);return ser(x)
def create(pid,uid,d:MedicationRequest):
 pet(pid,uid)
 now=now_taipei()
 x={"_id":ObjectId(),"petId":pid,**d.model_dump(),"createdAt":now,"updatedAt":now}
 if d.medicalVisitMedicationKey:
  identity={"petId":pid,"medicalVisitId":d.medicalVisitId,"medicalVisitMedicationKey":d.medicalVisitMedicationKey}
  # 同一開藥快照只建立一份療程；重送或兩台裝置同時建立也不會增加第二份。
  existing=db.medications.find_one(identity)
  if existing:return ser(existing)
  source_visit(d.medicalVisitId,pid,uid,d.medicalVisitMedicationKey)
  db.medications.create_index([("petId",1),("medicalVisitId",1),("medicalVisitMedicationKey",1)],unique=True,partialFilterExpression={"medicalVisitMedicationKey":{"$type":"string"}},name="unique_visit_prescription_course")
  try:
   saved=db.medications.find_one_and_update(identity,{"$setOnInsert":x},upsert=True,return_document=ReturnDocument.AFTER)
  except DuplicateKeyError:
   saved=db.medications.find_one(identity)
   if saved is None:raise
  if saved["_id"]!=x["_id"]:return ser(saved)
  x=saved
 else:
  source_visit(d.medicalVisitId,pid,uid)
  db.medications.insert_one(x)
 sync_reminders(x,uid);sync_timeline(x);return ser(x)
def update(rid,uid,d:MedicationRequest):
 x=db.medications.find_one({"_id":oid(rid)})
 if not x:raise HTTPException(404,"找不到用藥紀錄")
 pet(x["petId"],uid)
 if (d.medicalVisitId,d.medicalVisitMedicationKey)!=(x.get("medicalVisitId"),x.get("medicalVisitMedicationKey")):
  raise HTTPException(400,"編輯療程時不可更換來源；重新開立請另外新增。")
 v=d.model_dump();v["updatedAt"]=now_taipei();db.medications.update_one({"_id":x["_id"]},{"$set":v});x=db.medications.find_one({"_id":x["_id"]});sync_reminders(x,uid);return ser(x)
def change_status(rid,uid,status):
 x=db.medications.find_one({"_id":oid(rid)})
 if not x:raise HTTPException(404,"找不到用藥紀錄")
 pet(x["petId"],uid);db.medications.update_one({"_id":x["_id"]},{"$set":{"status":status,"reminderEnabled":False,"updatedAt":now_taipei()}});x=db.medications.find_one({"_id":x["_id"]});sync_reminders(x,uid);sync_timeline(x,status);return ser(x)
def delete(rid,uid):
 x=db.medications.find_one({"_id":oid(rid)})
 if not x:raise HTTPException(404,"找不到用藥紀錄")
 pet(x["petId"],uid);db.medications.delete_one({"_id":x["_id"]});db.reminders.delete_many({"petId":x["petId"],"sourceType":"medication","sourceId":rid});delete_timeline_item(x["petId"],"medication",rid)
