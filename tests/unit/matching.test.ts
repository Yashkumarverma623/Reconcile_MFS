import { describe, it, expect } from 'vitest';
import { MatchingEngine, RecordForMatching } from '../../worker/src/engine/matching.engine';

describe('Deterministic Matching Engine Unit Tests', () => {
  const rule = {
    primaryKey: 'external_id',
    requireAmountMatch: true,
    dateToleranceSeconds: 86400, // 24 hours
    requireCustomerMatch: false,
  };

  it('should correctly identify exact matches', () => {
    const recA: RecordForMatching = {
      id: 'a1',
      externalId: 'TX-1001',
      amount: BigInt(12000),
      currency: 'USD',
      date: new Date('2026-08-01T10:00:00Z'),
      customerReference: 'Alice',
    };

    const recB: RecordForMatching = {
      id: 'b1',
      externalId: 'TX-1001',
      amount: BigInt(12000),
      currency: 'USD',
      date: new Date('2026-08-01T10:00:00Z'),
      customerReference: 'Alice',
    };

    const results = MatchingEngine.compareRecords([recA], [recB], rule);
    expect(results).toHaveLength(1);
    expect(results[0].resultType).toBe('MATCHED');
    expect(results[0].differenceAmount).toBe(BigInt(0));
    expect(results[0].sourceARecordId).toBe('a1');
    expect(results[0].sourceBRecordId).toBe('b1');
  });

  it('should detect amount mismatches and calculate exact difference', () => {
    const recA: RecordForMatching = {
      id: 'a2',
      externalId: 'TX-1002',
      amount: BigInt(25000), // $250.00
      currency: 'USD',
      date: new Date('2026-08-01T10:00:00Z'),
      customerReference: 'Bob',
    };

    const recB: RecordForMatching = {
      id: 'b2',
      externalId: 'TX-1002',
      amount: BigInt(23000), // $230.00
      currency: 'USD',
      date: new Date('2026-08-01T10:00:00Z'),
      customerReference: 'Bob',
    };

    const results = MatchingEngine.compareRecords([recA], [recB], rule);
    expect(results).toHaveLength(1);
    expect(results[0].resultType).toBe('MISMATCH');
    expect(results[0].differenceAmount).toBe(BigInt(2000)); // 2000 cents = $20.00
    expect(results[0].mismatchFields.amount).toEqual({
      sourceA: 25000,
      sourceB: 23000,
      difference: 2000,
    });
  });

  it('should detect date tolerance exceedance', () => {
    const recA: RecordForMatching = {
      id: 'a3',
      externalId: 'TX-1003',
      amount: BigInt(45050),
      currency: 'USD',
      date: new Date('2026-08-01T10:00:00Z'),
      customerReference: 'Charlie',
    };

    const recB: RecordForMatching = {
      id: 'b3',
      externalId: 'TX-1003',
      amount: BigInt(45050),
      currency: 'USD',
      date: new Date('2026-08-05T10:00:00Z'), // 4 days later (tolerance is 1 day)
      customerReference: 'Charlie',
    };

    const results = MatchingEngine.compareRecords([recA], [recB], rule);
    expect(results).toHaveLength(1);
    expect(results[0].resultType).toBe('MISMATCH');
    expect(results[0].mismatchFields.date).toBeDefined();
  });

  it('should identify missing records from Source A and Source B', () => {
    const recA: RecordForMatching = {
      id: 'a4',
      externalId: 'TX-1004',
      amount: BigInt(8999),
      currency: 'USD',
      date: new Date('2026-08-01T10:00:00Z'),
      customerReference: 'Diana',
    };

    const recB: RecordForMatching = {
      id: 'b6',
      externalId: 'TX-1006',
      amount: BigInt(19900),
      currency: 'USD',
      date: new Date('2026-08-01T10:00:00Z'),
      customerReference: 'Frank',
    };

    const results = MatchingEngine.compareRecords([recA], [recB], rule);
    expect(results).toHaveLength(2);

    const missingB = results.find((r) => r.resultType === 'MISSING_FROM_B');
    const missingA = results.find((r) => r.resultType === 'MISSING_FROM_A');

    expect(missingB?.sourceARecordId).toBe('a4');
    expect(missingA?.sourceBRecordId).toBe('b6');
  });
});
