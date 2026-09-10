/**
 * Minimal RFC 5322 MIME builder for the invoice email.
 *
 * Kept dependency-free and side-effect-free so it can be unit tested easily.
 * Output uses CRLF line endings as required by RFC 5322 / SMTP and base64 for
 * the PDF attachment.
 */

const CRLF = '\r\n';

export interface RawMimeAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface RawMimeMessageParams {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  textBody: string;
  attachment?: RawMimeAttachment;
}

/** Fold base64 into lines of at most `lineLength` chars (RFC 2045 says 76). */
function chunkBase64(buffer: Buffer, lineLength = 76): string {
  const encoded = buffer.toString('base64');
  const lines: string[] = [];
  for (let i = 0; i < encoded.length; i += lineLength) {
    lines.push(encoded.slice(i, i + lineLength));
  }
  return lines.join(CRLF);
}

/** Strip CR/LF from header values to avoid header injection. */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function stripQuotes(value: string): string {
  return value.replace(/"/g, "'");
}

export function buildRawMimeMessage(params: RawMimeMessageParams): string {
  const random = `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  const mixedBoundary = `_sprout_mixed_${random}`;
  const altBoundary = `_sprout_alt_${random}`;

  const lines: string[] = [];

  lines.push(`From: ${sanitizeHeaderValue(params.from)}`);
  lines.push(`To: ${sanitizeHeaderValue(params.to)}`);
  if (params.replyTo) {
    lines.push(`Reply-To: ${sanitizeHeaderValue(params.replyTo)}`);
  }
  lines.push(`Subject: ${sanitizeHeaderValue(params.subject)}`);
  lines.push('MIME-Version: 1.0');
  lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
  lines.push('');
  lines.push(`--${mixedBoundary}`);
  lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  lines.push('');
  lines.push(`--${altBoundary}`);
  lines.push('Content-Type: text/plain; charset=UTF-8');
  lines.push('Content-Transfer-Encoding: 7bit');
  lines.push('');
  lines.push(params.textBody.replace(/\r?\n/g, CRLF));
  lines.push('');
  lines.push(`--${altBoundary}--`);

  if (params.attachment) {
    const filename = sanitizeHeaderValue(
      stripQuotes(params.attachment.filename),
    );
    lines.push(`--${mixedBoundary}`);
    lines.push(
      `Content-Type: ${params.attachment.contentType}; name="${filename}"`,
    );
    lines.push('Content-Transfer-Encoding: base64');
    lines.push(`Content-Disposition: attachment; filename="${filename}"`);
    lines.push('');
    lines.push(chunkBase64(params.attachment.content));
    lines.push('');
  }

  lines.push(`--${mixedBoundary}--`);

  return lines.join(CRLF);
}
