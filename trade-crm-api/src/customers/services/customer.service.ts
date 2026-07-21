import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async create(dto: CreateCustomerDto, tenantId: string) {
    const customer = this.customerRepository.create({
      ...dto,
      tenantId,
    });

    const savedCustomer = await this.customerRepository.save(customer);

    this.logger.log(
      `Customer ${savedCustomer.id} created for tenant ${tenantId}`,
    );

    return savedCustomer;
  }

  async update(id: string, dto: UpdateCustomerDto, tenantId: string) {
    const customer = await this.customerRepository.findOne({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    Object.assign(customer, dto);
    const savedCustomer = await this.customerRepository.save(customer);

    return savedCustomer;
  }
}
