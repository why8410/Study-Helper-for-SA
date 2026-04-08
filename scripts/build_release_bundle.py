from pathlib import Path
import shutil


BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "release" / "study-helper-for-sa-tablet-web"
ZIP_BASE = BASE_DIR / "release" / "study-helper-for-sa-tablet-web"
FILES_TO_COPY = [
    "index.html",
    "styles.css",
    "app.js",
    "manifest.webmanifest",
    "sw.js",
    "favicon.svg",
    "README.md",
    "netlify.toml",
]
GENERATED_TEXT_FILES = {
    "DEPLOY-NOTES.txt": "\n".join(
        [
            "Study Helper for SA Tablet release bundle",
            "",
            "1. 이 폴더의 모든 파일을 Netlify 같은 정적 호스팅에 업로드합니다.",
            "2. 배포가 끝나면 HTTPS 주소를 갤럭시 태블릿에서 엽니다.",
            "3. manifest.webmanifest, sw.js, 카메라 권한, OCR 로딩을 먼저 확인합니다.",
            "4. 자세한 기능 점검은 TABLET-TEST-CHECKLIST.txt 순서대로 진행합니다.",
        ]
    ),
    "TABLET-TEST-CHECKLIST.txt": "\n".join(
        [
            "Study Helper for SA Tablet quick test checklist",
            "",
            "기본 확인",
            "- 첫 화면이 정상적으로 열린다.",
            "- 제목이 Study Helper for SA 로 보인다.",
            "- For Tablet 문구가 작은 보조 문구로 보인다.",
            "",
            "카메라와 사진",
            "- 사진 찍기 버튼으로 전체화면 촬영이 열린다.",
            "- 촬영 후 메인 화면에 미리보기가 남는다.",
            "- 사진 업로드도 정상적으로 동작한다.",
            "",
            "OCR과 코칭",
            "- OCR 전체 읽기에 텍스트가 보인다.",
            "- 문제 번호 칩이 생성된다.",
            "- 힌트 1, 2, 3 흐름이 자연스럽다.",
            "- 마지막 단계 전에는 정답이 바로 보이지 않는다.",
            "",
            "음성과 보조 기능",
            "- 음성 입력 버튼이 동작한다.",
            "- 듣는 중 / 정리 중 상태가 버튼에 보인다.",
            "- 자동 읽기가 힌트 카드와 마지막 단계 카드에서 동작한다.",
            "- ChatGPT 복사와 공유하기가 동작한다.",
            "- 최근 기록 저장, 다시 열기, 지우기가 동작한다.",
            "",
            "간단 메모",
            "- 테스트 기종:",
            "- 브라우저:",
            "- 접속 주소:",
            "- 가장 잘 된 점:",
            "- 가장 먼저 고칠 점:",
        ]
    ),
}


def main():
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    copied_files = []
    for relative_path in FILES_TO_COPY:
        source = BASE_DIR / relative_path
        if not source.exists():
            raise SystemExit(f"Missing release asset: {relative_path}")
        destination = OUTPUT_DIR / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        copied_files.append(relative_path)

    generated_files = []
    for relative_path, contents in GENERATED_TEXT_FILES.items():
        destination = OUTPUT_DIR / relative_path
        destination.write_text(contents, encoding="utf-8")
        generated_files.append(relative_path)

    zip_path = shutil.make_archive(str(ZIP_BASE), "zip", root_dir=str(OUTPUT_DIR))

    print("Release bundle created:")
    print(OUTPUT_DIR)
    print("")
    print("Release zip created:")
    print(zip_path)
    print("")
    print("Generated:")
    for relative_path in generated_files:
        print(f"- {relative_path}")
    print("")
    print("Files:")
    for relative_path in copied_files:
        print(f"- {relative_path}")


if __name__ == "__main__":
    main()
