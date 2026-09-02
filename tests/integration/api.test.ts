import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../backend/src/app';

describe('API Integration & Multi-Tenancy Isolation Tests', () => {
  let tokenOrgA: string;
  let tokenOrgB: string;

  beforeAll(async () => {
    // Login Org A user
    const resA = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@acme.com',
      password: 'password123',
    });
    tokenOrgA = resA.body.token;

    // Login Org B user
    const resB = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@globex.com',
      password: 'password123',
    });
    tokenOrgB = resB.body.token;
  });

  it('should authenticate user and return current profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('owner@acme.com');
  });

  it('ENFORCE TENANT ISOLATION: Org B cannot view Org A data sources', async () => {
    // Org A fetches data sources
    const resA = await request(app)
      .get('/api/v1/data-sources')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    expect(resA.status).toBe(200);
    const orgADsIds = resA.body.dataSources.map((ds: any) => ds.id);
    expect(orgADsIds.length).toBeGreaterThan(0);

    // Org B fetches data sources
    const resB = await request(app)
      .get('/api/v1/data-sources')
      .set('Authorization', `Bearer ${tokenOrgB}`);

    expect(resB.status).toBe(200);
    const orgBDsIds = resB.body.dataSources.map((ds: any) => ds.id);

    // Org B should NOT see any of Org A's data source IDs
    for (const id of orgADsIds) {
      expect(orgBDsIds).not.toContain(id);
    }
  });

  it('ENFORCE TENANT ISOLATION: Org B cannot fetch Org A reconciliations by ID', async () => {
    const listA = await request(app)
      .get('/api/v1/reconciliations')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    if (listA.body.reconciliations.length > 0) {
      const reconId = listA.body.reconciliations[0].id;

      // Org B attempts to access Org A's reconciliation ID
      const resB = await request(app)
        .get(`/api/v1/reconciliations/${reconId}`)
        .set('Authorization', `Bearer ${tokenOrgB}`);

      expect(resB.status).toBe(404);
      expect(resB.body.error.code).toBe('RECONCILIATION_NOT_FOUND');
    }
  });

  it('should reject unauthenticated requests with 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/v1/reconciliations');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
