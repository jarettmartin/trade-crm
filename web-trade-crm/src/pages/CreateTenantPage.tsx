import React, { useState } from "react";
import {
  IonContent,
  IonPage,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonSpinner,
  IonNote,
  IonToast,
} from "@ionic/react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { formatPhone, stripPhone } from "../services/format";

const CreateTenantPage: React.FC = () => {
  const { updateUser, logout } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [defaultTaxPercent, setDefaultTaxPercent] = useState<number>(0);
  const [invoicePaymentMethodNote, setInvoicePaymentMethodNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastIsError, setToastIsError] = useState(false);

  const showToastMsg = (msg: string, isError = true) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setShowToast(true);
  };

  const handleCreate = async () => {
    if (!businessName || !businessEmail) {
      showToastMsg("Business name and email are required");
      return;
    }
    setLoading(true);
    try {
      const result = await api.createTenant({
        businessName,
        businessEmail,
        phone: phone || undefined,
        defaultTaxPercent,
        invoicePaymentMethodNote: invoicePaymentMethodNote || undefined,
      });
      updateUser({
        tenantId: result.id,
        businessName: result.businessName,
        businessEmail: result.businessEmail,
        phone: result.phone,
        defaultTaxPercent: result.defaultTaxPercent,
        invoicePaymentMethodNote: result.invoicePaymentMethodNote,
      });
    } catch (err: any) {
      showToastMsg(err.message || "Failed to create tenant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div style={{ maxWidth: 500, width: "100%", margin: "40px auto" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#1a73e8",
                margin: 0,
              }}
            >
              Create Your Business
            </h1>
            <p style={{ color: "#666", marginTop: 4 }}>
              Set up your company to get started
            </p>
          </div>

          <IonItem>
            <IonLabel position="stacked">Business Name *</IonLabel>
            <IonInput
              value={businessName}
              onIonInput={(e) => setBusinessName(e.detail.value!)}
              placeholder="Your Company Inc."
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Business Email *</IonLabel>
            <IonInput
              type="email"
              value={businessEmail}
              onIonInput={(e) => setBusinessEmail(e.detail.value!)}
              placeholder="billing@company.com"
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Phone</IonLabel>
            <IonInput
              type="tel"
              inputMode="numeric"
              value={formatPhone(phone)}
              onIonInput={(e) => {
                const digits = stripPhone(e.detail.value || "").slice(0, 10);
                setPhone(digits);
                // Force the cleaned value back into the input immediately
                if (e.target) {
                  (e.target as HTMLIonInputElement).value = formatPhone(digits);
                }
              }}
              placeholder="(555) 555-0100"
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Default Tax %</IonLabel>
            <IonInput
              type="number"
              value={defaultTaxPercent}
              onIonInput={(e) =>
                setDefaultTaxPercent(Number(e.detail.value) || 0)
              }
              placeholder="13"
            />
          </IonItem>

          <IonNote
            color="medium"
            style={{ display: "block", margin: "4px 16px 0", fontSize: 12 }}
          >
            Default tax rate used when creating invoices. Can be changed per
            invoice.
          </IonNote>

          <IonItem style={{ marginTop: 16 }}>
            <IonLabel position="stacked">
              Payment Instructions (shown on invoices)
            </IonLabel>
            <IonTextarea
              rows={4}
              value={invoicePaymentMethodNote}
              onIonInput={(e) => setInvoicePaymentMethodNote(e.detail.value!)}
              placeholder='e.g. "Please send e-transfers to billing@company.com"'
            />
          </IonItem>

          <IonButton
            expand="block"
            onClick={handleCreate}
            disabled={loading}
            style={{ marginTop: 20 }}
          >
            {loading ? <IonSpinner /> : "Create Business"}
          </IonButton>

          <IonButton
            expand="block"
            fill="outline"
            color="danger"
            onClick={logout}
            style={{ marginTop: 12 }}
          >
            Logout
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

export default CreateTenantPage;
