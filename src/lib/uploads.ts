import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "justificaciones");

export async function saveJustificationFile(file: File) {
  await mkdir(UPLOAD_ROOT, { recursive: true });
  const ext = path.extname(file.name).slice(0, 10);
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_ROOT, storedName), buffer);
  return { storedName, originalName: file.name };
}

export async function readJustificationFile(storedName: string) {
  const safeName = path.basename(storedName);
  return readFile(path.join(UPLOAD_ROOT, safeName));
}

/** Borra el archivo si existe; no falla si ya no está. */
export async function deleteJustificationFile(storedName: string) {
  const safeName = path.basename(storedName);
  try {
    await unlink(path.join(UPLOAD_ROOT, safeName));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
}
