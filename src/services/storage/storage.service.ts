/**
 * Storage abstraction (PRD 4.5 Cloud Storage & Organization). Production
 * deployments back this with AWS S3 under the folder layout described in
 * the spec (organizations/{school-id}/{year}/{term}/{category}/...). The
 * local-disk implementation below is a drop-in dev/test substitute — swap
 * it for an S3StorageService without touching any calling code.
 */
export interface StoredFile {
  storageKey: string;
  sizeBytes: number;
}

export interface StorageService {
  save(input: { schoolId: string; filename: string; buffer: Buffer }): Promise<StoredFile>;
  delete(storageKey: string): Promise<void>;
}

import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";

export class LocalDiskStorageService implements StorageService {
  async save(input: { schoolId: string; filename: string; buffer: Buffer }): Promise<StoredFile> {
    const dir = path.join(env.LOCAL_STORAGE_DIR, input.schoolId);
    await mkdir(dir, { recursive: true });

    const key = `${input.schoolId}/${randomUUID()}-${input.filename}`;
    const fullPath = path.join(env.LOCAL_STORAGE_DIR, key);
    await writeFile(fullPath, input.buffer);

    return { storageKey: key, sizeBytes: input.buffer.byteLength };
  }

  async delete(storageKey: string): Promise<void> {
    const fullPath = path.join(env.LOCAL_STORAGE_DIR, storageKey);
    await unlink(fullPath).catch(() => undefined);
  }
}

export const storageService: StorageService = new LocalDiskStorageService();
