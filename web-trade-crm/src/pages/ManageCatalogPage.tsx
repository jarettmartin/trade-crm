import { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonLabel,
  IonCheckbox,
  IonText,
  useIonViewWillEnter,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { api, CatalogItemResult } from "../services/api";
import PaginatedTable from "../components/PaginatedTable";

const PAGE_SIZE = 10;

const CATALOG_TYPES = ["SERVICE", "MATERIAL", "FEE"] as const;

const typeLabel: Record<string, string> = {
  SERVICE: "Service",
  MATERIAL: "Material",
  FEE: "Fee",
};

const currency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

const ManageCatalogPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM - Catalog";
  }, []);

  const history = useHistory();
  const [items, setItems] = useState<CatalogItemResult[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  const loadItems = async (pageNum: number, types: Set<string>) => {
    setLoading(true);
    try {
      const typeList = Array.from(types);
      const res = await api.fetchCatalogItems(
        pageNum,
        PAGE_SIZE,
        typeList.length > 0 ? typeList : undefined,
      );
      setItems(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
      setPage(pageNum);
    } catch {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Refresh on every view enter so catalog edits/deletes on the form page are
  // picked up when navigating back here.
  useIonViewWillEnter(() => {
    loadItems(1, selectedTypes);
  });

  const toggleType = (type: string) => {
    const next = new Set(selectedTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setSelectedTypes(next);
    loadItems(1, next);
  };

  const handlePageChange = (nextPage: number) => {
    loadItems(nextPage, selectedTypes);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Catalog</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "12px",
            }}
          >
            <IonButton
              onClick={() => history.push("/create-catalog-item")}
              data-testid="new-catalog-item"
            >
              New Catalog Item
            </IonButton>
          </div>

          <IonText color="medium">
            <p style={{ margin: "0 0 8px", fontSize: "0.875rem" }}>
              Filter by type:
            </p>
          </IonText>
          <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
            {CATALOG_TYPES.map((type) => (
              <IonLabel
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.875rem",
                }}
              >
                <IonCheckbox
                  checked={selectedTypes.has(type)}
                  onIonChange={() => toggleType(type)}
                />
                {typeLabel[type]}
              </IonLabel>
            ))}
            {selectedTypes.size > 0 && (
              <IonButton
                size="small"
                fill="clear"
                onClick={() => {
                  setSelectedTypes(new Set());
                  loadItems(1, new Set());
                }}
              >
                Clear
              </IonButton>
            )}
          </div>

          <PaginatedTable
            columns={[
              {
                label: "Description",
                render: (item) => (
                  <span style={{ fontWeight: 600 }}>{item.description}</span>
                ),
              },
              {
                label: "Type",
                render: (item) => typeLabel[item.type] ?? item.type,
              },
              {
                label: "Unit Price",
                render: (item) => currency(Number(item.unitPrice)),
              },
            ]}
            data={items}
            loading={loading}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            rowKey={(item) => item.id}
            onRowClick={(item) => history.push(`/edit-catalog-item/${item.id}`)}
            emptyMessage="No catalog items found."
          />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ManageCatalogPage;