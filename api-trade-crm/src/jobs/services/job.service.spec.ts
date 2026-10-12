import { NotFoundException, ValidationPipe } from '@nestjs/common';
import { JobService } from './job.service';
import { JobLineItemType } from '../../common/enums/job-line-item-type.enum';
import { JobStatus } from '../../common/enums/job-status.enum';
import { UpdateJobDto } from '../dto/update-job.dto';

function createMockRepository() {
  return {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((entity: unknown) => entity),
    save: jest.fn((entity: unknown) => entity),
    delete: jest.fn(),
  };
}

function createService() {
  const jobRepository = createMockRepository();
  const noteRepository = createMockRepository();
  const lineItemRepository = createMockRepository();

  jobRepository.findOne.mockResolvedValue({
    id: 'job-1',
    tenantId: 'tenant-1',
  });

  return {
    jobRepository,
    noteRepository,
    lineItemRepository,
    service: new JobService(jobRepository, noteRepository, lineItemRepository),
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
  let service: JobService;

  beforeEach(() => {
    ({ jobRepository, lineItemRepository, service } = createService());
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
