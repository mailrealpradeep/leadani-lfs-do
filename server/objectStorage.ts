import fs from 'fs';
import path from 'path';

const STORAGE_DIR = './uploads';

export class ObjectStorage {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(STORAGE_DIR);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(filePath: string, data: Buffer): Promise<void> {
    const fullPath = path.join(this.baseDir, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await fs.promises.writeFile(fullPath, data);
  }

  async download(filePath: string): Promise<Buffer | null> {
    const fullPath = path.join(this.baseDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    
    return fs.promises.readFile(fullPath);
  }

  async delete(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      return false;
    }
    
    await fs.promises.unlink(fullPath);
    return true;
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, filePath);
    return fs.existsSync(fullPath);
  }

  async getPublicUrl(filePath: string): Promise<string> {
    return `/api/files/${filePath}`;
  }
}
