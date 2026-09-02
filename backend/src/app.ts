import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

import authRoutes from './modules/auth/auth.routes';
import organizationRoutes from './modules/organizations/organizations.routes';
import dataSourceRoutes from './modules/data-sources/data-sources.routes';
import importRoutes from './modules/imports/imports.routes';
import reconciliationRoutes from './modules/reconciliations/reconciliations.routes';
import exceptionRoutes from './modules/exceptions/exceptions.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import auditRoutes from './modules/audit/audit.routes';
import searchRoutes from './modules/search/search.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: '*', // Configurable in production
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/data-sources', dataSourceRoutes);
app.use('/api/v1/imports', importRoutes);
app.use('/api/v1/reconciliations', reconciliationRoutes);
app.use('/api/v1/exceptions', exceptionRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/search', searchRoutes);

// Error Handler Middleware
app.use(errorHandler);

export default app;
