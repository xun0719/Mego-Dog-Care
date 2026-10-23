"""用途：集中產品規則設定，作為後端與 App 共用的單一來源。

與 config.py 的分工：config.py 管環境（連線、路徑、金鑰），本檔管產品規則
（門檻、上限、視窗）。數值本身存在同目錄的 policy_defaults.json，
後端讀取該檔、前端以測試比對該檔，確保同一個規則只有一份來源；環境變數
只用於部署時覆寫，App 另可透過 GET /api/settings/policy 取得實際生效的設定。
"""

import json
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# 自行載入 .env，不依賴 config.py 是否先被匯入；重複呼叫不會覆蓋已存在的環境變數。
load_dotenv(dotenv_path=Path(__file__).resolve().parents[3] / ".env")

_DEFAULTS_PATH = Path(__file__).resolve().parent / "policy_defaults.json"
_DEFAULTS = json.loads(_DEFAULTS_PATH.read_text(encoding="utf-8"))


def _int_env(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        return default
    return min(maximum, max(minimum, value))


def _float_env(name: str, default: float, minimum: float, maximum: float) -> float:
    try:
        value = float(os.getenv(name, str(default)))
    except ValueError:
        return default
    return min(maximum, max(minimum, value))


@dataclass(frozen=True)
class HealthTrendRule:
    """日常紀錄的連續天數規則。

    watch_days 為首頁開始顯示「需留意」的天數；continued_days 為升級為
    「持續需留意」的天數，同時也是 AI 健康監測採用的門檻。沒有
    continued_days 的規則只在首頁提示，不產生 AI 警示。
    """

    category: str
    status: str
    watch_days: int
    continued_days: int | None = None


# 單一來源：首頁健康觀察與 AI 健康監測共用這張表。
HEALTH_TREND_RULES: tuple[HealthTrendRule, ...] = tuple(
    HealthTrendRule(item["category"], item["status"], item["watchDays"], item["continuedDays"])
    for item in _DEFAULTS["healthTrendRules"]
)


def monitored_rules() -> tuple[HealthTrendRule, ...]:
    """AI 健康監測採用的規則：只取有「持續需留意」級距的項目。"""
    return tuple(rule for rule in HEALTH_TREND_RULES if rule.continued_days is not None)


def continued_days(category: str, status: str) -> int | None:
    for rule in HEALTH_TREND_RULES:
        if rule.category == category and rule.status == status:
            return rule.continued_days
    return None


@dataclass(frozen=True)
class Policy:
    # 健康監測
    repeated_event_count: int
    recent_symptom_window_hours: int
    weight_change_attention_percent: float
    medication_ending_soon_days: int
    care_due_soon_days: int
    # 附件
    attachment_limits: dict[str, int]
    orphan_attachment_hours: int
    # AI 對話
    chat_history_messages: int
    chat_message_max_chars: int
    # RAG 檢索
    rag_bm25_candidates: int
    rag_vector_candidates: int
    rag_rrf_constant: int
    # 觀測
    slow_request_threshold_ms: int


def get_policy() -> Policy:
    return Policy(
        repeated_event_count=_int_env("MEGO_REPEATED_EVENT_COUNT", 3, 2, 10),
        recent_symptom_window_hours=_int_env("MEGO_RECENT_SYMPTOM_WINDOW_HOURS", 72, 6, 720),
        weight_change_attention_percent=_float_env("MEGO_WEIGHT_CHANGE_PERCENT", 5.0, 1.0, 50.0),
        medication_ending_soon_days=_int_env("MEGO_MEDICATION_ENDING_SOON_DAYS", 2, 1, 30),
        care_due_soon_days=_int_env("MEGO_CARE_DUE_SOON_DAYS", 7, 1, 90),
        attachment_limits=dict(_DEFAULTS["attachmentLimits"]),
        orphan_attachment_hours=_int_env("MEGO_ORPHAN_ATTACHMENT_HOURS", 24, 1, 720),
        chat_history_messages=_int_env("MEGO_CHAT_HISTORY_MESSAGES", 10, 2, 50),
        chat_message_max_chars=_int_env("MEGO_CHAT_MESSAGE_MAX_CHARS", _DEFAULTS["chatMessageMaxChars"], 200, 8000),
        rag_bm25_candidates=_int_env("MEGO_RAG_BM25_CANDIDATES", 5, 1, 50),
        rag_vector_candidates=_int_env("MEGO_RAG_VECTOR_CANDIDATES", 5, 1, 50),
        rag_rrf_constant=_int_env("MEGO_RAG_RRF_CONSTANT", 60, 1, 1000),
        slow_request_threshold_ms=_int_env("MEGO_SLOW_REQUEST_MS", 1000, 50, 60000),
    )


def policy_payload() -> dict:
    """提供給 App 的設定；只包含前端實際需要的項目。"""
    policy = get_policy()
    return {
        "healthTrendRules": [
            {
                "category": rule.category,
                "status": rule.status,
                "watchDays": rule.watch_days,
                "continuedDays": rule.continued_days,
            }
            for rule in HEALTH_TREND_RULES
        ],
        "attachmentLimits": policy.attachment_limits,
        "chatMessageMaxChars": policy.chat_message_max_chars,
    }
