import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { FindManyOptions } from 'typeorm';
import { FeedbackService } from './feedback.service';
import { Feedback } from '../entities/feedback.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';

/**
 * Builds the repository slice the service depends on. Every method is a jest
 * mock whose types are inferred from its implementation, so
 * `mockImplementation` / `mockResolvedValue` calls are fully type-checked (no
 * `any`-typed mocks).
 */
function makeRepositoryMock() {
  return {
    create: jest.fn((input: Partial<Feedback>) => input),
    save: jest.fn((input: Partial<Feedback>) => input),
    findAndCount:
      jest.fn<
        (
          options: FindManyOptions<Feedback>,
        ) => Promise<[Partial<Feedback>[], number]>
      >(),
  };
}

type FeedbackRepositoryMock = ReturnType<typeof makeRepositoryMock>;

describe('FeedbackService', () => {
  let service: FeedbackService;
  let repository: FeedbackRepositoryMock;

  beforeEach(async () => {
    repository = makeRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: getRepositoryToken(Feedback),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  describe('create', () => {
    it('stamps tenant/author from the caller and trims input', async () => {
      repository.save.mockImplementation((input) => ({
        ...input,
        id: 'feedback-1',
      }));

      const result = await service.create(
        {
          type: FeedbackType.BUG,
          subject: '  Broken button  ',
          message: '  The save button does nothing  ',
        },
        'tenant-1',
        'user-1',
        'user@example.com',
      );

      expect(repository.create).toHaveBeenCalledWith({
        type: FeedbackType.BUG,
        subject: 'Broken button',
        message: 'The save button does nothing',
        tenantId: 'tenant-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
      });
      expect(result.id).toBe('feedback-1');
    });

    it('drops a blank subject instead of storing whitespace', async () => {
      await service.create(
        {
          type: FeedbackType.CONTACT,
          subject: '   ',
          message: 'Please call me',
        },
        'tenant-1',
        'user-1',
        'user@example.com',
      );

      const created = repository.create.mock.calls[0][0];

      expect(created.subject).toBeUndefined();
      expect(created.message).toBe('Please call me');
    });
  });

  describe('findAll', () => {
    it('scopes to the tenant, orders newest-first, and paginates', async () => {
      repository.findAndCount.mockResolvedValue([[{ id: 'feedback-1' }], 12]);

      const result = await service.findAll('tenant-1', 2, 5);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        order: { createdAt: 'DESC' },
        skip: 5,
        take: 5,
      });
      expect(result.meta).toEqual({
        page: 2,
        limit: 5,
        total: 12,
        totalPages: 3,
      });
    });
  });
});
