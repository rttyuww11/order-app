# COZY 백엔드

Express.js와 PostgreSQL을 사용하는 커피 주문 API입니다. 서버 시작 시 테이블을 생성하고 예시 메뉴와 옵션을 최초 한 번 등록합니다.

## 시작하기

```sh
npm install
npm run dev
```

`.env.example`을 `.env`로 복사해 PostgreSQL 연결 정보를 설정한 뒤 서버를 실행합니다. 서버는 기본적으로 `http://localhost:3000`에서 실행됩니다. `PORT`와 허용할 프런트엔드 출처(`CORS_ORIGIN`)를 설정할 수 있으며, 여러 출처는 쉼표로 구분합니다. Vite 개발 서버는 `/api` 요청을 이 서버로 프록시합니다.

## 스크립트

```sh
npm run dev    # Node.js watch 모드로 개발 서버 실행
npm start      # 서버 실행
npm run check  # JavaScript 구문 검사
```

## 현재 엔드포인트

- `GET /api/health`: 서버 및 PostgreSQL 연결 상태 확인
- `GET /api/menus`: 주문 가능한 메뉴와 옵션 조회
- `GET /api/admin/menus`: 관리자 메뉴 및 재고 조회
- `PATCH /api/admin/menus/:menuId/stock`: 재고를 1개 증감
- `POST /api/orders`: 주문 생성 및 재고 원자적 차감
- `GET /api/orders/:orderId`: 주문 단건 조회
- `GET /api/admin/orders`: 관리자 주문 목록 및 상태별 집계
- `PATCH /api/admin/orders/:orderId/status`: 주문을 다음 상태로 전이

초기 메뉴는 아메리카노, 고구마라떼, 카페라떼이며, 세 메뉴 모두 아이스/핫 중 한 가지 온도를 선택할 수 있습니다. 아메리카노 가격은 4,000원, 라떼 메뉴는 각각 5,000원이며, 각 메뉴에 샷·시럽 추가 옵션이 있습니다. 온도 선택은 메뉴 옵션의 선택 그룹으로 한 가지만 고를 수 있습니다.

PostgreSQL 접속 설정은 `.env`의 `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`로 관리합니다. 주문 가격과 재고는 서버에서 검증하며, 주문 생성·재고 차감은 한 트랜잭션으로 처리합니다. 모든 오류는 `{ "error": { "code": "...", "message": "..." } }` 형식입니다.

현재 PRD 범위에는 인증이 포함되지 않습니다. 관리자 API는 공개 네트워크에 배포하기 전에 접근 통제를 추가해야 합니다.
