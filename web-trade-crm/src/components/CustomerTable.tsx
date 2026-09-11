import React from "react";
import { CustomerResult } from "../services/api";
import PaginatedTable, { PaginatedTableColumn } from "./PaginatedTable";

const customerColumns: PaginatedTableColumn<CustomerResult>[] = [
  {
    label: "Name",
    render: (c) => (
      <span style={{ fontWeight: 600 }}>
        {c.firstName} {c.lastName}
      </span>
    ),
  },
  {
    label: "Company",
    render: (c) => (c.companyName ? c.companyName : "—"),
  },
  {
    label: "Phone",
    render: (c) => (c.phone ? c.phone : "—"),
  },
  {
    label: "Email",
    render: (c) => (c.email ? c.email : "—"),
  },
];

interface CustomerTableProps {
  data: CustomerResult[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  onSelectCustomer: (customer: CustomerResult) => void;
  selectedCustomerId?: string | null;
  emptyMessage?: string;
}

/**
 * Shared paginated table of all customers. Rows are clickable and highlight
 * the currently selected customer. Used on the Manage Customers and Create
 * Job pages to browse beyond the text-search box.
 */
function CustomerTable({
  data,
  loading,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onSelectCustomer,
  selectedCustomerId = null,
  emptyMessage = "No customers found.",
}: CustomerTableProps) {
  return (
    <PaginatedTable
      columns={customerColumns}
      data={data}
      loading={loading}
      page={page}
      pageSize={pageSize}
      total={total}
      totalPages={totalPages}
      onPageChange={onPageChange}
      rowKey={(c) => c.id}
      onRowClick={onSelectCustomer}
      selectedRowKey={selectedCustomerId}
      emptyMessage={emptyMessage}
    />
  );
}

export default CustomerTable;