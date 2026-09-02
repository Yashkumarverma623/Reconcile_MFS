import { PrismaClient, Role, DataSourceType, RecordStatus, ResultType, ExceptionSeverity, ExceptionStatus, JobStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with deterministic test data...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.exceptionComment.deleteMany();
  await prisma.exception.deleteMany();
  await prisma.reconciliationResult.deleteMany();
  await prisma.reconciliation.deleteMany();
  await prisma.matchingRule.deleteMany();
  await prisma.sourceRecord.deleteMany();
  await prisma.import.deleteMany();
  await prisma.dataSource.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Organizations
  const acmeOrg = await prisma.organization.create({
    data: { name: 'Acme Financial Services' },
  });

  const globexOrg = await prisma.organization.create({
    data: { name: 'Globex Corporation' },
  });

  // 2. Users
  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@acme.com',
      passwordHash,
      name: 'Alice Owner',
      role: Role.OWNER,
      organizationId: acmeOrg.id,
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      email: 'member@acme.com',
      passwordHash,
      name: 'Bob Member',
      role: Role.MEMBER,
      organizationId: acmeOrg.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'viewer@acme.com',
      passwordHash,
      name: 'Charlie Viewer',
      role: Role.VIEWER,
      organizationId: acmeOrg.id,
    },
  });

  // Other tenant user for authorization tests
  await prisma.user.create({
    data: {
      email: 'owner@globex.com',
      passwordHash,
      name: 'Globex Owner',
      role: Role.OWNER,
      organizationId: globexOrg.id,
    },
  });

  // 3. Data Sources for Acme
  const dsStripe = await prisma.dataSource.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Stripe Payment Gateway',
      type: DataSourceType.CSV,
      config: { filenamePattern: 'stripe_*.csv' },
    },
  });

  const dsLedger = await prisma.dataSource.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Internal ERP Ledger',
      type: DataSourceType.JSON,
      config: { rootKey: 'transactions' },
    },
  });

  const dsBankApi = await prisma.dataSource.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Bank Statement API Connector',
      type: DataSourceType.API,
      config: { baseUrl: 'https://api.mockbank.com/v1', resourcePath: '/transactions' },
    },
  });

  // 4. Matching Rules
  const defaultRule = await prisma.matchingRule.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Standard ID + Amount + 24h Window',
      primaryKey: 'external_id',
      requireAmountMatch: true,
      dateToleranceSeconds: 86400, // 24 hours
      requireCustomerMatch: false,
    },
  });

  // 5. Imports and Records for Stripe & Ledger
  const stripeImport = await prisma.import.create({
    data: {
      organizationId: acmeOrg.id,
      dataSourceId: dsStripe.id,
      checksum: 'stripe-demo-checksum-001',
      status: JobStatus.COMPLETED,
      totalRows: 6,
      validRows: 5,
      invalidRows: 0,
      duplicateRows: 1,
      completedAt: new Date(),
    },
  });

  const ledgerImport = await prisma.import.create({
    data: {
      organizationId: acmeOrg.id,
      dataSourceId: dsLedger.id,
      checksum: 'ledger-demo-checksum-001',
      status: JobStatus.COMPLETED,
      totalRows: 5,
      validRows: 5,
      invalidRows: 0,
      duplicateRows: 0,
      completedAt: new Date(),
    },
  });

  // Source A Records (Stripe)
  const recA1 = await prisma.sourceRecord.create({
    data: {
      importId: stripeImport.id,
      organizationId: acmeOrg.id,
      externalId: 'TX-1001',
      amount: BigInt(12000), // $120.00
      currency: 'USD',
      date: new Date('2026-08-01T10:00:00Z'),
      customerReference: 'Alice Smith',
      status: RecordStatus.VALID,
    },
  });

  const recA2 = await prisma.sourceRecord.create({
    data: {
      importId: stripeImport.id,
      organizationId: acmeOrg.id,
      externalId: 'TX-1002',
      amount: BigInt(25000), // $250.00 (Source B will have 23000)
      currency: 'USD',
      date: new Date('2026-08-01T11:30:00Z'),
      customerReference: 'Bob Johnson',
      status: RecordStatus.VALID,
    },
  });

  const recA3 = await prisma.sourceRecord.create({
    data: {
      importId: stripeImport.id,
      organizationId: acmeOrg.id,
      externalId: 'TX-1003',
      amount: BigInt(45050), // $450.50
      currency: 'USD',
      date: new Date('2026-08-02T09:00:00Z'), // Date mismatch: Source B is 3 days later
      customerReference: 'Charlie Brown',
      status: RecordStatus.VALID,
    },
  });

  const recA4 = await prisma.sourceRecord.create({
    data: {
      importId: stripeImport.id,
      organizationId: acmeOrg.id,
      externalId: 'TX-1004',
      amount: BigInt(8999), // $89.99 (Missing from Source B)
      currency: 'USD',
      date: new Date('2026-08-03T14:15:00Z'),
      customerReference: 'Diana Prince',
      status: RecordStatus.VALID,
    },
  });

  const recA5 = await prisma.sourceRecord.create({
    data: {
      importId: stripeImport.id,
      organizationId: acmeOrg.id,
      externalId: 'TX-1005',
      amount: BigInt(31000), // $310.00
      currency: 'USD',
      date: new Date('2026-08-04T16:20:00Z'),
      customerReference: 'Eve Adams',
      status: RecordStatus.VALID,
    },
  });

  // Duplicate record in Source A
  await prisma.sourceRecord.create({
    data: {
      importId: stripeImport.id,
      organizationId: acmeOrg.id,
      externalId: 'TX-1005',
      amount: BigInt(31000),
      currency: 'USD',
      date: new Date('2026-08-04T16:20:00Z'),
      customerReference: 'Eve Adams',
      status: RecordStatus.DUPLICATE,
    },
  });

  // Source B Records (Ledger)
  const recB1 = await prisma.sourceRecord.create({
    data: {
      importId: ledgerImport.id,
      organizationId: acmeOrg.id,
      externalId: 'TX-1001',
      amount: BigInt(12000), // Exact match
      currency: 'USD',
      date: new Date('2026-08-01T10:00:00Z'),
      customerReference: 'Alice Smith',
      status: RecordStatus.VALID,
    },
  });

  const recB2 = await prisma.sourceRecord.create({
    data: {
      importId: ledgerImport.id,
      organizationId: acmeOrg.id,
      externalId: 'TX-1002',
      amount: BigInt(23000), // Mismatch: $230 vs $250
      currency: 'USD',
      date: new Date('2026-08-01T11:30:00Z'),
      customerReference: 'Bob Johnson',
      status: RecordStatus.VALID,
    },
  });

  const recB3 = await prisma.sourceRecord.create({
    data: {
      importId: ledgerImport.id,
      organizationId: acmeOrg.id,
      externalId: 'TX-1003',
      amount: BigInt(45050),
      currency: 'USD',
      date: new Date('2026-08-06T10:00:00Z'), // 4 days later -> exceeds tolerance
      customerReference: 'Charlie Brown',
      status: RecordStatus.VALID,
    },
  });

  const recB5 = await prisma.sourceRecord.create({
    data: {
      importId: ledgerImport.id,
      organizationId: acmeOrg.id,
      externalId: 'TX-1005',
      amount: BigInt(31000), // Exact match
      currency: 'USD',
      date: new Date('2026-08-04T16:20:00Z'),
      customerReference: 'Eve Adams',
      status: RecordStatus.VALID,
    },
  });

  const recB6 = await prisma.sourceRecord.create({
    data: {
      importId: ledgerImport.id,
      organizationId: acmeOrg.id,
      externalId: 'TX-1006',
      amount: BigInt(19900), // $199.00 (Missing from Source A)
      currency: 'USD',
      date: new Date('2026-08-04T18:00:00Z'),
      customerReference: 'Frank Wright',
      status: RecordStatus.VALID,
    },
  });

  // 6. Pre-created Sample Reconciliation
  const recon = await prisma.reconciliation.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Stripe vs ERP August Run',
      status: JobStatus.COMPLETED,
      sourceAId: dsStripe.id,
      sourceBId: dsLedger.id,
      matchingRuleId: defaultRule.id,
      totalSourceA: 5,
      totalSourceB: 5,
      matchedCount: 2,
      mismatchCount: 2,
      missingACount: 1,
      missingBCount: 1,
      createdById: ownerUser.id,
      completedAt: new Date(),
    },
  });

  // Results
  // 1. TX-1001 Matched
  await prisma.reconciliationResult.create({
    data: {
      reconciliationId: recon.id,
      sourceARecordId: recA1.id,
      sourceBRecordId: recB1.id,
      resultType: ResultType.MATCHED,
      differenceAmount: BigInt(0),
      mismatchFields: {},
    },
  });

  // 2. TX-1005 Matched
  await prisma.reconciliationResult.create({
    data: {
      reconciliationId: recon.id,
      sourceARecordId: recA5.id,
      sourceBRecordId: recB5.id,
      resultType: ResultType.MATCHED,
      differenceAmount: BigInt(0),
      mismatchFields: {},
    },
  });

  // 3. TX-1002 Mismatch (Amount)
  const res2 = await prisma.reconciliationResult.create({
    data: {
      reconciliationId: recon.id,
      sourceARecordId: recA2.id,
      sourceBRecordId: recB2.id,
      resultType: ResultType.MISMATCH,
      differenceAmount: BigInt(2000), // $20.00 difference
      mismatchFields: {
        amount: { sourceA: 25000, sourceB: 23000 },
      },
    },
  });

  // 4. TX-1003 Mismatch (Date tolerance exceeded)
  const res3 = await prisma.reconciliationResult.create({
    data: {
      reconciliationId: recon.id,
      sourceARecordId: recA3.id,
      sourceBRecordId: recB3.id,
      resultType: ResultType.MISMATCH,
      differenceAmount: BigInt(0),
      mismatchFields: {
        date: { sourceA: '2026-08-02T09:00:00Z', sourceB: '2026-08-06T10:00:00Z', differenceSeconds: 349200 },
      },
    },
  });

  // 5. TX-1004 Missing from Source B
  const res4 = await prisma.reconciliationResult.create({
    data: {
      reconciliationId: recon.id,
      sourceARecordId: recA4.id,
      sourceBRecordId: null,
      resultType: ResultType.MISSING_FROM_B,
      differenceAmount: BigInt(8999),
      mismatchFields: {},
    },
  });

  // 6. TX-1006 Missing from Source A
  const res6 = await prisma.reconciliationResult.create({
    data: {
      reconciliationId: recon.id,
      sourceARecordId: null,
      sourceBRecordId: recB6.id,
      resultType: ResultType.MISSING_FROM_A,
      differenceAmount: BigInt(19900),
      mismatchFields: {},
    },
  });

  // 7. Exceptions created for discrepancies
  const exc1 = await prisma.exception.create({
    data: {
      organizationId: acmeOrg.id,
      reconciliationId: recon.id,
      resultId: res2.id,
      severity: ExceptionSeverity.HIGH,
      status: ExceptionStatus.OPEN,
      createdById: ownerUser.id,
      assignedToId: memberUser.id,
      reason: 'Amount mismatch detected between Stripe charge ($250.00) and ERP entry ($230.00)',
    },
  });

  await prisma.exceptionComment.create({
    data: {
      exceptionId: exc1.id,
      userId: ownerUser.id,
      content: 'I verified the customer receipt; Stripe charged $250.00 due to an added fee.',
    },
  });

  await prisma.exception.create({
    data: {
      organizationId: acmeOrg.id,
      reconciliationId: recon.id,
      resultId: res3.id,
      severity: ExceptionSeverity.MEDIUM,
      status: ExceptionStatus.IN_REVIEW,
      createdById: ownerUser.id,
      assignedToId: memberUser.id,
      reason: 'Date tolerance exceeded: ERP booking was delayed by 4 days',
    },
  });

  const exc3 = await prisma.exception.create({
    data: {
      organizationId: acmeOrg.id,
      reconciliationId: recon.id,
      resultId: res4.id,
      severity: ExceptionSeverity.HIGH,
      status: ExceptionStatus.RESOLVED,
      createdById: ownerUser.id,
      assignedToId: memberUser.id,
      resolvedById: memberUser.id,
      reason: 'Transaction TX-1004 present in Stripe but absent in ERP Ledger',
      resolution: 'Manually created journal entry JE-9801 in ERP ledger to record missing transaction.',
      resolvedAt: new Date(),
    },
  });

  await prisma.exceptionComment.create({
    data: {
      exceptionId: exc3.id,
      userId: memberUser.id,
      content: 'Journal entry posting verified by accounting team.',
    },
  });

  // 8. Audit Logs
  await prisma.auditLog.create({
    data: {
      organizationId: acmeOrg.id,
      userId: ownerUser.id,
      action: 'RECONCILIATION_CREATED',
      resource: `Reconciliation:${recon.id}`,
      details: { name: recon.name, totalRecords: 10 },
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: acmeOrg.id,
      userId: memberUser.id,
      action: 'EXCEPTION_RESOLVED',
      resource: `Exception:${exc3.id}`,
      details: { resolutionReason: 'Manually created journal entry' },
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
