import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { dataSourceOptions } from './data-source';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerAddress } from '../customers/entities/customer-address.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobNote } from '../jobs/entities/job-note.entity';
import { JobLineItem } from '../jobs/entities/job-line-item.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { CustomerType } from '../common/enums/customer-type.enum';
import { JobStatus } from '../common/enums/job-status.enum';
import { JobLineItemType } from '../common/enums/job-line-item-type.enum';
import { InvoiceStatus } from '../common/enums/invoice-status.enum';

/**
 * Seed the local database with the same data the web demo mode uses, so the
 * real API (non-demo) has customers/jobs/invoices to test with.
 *
 * Reads the demo fixtures from web-trade-crm/src/demo/api and inserts them
 * under the tenant of an existing user (so a real sign-in can see them).
 *
 * RUN FROM THE HOST (not inside the api container): the script reads the
 * web demo JSON, which is only present in the repo, not in the container.
 *
 *   cd api-trade-crm && npm run db:seed-demo
 *
 * Idempotent: customers are matched by email, jobs by title. Re-running is safe.
 */

// Loosely-typed shapes of the demo fixtures (kept intentionally loose — these
// files are the source of truth and use demo string ids).
interface DemoAddress {
  id: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  label?: string;
  isDefault?: boolean;
}

interface DemoCustomer {
  id: string;
  type: string;
  firstName: string;
  lastName: string;
  companyName?: string | null;
  phone: string;
  email?: string | null;
  notes?: string | null;
  addresses: DemoAddress[];
}

interface DemoLineItem {
  id: string;
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder?: number;
}

interface DemoNote {
  id: string;
  note: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string };
}

interface DemoInvoice {
  id: string;
  invoiceNumber: number;
  version: number;
  status: string;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  createdAt: string;
}

interface DemoJob {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  customerId: string;
  customerAddressId: string;
  notes: DemoNote[];
  lineItems: DemoLineItem[];
  invoices: DemoInvoice[];
}

interface DemoTenant {
  businessName: string;
  businessEmail: string;
  phone: string;
  defaultTaxPercent: number;
  invoicePaymentMethodNote: string;
}

// ---- Helpers ---------------------------------------------------------------

/** Resolve demo fixture path; provide a helpful error outside the repo. */
const DEMO_DIR = path.resolve(
  __dirname,
  '../../../web-trade-crm/src/demo/api',
);

function loadJson<T>(file: string): T {
  const full = path.join(DEMO_DIR, file);
  if (!fs.existsSync(full)) {
    throw new Error(
      `Demo fixture not found: ${full}\n` +
        'Run this script from the host repo (cd api-trade-crm && npm run db:seed-demo) — ' +
        'the web demo JSON lives in web-trade-crm/src/demo/api and is not mounted in Docker.',
    );
  }
  return JSON.parse(fs.readFileSync(full, 'utf8')) as T;
}

// The real Postgres enum only allows PERSON/BUSINESS; the demo fixtures use
// RESIDENTIAL/COMMERCIAL.
function mapCustomerType(type: string): CustomerType {
  if (type === 'COMMERCIAL') return CustomerType.BUSINESS;
  return CustomerType.PERSON;
}

// The real Postgres enum is DRAFT/ISSUED/PAID/VOID/SUPERSEDED; the demo uses
// "SENT" for an emailed invoice, which maps to ISSUED here.
function mapInvoiceStatus(status: string): InvoiceStatus {
  if (status === 'SENT') return InvoiceStatus.ISSUED;
  switch (status) {
    case InvoiceStatus.DRAFT:
    case InvoiceStatus.ISSUED:
    case InvoiceStatus.PAID:
    case InvoiceStatus.VOID:
    case InvoiceStatus.SUPERSEDED:
      return status as InvoiceStatus;
    default:
      return InvoiceStatus.DRAFT;
  }
}

