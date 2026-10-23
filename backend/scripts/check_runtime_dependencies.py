"""檢查實際可載入的後端套件；中斷安裝後可依既有版本修復，不讀取 App 或資料庫。"""

import argparse
from importlib import import_module, metadata
import subprocess
import sys


RUNTIME_MODULES = (
    "fastapi", "jwt", "pydantic", "pymongo", "uvicorn", "anyio",
    "dotenv", "multipart", "onnxruntime", "numpy", "PIL", "reportlab",
    "httpx", "pytest",
)


def runtime_errors(importer=import_module):
    errors = []
    for name in RUNTIME_MODULES:
        try:
            importer(name)
        except Exception as error:
            errors.append((name, f"{type(error).__name__}: {error}"))
    return errors


def installed_specs(distributions):
    # pip 正在執行安裝，不在同一程序裡強制替換 pip 本身。
    return sorted({
        f"{dist.metadata['Name']}=={dist.version}"
        for dist in distributions
        if dist.metadata.get("Name") and dist.metadata["Name"].lower() != "pip"
    })


def repair_command(distributions):
    specs = installed_specs(distributions)
    if not specs:
        raise RuntimeError("找不到可修復的套件版本，請重新安裝 backend/requirements.txt")
    # 完整重裝檔案，但不重新解析依賴或升級版本；修復後仍需重新跑檢查。
    return [sys.executable, "-m", "pip", "install", "--force-reinstall",
            "--no-deps", "--no-cache-dir", *specs]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repair", action="store_true")
    args = parser.parse_args(argv)
    if args.repair:
        return subprocess.run(repair_command(metadata.distributions()), check=False).returncode
    errors = runtime_errors()
    for name, error in errors:
        print(f"{name}: {error}", file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
