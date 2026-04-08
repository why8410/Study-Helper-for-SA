from html.parser import HTMLParser
from pathlib import Path
from typing import Optional
import json
import sys


BASE_DIR = Path(__file__).resolve().parent.parent


class AssetParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.asset_paths = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "link" and "href" in attrs_dict:
            self.asset_paths.append(attrs_dict["href"])
        if tag == "script" and "src" in attrs_dict:
            self.asset_paths.append(attrs_dict["src"])


def normalize_local_asset_path(raw_path: str) -> Optional[str]:
    if not raw_path:
        return None
    if raw_path.startswith(("http://", "https://", "//", "data:", "blob:")):
        return None

    normalized = raw_path.split("?", 1)[0].split("#", 1)[0]
    if normalized.startswith("./"):
        normalized = normalized[2:]

    return normalized.lstrip("/")


def main():
    required_files = [
        BASE_DIR / "index.html",
        BASE_DIR / "styles.css",
        BASE_DIR / "app.js",
        BASE_DIR / "manifest.webmanifest",
        BASE_DIR / "sw.js",
        BASE_DIR / "README.md",
        BASE_DIR / "Build-Study-Helper-for-SA-Tablet-Release.command",
        BASE_DIR / "scripts" / "build_release_bundle.py",
    ]

    missing = [str(path) for path in required_files if not path.exists()]
    if missing:
        raise SystemExit(f"Missing files: {missing}")

    manifest = json.loads((BASE_DIR / "manifest.webmanifest").read_text(encoding="utf-8"))
    if manifest.get("display") != "standalone":
        raise SystemExit("Manifest display must be standalone.")

    parser = AssetParser()
    parser.feed((BASE_DIR / "index.html").read_text(encoding="utf-8"))
    local_assets = [path for raw_path in parser.asset_paths if (path := normalize_local_asset_path(raw_path))]

    for asset in local_assets:
        asset_path = BASE_DIR / asset
        if not asset_path.exists():
            raise SystemExit(f"Referenced asset does not exist: {asset}")

    app_js = (BASE_DIR / "app.js").read_text(encoding="utf-8")
    required_markers = [
        "runClientSideOcr",
        "preprocessImageForOcr",
        "runOcrPass",
        "setVoiceButtonState",
        "showCameraOverlay",
        "updateCaptureButtonLabel",
        "buildCoachingResponse",
        "copyChatGptPrompt",
        "playFinalAnswerAudio",
        "shareChatGptPrompt",
        "saveHistoryItem",
        "clearHistory",
        "speechSynthesis",
        "beforeinstallprompt",
    ]
    missing_markers = [marker for marker in required_markers if marker not in app_js]
    if missing_markers:
        raise SystemExit(f"Missing app.js markers: {missing_markers}")

    print("Static tablet app verification passed.")


if __name__ == "__main__":
    main()
