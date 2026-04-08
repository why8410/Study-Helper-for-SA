# 기술 설계서

## 1. 구조 요약

이 프로젝트는 `정적 웹앱` 입니다.

즉,

- HTML
- CSS
- JavaScript

만으로 동작하는 태블릿용 앱입니다.

## 2. 왜 이런 구조를 선택했는가

기존 Mac 버전처럼 Python 서버와 Apple 로컬 AI를 그대로 쓸 수는 없었습니다.

태블릿 버전에서는:

- Android 브라우저에서 열려야 하고
- 설치 부담이 낮아야 하며
- 비용도 최소화해야 했습니다.

그래서 선택한 방식:

- 브라우저 내 카메라 API
- 브라우저 내 음성 입력
- 브라우저 내 음성 합성
- 브라우저에서 실행되는 OCR 라이브러리
- 정적 파일 기반 PWA

## 3. 파일 역할

- `index.html`
  - 화면 구조
- `styles.css`
  - 태블릿 우선 디자인
- `app.js`
  - 카메라, OCR, OCR 전처리, 힌트 생성, 음성, 공유, 최근 기록 로직
- `manifest.webmanifest`
  - 홈 화면 설치용 설정
- `sw.js`
  - 서비스 워커와 캐시
- `Start-Study-Helper-for-SA-Tablet.command`
  - Mac에서 미리보기 서버를 쉽게 띄우는 스크립트
- `Stop-Study-Helper-for-SA-Tablet.command`
  - 미리보기 서버 종료 스크립트
- `Build-Study-Helper-for-SA-Tablet-Release.command`
  - 배포용 정적 파일 묶음을 만드는 실행 스크립트
- `scripts/verify_static_app.py`
  - 정적 앱 구조 검증 스크립트
- `scripts/build_release_bundle.py`
  - Netlify 같은 정적 호스팅에 올릴 릴리스 폴더 생성
- `tests/test_static_app.py`
  - 검증 스크립트 자동 테스트

## 4. AI 관련 현재 구조

이 버전은 `외부 AI API 직접 연결` 보다
`브라우저 OCR + 규칙 기반 힌트 생성`
을 먼저 사용합니다.

보조 구조:

- OCR 전에 이미지를 흑백 대비 중심으로 한 번 정리
- 1차 읽기가 약하면 2차 보정 읽기를 다시 시도
- OCR 결과가 나오면 문제 번호 추출
- 선택된 번호 문제 문장만 추출
- 문장 패턴을 보고 문제 유형 추론
- 문제 유형에 맞는 힌트 세트 생성

## 5. ChatGPT 보조 구조

이 버전은 ChatGPT를 앱 안에 직접 붙이지 않았습니다.

대신:

- 현재 분석 결과
- 아이 요청
- OCR 전체 텍스트

를 합쳐서 `ChatGPT에 붙여넣을 질문`을 복사하는 방식입니다.

추가로:

- 브라우저의 공유 기능이 있으면 바로 다른 앱으로 전달 가능
- 최근 코칭 기록은 `localStorage` 에 저장해서 다시 불러올 수 있음
- 아이용 심화 질문과 부모용 설명 질문을 다르게 만들 수 있음

이 방법의 장점:

- API 비용이 없음
- 태블릿에서 바로 사용 가능
- 최실장님이 이미 가진 ChatGPT 계정을 활용 가능

## 6. 기술적 한계

- OCR 품질은 사진 상태 의존도가 큼
- 복잡한 문장은 규칙 기반 힌트가 약할 수 있음
- CDN에서 OCR 라이브러리를 불러오므로 인터넷 연결이 필요할 수 있음
- 카메라/PWA는 HTTPS에서 가장 안정적
