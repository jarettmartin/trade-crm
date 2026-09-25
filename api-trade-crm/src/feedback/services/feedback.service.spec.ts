import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeedbackService } from './feedback.service';
import { Feedback } from '../entities/feedback.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';

describe('FeedbackService', () => {
  let service: FeedbackService;
  const save = jest.fn();
  const findAndCount = jest.fn();
  const create = jest.fn();

  beforeEach(async () => {
    jest.resetAllMocks();
    create.mockImplementation((input: Partial<Feedback>) => input);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: getRepositoryToken(Feedback),
          useValue: { create, save, findAndCount },
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  describe('create', () => {
    it('stamps tenant/author from the caller and trims input', async () => {
      save.mockImplementation((input: Partial<Feedback>) => ({
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

      expect(create).toHaveBeenCalledWith({
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
      save.mockImplementation((input: Partial<Feedback>) => input);

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

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ subject: undefined }),
      );
    });
  });

  describe('findAll', () => {
    it('scopes to the tenant, orders newest-first, and paginates', async () => {
      findAndCount.mockResolvedValue([[{ id: 'feedback-1' }], 12]);

      const result = await service.findAll('tenant-1', 2, 5);

      expect(findAndCount).toHaveBeenCalledWith({
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
