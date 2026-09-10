import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { buildRawMimeMessage, RawMimeAttachment } from '../mime';
import {
  loadEmailTemplates,
  CompiledEmailTemplate,
  RenderedEmailTemplate,
} from '../email-templates';

export interface SendEmailParams {
  to: string;
  /** Full From header value, e.g. "Sprout Landscaping <no-reply@sprout-crm.com>". */
  from: string;
  replyTo?: string;
  subject: string;
  textBody: string;
  attachment?: RawMimeAttachment;
}

@Injectable()
export class EmailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailService.name);
  private readonly client: SESv2Client;
  private emailTemplates = new Map<string, CompiledEmailTemplate>();

  constructor(configService: ConfigService) {
    const region = configService.get<string>('SES_REGION', 'us-east-2');
    const accessKeyId = configService.get<string>('AWS_ACCESS_KEY_ID', '');
    const secretAccessKey = configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
      '',
    );

    this.client = new SESv2Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  onModuleInit() {
    this.emailTemplates = loadEmailTemplates();
    this.logger.log(`Loaded ${this.emailTemplates.size} email template(s)`);
  }

  /**
   * Render the subject + body of a Handlebars email template with the given
   * context. Templates live in src/email/templates/*.hbs.
   */
  renderEmailTemplate(
    name: string,
    context: Record<string, unknown>,
  ): RenderedEmailTemplate {
    const template = this.emailTemplates.get(name);
    if (!template) {
      throw new Error(`Email template "${name}" not found`);
    }
    return {
      subject: template.subject(context) ?? '',
      textBody: template.textBody(context) ?? '',
    };
  }

  async sendEmail(params: SendEmailParams): Promise<{ messageId: string }> {
    const mime = buildRawMimeMessage({
      from: params.from,
      to: params.to,
      replyTo: params.replyTo,
      subject: params.subject,
      textBody: params.textBody,
      attachment: params.attachment,
    });

    const command = new SendEmailCommand({
      Content: {
        Raw: {
          Data: Buffer.from(mime, 'utf8'),
        },
      },
    });

    const result = await this.client.send(command);

    return {
      messageId: result.MessageId || '',
    };
  }

  onModuleDestroy() {
    // Release HTTP connections held by the SES client on shutdown.
    this.client.destroy();
  }
}
