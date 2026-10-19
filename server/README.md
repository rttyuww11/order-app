# COZY 백엔드

Express.js 기반 API 서버 개발 환경입니다. PostgreSQL 연결 풀을 사용하며, 서버 시작 시 DB 연결을 확인합니다.

## 시작하기

```sh
npm install
npm run dev
```

서버는 기본적으로 `http://localhost:3000`에서 실행됩니다. `PORT`와 허용할 프런트엔드 출처(`CORS_ORIGIN`)는 `.env`에서 설정할 수 있습니다. `CORS_ORIGIN`에 여러 출처를 지정할 때는 쉼표로 구분합니다.

## 스크립트

```sh
npm run dev    # Node.js watch 모드로 개발 서버 실행
npm start      # 서버 실행
npm run check  # JavaScript 구문 검사
```

## 현재 엔드포인트

- `GET /api/health`: 서버 및 PostgreSQL 연결 상태 확인

PostgreSQL 접속 설정은 `.env`의 `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`로 관리합니다. 서버 오류는 공통 JSON 오류 형식으로 응답하며, 정의되지 않은 경로는 `404`를 반환합니다.

주문 및 메뉴 테이블과 제품 API는 `docs/PRD.md`의 백엔드 PRD에 따라 다음 단계에서 구현합니다.
