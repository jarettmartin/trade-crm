import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackController } from './controllers/feedback.controller';
import { FeedbackService } from './services/feedback.service';
import { FeedbackEmailService } from './services/feedback-email.service';
import { Feedback } from './entities/feedback.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Feedback, Tenant]), EmailModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, FeedbackEmailService],
})
export class FeedbackModule {}
