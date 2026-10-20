import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import api from './api.js';
import { checkDatabaseConnection } from './database.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    const error = new Error('Origin is not allowed by CORS');
    error.status = 403;
    callback(error);
  },
}));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', async (_request, response, next) => {
  try {
    await checkDatabaseConnection();
    response.json({
      service: 'cozy-order-server',
      status: 'ok',
      database: 'connected',
    });
  } catch (error) {
    error.status = 503;
    next(error);
  }
});

app.use('/api', api);

app.use((_request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: '요청한 경로를 찾을 수 없습니다.',
    },
  });
});

app.use((error, _request, response, _next) => {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : error.type === 'entity.parse.failed'
      ? 400
      : 500;

  if (status >= 500) {
    console.error(error);
  }

  response.status(status).json({
    error: {
      code: error.code ?? (
        status === 403
          ? 'FORBIDDEN'
          : status === 400
            ? 'BAD_REQUEST'
            : status === 503
              ? 'SERVICE_UNAVAILABLE'
              : 'INTERNAL_SERVER_ERROR'
      ),
      message:
        status >= 500
          ? '서버 내부 오류가 발생했습니다.'
          : error.type === 'entity.parse.failed'
            ? 'JSON 요청 형식이 올바르지 않습니다.'
            : error.message,
    },
  });
});

export default app;
