import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException, ValidationPipe } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JobService } from './job.service';
import { Job } from '../entities/job.entity';
import { JobNote } from '../entities/job-note.entity';
import { JobLineItem } from '../entities/job-line-item.entity';
import { CatalogService } from '../../catalog/services/catalog.service';
import { JobLineItemType } from '../../common/enums/job-line-item-type.enum';
import { JobStatus } from '../../common/enums/job-status.enum';
import { UpdateJobDto } from '../dto/update-job.dto';

/**
 * Minimal repository stand-in. The functions are given explicit signatures so
 * `mockResolvedValue(...)` accepts real values instead of widening to `never`,
 * and the whole object is cast to `Repository<…>` where it is injected (below) —
 * otherwise tsc/VS Code reports TS2345 naming `jest.Mock` (see CONTEXT.md →
 * "Type-checking spec files"). ts-jest transpiles per-file (`isolatedModules`),
 * so it never surfaces these errors; only the IDE does.
 */
function createMockRepository() {
  return {
    findOne: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    find: jest
      .fn<(...args: unknown[]) => Promise<unknown[]>>()
      .mockResolvedValue([]),
    create: jest.fn((entity: unknown) => entity),
    save: jest.fn<(...args: unknown[]) => Promise<unknown>>((entity) =>
      Promise.resolve(entity),
    ),
    delete: jest.fn<(...args: unknown[]) => Promise<{ affected?: number }>>(),
  };
}

function createMockCatalogService() {
  return {
    findById: jest.fn((id: string, _tenantId: string) =>
      Promise.resolve({ id, tenantId: _tenantId }),
    ),
  };
}

function createService() {
  const jobRepository = createMockRepository();
  const noteRepository = createMockRepository();
  const lineItemRepository = createMockRepository();
  const catalogService = createMockCatalogService();

  jobRepository.findOne.mockResolvedValue({
    id: 'job-1',
    tenantId: 'tenant-1',
  });

  return {
    jobRepository,
    noteRepository,
    lineItemRepository,
    catalogService,
    service: new JobService(
      jobRepository as unknown as Repository<Job>,
      noteRepository as unknown as Repository<JobNote>,
      lineItemRepository as unknown as Repository<JobLineItem>,
      catalogService as unknown as CatalogService,
    ),
  };
}

const lineItem = {
  type: JobLineItemType.SERVICE,
  description: 'Mow the lawn',
  quantity: 2,
  unitPrice: 60,
  lineTotal: 120,
};

describe('JobService.createNote', () => {
  let jobRepository: ReturnType<typeof createMockRepository>;
  let noteRepository: ReturnType<typeof createMockRepository>;
  let service: JobService;

  beforeEach(() => {
    ({ jobRepository, noteRepository, service } = createService());
  });

  it('inserts one new note for the job in the caller tenant', async () => {
    await service.createNote(
      'job-1',
      { userId: 'user-1', note: 'Follow-up booked.' },
      'tenant-1',
    );

    expect(jobRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'job-1', tenantId: 'tenant-1' },
    });
    expect(noteRepository.create).toHaveBeenCalledTimes(1);
    expect(noteRepository.save).toHaveBeenCalledWith({
      userId: 'user-1',
      note: 'Follow-up booked.',
      jobId: 'job-1',
      tenantId: 'tenant-1',
    });
  });

  it('never removes or rewrites existing notes', async () => {
    await service.createNote(
      'job-1',
      { userId: 'user-1', note: 'Follow-up booked.' },
      'tenant-1',
    );

    // Only an insert happens, so every existing note keeps its id and
    // createdAt (what the old notes-array update used to reset for the list).
    expect(noteRepository.delete).not.toHaveBeenCalled();
    expect(noteRepository.save).toHaveBeenCalledTimes(1);
  });

  it('returns the new note with its author', async () => {
    noteRepository.save.mockResolvedValue({ id: 'note-9', note: 'Hi' });
    noteRepository.findOne.mockResolvedValue({
      id: 'note-9',
      note: 'Hi',
      user: { id: 'user-1', firstName: 'Demo', lastName: 'User' },
    });

    const created = await service.createNote(
      'job-1',
      { userId: 'user-1', note: 'Hi' },
      'tenant-1',
    );

    expect(noteRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'note-9', tenantId: 'tenant-1' },
      relations: { user: true },
    });
    expect(created).toMatchObject({
      id: 'note-9',
      user: { firstName: 'Demo', lastName: 'User' },
    });
  });

  it('rejects a job outside the tenant without inserting anything', async () => {
    jobRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createNote('job-2', { userId: 'user-1', note: 'Hi' }, 'tenant-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(noteRepository.create).not.toHaveBeenCalled();
    expect(noteRepository.save).not.toHaveBeenCalled();
  });
});

