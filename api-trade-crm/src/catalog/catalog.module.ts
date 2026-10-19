import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './controllers/catalog.controller';
import { CatalogService } from './services/catalog.service';
import { CatalogItem } from './entities/catalog-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogItem])],
  controllers: [CatalogController],
  providers: [CatalogService],
  // Exported so the job line-item flow and the AI estimator can reuse the
  // tenant-scoped catalog lookup instead of re-querying catalog_items.
  exports: [CatalogService],
})
export class CatalogModule {}
