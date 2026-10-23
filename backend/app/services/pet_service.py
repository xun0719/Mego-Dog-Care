from app.timezone import now_taipei
"""毛孩資料的 CRUD 商業邏輯，隔離 MongoDB 細節與 HTTP 路由。"""

from bson.errors import InvalidId
from bson.objectid import ObjectId
import secrets
from fastapi import HTTPException

from app.db import db
from app.schemas import PetCreateRequest, PetMemorialRequest, PetUpdateRequest
from app.services.attachment_service import _delete_document


def _object_id(value: str, label: str) -> ObjectId:
    """將字串轉為 MongoDB ID，並回傳可讀的 API 錯誤。"""
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(status_code=400, detail=f"{label}格式錯誤")


def _ensure_user(user_id: str) -> None:
    """確認毛孩所屬帳號存在。"""
    if not db.users.find_one({"_id": _object_id(user_id, "使用者 ID ")}):
        raise HTTPException(status_code=404, detail="找不到使用者")


def serialize_pet(pet: dict) -> dict:
    """將 MongoDB 文件轉成前端可用的毛孩資料。"""
    return {
        "_id": str(pet["_id"]),
        "userId": pet["userId"],
        "name": pet.get("name", ""),
        "gender": pet.get("gender", ""),
        "breed": pet.get("breed", ""),
        "breedType": pet.get("breedType", "unknown"),
        "avatarAttachmentId": pet.get("avatarAttachmentId"),
        "birthday": pet.get("birthday", ""),
        "arrivalDate": pet.get("arrivalDate", ""),
        "neutered": pet.get("neutered", False),
        "allergies": pet.get("allergies", ""),
        "chronicDiseases": pet.get("chronicDiseases", ""),
        "microchipNumber": pet.get("microchipNumber", ""),
        "coatColor": pet.get("coatColor", ""),
        "distinctiveFeatures": pet.get("distinctiveFeatures", ""),
        "latestWeightKg": pet.get("latestWeightKg"),
        "latestWeightAt": pet.get("latestWeightAt"),
        "memorial": bool(pet.get("memorial", False)),
        "passedAwayDate": pet.get("passedAwayDate", ""),
        "memorialNote": pet.get("memorialNote", ""),
    }


def list_pets(user_id: str) -> list[dict]:
    """取得指定使用者的全部毛孩，並補建舊資料的固定身分 QR。"""
    _ensure_user(user_id)
    user = db.users.find_one({"_id": _object_id(user_id, "使用者 ID ")}, {"email": 1}) or {}
    pets = list(db.pets.find({"userId": user_id}))
    for pet in pets:
        if not db.lost_pet_profiles.find_one({"petId": str(pet["_id"])}):
            now = now_taipei()
            db.lost_pet_profiles.insert_one({"petId": str(pet["_id"]), "publicToken": secrets.token_urlsafe(32), "enabled": True, "lostMode": False, "contactEmail": user.get("email", ""), "showBreed": True, "showSex": True, "showNeutered": False, "showCoatColor": True, "showDistinctiveFeatures": True, "showAvatar": True, "showContactName": True, "showContactEmail": False, "showContactPhone": True, "showAlternatePhone": False, "showContactMessage": True, "createdAt": now, "updatedAt": now})
    return [serialize_pet(pet) for pet in pets]


def create_pet(data: PetCreateRequest) -> dict:
    """新增一隻毛孩；同一帳號可以建立多筆資料。"""
    _ensure_user(data.userId)
    document = data.model_dump()
    if document.get("avatarAttachmentId"):
        raise HTTPException(status_code=422, detail="新增毛孩時請先建立資料，再上傳頭像")
    document.pop("avatarAttachmentId", None)
    result = db.pets.insert_one(document)
    document["_id"] = result.inserted_id
    user = db.users.find_one({"_id": _object_id(data.userId, "使用者 ID ")}, {"email": 1}) or {}
    db.lost_pet_profiles.insert_one({
        "petId": str(result.inserted_id), "publicToken": secrets.token_urlsafe(32),
        "enabled": True, "lostMode": False, "contactEmail": user.get("email", ""),
        "showBreed": True, "showSex": True, "showNeutered": False,
        "showCoatColor": True, "showDistinctiveFeatures": True, "showAvatar": True, "showContactName": True, "showContactEmail": False, "showContactPhone": True, "showAlternatePhone": False, "showContactMessage": True,
        "createdAt": now_taipei(), "updatedAt": now_taipei(),
    })
    return {
        "success": True,
        "message": "寵物資料已儲存",
        "petData": serialize_pet(document),
    }


