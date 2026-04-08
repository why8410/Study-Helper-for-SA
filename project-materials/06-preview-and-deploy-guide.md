# 미리보기 및 배포 가이드

## 1. 목적

이 문서는 `Study Helper for SA Tablet` 을

- 지금 Mac에서 미리보는 방법
- 나중에 갤럭시 태블릿에서 여는 방법

을 설명합니다.

갤럭시 태블릿에서 실제 테스트하는 상세 순서는
`10-galaxy-tablet-test-guide.md` 를 함께 보면 됩니다.

## 2. 지금 Mac에서 미리보기

가장 쉬운 방법:

- `Start-Study-Helper-for-SA-Tablet.command` 더블클릭

종료:

- `Stop-Study-Helper-for-SA-Tablet.command` 더블클릭

직접 실행:

```bash
python3 -m http.server 8010
```

접속 주소:

```text
http://127.0.0.1:8010
```

## 3. 왜 HTTPS가 중요한가

태블릿에서 아래 기능은 HTTPS에서 가장 안정적으로 동작합니다.

- 카메라 권한
- PWA 설치
- 서비스 워커

그래서 실제 태블릿 사용 단계에서는
`정적 배포` 가 사실상 필요합니다.

## 4. 실제 태블릿 사용 추천 방식

가장 현실적인 방식:

1. 이 폴더를 GitHub Pages, Netlify, Cloudflare Pages 같은 정적 호스팅에 올림
2. 태블릿 브라우저에서 HTTPS 주소로 접속
3. 홈 화면에 추가
4. 앱처럼 사용

배포용 파일을 따로 모으고 싶으면:

- `Build-Study-Helper-for-SA-Tablet-Release.command` 더블클릭
- 또는 `python3 scripts/build_release_bundle.py`

그러면 `release/study-helper-for-sa-tablet-web/` 폴더가 만들어지고,
최신 `release/study-helper-for-sa-tablet-web.zip` 도 함께 다시 만들어집니다.

릴리스 폴더 안에는 아래 안내 파일도 같이 들어갑니다.

- `DEPLOY-NOTES.txt`
- `TABLET-TEST-CHECKLIST.txt`

그 안의 파일 또는 zip 파일을 정적 호스팅에 올리면 됩니다.

필요하면:

- `release/study-helper-for-sa-tablet-web.zip`

처럼 압축해서 한 번에 올릴 수도 있습니다.

## 4-1. 임시 테스트용 빠른 방법

정식 배포 전이라면
`임시 HTTPS 터널` 로 태블릿 테스트를 먼저 해볼 수도 있습니다.

예를 들어:

- Mac에서 로컬 미리보기 서버 실행
- 임시 공개 HTTPS 주소 생성
- 갤럭시 태블릿에서 그 주소 접속

이 방법의 장점:

- 정식 배포 전에 빠르게 실기 테스트 가능
- 카메라, OCR, 버튼 흐름을 먼저 확인 가능

주의:

- 주소가 임시로 바뀔 수 있음
- 터널을 띄운 Mac이 켜져 있어야 함
- Mac을 끄면 링크도 함께 멈춤

## 4-2. PC를 꺼도 링크가 열리게 하려면

현재처럼 `임시 터널` 방식은
이 Mac이 실제로 앱 파일을 내보내고 있기 때문에
Mac 전원이 꺼지면 링크도 사용할 수 없습니다.

즉:

- `임시 링크` = 빠른 테스트용
- `PC를 꺼도 계속 열리는 링크` = 정적 호스팅 필요

그래서 최실장님이 집에서
`링크만 열어서 쓰고 싶다`
면 아래 중 하나가 필요합니다.

- Netlify
- Cloudflare Pages
- GitHub Pages

이 경우에는 한 번 올려두면
이 PC가 꺼져 있어도 링크로 계속 접속할 수 있습니다.

다만 이 단계부터는
호스팅 서비스 로그인은 한 번 필요합니다.

실사용 기준으로 보면:

- 집에서 매번 PC를 켤 필요가 없어짐
- 태블릿에서 같은 링크를 계속 사용할 수 있음
- 홈 화면 추가 후 앱처럼 쓰기 쉬워짐
- 현재 버전의 기본 코칭은 태블릿에서 ChatGPT 로그인 없이도 사용 가능
- 단, `ChatGPT 복사`, `공유하기` 로 ChatGPT 앱을 함께 쓸 때는 ChatGPT 로그인이 필요할 수 있음

현재 확인된 Netlify 기본 주소 예시:

- `https://stately-lebkuchen-7423fb.netlify.app`

배포별 개별 주소보다
이런 `기본 사이트 주소`를 저장해 두는 편이 실제 사용에는 더 편합니다.

현재 기준으로 최신 UI 반영까지 확인되었습니다.

## 5. 현재 가장 쉬운 후보

### Netlify

- 정적 사이트 배포가 쉬움
- HTTPS 자동

### Cloudflare Pages

- 정적 사이트에 적합
- HTTPS 자동

### GitHub Pages

- 코드 관리와 함께 하기 좋음
- 다만 설정이 조금 더 익숙해야 할 수 있음

## 6. 배포 전 체크할 것

- `manifest.webmanifest` 응답 확인
- `sw.js` 응답 확인
- 카메라 권한 허용 확인
- OCR 라이브러리 로드 확인
- 힌트 카드와 마지막 단계 카드의 `자동 읽기` 동작 확인
- 최근 기록 저장과 불러오기 확인
- `공유하기` 버튼이 태블릿에서 열리는지 확인

## 7. 현재 제약

- 정적 배포 자체는 한 번 진행해서 기본 Netlify 주소와 최신 UI 반영까지 확인함
- 다만 실제 갤럭시 태블릿에서의 실사용 기록은 더 쌓아야 함
- 최근 기록은 기기 안 브라우저 저장소에만 남음
- 다음 단계는 HTTPS 주소로 실제 태블릿 테스트를 반복하면서 OCR과 음성 흐름을 다듬는 것
