import { compileEmailTemplate, loadEmailTemplates } from './email-templates';

describe('email templates', () => {
  describe('compileEmailTemplate', () => {
    it('parses the subject line and the body template', () => {
      const tpl = compileEmailTemplate(
        'subject: Invoice {{invoiceNumber}} from {{businessName}}\n' +
          '---\n' +
          'Hi {{customerName}},\n\n' +
          'Amount due: {{amountDue}}',
      );

      expect(
        tpl.subject({ invoiceNumber: '0000 1001', businessName: 'X' }),
      ).toBe('Invoice 0000 1001 from X');
      expect(tpl.textBody({ customerName: 'S', amountDue: '$5.00' })).toBe(
        'Hi S,\n\nAmount due: $5.00',
      );
    });

    it('treats a file without a separator as body-only', () => {
      const tpl = compileEmailTemplate('Just a body {{name}}');
      expect(tpl.subject({ name: 'x' })).toBe('');
      expect(tpl.textBody({ name: 'x' })).toBe('Just a body x');
    });
  });

  describe('loadEmailTemplates', () => {
    it('loads the invoice-email template from disk', () => {
      const templates = loadEmailTemplates();
      expect(templates.has('invoice-email')).toBe(true);
    });

    it('renders the invoice-email template to the expected copy', () => {
      const templates = loadEmailTemplates();
      const tpl = templates.get('invoice-email');
      expect(tpl).toBeDefined();

      const context = {
        customerName: 'Sarah Johnson',
        invoiceNumber: '0000 1001',
        businessName: 'Sprout Landscaping',
        amountDue: '$819.25',
        paymentNote:
          'Payment due within 30 days. Thank you for your business.\n\n',
        businessEmail: 'hello@sproutlandscaping.com',
      };

      const subject = tpl!.subject(context);
      const textBody = tpl!.textBody(context);

      expect(subject).toBe('Invoice 0000 1001 from Sprout Landscaping');

      // Matches the copy the service produced before templating was added.
      expect(textBody).toBe(
        [
          'Hi Sarah Johnson,',
          '',
          'Please find attached invoice 0000 1001 from Sprout Landscaping.',
          '',
          'Amount due: $819.25',
          '',
          'Payment due within 30 days. Thank you for your business.',
          '',
          'If you have any questions, reply to this email or contact us at hello@sproutlandscaping.com.',
          '',
          'Thank you,\nSprout Landscaping',
        ].join('\n'),
      );
    });

    it('omits the payment note paragraph when the tenant has none', () => {
      const templates = loadEmailTemplates();
      const tpl = templates.get('invoice-email')!;
      const textBody = tpl.textBody({
        customerName: 'Sarah Johnson',
        invoiceNumber: '0000 1001',
        businessName: 'Sprout Landscaping',
        amountDue: '$819.25',
        paymentNote: '',
        businessEmail: 'hello@sproutlandscaping.com',
      });

      expect(textBody).not.toContain('Payment due');
      expect(textBody).toContain('Amount due: $819.25');
      expect(textBody).toContain(
        'If you have any questions, reply to this email or contact us at hello@sproutlandscaping.com.',
      );
    });

    it('throws when the templates directory is missing', () => {
      expect(() => loadEmailTemplates('/nonexistent')).toThrow(
        'Email templates directory not found',
      );
    });
  });
});
