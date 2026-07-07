# Cat Finder

강아지들 사이에 숨어 있는 고양이 4마리를 찾는 간단한 클릭 게임입니다.

- 고양이를 맞히면 `O` 표시가 나옵니다.
- 잘못 누르면 `X` 표시가 나오고 생명력이 1 줄어듭니다.
- 생명력이 모두 없어지기 전에 고양이 4마리를 찾으면 성공입니다.

## 바로 실행

```bash
npm install
npm run dev:client
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:5173/
```

`http://localhost:5173/cat-finder`로 열어도 같은 게임이 나옵니다.

## GitHub Pages

`main` 브랜치에 올라가면 GitHub Actions가 자동으로 검사와 빌드를 실행하고 Pages에 배포합니다.

배포 주소:

```text
https://mathlove22.github.io/cat-finder/
```

## 검사와 빌드

```bash
npm test
npm run build
```
