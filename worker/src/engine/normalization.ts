import { parse as parseCsv } from 'csv-parse/sync';

export interface NormalizedRecordInput {
  externalId: string;
  amount: bigint;
  currency: string;
  date: Date;
  customerReference: string | null;
  status: 'VALID' | 'INVALID' | 'DUPLICATE';
  metadata: Record<string, any>;
}

export interface NormalizationResult {
  totalRows: number;
  validRows: NormalizedRecordInput[];
  invalidRowsCount: number;
  duplicateRowsCount: number;
  errorSummary: Array<{ row: number; reason: string }>;
}

export class Normalizer {
  static parseAmountToMinorUnits(val: any): bigint {
    if (val === null || val === undefined || val === '') return BigInt(0);
    if (typeof val === 'number') {
      return BigInt(Math.round(val * 100));
    }
    const str = String(val).replace(/[\$,]/g, '').trim();
    const num = parseFloat(str);
    if (isNaN(num)) return BigInt(0);
    return BigInt(Math.round(num * 100));
  }

  static parseDate(val: any): Date | null {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  static processRawRecords(rows: any[]): NormalizationResult {
    const validRows: NormalizedRecordInput[] = [];
    let invalidRowsCount = 0;
    let duplicateRowsCount = 0;
    const errorSummary: Array<{ row: number; reason: string }> = [];

    const seenExternalIds = new Set<string>();

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      // Extract keys flexibly (snake_case, camelCase, Title Case)
      const externalId =
        row.external_id || row.externalId || row.transaction_id || row.transactionId || row.id || row.ID;
      const amountRaw = row.amount !== undefined ? row.amount : row.Amount || row.total || row.value;
      const dateRaw = row.date || row.Date || row.timestamp || row.created_at || row.createdAt;
      const customer =
        row.customer || row.Customer || row.customer_reference || row.customerReference || row.user || null;
      const currency = (row.currency || row.Currency || 'USD').toUpperCase();

      if (!externalId) {
        invalidRowsCount++;
        errorSummary.push({ row: rowNum, reason: 'Missing required external_id field' });
        return;
      }

      const parsedDate = this.parseDate(dateRaw);
      if (!parsedDate) {
        invalidRowsCount++;
        errorSummary.push({ row: rowNum, reason: `Invalid date format: "${dateRaw}"` });
        return;
      }

      const amount = this.parseAmountToMinorUnits(amountRaw);

      const extIdStr = String(externalId).trim();

      // Check duplicate within source file
      let status: 'VALID' | 'DUPLICATE' = 'VALID';
      if (seenExternalIds.has(extIdStr)) {
        duplicateRowsCount++;
        status = 'DUPLICATE';
      } else {
        seenExternalIds.add(extIdStr);
      }

      // Metadata contains all other fields
      const { external_id, externalId: _, transaction_id, amount: __, date: ___, customer: ____, ...rest } = row;

      validRows.push({
        externalId: extIdStr,
        amount,
        currency,
        date: parsedDate,
        customerReference: customer ? String(customer).trim() : null,
        status,
        metadata: rest || {},
      });
    });

    return {
      totalRows: rows.length,
      validRows,
      invalidRowsCount,
      duplicateRowsCount,
      errorSummary,
    };
  }

  static parseCsvFile(bufferOrString: string | Buffer): any[] {
    return parseCsv(bufferOrString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  }

  static parseJsonFile(bufferOrString: string | Buffer): any[] {
    const str = bufferOrString.toString('utf-8');
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.records)) return parsed.records;
      if (Array.isArray(parsed.data)) return parsed.data;
      if (Array.isArray(parsed.transactions)) return parsed.transactions;
      if (Array.isArray(parsed.items)) return parsed.items;
    }
    return [parsed];
  }
}
