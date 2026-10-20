# COZY 프런트엔드

React와 바닐라 JavaScript로 구성된 Vite 커피 주문 애플리케이션입니다. 메뉴·재고·주문 데이터는 Express API와 PostgreSQL에서 불러옵니다.

## 시작하기

```sh
npm install
npm run dev
```

개발 서버 주소는 터미널에 표시됩니다.

## 명령어

```sh
npm run build    # 프로덕션 빌드
npm run preview  # 프로덕션 빌드 미리보기
npm run lint     # Oxlint 검사
```

## API 연결

Vite 개발 서버는 `/api` 요청을 `http://127.0.0.1:3000`으로 프록시합니다. 먼저 [백엔드 README](../server/README.md)에 따라 PostgreSQL과 API 서버를 실행한 뒤 프런트엔드를 시작하세요. 메뉴와 재고는 서버에서 조회되며, 주문 가격 검증과 재고 차감도 서버에서 원자적으로 처리합니다.

## 디렉터리

- `src/`: React 애플리케이션 코드
- `public/`: 빌드 시 그대로 복사되는 정적 파일
- `dist/`: 프로덕션 빌드 출력물
