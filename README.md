# Study Helper for SA

화면에는 `Study Helper for SA` 가 제목으로 보이고,
작은 보조 문구로만 `For Tablet` 이 표시됩니다.

갤럭시 태블릿처럼 `Mac이 아닌 기기`에서도 사용할 수 있도록 만든
태블릿용 `PWA 웹앱` 버전입니다.

## 참고 자료

기획, 설계, 진행 기록은 `project-materials/` 폴더를 보면 됩니다.

## GitHub 배포

- GitHub 저장소: `https://github.com/why8410/Study-Helper-for-SA`
- GitHub Actions 기반 Pages 배포 워크플로: `.github/workflows/deploy-pages.yml`
- GitHub Pages 프로젝트 주소 형식:
  - `https://why8410.github.io/Study-Helper-for-SA/`

이 저장소는 GitHub Pages 하위 경로에서도 열리도록
상대 경로와 서비스 워커 등록 경로를 맞춰두었습니다.

## 이 버전의 핵심

- Android 태블릿 브라우저 중심
- `사진 찍기` 버튼으로 여는 전체화면 촬영 / 사진 업로드
- 브라우저 내장 음성 입력
- 브라우저 내장 음성 읽기
- 음성 입력 상태 버튼 표시
- 클라이언트 측 OCR
- OCR 전처리로 사진 대비 보정
- OCR 약할 때 2차 보정 읽기
- 정답보다 힌트 우선 코칭
- 힌트 카드와 마지막 단계 카드 안 `자동 읽기`
- 필요하면 `ChatGPT 복사`
- `아이용 깊은 풀이` 와 `부모용 요약` 중 선택해서 ChatGPT 보조 질문 준비
- `공유하기`로 ChatGPT 앱이나 다른 앱으로 전달
- 최근 코칭 기록 저장과 다시 불러오기

## 실제 사용 기준 메모

- Netlify 같은 정적 호스팅에 올려두면 이 PC를 꺼도 링크가 열립니다.
- 첫 실행은 OCR 라이브러리 로드 때문에 인터넷 연결이 있는 편이 좋습니다.
- `홈 화면에 추가` 해두면 태블릿에서 앱처럼 쓰기 편합니다.
- 최근 기록은 현재 기기 브라우저 안에만 저장됩니다.
- 현재 버전은 기본 사용에 `ChatGPT 로그인` 이 필요하지 않습니다.
- 다만 `ChatGPT 복사`, `공유하기` 로 ChatGPT 앱을 함께 쓸 때는 그때만 ChatGPT 로그인 여부가 영향을 줍니다.

## 왜 새 버전이 필요한가

기존 `Study Helper for SA` 는 Mac 로컬 실행과 Apple 로컬 AI를 기준으로 만들었습니다.

하지만 이 폴더의 버전은:

- Mac 없이도 쓸 수 있게
- 갤럭시 태블릿 브라우저에서 실행되게
- 서버 의존을 줄이고
- 태블릿 단독 사용 흐름에 맞게

다시 만든 버전입니다.

## 파일 구조

- `index.html`: 태블릿용 메인 화면
- `styles.css`: 모바일 우선 UI 스타일
- `app.js`: 카메라, OCR, 힌트, 음성, 공유, 최근 기록 로직
- `manifest.webmanifest`: PWA 설치 정보
- `sw.js`: 오프라인 캐시용 서비스 워커
- `netlify.toml`: 무료 정적 배포용 기본 설정
- `favicon.svg`: 앱 아이콘
- `Start-Study-Helper-for-SA-Tablet.command`: 로컬 미리보기 실행
- `Stop-Study-Helper-for-SA-Tablet.command`: 로컬 미리보기 종료
- `Build-Study-Helper-for-SA-Tablet-Release.command`: 배포용 파일 묶음 생성
- `scripts/verify_static_app.py`: 정적 앱 구조 검증
- `scripts/build_release_bundle.py`: 정적 배포용 릴리스 폴더 생성
- `project-materials/`: 기획/설계/운영 문서

`Build-Study-Helper-for-SA-Tablet-Release.command` 를 실행하면
릴리스 폴더와 최신 zip 파일이 함께 다시 만들어집니다.
릴리스 폴더 안에는 `DEPLOY-NOTES.txt` 와 `TABLET-TEST-CHECKLIST.txt` 도 같이 생성됩니다.

## 실행 방법

이 앱은 정적 웹앱이라서
`HTTPS 환경` 또는 `localhost` 에서 실행하는 것이 가장 좋습니다.

### 로컬 테스트 예시

```bash
python3 -m http.server 8010
```

그 뒤 브라우저에서 아래 주소로 접속:

```text
http://127.0.0.1:8010
```

### Mac 더블클릭 실행

- `Start-Study-Helper-for-SA-Tablet.command`
- `Stop-Study-Helper-for-SA-Tablet.command`

## 갤럭시 태블릿에서 실제 사용하려면

가장 쉬운 방법은 이 앱을 `정적 호스팅` 하는 것입니다.

예:

- GitHub Pages
- Netlify
- Cloudflare Pages

이유:

- 모바일 카메라는 보통 `https://` 또는 `localhost` 에서만 안정적으로 동작
- PWA 설치도 HTTPS에서 가장 잘 동작

## 현재 한계

- 클라이언트 OCR 정확도는 사진 품질의 영향을 크게 받음
- 휴대폰으로 PC 화면을 다시 찍는 방식에서는 OCR 정확도가 더 떨어질 수 있음
- 실제 문제집 종이 또는 원본 이미지 업로드가 더 정확함
- OpenAI API를 직접 붙인 버전보다 풀이 품질은 낮을 수 있음
- ChatGPT 계정이 있으면 `ChatGPT 복사` 버튼으로 더 자세한 풀이 보완 가능
- 최근 기록은 이 태블릿 브라우저 안에만 저장됨

## 검증

```bash
python3 scripts/verify_static_app.py
python3 -m unittest discover -s tests
```

## 추천 사용 방식

1. 태블릿에서 `사진 찍기` 를 눌러 전체화면 촬영을 연다
2. 앱에서 힌트를 먼저 본다
3. 더 깊은 풀이가 필요하면 `ChatGPT 복사`
4. ChatGPT 앱에 붙여넣어 추가 질문
