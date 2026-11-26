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

## 플레이

GitHub Pages: https://changbaebang.github.io/games/

## 새 게임 추가하기

1. `게임이름/index.html` 폴더를 만듭니다.
2. 루트 `index.html`의 `<main class="grid">` 안에 카드(`<a class="game">`)를 하나 추가합니다.

각 게임은 외부 빌드 없이 HTML 파일 하나로 동작합니다. (블록 헌터는 three.js를 CDN에서 불러옵니다.)
