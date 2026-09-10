import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

export interface CompiledEmailTemplate {
  subject: Handlebars.TemplateDelegate;
  textBody: Handlebars.TemplateDelegate;
}

export interface RenderedEmailTemplate {
  subject: string;
  textBody: string;
}

const SEPARATOR_LINE = '---';

/**
 * Handlebars email templates — one `.hbs` file per email type.
 *
 * Format:
 *
 *   subject: Invoice {{invoiceNumber}} from {{businessName}}
 *   ---
 *   Hi {{customerName}},
 *   ...
 *
 * The `subject:` line + a `---` separator precede the plain-text body
 * template. A template without the separator is treated as body-only
 * (subject renders as an empty string).
 *
 * Files live in `src/email/templates/` and are compiled once at startup by
 * `EmailService` (the same pattern `PdfService` uses for the PDF template).
 * Future email types just add a new `.hbs` file here.
 */
export function compileEmailTemplate(source: string): CompiledEmailTemplate {
  const normalized = source.replace(/\r\n/g, '\n').trim();
  const separatorIdx = normalized.indexOf(`\n${SEPARATOR_LINE}\n`);
  const head = separatorIdx === -1 ? '' : normalized.slice(0, separatorIdx);
  const bodySource =
    separatorIdx === -1
      ? normalized
      : normalized.slice(separatorIdx + SEPARATOR_LINE.length + 2);

  // Optional subject line in the head block: "subject: <handlebars>".
  const subjectMatch = head.match(/^subject:\s*(.+)$/m);
  const subjectSource = subjectMatch ? subjectMatch[1].trim() : '';

  return {
    subject: Handlebars.compile(subjectSource),
    textBody: Handlebars.compile(bodySource),
  };
}

export function loadEmailTemplates(
  templatesDir?: string,
): Map<string, CompiledEmailTemplate> {
  const dir = templatesDir ?? path.join(__dirname, 'templates');
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`Email templates directory not found: ${dir}`);
  }

  const templates = new Map<string, CompiledEmailTemplate>();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.hbs')) continue;
    const source = fs.readFileSync(path.join(dir, file), 'utf-8');
    templates.set(path.basename(file, '.hbs'), compileEmailTemplate(source));
  }
  return templates;
}
