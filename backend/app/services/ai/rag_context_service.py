"""Optional retrieval of public, curated dog-care references for MEGO AI."""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from rag_experiment.query_mongo_index import retrieve

from .app_knowledge import trusted_internal_sources

logger = logging.getLogger(__name__)
DEFAULT_RAG_TOP_K = 3
MIN_RAG_TOP_K = 1
MAX_RAG_TOP_K = 10


def configured_rag_top_k() -> int:
    try:
        value = int(os.getenv("MEGO_RAG_TOP_K", str(DEFAULT_RAG_TOP_K)))
    except ValueError:
        return DEFAULT_RAG_TOP_K
    return min(MAX_RAG_TOP_K, max(MIN_RAG_TOP_K, value))

def build_knowledge_bundle(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Create model-safe evidence and an allowlisted URL map from retrieved chunks."""
    source_by_url: dict[str, dict[str, str]] = {}
    evidence: list[dict[str, Any]] = []
    trusted = trusted_internal_sources()
    for item in results:
        source_ids: list[str] = []
        for citation in item.get("citations", []):
            url = str(citation.get("url", "")).strip()
            internal_id = str(citation.get("sourceId", ""))
            if internal_id in trusted and str(item.get("text", "")).strip() == trusted[internal_id][1]:
                source_by_url[internal_id] = {
                    "sourceId": internal_id, "title": trusted[internal_id][0],
                    "documentTitle": str(item.get("document_title") or "MEGO 內部功能文件"),
                    "section": str(item.get("section") or ""), "url": "", "kind": "internal",
                }
                source_ids.append(internal_id)
                continue
            if not url.startswith(("https://", "http://")):
                continue
            if url not in source_by_url:
                source_id = f"R{len(source_by_url) + 1}"
                source_by_url[url] = {
                    "sourceId": source_id,
                    "title": str(citation.get("title") or "參考來源"),
                    "documentTitle": str(item.get("document_title") or "犬隻照護資料"),
                    "section": str(item.get("section") or ""),
                    "url": url,
                }
            source_ids.append(source_by_url[url]["sourceId"])
        text = str(item.get("text", "")).strip()
        if text and source_ids:
            evidence.append({
                "documentTitle": str(item.get("document_title", "")),
                "section": str(item.get("section", "")),
                "text": text,
                "sourceIds": list(dict.fromkeys(source_ids)),
            })
    return {
        "allowedSources": [{"sourceId": source["sourceId"], "title": source["title"]} for source in source_by_url.values()],
        "evidence": evidence,
        "sourceMap": {source["sourceId"]: source for source in source_by_url.values()},
    }


async def retrieve_canine_knowledge(question: str) -> list[dict[str, Any]]:
    """Retrieve public references with bounded waits; failures leave normal chat available."""
    # 不再用關鍵詞預判主題：飼主的口語問法常常不含「狗」或「犬」，
    # 評估題庫中有 23% 的題目會被擋下，其中包含牙齦發白、連續嘔吐這類
    # 最需要檢索到知識的高風險問題。沒有找到資料時對話照常繼續。
    enabled = os.getenv("MEGO_RAG_ENABLED", "true").strip().lower() not in {"0", "false", "no", "off"}
    if not enabled:
        return []

    try:
        total_timeout = float(os.getenv("MEGO_RAG_TIMEOUT_SECONDS", "24"))
        total_timeout = min(max(total_timeout, 8), 40)
        model_timeout = max(1, (total_timeout - 5) / 2)
        result = await asyncio.wait_for(
            asyncio.to_thread(retrieve, question, configured_rag_top_k(), model_timeout),
            timeout=total_timeout,
        )
        return result.get("results", []) if isinstance(result, dict) else []
    except Exception as exc:
        logger.warning("MEGO RAG retrieval unavailable; continuing without references (%s)", type(exc).__name__)
        return []
