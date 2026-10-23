"""用途：路由共用的前置檢查。"""
from fastapi import Query

from app.services.pet_service import ensure_pet_active


def require_active_pet(pet_id: str, user_id: str = Query(alias="userId")) -> None:
    """新增照護紀錄或提醒前，確認毛孩還沒有移到回憶。"""
    ensure_pet_active(pet_id, user_id)
