import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type Papercut = {
  id: string;
  name: string;
  descriptionHtml: string;
  screenshotUrl?: string | null;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "..", "..", ".data");
const PAPERCUTS_FILE = path.join(DATA_DIR, "papercuts.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function readAll(): Papercut[] {
  ensureDirs();
  if (!fs.existsSync(PAPERCUTS_FILE)) return [];
  const raw = fs.readFileSync(PAPERCUTS_FILE, "utf8").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Papercut[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeAll(items: Papercut[]) {
  ensureDirs();
  const tmp = `${PAPERCUTS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), "utf8");
  fs.renameSync(tmp, PAPERCUTS_FILE);
}

export function listPapercuts(): Papercut[] {
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function createPapercut(input: {
  name: string;
  descriptionHtml: string;
  screenshotUrl?: string | null;
}): Papercut {
  const now = new Date().toISOString();
  const item: Papercut = {
    id: randomUUID(),
    name: input.name.trim() || "Untitled",
    descriptionHtml: input.descriptionHtml ?? "",
    screenshotUrl: input.screenshotUrl ?? null,
    createdAt: now,
  };
  const all = readAll();
  all.push(item);
  writeAll(all);
  return item;
}

export function getPapercut(id: string): Papercut | null {
  const all = readAll();
  return all.find((p) => p.id === id) ?? null;
}

export function saveUploadFile(opts: {
  filename: string;
  bytes: Uint8Array;
}): { url: string; absolutePath: string } {
  ensureDirs();
  const safeName = opts.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = path.extname(safeName) || ".png";
  const basename = `${randomUUID()}${ext}`;
  const absolutePath = path.join(UPLOAD_DIR, basename);
  fs.writeFileSync(absolutePath, opts.bytes);
  return { url: `/uploads/${basename}`, absolutePath };
}


