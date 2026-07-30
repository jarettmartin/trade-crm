import { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonSpinner,
  IonText,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  IonToast,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { api, CustomerResult, CreateJobPayload } from "../services/api";
import CustomerSearch from "../components/CustomerSearch";

const CreateJobPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM - Create Job";
  }, []);

  const history = useHistory();
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerResult | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastIsError, setToastIsError] = useState(false);

  const showToastMsg = (msg: string, isError = true) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setShowToast(true);
  };

  const handleSelectCustomer = (customer: CustomerResult) => {
    setSelectedCustomer(customer);
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
  };

  const handleSave = async () => {
    if (!selectedCustomer) {
      showToastMsg("Please select a customer first");
      return;
    }
    if (!title.trim()) {
      showToastMsg("Job title is required");
      return;
    }
    if (!selectedAddressId) {
      showToastMsg("Please select a customer address");
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
      setToastMessage("Job created successfully");
      setShowToast(true);
    } catch (err) {
      showToastMsg(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>New Job</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <CustomerSearch onSelect={handleSelectCustomer} />

        {selectedCustomer && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              border: "1px solid var(--ion-color-light-shade)",
              borderRadius: "8px",
              background: "var(--ion-background-color)",
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
                <div style={{ marginTop: "12px" }}>
                  <IonLabel
                    style={{
                      fontSize: "14px",
                      marginBottom: "4px",
                      display: "block",
                    }}
                  >
                    Address
                  </IonLabel>
                  <IonSelect
                    value={selectedAddressId}
                    onIonChange={(e) => setSelectedAddressId(e.detail.value)}
                    style={{ width: "100%" }}
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
                </div>
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
          </>
        )}

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
          <IonButton
            expand="block"
            onClick={handleSave}
            disabled={
              saving || !selectedCustomer || !title.trim() || !selectedAddressId
            }
          >
            {saving ? <IonSpinner /> : "Save Job"}
          </IonButton>
        </div>

        <IonToast
          isOpen={showToast}
          message={toastMessage}
          color={toastIsError ? "danger" : "success"}
          duration={toastIsError ? undefined : 5000}
          buttons={
            toastIsError
              ? [{ text: "Dismiss", handler: () => setShowToast(false) }]
              : undefined
          }
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default CreateJobPage;
