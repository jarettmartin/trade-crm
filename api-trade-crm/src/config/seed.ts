import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source';

async function seed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const queryRunner = dataSource.createQueryRunner();

  try {
    // Check if invite code already exists
    const existing = await queryRunner.query(
      `SELECT id FROM invite_codes WHERE code = $1`,
      ['INV'],
    );

    if (existing.length === 0) {
      await queryRunner.query(
        `INSERT INTO invite_codes (code, active, "maxUses", "currentUses", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        ['INV', true, 1000, 0],
      );
      console.log('Seed: Invite code "INV" created (max 1000 uses)');
    } else {
      console.log('Seed: Invite code "INV" already exists, skipping');
    }
  } catch (error: any) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seed();
