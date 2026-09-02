import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import fs from 'fs';
import dotenv from 'dotenv';
import { PrismaClient, JobStatus, RecordStatus, ResultType, ExceptionSeverity, ExceptionStatus } from '@prisma/client';
import { Normalizer } from './engine/normalization';
import { MatchingEngine, RecordForMatching } from './engine/matching.engine';
import axios from 'axios';

dotenv.config({ path: '../.env' });

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

console.log('[Worker] Initializing Reconcile background worker...');

// 1. IMPORT WORKER
const importWorker = new Worker(
  'import-queue',
  async (job: Job) => {
    const { importId, organizationId, dataSourceId, filePath, dataSourceType, config } = job.data;
    console.log(`[Worker] Processing import job ${job.id} for importId: ${importId}`);

    try {
      await prisma.import.update({
        where: { id: importId },
        data: { status: JobStatus.PROCESSING },
      });

      let rawRows: any[] = [];

      if (dataSourceType === 'CSV') {
        if (!filePath || !fs.existsSync(filePath)) {
          throw new Error(`File not found at path: ${filePath}`);
        }
        const buffer = fs.readFileSync(filePath);
        rawRows = Normalizer.parseCsvFile(buffer);
      } else if (dataSourceType === 'JSON') {
        if (!filePath || !fs.existsSync(filePath)) {
          throw new Error(`File not found at path: ${filePath}`);
        }
        const buffer = fs.readFileSync(filePath);
        rawRows = Normalizer.parseJsonFile(buffer);
      } else if (dataSourceType === 'API') {
        const baseUrl = config.baseUrl;
        const resourcePath = config.resourcePath || '/';
        const url = `${baseUrl.replace(/\/$/, '')}/${resourcePath.replace(/^\//, '')}`;
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (config.authToken) {
          headers['Authorization'] = `Bearer ${config.authToken}`;
        }
        const response = await axios.get(url, { headers, timeout: 10000 });
        let data = response.data;
        if (Array.isArray(data)) rawRows = data;
        else if (data && typeof data === 'object') {
          rawRows = data.records || data.data || data.items || data.transactions || [data];
        }
      }

      const normalization = Normalizer.processRawRecords(rawRows);

      // Save records in batch
      if (normalization.validRows.length > 0) {
        await prisma.sourceRecord.createMany({
          data: normalization.validRows.map((r) => ({
            importId,
            organizationId,
            externalId: r.externalId,
            amount: r.amount,
            currency: r.currency,
            date: r.date,
            customerReference: r.customerReference,
            status: r.status as RecordStatus,
            metadata: r.metadata,
          })),
        });
      }

      await prisma.import.update({
        where: { id: importId },
        data: {
          status: JobStatus.COMPLETED,
          totalRows: normalization.totalRows,
          validRows: normalization.validRows.filter((r) => r.status === 'VALID').length,
          duplicateRows: normalization.duplicateRowsCount,
          invalidRows: normalization.invalidRowsCount,
          errorSummary: normalization.errorSummary,
          completedAt: new Date(),
        },
      });

      console.log(`[Worker] Import job ${job.id} completed successfully.`);
    } catch (err: any) {
      console.error(`[Worker] Import job ${job.id} failed:`, err);
      await prisma.import.update({
        where: { id: importId },
        data: {
          status: JobStatus.FAILED,
          errorSummary: [{ row: 0, reason: err.message || 'Unknown processing error' }],
        },
      });
      throw err;
    }
  },
  { connection }
);

