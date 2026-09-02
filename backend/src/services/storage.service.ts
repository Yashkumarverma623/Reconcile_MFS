import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export class StorageService {
  static getUploadDir(): string {
    return uploadDir;
  }

  static calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  static saveBuffer(buffer: Buffer, originalName: string): { filePath: string; checksum: string } {
    const checksum = this.calculateChecksum(buffer);
    const ext = path.extname(originalName) || '.txt';
    const filename = `${Date.now()}-${checksum.substring(0, 10)}${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    return { filePath, checksum };
  }
}
