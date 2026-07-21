import { useState, useEffect, useRef } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonSpinner,
  IonText,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { api, CustomerResult, CreateJobPayload } from "../services/api";

const CreateJobPage: React.FC = () => {
  const history = useHistory();
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerResult | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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

  const handleSelectCustomer = (customer: CustomerResult) => {
    setSelectedCustomer(customer);
    setSearchText("");
    setShowDropdown(false);
    setResults([]);
    // Auto-select first address
    if (customer.addresses && customer.addresses.length > 0) {
      const defaultAddr = customer.addresses.find((a) => a.isDefault);
      setSelectedAddressId(
        defaultAddr ? defaultAddr.id : customer.addresses[0].id,
      );
    } else {
      setSelectedAddressId("");
    }
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setSelectedAddressId("");
    setSearchText("");
    setResults([]);
    setShowDropdown(false);
  };

  const handleSave = async () => {
    setError("");

    if (!selectedCustomer) {
      setError("Please select a customer first");
      return;
    }
    if (!title.trim()) {
      setError("Job title is required");
      return;
    }
    if (!selectedAddressId) {
      setError("Please select a customer address");
      return;
    }

    const payload: CreateJobPayload = {
      customerId: selectedCustomer.id,
      customerAddressId: selectedAddressId,
      title: title.trim(),
      description: description.trim() || undefined,
    };

    setSaving(true);
    try {
      await api.createJob(payload);
      history.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>New Job</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {error && (
          <IonText color="danger">
            <p style={{ marginBottom: "16px" }}>{error}</p>
          </IonText>
        )}

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
                  onClick={() => handleSelectCustomer(customer)}
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

        {selectedCustomer && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              border: "1px solid var(--ion-color-primary-tint)",
              borderRadius: "8px",
              background: "var(--ion-color-primary-tint)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <IonText>
                  <strong>
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </strong>
                </IonText>
                {selectedCustomer.companyName && (
                  <IonText>
                    <p style={{ margin: "2px 0" }}>
                      {selectedCustomer.companyName}
                    </p>
                  </IonText>
                )}
                <IonText color="medium">
                  <p style={{ margin: "2px 0" }}>{selectedCustomer.phone}</p>
                </IonText>
                {selectedCustomer.email && (
                  <IonText color="medium">
                    <p style={{ margin: "2px 0" }}>{selectedCustomer.email}</p>
                  </IonText>
                )}
              </div>
              <IonButton
                size="small"
                fill="clear"
                color="medium"
                onClick={handleClearSelection}
              >
                Change
              </IonButton>
            </div>

            {selectedCustomer.addresses &&
              selectedCustomer.addresses.length > 0 && (
                <IonItem style={{ "--padding-start": "0", marginTop: "8px" }}>
                  <IonLabel position="stacked">Address</IonLabel>
                  <IonSelect
                    value={selectedAddressId}
                    onIonChange={(e) => setSelectedAddressId(e.detail.value)}
                  >
                    {selectedCustomer.addresses.map((addr) => {
                      return (
                        <IonSelectOption key={addr.id} value={addr.id}>
                          {addr.addressLine1}
                          {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                          {addr.city ? `, ${addr.city}` : ""}
                          {addr.stateProvince ? `, ${addr.stateProvince}` : ""}
                          {addr.isDefault ? " (Default)" : ""}
                        </IonSelectOption>
                      );
                    })}
                  </IonSelect>
                </IonItem>
              )}
          </div>
        )}

        {selectedCustomer && (
          <>
            <IonItem style={{ marginTop: "16px" }}>
              <IonLabel position="stacked">
                Job Title <IonText color="danger">*</IonText>
              </IonLabel>
              <IonInput
                value={title}
                onIonInput={(e) => setTitle(e.detail.value || "")}
                placeholder="e.g. Repair dishwasher"
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Description</IonLabel>
              <IonTextarea
                rows={4}
                value={description}
                onIonInput={(e) => setDescription(e.detail.value || "")}
                placeholder="Describe the work to be done..."
              />
            </IonItem>

            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "24px",
              }}
            >
              <IonButton
                expand="block"
                fill="outline"
                onClick={() => history.goBack()}
              >
                Cancel
              </IonButton>
              <IonButton expand="block" onClick={handleSave} disabled={saving}>
                {saving ? <IonSpinner /> : "Save Job"}
              </IonButton>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default CreateJobPage;
