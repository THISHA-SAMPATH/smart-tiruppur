import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "smart_tiruppur_session";

export type RoleType =
  | "ADMIN"
  | "REGULATOR"
  | "INDUSTRY"
  | "GROUNDWATER_OFFICER"
  | "CITIZEN";

export interface UserSessionPayload {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  industryUnitId: string | null;
  organization: string | null;
  iat?: number;
  exp?: number;
}

const JWT_SECRET =
  process.env.JWT_SECRET || "smart_tiruppur_super_secret_jwt_key_2026";

/** Helper function to convert string to Uint8Array */
function getSecretBuffer(): ArrayBuffer {
  const bytes = new TextEncoder().encode(JWT_SECRET);
  return bytes.buffer as ArrayBuffer;
}

/** Base64URL encode string or Uint8Array */
function base64urlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** Base64URL decode string to Uint8Array */
function base64urlDecode(input: string): Uint8Array {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Create HMAC SHA-256 JWT token using Web Crypto API */
export async function createSessionToken(
  payload: Omit<UserSessionPayload, "iat" | "exp">,
  expiresInSeconds = 60 * 60 * 24 * 7 // 7 days
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: UserSessionPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(fullPayload));

  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    getSecretBuffer(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(dataToSign)
  );

  const encodedSignature = base64urlEncode(new Uint8Array(signatureBuffer));

  return `${dataToSign}.${encodedSignature}`;
}

/** Verify HMAC SHA-256 JWT token using Web Crypto API */
export async function verifySessionToken(
  token: string
): Promise<UserSessionPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      getSecretBuffer(),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = base64urlDecode(signature);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      signatureBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(dataToVerify)
    );

    if (!isValid) return null;

    const payloadText = new TextDecoder().decode(base64urlDecode(encodedPayload));
    const payload: UserSessionPayload = JSON.parse(payloadText);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/** Get session user from Next.js server components or API routes */
export async function getCurrentUser(): Promise<UserSessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
