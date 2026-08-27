/**
 * Storage abstraction (PRD 4.5 Cloud Storage & Organization). Production
 * deployments back this with AWS S3 under the folder layout described in the
 * spec (organizations/{school-id}/{year}/{term}/{category}/...) — swap in an
 * S3StorageService without touching any calling code.
 */
export interface StoredFile {
  storageKey: string;
  sizeBytes: number;
}

export interface RetrievedFile {
  bytes: Buffer;
  mimeType: string;
  sizeBytes: number;
}

export interface StorageService {
  save(input: {
    schoolId: string;
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<StoredFile>;
  read(storageKey: string): Promise<RetrievedFile | null>;
  delete(storageKey: string): Promise<void>;
}

import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "../../db/prisma.js";

/**
 * Keeps file bytes in the database, alongside the record that describes them.
 *
 * The obvious implementation writes to local disk, and that is what this was.
 * It cannot work here: the deployment target is a serverless function, where
 * the only writable path is /tmp and it is wiped between cold starts — so an
 * uploaded document was readable for a few minutes and then gone, on an
 * origin that had no endpoint to read it back with anyway. Documents that
 * vanish are worse than documents that are slow.
 *
 * Postgres is a poor object store at scale, which is what StorageService
 * exists to make swappable. At demo volume it is the option that is actually
 * correct: files survive deploys, cold starts and container moves, and they
 * are backed up with everything else.
 */
export class DatabaseStorageService implements StorageService {
  async save(input: {
    schoolId: string;
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<StoredFile> {
    // Keyed by school and a fresh id, so two uploads of the same filename
    // cannot collide and the key still says where it belongs.
    const storageKey = `${input.schoolId}/${randomUUID()}${path.extname(input.filename)}`;

    await prisma.documentFile.create({
      data: {
        storageKey,
        mimeType: input.mimeType,
        sizeBytes: input.buffer.byteLength,
        bytes: input.buffer,
      },
    });

    return { storageKey, sizeBytes: input.buffer.byteLength };
  }

  async read(storageKey: string): Promise<RetrievedFile | null> {
    const stored = await prisma.documentFile.findUnique({ where: { storageKey } });
    if (!stored) return null;

    return {
      bytes: Buffer.from(stored.bytes),
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
    };
  }

  async delete(storageKey: string): Promise<void> {
    // Deleting bytes that are already gone is the desired end state, not an
    // error — a retried delete must not fail.
    await prisma.documentFile.deleteMany({ where: { storageKey } });
  }
}

export const storageService: StorageService = new DatabaseStorageService();