def update_pet(pet_id: str, user_id: str, data: PetUpdateRequest) -> dict:
    """更新屬於目前使用者的毛孩資料。"""
    pet_object_id = _object_id(pet_id, "毛孩 ID ")
    existing = db.pets.find_one({"_id": pet_object_id, "userId": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="找不到毛孩資料")
    values = data.model_dump(exclude={"avatarAttachmentId"})
    values.pop("avatarUri", None)
    from app.services.attachment_service import replace_pet_avatar

    result = replace_pet_avatar(
        pet_id,
        user_id,
        data.avatarAttachmentId,
        current_pet=existing,
        values=values,
    )
    return {
        "success": True,
        "message": "毛孩資料已更新",
        "petData": serialize_pet(result),
    }


def delete_pet(pet_id: str, user_id: str) -> dict:
    """刪除屬於目前使用者的毛孩資料。"""
    pet_object_id = _object_id(pet_id, "毛孩 ID ")
    result = db.pets.delete_one(
        {"_id": pet_object_id, "userId": user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="找不到毛孩資料")
    # 毛孩刪除時一併清理私有子資料，避免留下 orphan records。
    child_query = {"petId": pet_id}
    for collection in (db.daily_logs, db.weight_records, db.health_events, db.medical_visits,
                       db.vaccinations, db.dewormings, db.medications, db.reminders, db.timeline):
        collection.delete_many(child_query)
    for attachment in db.attachments.find(child_query):
        _delete_document(attachment)
    db.lost_pet_profiles.delete_many(child_query)
    return {"success": True, "message": "毛孩資料已刪除"}


MEMORIAL_BLOCKED_MESSAGE = "這隻毛孩已移到回憶，不能再新增紀錄"


def ensure_pet_active(pet_id: str, user_id: str) -> None:
    """新增紀錄前確認毛孩屬於目前帳號，且還沒有移到回憶。"""
    pet = db.pets.find_one({"_id": _object_id(pet_id, "毛孩 ID "), "userId": user_id}, {"memorial": 1})
    if not pet:
        raise HTTPException(status_code=404, detail="找不到毛孩資料")
    if pet.get("memorial"):
        raise HTTPException(status_code=409, detail=MEMORIAL_BLOCKED_MESSAGE)


def set_memorial(pet_id: str, user_id: str, data: PetMemorialRequest) -> dict:
    """把毛孩移到回憶：保留所有紀錄，停止尚未完成的提醒，並關閉身分 QR 公開頁。"""
    pet_object_id = _object_id(pet_id, "毛孩 ID ")
    existing = db.pets.find_one({"_id": pet_object_id, "userId": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="找不到毛孩資料")
    today = now_taipei().date().isoformat()
    if data.passedAwayDate > today:
        raise HTTPException(status_code=422, detail="離開日期不能晚於今天")
    earliest = max(existing.get("birthday") or "", existing.get("arrivalDate") or "")
    if earliest and data.passedAwayDate < earliest:
        raise HTTPException(status_code=422, detail="離開日期不能早於生日或到家日")
    now = now_taipei()
    result = db.pets.find_one_and_update(
        {"_id": pet_object_id, "userId": user_id},
        {"$set": {
            "memorial": True,
            "passedAwayDate": data.passedAwayDate,
            "memorialNote": data.memorialNote.strip(),
            "memorializedAt": now,
        }},
        return_document=True,
    )
    stopped = db.reminders.update_many(
        {"petId": pet_id, "status": {"$in": ["pending", "snoozed"]}},
        {"$set": {"status": "skipped", "memorialSkipped": True, "updatedAt": now}},
    ).modified_count
    db.lost_pet_profiles.update_many(
        {"petId": pet_id, "enabled": True},
        {"$set": {"enabled": False, "lostMode": False, "disabledByMemorial": True, "updatedAt": now}},
    )
    return {
        "success": True,
        "message": "已移到回憶",
        "petData": serialize_pet(result),
        "stoppedReminderCount": stopped,
    }


def clear_memorial(pet_id: str, user_id: str) -> dict:
    """誤設回憶時可以還原；已停止的提醒不會自動恢復，需要時再重新建立。"""
    pet_object_id = _object_id(pet_id, "毛孩 ID ")
    result = db.pets.find_one_and_update(
        {"_id": pet_object_id, "userId": user_id},
        {"$unset": {"memorial": "", "passedAwayDate": "", "memorialNote": "", "memorializedAt": ""}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="找不到毛孩資料")
    db.lost_pet_profiles.update_many(
        {"petId": pet_id, "disabledByMemorial": True},
        {"$set": {"enabled": True, "updatedAt": now_taipei()}, "$unset": {"disabledByMemorial": ""}},
    )
    return {"success": True, "message": "已從回憶還原", "petData": serialize_pet(result)}
