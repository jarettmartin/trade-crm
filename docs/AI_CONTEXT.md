Project Principles

- Multi-tenant SaaS
- Every tenant-owned table contains tenantId
- Never trust tenantId from client
- Use soft deletes
- UUID primary keys
- TypeORM
- NestJS
- Modular architecture
- Feature modules
- DTO validation
- RESTful APIs
- Firebase Authentication
- No business logic in controllers
- Repository pattern
- Ionic (react) for UI
- Docker/compose to manage system componenta

Folder Structure (update here if anything changes)

src/
auth/
tenants/
users/
customers/
jobs/
invoices/
common/

Coding Standards:

- Constructor injection
- DTOs
- ValidationPipe
- Transactions where appropriate
- Eager loading avoided
- Pagination on list endpoints
- Never expose deleted rows
- Never expose another tenant's data
