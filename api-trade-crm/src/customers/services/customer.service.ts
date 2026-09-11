import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { CustomerAddress } from '../entities/customer-address.entity';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { SearchCustomerDto } from '../dto/search-customer.dto';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CustomerAddress)
    private readonly addressRepository: Repository<CustomerAddress>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCustomerDto, tenantId: string) {
    const { addresses, ...customerData } = dto;

    return this.dataSource.transaction(async (manager) => {
      const customer = manager.create(Customer, {
        ...customerData,
        tenantId,
      });

      const savedCustomer = await manager.save(Customer, customer);

      // Create addresses if provided
      if (addresses && addresses.length > 0) {
        const addressEntities = addresses.map((addr, index) =>
          manager.create(CustomerAddress, {
            ...addr,
            tenantId,
            customerId: savedCustomer.id,
            isDefault: addr.isDefault ?? index === 0,
          }),
        );
        await manager.save(CustomerAddress, addressEntities);
      }

      // Return customer with addresses
      const customerWithAddresses = await manager.findOne(Customer, {
        where: { id: savedCustomer.id },
        relations: { addresses: true },
      });

      this.logger.log(
        `Customer ${savedCustomer.id} created for tenant ${tenantId}`,
      );

      return customerWithAddresses;
    });
  }

  async update(id: string, dto: UpdateCustomerDto, tenantId: string) {
    const { addresses, ...customerData } = dto;

    const customer = await this.customerRepository.findOne({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.dataSource.transaction(async (manager) => {
      // Update customer fields
      Object.assign(customer, customerData);
      await manager.save(Customer, customer);

      // Reconcile addresses if provided. We update existing rows IN PLACE
      // (never delete+recreate) so foreign keys from jobs.customerAddressId
      // stay valid — deleting an address a job references violates the FK
      // (ON DELETE NO ACTION) and returns a 500.
      if (addresses !== undefined) {
        const existingAddresses = await manager.find(CustomerAddress, {
          where: { customerId: id, tenantId },
          order: { createdAt: 'ASC' },
        });

        // 1. Update existing addresses in place (positional match — the UI
        //    always sends the full ordered list without ids).
        const overlap = Math.min(existingAddresses.length, addresses.length);
        for (let i = 0; i < overlap; i++) {
          Object.assign(existingAddresses[i], addresses[i]);
          existingAddresses[i].isDefault = addresses[i].isDefault ?? i === 0;
          await manager.save(CustomerAddress, existingAddresses[i]);
        }

        // 2. Insert any newly-added addresses.
        const added = addresses.slice(existingAddresses.length);
        if (added.length > 0) {
          const created = added.map((addr, index) =>
            manager.create(CustomerAddress, {
              ...addr,
              tenantId,
              customerId: id,
              isDefault:
                addr.isDefault ?? existingAddresses.length + index === 0,
            }),
          );
          await manager.save(CustomerAddress, created);
        }

        // 3. Remove surplus addresses — but never one still referenced by a
        //    job. Referenced ones are kept to preserve data integrity.
        const surplus = existingAddresses.slice(addresses.length);
        if (surplus.length > 0) {
          const surplusIds = surplus.map((a) => a.id);
          const referenced = await manager
            .getRepository(CustomerAddress)
            .createQueryBuilder('address')
            .innerJoin('jobs', 'job', 'job."customerAddressId" = address.id')
            .where('address.id IN (:...surplusIds)', { surplusIds })
            .getMany();
          const referencedIds = new Set(referenced.map((a) => a.id));
          const deletable = surplusIds.filter((id) => !referencedIds.has(id));
          if (deletable.length > 0) {
            await manager.delete(CustomerAddress, deletable);
          }
        }
      }

      // Return customer with addresses
      const customerWithAddresses = await manager.findOne(Customer, {
        where: { id, tenantId },
        relations: { addresses: true },
      });

      this.logger.log(`Customer ${id} updated for tenant ${tenantId}`);

      return customerWithAddresses;
    });
  }

  async findAll(tenantId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [customers, total] = await this.customerRepository.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      // Include addresses so list selections can prefill address pickers
      // (e.g. the Create Job page uses customer.addresses directly).
      relations: { addresses: true },
    });

    return {
      data: customers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, tenantId: string) {
    const customer = await this.customerRepository.findOne({
      where: { id, tenantId },
      relations: {
        addresses: true,
        jobs: {
          notes: true,
          lineItems: true,
          invoices: true,
        },
      },
      order: {
        jobs: {
          createdAt: 'DESC',
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async search(dto: SearchCustomerDto, tenantId: string) {
    const tokens = dto.q.split(/\s+/).filter((t) => t.length > 0);

    if (tokens.length === 0) {
      return [];
    }

    const query = this.customerRepository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.addresses', 'address')
      .where('customer.tenantId = :tenantId', { tenantId });

    // For each token, add a WHERE clause that checks ALL customer + address fields
    tokens.forEach((token, index) => {
      const param = `token_${index}`;
      const like = `%${token}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where(`LOWER(customer.firstName) LIKE LOWER(:${param})`, {
            [param]: like,
          })
            .orWhere(`LOWER(customer.lastName) LIKE LOWER(:${param})`, {
              [param]: like,
            })
            .orWhere(`LOWER(customer.companyName) LIKE LOWER(:${param})`, {
              [param]: like,
            })
            .orWhere(`LOWER(customer.phone) LIKE LOWER(:${param})`, {
              [param]: like,
            })
            .orWhere(`LOWER(customer.email) LIKE LOWER(:${param})`, {
              [param]: like,
            })
            .orWhere(`LOWER(address.addressLine1) LIKE LOWER(:${param})`, {
              [param]: like,
            })
            .orWhere(`LOWER(address.addressLine2) LIKE LOWER(:${param})`, {
              [param]: like,
            })
            .orWhere(`LOWER(address.city) LIKE LOWER(:${param})`, {
              [param]: like,
            })
            .orWhere(`LOWER(address.stateProvince) LIKE LOWER(:${param})`, {
              [param]: like,
            })
            .orWhere(`LOWER(address.zipPostalCode) LIKE LOWER(:${param})`, {
              [param]: like,
            });
        }),
      );
    });

    const results = await query.getMany();

    // Deduplicate customers that were returned multiple times due to multiple address matches
    const seen = new Set<string>();
    const deduped = results.filter((customer) => {
      if (seen.has(customer.id)) {
        return false;
      }
      seen.add(customer.id);
      return true;
    });

    return deduped;
  }
}
