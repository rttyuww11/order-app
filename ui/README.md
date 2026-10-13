# COZY 프런트엔드

React와 바닐라 JavaScript로 구성된 Vite 커피 주문 애플리케이션입니다. 현재 메뉴는 화면 확인을 위한 샘플 데이터입니다.

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

## 주문 API

주문하기 버튼은 `POST /api/orders`로 JSON 요청을 보냅니다. 요청에는 메뉴 항목, 수량, 선택 옵션, 항목 단가와 총 금액이 포함됩니다. API가 성공 응답을 반환해야 주문을 완료하고 장바구니를 비웁니다. 실패하거나 서버에 연결할 수 없으면 장바구니를 유지하고 오류를 표시합니다.

API 서버가 Vite 개발 서버와 다른 주소에서 실행된다면 Vite 프록시를 설정하거나 같은 출처에서 `/api/orders`를 제공해야 합니다.

## 디렉터리

- `src/`: React 애플리케이션 코드
- `public/`: 빌드 시 그대로 복사되는 정적 파일
- `dist/`: 프로덕션 빌드 출력물
