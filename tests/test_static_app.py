import subprocess
import sys
import unittest
import json
from pathlib import Path
from html.parser import HTMLParser


BASE_DIR = Path(__file__).resolve().parent.parent


class IdParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if "id" in attrs_dict:
            self.ids.add(attrs_dict["id"])


class StaticAppTest(unittest.TestCase):
    def test_verify_script_passes(self):
        result = subprocess.run(
            [sys.executable, str(BASE_DIR / "scripts" / "verify_static_app.py")],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            self.fail(result.stderr or result.stdout)

    def test_html_contains_recent_history_and_share_controls(self):
        parser = IdParser()
        html = (BASE_DIR / "index.html").read_text(encoding="utf-8")
        parser.feed(html)

        for required_id in [
            "camera-overlay",
            "close-camera-button",
            "share-chatgpt-prompt-button",
            "copy-chatgpt-prompt-button",
            "result-details-toggle",
            "analysis-phase-idle",
            "answer-audio-button",
            "final-stage-card",
            "history-list",
            "clear-history-button",
        ]:
            self.assertIn(required_id, parser.ids)

        for expected_asset_reference in [
            'href="manifest.webmanifest"',
            'href="favicon.svg"',
            'href="styles.css"',
            'src="app.js"',
        ]:
            self.assertIn(expected_asset_reference, html)

    def test_manifest_uses_relative_paths_for_project_site_deployments(self):
        manifest = json.loads((BASE_DIR / "manifest.webmanifest").read_text(encoding="utf-8"))
        self.assertEqual("./", manifest["start_url"])
        self.assertEqual("./", manifest["scope"])
        self.assertEqual("favicon.svg", manifest["icons"][0]["src"])

    def test_release_bundle_builder_creates_expected_files(self):
        result = subprocess.run(
            [sys.executable, str(BASE_DIR / "scripts" / "build_release_bundle.py")],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            self.fail(result.stderr or result.stdout)

        output_dir = BASE_DIR / "release" / "study-helper-for-sa-tablet-web"
        for relative_path in [
            "index.html",
            "styles.css",
            "app.js",
            "manifest.webmanifest",
            "sw.js",
            "favicon.svg",
            "README.md",
            "netlify.toml",
            "DEPLOY-NOTES.txt",
            "TABLET-TEST-CHECKLIST.txt",
        ]:
            self.assertTrue((output_dir / relative_path).exists(), relative_path)

        deploy_notes = (output_dir / "DEPLOY-NOTES.txt").read_text(encoding="utf-8")
        self.assertIn("Netlify", deploy_notes)
        self.assertIn("TABLET-TEST-CHECKLIST.txt", deploy_notes)

        checklist = (output_dir / "TABLET-TEST-CHECKLIST.txt").read_text(encoding="utf-8")
        self.assertIn("사진 찍기", checklist)
        self.assertIn("ChatGPT 복사", checklist)

        self.assertTrue((BASE_DIR / "release" / "study-helper-for-sa-tablet-web.zip").exists())


if __name__ == "__main__":
    unittest.main()
