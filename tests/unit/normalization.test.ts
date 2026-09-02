import { describe, it, expect } from 'vitest';
import { Normalizer } from '../../worker/src/engine/normalization';

describe('Data Normalization & Duplicate Detection Tests', () => {
  it('should parse floating amounts accurately into integer minor units (cents)', () => {
    expect(Normalizer.parseAmountToMinorUnits(120.0)).toBe(BigInt(12000));
    expect(Normalizer.parseAmountToMinorUnits('250.50')).toBe(BigInt(25050));
    expect(Normalizer.parseAmountToMinorUnits('$89.99')).toBe(BigInt(8999));
    expect(Normalizer.parseAmountToMinorUnits('1,250.00')).toBe(BigInt(125000));
  });

  it('should process raw records and mark within-file duplicates accurately', () => {
    const rawRows = [
      { external_id: 'TX-1001', amount: 100.0, date: '2026-08-01', customer: 'Alice' },
      { external_id: 'TX-1002', amount: 200.0, date: '2026-08-01', customer: 'Bob' },
      { external_id: 'TX-1001', amount: 100.0, date: '2026-08-01', customer: 'Alice' }, // Duplicate!
      { amount: 50.0, date: '2026-08-01' }, // Invalid missing ID
    ];

    const result = Normalizer.processRawRecords(rawRows);

    expect(result.totalRows).toBe(4);
    expect(result.invalidRowsCount).toBe(1);
    expect(result.duplicateRowsCount).toBe(1);

    const validRows = result.validRows;
    expect(validRows).toHaveLength(3);

    const tx1001Records = validRows.filter((r) => r.externalId === 'TX-1001');
    expect(tx1001Records).toHaveLength(2);
    expect(tx1001Records[0].status).toBe('VALID');
    expect(tx1001Records[1].status).toBe('DUPLICATE');
  });
});
