"""用途：提供設定中心可驗證的帳號儲存量，以及 App 共用的產品規則設定。"""
from fastapi import APIRouter, Query
from app.core.policy import policy_payload
from app.services.settings_service import storage_usage
router=APIRouter(prefix='/settings',tags=['settings'])
@router.get('/storage')
def get_storage(user_id:str=Query(alias='userId')):
    return {'success':True,'message':'已取得儲存空間資訊','data':storage_usage(user_id)}

@router.get('/policy')
def get_policy_settings():
    """健康觀察門檻與附件上限的單一來源；App 取不到時才使用內建備援值。"""
    return {'success':True,'message':'已取得設定','data':policy_payload()}
