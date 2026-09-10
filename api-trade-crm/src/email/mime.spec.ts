import { buildRawMimeMessage } from './mime';

describe('buildRawMimeMessage', () => {
  it('builds headers and multipart/mixed structure', () => {
    const raw = buildRawMimeMessage({
      from: 'Sprout Landscaping <no-reply@sprout-crm.com>',
      to: 'sarah.j@example.com',
      replyTo: 'hello@sproutlandscaping.com',
      subject: 'Invoice 8888 0001 from Sprout Landscaping',
      textBody: 'Hi Sarah,\n\nPlease find your invoice attached.\n',
    });

    expect(raw).toContain('From: Sprout Landscaping <no-reply@sprout-crm.com>');
    expect(raw).toContain('To: sarah.j@example.com');
    expect(raw).toContain('Reply-To: hello@sproutlandscaping.com');
    expect(raw).toContain('Subject: Invoice 8888 0001 from Sprout Landscaping');
    expect(raw).toContain('MIME-Version: 1.0');
    expect(raw).toContain('Content-Type: multipart/mixed;');
    expect(raw).toContain('multipart/alternative');
    expect(raw).toContain('text/plain; charset=UTF-8');
    expect(raw).toContain(
      'Hi Sarah,\r\n\r\nPlease find your invoice attached.',
    );
    // Message must terminate with the closing mixed boundary.
    expect(raw).toMatch(/-_sprout_mixed_[\w]+--$/);
    // A trailing blank line after the final boundary would be accepted but we
    // want the boundaries to appear exactly once at the end.
    expect(raw.endsWith('\r\n--')).toBe(false);
  });

  it('embeds a base64 PDF attachment chunked at 76 chars', () => {
    // 1000 bytes encodes to exactly 1336 base64 chars:
    // 17 full lines of 76 + one short line of 44.
    const pdf = Buffer.from('x'.repeat(1000), 'utf8');
    const raw = buildRawMimeMessage({
      from: 'Bus <no-reply@sprout-crm.com>',
      to: 'a@b.com',
      subject: 'Invoice',
      textBody: 'body',
      attachment: {
        filename: 'invoice-88880001.pdf',
        contentType: 'application/pdf',
        content: pdf,
      },
    });

    expect(raw).toContain(
      'Content-Type: application/pdf; name="invoice-88880001.pdf"',
    );
    expect(raw).toContain('Content-Transfer-Encoding: base64');
    expect(raw).toContain(
      'Content-Disposition: attachment; filename="invoice-88880001.pdf"',
    );

    // Pull the base64 payload: everything after the base64 header's blank line
    // until the closing mixed boundary.
    const lines = raw.split('\r\n');
    const transferIdx = lines.indexOf('Content-Transfer-Encoding: base64');
    expect(transferIdx).toBeGreaterThan(-1);
    const payload = lines.splice(transferIdx + 2);
    // Remove the empty line that precedes the closing boundary.
    payload.pop();
    const dataLines = payload;

    let total = 0;
    for (const line of dataLines) {
      expect(line.length).toBeLessThanOrEqual(76);
      total += line.length;
    }
    expect(total).toBe(1336);
  });

  it('strips CR/LF from header values to prevent injection', () => {
    const raw = buildRawMimeMessage({
      from: 'Bus <no-reply@sprout-crm.com>',
      to: 'a@b.com',
      subject: 'Invoice\r\nBcc: evil@example.com',
      textBody: 'body',
    });

    expect(raw).not.toContain('\r\nBcc:');
    expect(raw).toContain('Subject: Invoice Bcc: evil@example.com');
    // Only one Subject header is present.
    expect(raw.match(/^Subject:/gm)).toHaveLength(1);
  });
});