// 2. RECONCILIATION WORKER
const reconciliationWorker = new Worker(
  'reconciliation-queue',
  async (job: Job) => {
    const { reconciliationId, organizationId } = job.data;
    console.log(`[Worker] Processing reconciliation job ${job.id} for reconciliationId: ${reconciliationId}`);

    try {
      await prisma.reconciliation.update({
        where: { id: reconciliationId },
        data: { status: JobStatus.RUNNING },
      });

      const reconciliation = await prisma.reconciliation.findFirst({
        where: { id: reconciliationId },
        include: { matchingRule: true, createdBy: true },
      });

      if (!reconciliation) {
        throw new Error(`Reconciliation ${reconciliationId} not found`);
      }

      // Get latest completed import for Source A
      const importA = await prisma.import.findFirst({
        where: { dataSourceId: reconciliation.sourceAId, status: JobStatus.COMPLETED },
        orderBy: { createdAt: 'desc' },
      });

      // Get latest completed import for Source B
      const importB = await prisma.import.findFirst({
        where: { dataSourceId: reconciliation.sourceBId, status: JobStatus.COMPLETED },
        orderBy: { createdAt: 'desc' },
      });

      if (!importA || !importB) {
        throw new Error('Completed imports for both Data Source A and Data Source B are required to run reconciliation');
      }

      const [recordsA, recordsB] = await Promise.all([
        prisma.sourceRecord.findMany({
          where: { importId: importA.id, status: RecordStatus.VALID },
        }),
        prisma.sourceRecord.findMany({
          where: { importId: importB.id, status: RecordStatus.VALID },
        }),
      ]);

      const formattedA: RecordForMatching[] = recordsA.map((r) => ({
        id: r.id,
        externalId: r.externalId,
        amount: r.amount,
        currency: r.currency,
        date: r.date,
        customerReference: r.customerReference,
      }));

      const formattedB: RecordForMatching[] = recordsB.map((r) => ({
        id: r.id,
        externalId: r.externalId,
        amount: r.amount,
        currency: r.currency,
        date: r.date,
        customerReference: r.customerReference,
      }));

      const matchingResults = MatchingEngine.compareRecords(formattedA, formattedB, {
        primaryKey: reconciliation.matchingRule.primaryKey,
        requireAmountMatch: reconciliation.matchingRule.requireAmountMatch,
        dateToleranceSeconds: reconciliation.matchingRule.dateToleranceSeconds,
        requireCustomerMatch: reconciliation.matchingRule.requireCustomerMatch,
      });

      let matchedCount = 0;
      let mismatchCount = 0;
      let missingACount = 0;
      let missingBCount = 0;

      // Process results and create exceptions
      for (const res of matchingResults) {
        if (res.resultType === 'MATCHED') matchedCount++;
        else if (res.resultType === 'MISMATCH') mismatchCount++;
        else if (res.resultType === 'MISSING_FROM_A') missingACount++;
        else if (res.resultType === 'MISSING_FROM_B') missingBCount++;

        const createdResult = await prisma.reconciliationResult.create({
          data: {
            reconciliationId,
            sourceARecordId: res.sourceARecordId,
            sourceBRecordId: res.sourceBRecordId,
            resultType: res.resultType,
            differenceAmount: res.differenceAmount,
            mismatchFields: res.mismatchFields,
          },
        });

        // Create exception for non-matched results
        if (res.resultType !== 'MATCHED') {
          let severity: ExceptionSeverity = ExceptionSeverity.MEDIUM;
          let reasonText = '';

          if (res.resultType === 'MISMATCH') {
            const diffCents = Number(res.differenceAmount);
            if (diffCents > 10000) severity = ExceptionSeverity.HIGH; // > $100
            reasonText = `Discrepancy detected in fields: ${Object.keys(res.mismatchFields).join(', ')}`;
          } else if (res.resultType === 'MISSING_FROM_B') {
            severity = ExceptionSeverity.HIGH;
            reasonText = `Record present in Source A but absent in Source B`;
          } else if (res.resultType === 'MISSING_FROM_A') {
            severity = ExceptionSeverity.HIGH;
            reasonText = `Record present in Source B but absent in Source A`;
          }

          await prisma.exception.create({
            data: {
              organizationId,
              reconciliationId,
              resultId: createdResult.id,
              severity,
              status: ExceptionStatus.OPEN,
              createdById: reconciliation.createdById,
              reason: reasonText,
            },
          });
        }
      }

      await prisma.reconciliation.update({
        where: { id: reconciliationId },
        data: {
          status: JobStatus.COMPLETED,
          totalSourceA: recordsA.length,
          totalSourceB: recordsB.length,
          matchedCount,
          mismatchCount,
          missingACount,
          missingBCount,
          completedAt: new Date(),
        },
      });

      console.log(`[Worker] Reconciliation job ${job.id} completed successfully.`);
    } catch (err: any) {
      console.error(`[Worker] Reconciliation job ${job.id} failed:`, err);
      await prisma.reconciliation.update({
        where: { id: reconciliationId },
        data: { status: JobStatus.FAILED },
      });
      throw err;
    }
  },
  { connection }
);

importWorker.on('failed', (job, err) => {
  console.error(`[Import Queue] Job ${job?.id} failed with error:`, err);
});

reconciliationWorker.on('failed', (job, err) => {
  console.error(`[Reconciliation Queue] Job ${job?.id} failed with error:`, err);
});

console.log('[Worker] Worker processes running and waiting for jobs.');

import http from 'http';
const port = process.env.PORT || 8000;
http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Worker is active\n');
}).listen(port, () => {
  console.log(`[Worker] Healthcheck HTTP server listening on port ${port}`);
});

