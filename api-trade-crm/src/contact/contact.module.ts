import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactController } from './controllers/contact.controller';
import { ContactService } from './services/contact.service';
import { ContactEmailService } from './services/contact-email.service';
import { ContactSubmission } from './entities/contact-submission.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([ContactSubmission]), EmailModule],
  controllers: [ContactController],
  providers: [ContactService, ContactEmailService],
})
export class ContactModule {}
