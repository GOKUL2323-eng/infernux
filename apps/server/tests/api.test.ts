import request from 'supertest';
import { createApp } from '../src/app';

describe('API Server Integration Tests', () => {
  const app = createApp();

  it('GET /health returns 200 with service information', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('Infernux API');
  });

  it('GET /api/v1/unknown returns 404 with standardized error response', async () => {
    const res = await request(app).get('/api/v1/unknown');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /api/v1/auth/register validates required input fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'short' }); // missing password, email, displayName

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('POST /api/v1/auth/login validates identifier and password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('Protected routes reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/chats/conversations');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

