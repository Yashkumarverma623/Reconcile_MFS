export interface RecordForMatching {
  id: string;
  externalId: string;
  amount: bigint;
  currency: string;
  date: Date;
  customerReference: string | null;
}

export interface MatchingRuleConfig {
  primaryKey: string;
  requireAmountMatch: boolean;
  dateToleranceSeconds: number; // e.g. 86400 for 1 day
  requireCustomerMatch: boolean;
}

export interface MatchingEngineResult {
  sourceARecordId: string | null;
  sourceBRecordId: string | null;
  resultType: 'MATCHED' | 'MISMATCH' | 'MISSING_FROM_A' | 'MISSING_FROM_B';
  differenceAmount: bigint;
  mismatchFields: Record<string, any>;
}

export class MatchingEngine {
  static compareRecords(
    sourceARecords: RecordForMatching[],
    sourceBRecords: RecordForMatching[],
    rule: MatchingRuleConfig
  ): MatchingEngineResult[] {
    const results: MatchingEngineResult[] = [];

    // Map Source B records by externalId
    const mapB = new Map<string, RecordForMatching>();
    const matchedBRecordIds = new Set<string>();

    for (const b of sourceBRecords) {
      mapB.set(b.externalId, b);
    }

    // Process Source A records
    for (const a of sourceARecords) {
      const b = mapB.get(a.externalId);

      if (!b) {
        // Missing from Source B
        results.push({
          sourceARecordId: a.id,
          sourceBRecordId: null,
          resultType: 'MISSING_FROM_B',
          differenceAmount: a.amount,
          mismatchFields: {},
        });
        continue;
      }

      matchedBRecordIds.add(b.id);

      // We have candidate B for record A! Check matching rules.
      const mismatchFields: Record<string, any> = {};
      let isMismatch = false;

      // 1. Amount Check
      const diffAmount = a.amount > b.amount ? a.amount - b.amount : b.amount - a.amount;
      if (rule.requireAmountMatch && a.amount !== b.amount) {
        isMismatch = true;
        mismatchFields.amount = {
          sourceA: Number(a.amount),
          sourceB: Number(b.amount),
          difference: Number(diffAmount),
        };
      }

      // 2. Date Tolerance Check
      const timeDiffSeconds = Math.abs(a.date.getTime() - b.date.getTime()) / 1000;
      if (timeDiffSeconds > rule.dateToleranceSeconds) {
        isMismatch = true;
        mismatchFields.date = {
          sourceA: a.date.toISOString(),
          sourceB: b.date.toISOString(),
          differenceSeconds: Math.round(timeDiffSeconds),
          toleranceSeconds: rule.dateToleranceSeconds,
        };
      }

      // 3. Customer Reference Check
      if (rule.requireCustomerMatch && a.customerReference !== b.customerReference) {
        isMismatch = true;
        mismatchFields.customerReference = {
          sourceA: a.customerReference,
          sourceB: b.customerReference,
        };
      }

      if (isMismatch) {
        results.push({
          sourceARecordId: a.id,
          sourceBRecordId: b.id,
          resultType: 'MISMATCH',
          differenceAmount: diffAmount,
          mismatchFields,
        });
      } else {
        results.push({
          sourceARecordId: a.id,
          sourceBRecordId: b.id,
          resultType: 'MATCHED',
          differenceAmount: BigInt(0),
          mismatchFields: {},
        });
      }
    }

    // Process remaining Source B records missing from Source A
    for (const b of sourceBRecords) {
      if (!matchedBRecordIds.has(b.id)) {
        results.push({
          sourceARecordId: null,
          sourceBRecordId: b.id,
          resultType: 'MISSING_FROM_A',
          differenceAmount: b.amount,
          mismatchFields: {},
        });
      }
    }

    return results;
  }
}
