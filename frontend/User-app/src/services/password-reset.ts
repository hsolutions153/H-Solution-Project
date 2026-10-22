import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const RESET_FILE = process.env.PASSWORD_RESET_DB_FILE
  ? path.resolve(process.env.PASSWORD_RESET_DB_FILE)
  : path.join(process.cwd(), "data", "password-resets.json");
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type ResetRequest = {
  id: string;
  phone: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  verifiedAt?: string;
  tokenHash?: string;
  usedAt?: string;
};

type ResetDatabase = { requests: ResetRequest[] };

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function readDatabase(): ResetDatabase {
  const directory = path.dirname(RESET_FILE);
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
  if (!fs.existsSync(RESET_FILE)) {
    fs.writeFileSync(RESET_FILE, JSON.stringify({ requests: [] }, null, 2), "utf8");
  }
  try {
    return JSON.parse(fs.readFileSync(RESET_FILE, "utf8")) as ResetDatabase;
  } catch {
    return { requests: [] };
  }
}

function writeDatabase(database: ResetDatabase) {
  fs.writeFileSync(RESET_FILE, JSON.stringify(database, null, 2), "utf8");
}

export function createPasswordReset(phone: string, code: string) {
  const database = readDatabase();
  const now = Date.now();
  database.requests = database.requests.filter(
    (request) => new Date(request.expiresAt).getTime() > now && !request.usedAt,
  );
  const request: ResetRequest = {
    id: randomUUID(),
    phone,
    codeHash: hash(code),
    expiresAt: new Date(now + CODE_TTL_MS).toISOString(),
    attempts: 0,
  };
  database.requests.push(request);
  writeDatabase(database);
  return { id: request.id, expiresAt: request.expiresAt };
}

export function verifyPasswordResetCode(requestId: string, code: string) {
  const database = readDatabase();
  const request = database.requests.find((item) => item.id === requestId);
  if (!request || request.usedAt) return { error: "invalid" as const };
  if (new Date(request.expiresAt).getTime() <= Date.now()) return { error: "expired" as const };
  if (request.attempts >= MAX_ATTEMPTS) return { error: "locked" as const };

  request.attempts += 1;
  if (request.codeHash !== hash(code)) {
    writeDatabase(database);
    return { error: "invalid" as const, attemptsLeft: MAX_ATTEMPTS - request.attempts };
  }

  const token = randomBytes(32).toString("hex");
  request.verifiedAt = new Date().toISOString();
  request.tokenHash = hash(token);
  writeDatabase(database);
  return { token, phone: request.phone };
}

export function consumePasswordReset(requestId: string, token: string) {
  const database = readDatabase();
  const request = database.requests.find((item) => item.id === requestId);
  if (
    !request ||
    request.usedAt ||
    !request.verifiedAt ||
    !request.tokenHash ||
    request.tokenHash !== hash(token) ||
    new Date(request.expiresAt).getTime() <= Date.now()
  ) {
    return null;
  }

  request.usedAt = new Date().toISOString();
  writeDatabase(database);
  return request.phone;
}
