import React from "react";
import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
} from "@ionic/react";
import { chevronBackOutline, chevronForwardOutline } from "ionicons/icons";

export interface PaginatedTableColumn<T> {
  label: string;
  render: (row: T) => React.ReactNode;
}

interface PaginatedTableProps<T> {
  columns: PaginatedTableColumn<T>[];
  data: T[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  selectedRowKey?: string | null;
}

function PaginatedTable<T>({
  columns,
  data,
  loading,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  rowKey,
  onRowClick,
  emptyMessage = "No records found.",
  selectedRowKey = null,
}: PaginatedTableProps<T>) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "24px" }}>
        <IonSpinner />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <IonText color="medium">
        <p style={{ textAlign: "center", marginTop: "24px" }}>{emptyMessage}</p>
      </IonText>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <IonText color="medium">
          <small>
            Showing {start}–{end} of {total}
          </small>
        </IonText>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <IonText color="medium">
            <small>
              Page {page} of {totalPages}
            </small>
          </IonText>
          <IonButton
            size="small"
            fill="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            title="Previous page"
          >
            <IonIcon slot="icon-only" icon={chevronBackOutline} />
          </IonButton>
          <IonButton
            size="small"
            fill="outline"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            title="Next page"
          >
            <IonIcon slot="icon-only" icon={chevronForwardOutline} />
          </IonButton>
        </div>
      </div>

      <div style={{ overflowX: "auto", borderTop: "1px solid var(--ion-color-light-shade)" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.875rem",
          }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.label}
                  style={{
                    textAlign: "left",
                    padding: "10px 8px",
                    borderBottom: "2px solid var(--ion-color-light-shade)",
                    color: "var(--ion-color-medium)",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const key = rowKey(row);
              const isSelected =
                selectedRowKey !== null && selectedRowKey === key;
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  style={{
                    background: isSelected
                      ? "var(--ion-color-light)"
                      : undefined,
                    cursor: onRowClick ? "pointer" : "default",
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.label}
                      style={{
                        padding: "10px 8px",
                        borderBottom: "1px solid var(--ion-color-light-shade)",
                        verticalAlign: "top",
                      }}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PaginatedTable;