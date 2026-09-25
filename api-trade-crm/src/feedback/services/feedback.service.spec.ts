import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeedbackService } from './feedback.service';
import { Feedback } from '../entities/feedback.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';

/**
 * The subset of `Repository<Feedback>` the service uses, with every method
 * typed as a jest mock so `mockImplementation` / `mockResolvedValue` calls are
 * type-checked (no `any`-typed mocks).
 */
interface FeedbackRepositoryMock {
  create: jest.Mock<Partial<Feedback>, [Partial<Feedback>]>;
  save: jest.Mock<Partial<Feedback>, [Partial<Feedback>]>;
  findAndCount: jest.Mock<
    Promise<[Partial<Feedback>[], number]>,
    [Record<string, unknown>]
  >;
}

describe('FeedbackService', () => {
  let service: FeedbackService;
  let repository: FeedbackRepositoryMock;

  beforeEach(async () => {
    // Fresh mocks per test — created inputs pass through unchanged.
    repository = {
      create: jest.fn<Partial<Feedback>, [Partial<Feedback>]>((input) => input),
      save: jest.fn<Partial<Feedback>, [Partial<Feedback>]>((input) => input),
      findAndCount: jest.fn<
        Promise<[Partial<Feedback>[], number]>,
        [Record<string, unknown>]
      >(),
    };

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

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ subject: undefined }),
      );
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
