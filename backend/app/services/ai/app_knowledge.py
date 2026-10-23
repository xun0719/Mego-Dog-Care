"""Versioned, trusted application facts, maintained alongside implementing code."""
VERSION = "2026-10-13.1"
DOCUMENTS = (
    ("home-health", "首頁與健康觀察", "MEGO 手機 App 有首頁、紀錄、MEGO AI、設定四個分頁。首頁今日概況顯示日常紀錄與照護提醒。健康觀察使用最近 30 天日常紀錄的喝水、食量、精神、便便欄位，依連續且日期不中斷的紀錄規則判斷，不是 AI 診斷。喝水偏少或偏多、食量偏少、精神稍低、便便偏硬或偏軟連續 2 天需留意、3 天持續需留意；食量偏多連續 3 天需留意；水狀便 1 天需留意、2 天持續需留意。無紀錄、紀錄不足或中斷、今日尚未記錄分別呈現；歷史警示標示最後觀察日期，不表示今天症狀仍存在。"),
    ("pre-vet-scope", "就醫前摘要的資料範圍", "就醫前摘要可選最近 7、15、30 天，依帳號與毛孩隔離資料。可勾選體重、日常紀錄、健康異常、疫苗、驅蟲、用藥、就醫、提醒資料；至少保留一項。頁面先顯示一頁近期重點，再展開選定範圍的完整資料。分享內容遵守已套用的資料選項，手寫此次想問獸醫的問題依帳號與毛孩保留本機草稿。AI 整理依授權的紀錄與選定範圍，不代表獸醫診斷；尚無資料不可編造。"),
    ("supported-features", "已提供與未提供的功能", "目前支援手機淺色三種首頁主題，原始毛孩 QR 公開資訊可選公開欄位並更新安全連結。紀錄包含體重、日常、健康異常、疫苗、驅蟲、用藥、就醫與提醒，照片可附於紀錄並於照護相簿查看。設定提供通知、AI 用量、PDF 照護報告匯出、帳號刪除。App 內提醒與手機通知權限分開；登出取消此帳號手機通知。沒有列明的功能不得假設存在；目前未提供修改 Email、密碼、Email 驗證、暗色模式或平板專用介面。未知功能應明確回答此版本文件無法確認，不提供虛構操作步驟。"),
)

def internal_app_results():
    """三篇文件合計約 630 字，每次都附上；用關鍵詞猜使用者是否在問功能並不可靠。"""
    return [{"document_title": f"MEGO 內部功能文件 v{VERSION}", "section": title, "text": text, "citations": [{"sourceId": f"APP:{VERSION}:{slug}", "title": title}]} for slug, title, text in DOCUMENTS]

def trusted_internal_sources():
    return {f"APP:{VERSION}:{slug}": (title, text) for slug, title, text in DOCUMENTS}


def is_app_function_question(question: str) -> bool:
    """只用於判斷是否略過個人照護紀錄；功能文件一律附上，不經此判斷。"""
    text = question.lower()
    app_named = any(cue in text for cue in ("mego", "app", "首頁", "分頁", "設定頁"))
    functional = any(cue in text for cue in ("功能", "操作", "怎麼用", "如何使用", "支援", "有沒有", "能不能", "是否可以", "判斷", "規則", "範圍"))
    rules = "健康觀察" in text and any(cue in text for cue in ("規則", "判斷", "怎麼", "如何"))
    brief = "就醫前摘要" in text and any(cue in text for cue in ("範圍", "哪些", "包含", "期間", "天數"))
    return app_named and functional or rules or brief
