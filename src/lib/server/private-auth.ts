import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  PRIVATE_ROUTE_COOKIE_SECRET,
  PRIVATE_ROUTE_PASSWORD,
} from "$env/static/private";

const COOKIE_NAME = "private_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const base64url = (input: Buffer | string) => {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const signPayload = (payload: string) => {
  return base64url(createHmac("sha256", PRIVATE_ROUTE_COOKIE_SECRET).update(payload).digest());
};

export const isAuthConfigured = () =>
  !!PRIVATE_ROUTE_PASSWORD && !!PRIVATE_ROUTE_COOKIE_SECRET;

export const createSessionToken = () => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const nonce = base64url(randomBytes(16));
  const payload = `${issuedAt}.${nonce}`;
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
};

export const verifySessionToken = (token: string | null) => {
  if (!token || !isAuthConfigured()) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [issuedAtRaw, nonce, signature] = parts;
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (issuedAt > now || now - issuedAt > MAX_AGE_SECONDS) {
    return false;
  }

  const payload = `${issuedAtRaw}.${nonce}`;
  const expectedSignature = signPayload(payload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
};

export const privateSessionConfig = {
  COOKIE_NAME,
  MAX_AGE_SECONDS,
};
