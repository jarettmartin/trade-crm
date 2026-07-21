import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
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
  ) {}

  async create(dto: CreateCustomerDto, tenantId: string) {
    const { addresses, ...customerData } = dto;

    const customer = this.customerRepository.create({
      ...customerData,
      tenantId,
    });

    const savedCustomer = await this.customerRepository.save(customer);

    // Create addresses if provided
    if (addresses && addresses.length > 0) {
      const addressEntities = addresses.map((addr, index) =>
        this.addressRepository.create({
          ...addr,
          tenantId,
          customerId: savedCustomer.id,
          isDefault: addr.isDefault ?? index === 0,
        }),
      );
      await this.addressRepository.save(addressEntities);
    }

    // Return customer with addresses
    const customerWithAddresses = await this.customerRepository.findOne({
      where: { id: savedCustomer.id },
      relations: { addresses: true },
    });

    this.logger.log(
      `Customer ${savedCustomer.id} created for tenant ${tenantId}`,
    );

    return customerWithAddresses;
  }

  async update(id: string, dto: UpdateCustomerDto, tenantId: string) {
    const { addresses, ...customerData } = dto;

    const customer = await this.customerRepository.findOne({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Update customer fields
    Object.assign(customer, customerData);
    await this.customerRepository.save(customer);

    // Replace addresses if provided
    if (addresses !== undefined) {
      // Delete existing addresses
      await this.addressRepository.delete({ customerId: id, tenantId });

      // Create new addresses
      if (addresses.length > 0) {
        const addressEntities = addresses.map((addr, index) =>
          this.addressRepository.create({
            ...addr,
            tenantId,
            customerId: id,
            isDefault: addr.isDefault ?? index === 0,
          }),
        );
        await this.addressRepository.save(addressEntities);
      }
    }

    // Return customer with addresses
    const customerWithAddresses = await this.customerRepository.findOne({
      where: { id, tenantId },
      relations: { addresses: true },
    });

    return customerWithAddresses;
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
