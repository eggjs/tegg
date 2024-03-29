import { promises as fs } from 'fs';

export class FSUtil {
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
    } catch (_) {
      return false;
    }
    return true;
  }
}
