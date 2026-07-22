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
import { useHistory } from "react-router-dom";
import { api, CustomerResult } from "../services/api";

interface CustomerSearchProps {
  onSelect: (customer: CustomerResult) => void;
  clearOnSelect?: boolean;
}

const CustomerSearch: React.FC<CustomerSearchProps> = ({
  onSelect,
  clearOnSelect = true,
}) => {
  const history = useHistory();
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const doSearch = async (q: string) => {
    setIsSearching(true);
    try {
      const data = await api.searchCustomers(q);
      setResults(data);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

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
      doSearch(trimmed);
    }, 1000);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchText]);

  const handleSelect = (customer: CustomerResult) => {
    onSelect(customer);
    setResults([]);
    setShowDropdown(false);
    if (clearOnSelect) {
      setSearchText("");
    }
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
          onClick={() => history.push("/create-customer")}
        >
          Create New Customer
        </IonButton>
      </div>
      <div style={{ position: "relative" }}>
        <IonSearchbar
          value={searchText}
          onIonInput={(e) => setSearchText(e.detail.value || "")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const trimmed = searchText.trim();
              if (trimmed.length > 0) {
                if (debounceRef.current) {
                  clearTimeout(debounceRef.current);
                }
                doSearch(trimmed);
              }
            }
          }}
          placeholder="Search customers..."
          debounce={0}
        />

        {isSearching && (
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
            {results.map((customer) => (
              <IonItem
                key={customer.id}
                button
                onClick={() => handleSelect(customer)}
              >
                <IonLabel>
                  <h2>
                    {customer.firstName} {customer.lastName}
                  </h2>
                  {customer.companyName && <p>{customer.companyName}</p>}
                  <p>{customer.phone}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}

        {showDropdown && results.length === 0 && !isSearching && (
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
              <p>No customers found</p>
            </IonText>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerSearch;
