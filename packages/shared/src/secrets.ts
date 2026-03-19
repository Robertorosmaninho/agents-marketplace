import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function resolveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(input: {
  plaintext: string;
  secret: string;
}): { ciphertext: string; iv: string; authTag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", resolveKey(input.secret), iv);
  const ciphertext = Buffer.concat([cipher.update(input.plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

export function decryptSecret(input: {
  ciphertext: string;
  iv: string;
  authTag: string;
  secret: string;
}): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    resolveKey(input.secret),
    Buffer.from(input.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(input.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
}
