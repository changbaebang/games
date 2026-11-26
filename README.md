# 미니 게임 오락실

브라우저에서 바로 하는 작은 게임 모음입니다. PC와 모바일 모두 지원해요.

| 게임 | 장르 | 경로 |
|---|---|---|
| 블록 헌터 | 3D 블록 액션 | [`/block-hunter/`](./block-hunter/) |
| 에이스 스트라이크 | 세로 스크롤 비행 슈팅 | [`/ace-strike/`](./ace-strike/) |
| 달빛 생존자 | 생존 로그라이트 | [`/moon-survivor/`](./moon-survivor/) |
| 블록 스택 | 낙하 블록 퍼즐 | [`/block-stack/`](./block-stack/) |
| 여우 달리기 | 러너 | [`/fox-run/`](./fox-run/) |
| 성벽 수비대 | 타워 디펜스 | [`/castle-guard/`](./castle-guard/) |
| 미니 레이서 | 탑뷰 레이싱 | [`/mini-racer/`](./mini-racer/) |
| 벽돌 팡팡 | 벽돌깨기 | [`/brick-pop/`](./brick-pop/) |
| 달걀 바꾸기 | 3매치 퍼즐 | [`/egg-swap/`](./egg-swap/) |
| 달걀 받기 | 캐주얼 받기 | [`/egg-catch/`](./egg-catch/) |
| 달걀 싣고 달려라 | 물리 드라이브 | [`/egg-drive/`](./egg-drive/) |
| 과일 합치기 | 물리 퍼즐 | [`/fruit-merge/`](./fruit-merge/) |
| 오목 | 보드게임 (AI·2인) | [`/omok/`](./omok/) |
| 에어하키 | 대전 (AI·2인) | [`/air-hockey/`](./air-hockey/) |
| 구구단 풍선 | 구구단 학습 (2학년) | [`/gugudan-balloon/`](./gugudan-balloon/) |
| 똑딱 시계 | 시계 보기·시간 계산 (2~3학년) | [`/tick-clock/`](./tick-clock/) |

## 플레이

GitHub Pages: https://changbaebang.github.io/games/

## 공통 기능

- **앱처럼 설치**: `manifest.webmanifest` + `sw.js`. 안드로이드·PC 크롬은 목록 화면의 "앱으로 설치" 버튼, 아이폰은 Safari 공유 → 홈 화면에 추가. 한 번 연 게임은 오프라인에서도 열립니다.
- **효과음**: `common/arcade.js`가 WebAudio로 효과음을 합성합니다(음원 파일 없음). 모든 게임 공통 음소거는 각 게임 메뉴의 "소리" 버튼이나 `M` 키.
- **내 기록**: 각 게임이 최고 기록을 `localStorage`에 저장하고, 목록 화면 카드에 "내 기록"으로 보여 줍니다. 기록은 기기·브라우저별로 따로 저장됩니다.

## 새 게임 추가하기

1. `게임이름/index.html` 폴더를 만듭니다.
2. 루트 `index.html`의 `<main class="grid">` 안에 카드(`<a class="game">`)를 하나 추가합니다.
3. 게임 `<head>`에 `<script src="../common/arcade.js"></script>`를 넣고, 효과음은 `Arcade.play('coin')`, 기록은 `Arcade.record('키', 값)`으로 저장합니다.
4. 루트 `index.html` 아래쪽 `REC` 표에 기록 표시 방법을, `sw.js`의 `PRECACHE`에 새 폴더를 추가하고 `VERSION`을 올립니다.

각 게임은 외부 빌드 없이 HTML 파일 하나로 동작합니다. (블록 헌터는 three.js를 CDN에서 불러옵니다.)
