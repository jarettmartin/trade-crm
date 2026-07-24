/**
 * HMAC-SHA256 utility using the crypto-js library.
 * Used for Cognito SECRET_HASH computation.
 */
import HmacSHA256 from "crypto-js/hmac-sha256";
import Base64 from "crypto-js/enc-base64";

export function computeSecretHash(secret: string, message: string): string {
  const hash = HmacSHA256(message, secret);
  return Base64.stringify(hash);
}