describe('JobService.createLineItem', () => {
  let jobRepository: ReturnType<typeof createMockRepository>;
  let lineItemRepository: ReturnType<typeof createMockRepository>;
  let catalogService: ReturnType<typeof createMockCatalogService>;
  let service: JobService;

  beforeEach(() => {
    ({ jobRepository, lineItemRepository, catalogService, service } =
      createService());
  });

  it('inserts one line item for the job in the caller tenant', async () => {
    await service.createLineItem(
      'job-1',
      { ...lineItem, catalogItemId: 'catalog-1' },
      'tenant-1',
    );

    expect(jobRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'job-1', tenantId: 'tenant-1' },
    });
    expect(lineItemRepository.create).toHaveBeenCalledTimes(1);
    expect(lineItemRepository.save).toHaveBeenCalledWith({
      ...lineItem,
      catalogItemId: 'catalog-1',
      jobId: 'job-1',
      tenantId: 'tenant-1',
    });
  });

  it('never removes or rewrites existing line items', async () => {
    await service.createLineItem('job-1', lineItem, 'tenant-1');

    expect(lineItemRepository.delete).not.toHaveBeenCalled();
    expect(lineItemRepository.save).toHaveBeenCalledTimes(1);
  });

  it('validates a supplied catalogItemId against the caller tenant', async () => {
    await service.createLineItem(
      'job-1',
      { ...lineItem, catalogItemId: 'catalog-1' },
      'tenant-1',
    );

    expect(catalogService.findById).toHaveBeenCalledWith(
      'catalog-1',
      'tenant-1',
    );
  });

  it('rejects a catalog item that is not in the caller tenant', async () => {
    catalogService.findById.mockRejectedValue(
      new NotFoundException('Catalog item not found'),
    );

    await expect(
      service.createLineItem(
        'job-1',
        { ...lineItem, catalogItemId: 'someone-elses-catalog' },
        'tenant-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(lineItemRepository.create).not.toHaveBeenCalled();
    expect(lineItemRepository.save).not.toHaveBeenCalled();
  });

  it('skips the catalog lookup when no catalogItemId is supplied', async () => {
    await service.createLineItem('job-1', lineItem, 'tenant-1');

    expect(catalogService.findById).not.toHaveBeenCalled();
  });

  it('rejects a job outside the tenant without inserting anything', async () => {
    jobRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createLineItem('job-2', lineItem, 'tenant-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(lineItemRepository.create).not.toHaveBeenCalled();
    expect(lineItemRepository.save).not.toHaveBeenCalled();
  });
});

describe('JobService.deleteLineItem', () => {
  let lineItemRepository: ReturnType<typeof createMockRepository>;
  let service: JobService;

  beforeEach(() => {
    ({ lineItemRepository, service } = createService());
  });

  it('deletes the item scoped to its job and tenant', async () => {
    lineItemRepository.delete.mockResolvedValue({ affected: 1 });

    const result = await service.deleteLineItem('job-1', 'li-1', 'tenant-1');

    expect(lineItemRepository.delete).toHaveBeenCalledWith({
      id: 'li-1',
      jobId: 'job-1',
      tenantId: 'tenant-1',
    });
    expect(result).toEqual({ success: true });
  });

  it('rejects an unknown or foreign line item', async () => {
    lineItemRepository.delete.mockResolvedValue({ affected: 0 });

    await expect(
      service.deleteLineItem('job-1', 'someone-elses-li', 'tenant-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('JobService.update', () => {
  let noteRepository: ReturnType<typeof createMockRepository>;
  let lineItemRepository: ReturnType<typeof createMockRepository>;
  let service: JobService;

  beforeEach(() => {
    ({ noteRepository, lineItemRepository, service } = createService());
  });

  it('never touches the notes or line items repositories', async () => {
    await service.update('job-1', { status: JobStatus.COMPLETED }, 'tenant-1');

    expect(noteRepository.find).not.toHaveBeenCalled();
    expect(noteRepository.create).not.toHaveBeenCalled();
    expect(noteRepository.save).not.toHaveBeenCalled();
    expect(noteRepository.delete).not.toHaveBeenCalled();
    expect(lineItemRepository.create).not.toHaveBeenCalled();
    expect(lineItemRepository.save).not.toHaveBeenCalled();
    expect(lineItemRepository.delete).not.toHaveBeenCalled();
  });
});

describe('UpdateJobDto contract', () => {
  // Mirrors the global pipe configured in main.ts.
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  it.each(['notes', 'lineItems'])(
    'rejects a %s array sent to PATCH /jobs/:id',
    async (field) => {
      await expect(
        pipe.transform(
          { [field]: [] },
          { type: 'body', metatype: UpdateJobDto },
        ),
      ).rejects.toMatchObject({
        response: { message: [expect.stringContaining(field)] },
      });
    },
  );

  it('still accepts the job fields', async () => {
    const dto = (await pipe.transform(
      { status: JobStatus.COMPLETED },
      { type: 'body', metatype: UpdateJobDto },
    )) as UpdateJobDto;

    expect(dto).toMatchObject({ status: JobStatus.COMPLETED });
  });
});

describe('JobService.findById ordering', () => {
  let jobRepository: ReturnType<typeof createMockRepository>;
  let service: JobService;

  beforeEach(() => {
    ({ jobRepository, service } = createService());
  });

  it('orders notes and line items by createdAt, with no client-supplied order', async () => {
    await service.findById('job-1', 'tenant-1');

    expect(jobRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        order: {
          notes: { createdAt: 'ASC', id: 'ASC' },
          lineItems: { createdAt: 'ASC', id: 'ASC' },
          invoices: { createdAt: 'DESC' },
        },
      }),
    );
  });
});
