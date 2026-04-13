# Study Helper for SA Tablet 기술 설계 요약

이 문서는 공통 문서 체계 기준으로 빠르게 보는 표준 기술 설계 진입 문서입니다.
상세 기술 설계 본문은 `04-technical-design.md`를 기준으로 유지합니다.

## 현재 구조 요약

- 앱 형태: 정적 웹앱 기반 PWA
- 핵심 파일: `index.html`, `styles.css`, `app.js`
- ChatGPT 보조: `아이용 깊은 풀이`, `부모용 요약` 선택 모드 지원
- 설치/오프라인 관련 파일: `manifest.webmanifest`, `sw.js`
- 배포 보조 파일: `Build-Study-Helper-for-SA-Tablet-Release.command`, `scripts/build_release_bundle.py`
- 검증 파일: `scripts/verify_static_app.py`, `tests/test_static_app.py`

## 상세 문서 위치

- 상세 기술 설계: `04-technical-design.md`
- 실제 진행 로그: `09-progress-log.md`
- 상세 다음 단계: `07-next-steps.md`