async function seed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  try {
    const em = dataSource.manager;

    const tenantDemo: DemoTenant = loadJson<DemoTenant>('tenant.json');
    const customersDemo: DemoCustomer[] = loadJson<DemoCustomer[]>('customers.json');
    const jobsDemo: DemoJob[] = loadJson<DemoJob[]>('jobs.json');

    // ---- Resolve tenant + reference user -------------------------------
    const firstUsers = await em.find(User, {
      order: { createdAt: 'ASC' },
      take: 1,
    });
    const anyUser = firstUsers[0] || null;
    if (!anyUser) {
      throw new Error(
        'No users exist yet. Sign up via the app (or insert a user row) before running db:seed-demo.',
      );
    }

    let tenant: Tenant | null = anyUser.tenantId
      ? await em.findOne(Tenant, { where: { id: anyUser.tenantId } })
      : null;

    if (!tenant) {
      console.log('No tenant found for the user — creating one from the demo tenant.');
      tenant = em.create(Tenant, {
        businessName: tenantDemo.businessName,
        businessEmail: tenantDemo.businessEmail,
        phone: tenantDemo.phone,
        defaultTaxPercent: tenantDemo.defaultTaxPercent,
        invoicePaymentMethodNote: tenantDemo.invoicePaymentMethodNote,
      });
      await em.save(tenant);
      anyUser.tenantId = tenant.id;
      await em.save(anyUser);
    } else {
      // Adopt the demo business settings so the UI matches demo mode.
      tenant.businessName = tenantDemo.businessName;
      tenant.businessEmail = tenantDemo.businessEmail;
      tenant.phone = tenantDemo.phone;
      tenant.defaultTaxPercent = tenantDemo.defaultTaxPercent;
      tenant.invoicePaymentMethodNote = tenantDemo.invoicePaymentMethodNote;
      await em.save(tenant);
    }

    const refUser = await em.findOne(User, { where: { tenantId: tenant.id } });
    if (!refUser) {
      throw new Error('No user exists for tenant ' + tenant.id);
    }

    console.log(`Tenant : ${tenant.businessName} (${tenant.id})`);
    console.log(`User   : ${refUser.email} (${refUser.id})`);

    // ---- Customers + addresses ------------------------------------------
    const customerIdMap = new Map<string, string>(); // demoId -> realId
    const addressIdMap = new Map<string, string>(); // demoId -> realId
    let customersCreated = 0;
    let addressesCreated = 0;

    for (const c of customersDemo) {
      const email = c.email || undefined;
      let existing: Customer | null = null;
      if (email) {
        existing = await em.findOne(Customer, {
          where: { tenantId: tenant.id, email },
        });
      }
      if (!existing) {
        // Match on first/last + phone when email is absent.
        existing = await em.findOne(Customer, {
          where: {
            tenantId: tenant.id,
            firstName: c.firstName,
            lastName: c.lastName,
            phone: c.phone,
          },
        });
      }

      if (existing) {
        customerIdMap.set(c.id, existing.id);
        const existingAddresses = await em.find(CustomerAddress, {
          where: { customerId: existing.id },
        });
        for (const a of c.addresses || []) {
          const match = existingAddresses.find(
            (ea) =>
              ea.addressLine1 === a.addressLine1 &&
              ea.city === a.city &&
              ea.zipPostalCode === a.zipPostalCode,
          );
          if (match) addressIdMap.set(a.id, match.id);
        }
        continue;
      }

      const customer = em.create(Customer, {
        tenantId: tenant.id,
        type: mapCustomerType(c.type),
        firstName: c.firstName,
        lastName: c.lastName,
        companyName: c.companyName || undefined,
        phone: c.phone,
        email: c.email || undefined,
        notes: c.notes || undefined,
      });
      await em.save(customer);
      customerIdMap.set(c.id, customer.id);
      customersCreated++;

      for (const a of c.addresses || []) {
        const addr = em.create(CustomerAddress, {
          tenantId: tenant.id,
          customerId: customer.id,
          label: a.label || '',
          addressLine1: a.addressLine1,
          addressLine2: a.addressLine2 || undefined,
          city: a.city,
          stateProvince: a.stateProvince,
          zipPostalCode: a.zipPostalCode,
          countryCode: 'CA', // all demo addresses are Canadian
          isDefault: a.isDefault ?? false,
        });
        await em.save(addr);
        addressIdMap.set(a.id, addr.id);
        addressesCreated++;
      }
    }
// ---- Jobs + notes + line items + invoices ---------------------------
    const customersById = new Map(customersDemo.map((c) => [c.id, c]));
    let jobsCreated = 0;
    let notesCreated = 0;
    let lineItemsCreated = 0;
    let invoicesCreated = 0;

    const latestInvoice = await em.findOne(Invoice, {
      where: { tenantId: tenant.id },
      order: { invoiceNumber: 'DESC' },
    });
    let nextInvoiceNumber = latestInvoice ? latestInvoice.invoiceNumber + 1 : 88880001;

    for (const j of jobsDemo) {
      const existing = await em.findOne(Job, {
        where: { tenantId: tenant.id, title: j.title },
      });
      if (existing) continue;

      const customerId = customerIdMap.get(j.customerId);
      const addressId = addressIdMap.get(j.customerAddressId);
      if (!customerId || !addressId) {
        console.warn(`  Skipping job "${j.title}" — demo customer/address mapping missing.`);
        continue;
      }

      const demoCustomer = customersById.get(j.customerId);
      const demoAddress = demoCustomer?.addresses?.find((a) => a.id === j.customerAddressId);

      const job = em.create(Job, {
        tenantId: tenant.id,
        customerId,
        customerAddressId: addressId,
        title: j.title,
        description: j.description || undefined,
        status: j.status as JobStatus,
        createdAt: new Date(j.createdAt),
      });
      await em.save(job);
      jobsCreated++;

      for (const n of j.notes || []) {
        const note = em.create(JobNote, {
          tenantId: tenant.id,
          jobId: job.id,
          userId: refUser.id,
          note: n.note,
          createdAt: new Date(n.createdAt),
        });
        await em.save(note);
        notesCreated++;
      }

      for (const li of j.lineItems || []) {
        const item = em.create(JobLineItem, {
          tenantId: tenant.id,
          jobId: job.id,
          type: li.type as JobLineItemType,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          lineTotal: li.lineTotal,
          sortOrder: li.sortOrder ?? 0,
        });
        await em.save(item);
        lineItemsCreated++;
      }

      for (const inv of j.invoices || []) {
        const status = mapInvoiceStatus(inv.status);
        const isPaid = status === InvoiceStatus.PAID;

        const snapshot = {
          customer: {
            id: customerId,
            name: `${demoCustomer?.firstName ?? ''} ${demoCustomer?.lastName ?? ''}`.trim(),
            companyName: demoCustomer?.companyName ?? undefined,
            phone: demoCustomer?.phone,
            email: demoCustomer?.email ?? undefined,
          },
          serviceAddress: demoAddress
            ? {
                id: addressId,
                label: demoAddress.label || '',
                addressLine1: demoAddress.addressLine1,
                addressLine2: demoAddress.addressLine2 ?? undefined,
                city: demoAddress.city,
                stateProvince: demoAddress.stateProvince,
                zipPostalCode: demoAddress.zipPostalCode,
                countryCode: 'CA',
              }
            : null,
          job: {
            id: job.id,
            title: j.title,
            description: j.description ?? null,
          },
          lineItems: (j.lineItems || []).map((li) => ({
            type: li.type,
            description: li.description,
            quantity: Number(li.quantity),
            unitPrice: Number(li.unitPrice),
            lineTotal: Number(li.lineTotal),
            sortOrder: li.sortOrder ?? 0,
          })),
          totals: {
            subtotal: inv.subtotal,
            taxPercent: inv.taxPercent,
            taxAmount: inv.taxAmount,
            total: inv.total,
          },
        };

        const invoice = em.create(Invoice, {
          tenantId: tenant.id,
          jobId: job.id,
          invoiceNumber: nextInvoiceNumber++,
          version: inv.version ?? 1,
          status,
          subtotal: inv.subtotal,
          taxPercent: inv.taxPercent,
          taxAmount: inv.taxAmount,
          total: inv.total,
          issuedAt:
            isPaid || status === InvoiceStatus.ISSUED
              ? new Date(inv.createdAt)
              : undefined,
          paidAt: isPaid ? new Date(inv.createdAt) : undefined,
          snapshot,
          createdAt: new Date(inv.createdAt),
        });
        await em.save(invoice);
        invoicesCreated++;
      }
    }

    console.log(
      `Customers created : ${customersCreated} (addresses: ${addressesCreated})`,
    );
    console.log(
      `Jobs created      : ${jobsCreated} (notes: ${notesCreated}, line items: ${lineItemsCreated})`,
    );
    console.log(`Invoices created  : ${invoicesCreated}`);
    console.log('Demo seed complete.');
  } catch (error: any) {
    console.error('Seed failed:', error?.message ?? error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

seed();