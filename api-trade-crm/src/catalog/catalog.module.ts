import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './controllers/catalog.controller';
import { CatalogService } from './services/catalog.service';
import { CatalogItem } from './entities/catalog-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogItem])],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
