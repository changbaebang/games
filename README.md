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
| 계란 훔치기 | 잠입·펫 수집 | [`/egg-steal/`](./egg-steal/) |
| 구구단 풍선 | 구구단 학습 (2학년) | [`/gugudan-balloon/`](./gugudan-balloon/) |
| 똑딱 시계 | 시계 보기·시간 계산 (2~3학년) | [`/tick-clock/`](./tick-clock/) |
| 동전 가게 | 돈 계산·거스름돈 (2~3학년) | [`/coin-shop/`](./coin-shop/) |
| 규칙 기차 | 규칙 찾기 (2~3학년) | [`/pattern-train/`](./pattern-train/) |
| 각도 탐정 | 각도·각 구하기 (4~5학년) | [`/angle-detective/`](./angle-detective/) |
| 입체 공방 | 직육면체·전개도·쌓기나무 (5~6학년) | [`/solid-lab/`](./solid-lab/) |

## 플레이

GitHub Pages: https://changbaebang.github.io/games/

## 공통 기능

- **앱처럼 설치**: `manifest.webmanifest` + `sw.js`. 안드로이드·PC 크롬은 목록 화면의 "앱으로 설치" 버튼, 아이폰은 Safari 공유 → 홈 화면에 추가. 한 번 연 게임은 오프라인에서도 열립니다.
- **효과음**: `common/arcade.js`가 WebAudio로 효과음을 합성합니다(음원 파일 없음). 모든 게임 공통 음소거는 각 게임 메뉴의 "소리" 버튼이나 `M` 키.
- **내 기록**: 각 게임이 최고 기록을 `localStorage`에 저장하고, 목록 화면 카드에 "내 기록"으로 보여 줍니다. 기록은 기기·브라우저별로 따로 저장됩니다.

## 새 게임 추가하기

1. `게임이름/` 폴더를 만들고, 파일을 역할별로 나눕니다.

   | 파일 | 내용 |
   |---|---|
   | `index.html` | 화면 뼈대(마크업)만. `style.css`, `game.js`를 불러옴 |
   | `style.css` | 모양 |
   | `game.js` | 게임 동작. 시작할 때 `data.json`을 `fetch`로 읽음 |
   | `data.json` | 단계, 문제 범위, 물건·손님 목록, 칭찬 문구처럼 자주 바꾸는 내용 |

   내용(단계 난이도, 문구 등)만 바꿀 때는 `data.json`만 고치면 됩니다.
2. 루트 `index.html`의 `<main class="grid">` 안에 카드(`<a class="game">`)를 하나 추가합니다.
3. 게임 `<head>`에 `<script src="../common/arcade.js"></script>`를 넣고, 효과음은 `Arcade.play('coin')`, 기록은 `Arcade.record('키', 값)`으로 저장합니다.
4. 루트 `index.html` 아래쪽 `REC` 표에 기록 표시 방법을, `sw.js`의 `PRECACHE`에 새 폴더와 그 안의 파일들을 추가하고 `VERSION`을 올립니다.

### 컴퓨터에서 열어 보기

`data.json`을 `fetch`로 읽기 때문에 파일을 더블클릭해서(`file://`) 열면 데이터를 못 불러옵니다. 저장소 폴더에서 아래처럼 웹 서버를 띄우고 http://localhost:8000 으로 여세요.

```
python3 -m http.server 8000
```

학습 게임(구구단 풍선, 똑딱 시계, 동전 가게, 규칙 기차, 각도 탐정, 입체 공방)이 이 구조를 따릅니다. 그 전에 만든 게임은 HTML 파일 하나로 되어 있어요. (블록 헌터는 three.js를 CDN에서 불러옵니다.)
