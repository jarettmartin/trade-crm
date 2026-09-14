import { useState, useEffect, useRef } from "react";
import {
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonText,
  IonButton,
} from "@ionic/react";
import { CatalogItemResult } from "../services/api";

interface CatalogItemSearchProps {
  /** All of the tenant's catalog items (fetched up-front, searched locally). */
  catalogItems: CatalogItemResult[];
  loading: boolean;
  onSelect: (item: CatalogItemResult) => void;
  /** Opens the normal custom (manual) line item entry form. */
  onAddCustom: () => void;
}

const maxPrice = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

const itemTypeLabel: Record<string, string> = {
  SERVICE: "Service",
  MATERIAL: "Material",
  FEE: "Fee",
};

/**
 * Local catalog item picker for the job detail page. Unlike CustomerSearch
 * (which hits a /search endpoint), the tenant's catalog items are fetched
 * once up-front (see api.fetchAllCatalogItems) and filtered client-side on
 * every applicable property — description, type, and unit price — which keeps
 * keystroke search instant for a catalog-sized dataset. The caller refreshes
 * the list on view enter so catalog edits/deletes land next time the job is
 * opened.
 */
const CatalogItemSearch: React.FC<CatalogItemSearchProps> = ({
  catalogItems,
  loading,
  onSelect,
  onAddCustom,
}) => {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<CatalogItemResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = searchText.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
      const matches = catalogItems.filter((item) => {
        const haystack = [
          item.description,
          item.type,
          itemTypeLabel[item.type] ?? item.type,
          String(item.unitPrice),
          maxPrice(Number(item.unitPrice)),
        ]
          .join(" ")
          .toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      });
      setResults(matches);
      setShowDropdown(true);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchText, catalogItems]);

  const handleSelect = (item: CatalogItemResult) => {
    onSelect(item);
    setResults([]);
    setShowDropdown(false);
    setSearchText("");
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "8px",
        }}
      >
        <IonButton
          size="small"
          fill="outline"
          onClick={onAddCustom}
          data-testid="add-custom-line-item"
        >
          Add Custom Line Item
        </IonButton>
      </div>

      <div style={{ position: "relative" }}>
        <IonSearchbar
          value={searchText}
          onIonInput={(e) => setSearchText(e.detail.value || "")}
          placeholder="Search catalog items..."
          debounce={0}
        />

        {!searchText.trim() && (
          <IonText color="medium">
            <p style={{ textAlign: "center", marginTop: "8px" }}>
              Search by description, type, or price to add a catalog item — or
              add a custom line item.
            </p>
          </IonText>
        )}

        {loading && (
          <div
            style={{
              position: "absolute",
              top: "56px",
              left: "16px",
              right: "16px",
              background: "var(--ion-background-color)",
              border: "1px solid var(--ion-color-light-shade)",
              borderRadius: "8px",
              zIndex: 100,
              padding: "16px",
              textAlign: "center",
            }}
          >
            <IonSpinner />
          </div>
        )}

        {showDropdown && results.length > 0 && (
          <IonList
            style={{
              position: "absolute",
              top: "56px",
              left: "16px",
              right: "16px",
              background: "var(--ion-background-color)",
              border: "1px solid var(--ion-color-light-shade)",
              borderRadius: "8px",
              zIndex: 100,
              maxHeight: "240px",
              overflowY: "auto",
            }}
          >
            {results.map((item) => (
              <IonItem key={item.id} button onClick={() => handleSelect(item)}>
                <IonLabel>
                  <h2 style={{ fontWeight: 600 }}>{item.description}</h2>
                  <p>
                    {itemTypeLabel[item.type] ?? item.type} ·{" "}
                    {maxPrice(Number(item.unitPrice))}
                  </p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}

        {showDropdown && results.length === 0 && !loading && (
          <div
            style={{
              position: "absolute",
              top: "56px",
              left: "16px",
              right: "16px",
              background: "var(--ion-background-color)",
              border: "1px solid var(--ion-color-light-shade)",
              borderRadius: "8px",
              zIndex: 100,
              padding: "16px",
              textAlign: "center",
            }}
          >
            <IonText color="medium">
              <p>No catalog items found</p>
            </IonText>
          </div>
        )}

        {!loading &&
          !showDropdown &&
          catalogItems.length === 0 && (
            <IonText color="medium">
              <p style={{ textAlign: "center", marginTop: "8px" }}>
                No catalog items yet. Add some from the Catalog page, or use a
                custom line item.
              </p>
            </IonText>
          )}
      </div>
    </div>
  );
};

export default CatalogItemSearch;