import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { UserStatus } from '../../common/enums/user-status.enum';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateTenantDto, cognitoSub: string) {
    // Find the local user by Cognito sub
    const user = await this.userRepository.findOne({
      where: { cognitoSub },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.tenantId) {
      throw new BadRequestException('User already belongs to a tenant');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(
        'Email must be verified before creating a business',
      );
    }

    // Create the tenant
    const tenant = this.tenantRepository.create({
      businessName: dto.businessName,
      businessEmail: dto.businessEmail,
      phone: dto.phone,
      defaultTaxPercent: dto.defaultTaxPercent ?? 0,
      invoicePaymentMethodNote: dto.invoicePaymentMethodNote,
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    // Associate the user with the tenant
    user.tenantId = savedTenant.id;
    await this.userRepository.save(user);

    this.logger.log(
      `Tenant ${savedTenant.id} created by user ${user.id} (${user.email})`,
    );

    return {
      id: savedTenant.id,
      businessName: savedTenant.businessName,
      businessEmail: savedTenant.businessEmail,
      phone: savedTenant.phone,
      defaultTaxPercent: savedTenant.defaultTaxPercent,
      invoicePaymentMethodNote: savedTenant.invoicePaymentMethodNote,
    };
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    Object.assign(tenant, dto);
    const savedTenant = await this.tenantRepository.save(tenant);

    this.logger.log(`Tenant ${savedTenant.id} updated`);

    return {
      id: savedTenant.id,
      businessName: savedTenant.businessName,
      businessEmail: savedTenant.businessEmail,
      phone: savedTenant.phone,
      defaultTaxPercent: savedTenant.defaultTaxPercent,
      invoicePaymentMethodNote: savedTenant.invoicePaymentMethodNote,
    };
  }
}
