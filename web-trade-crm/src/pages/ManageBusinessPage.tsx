import React, { useState, useRef, useCallback } from "react";
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonText,
  IonSpinner,
  IonNote,
  IonToast,
} from "@ionic/react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";

const ManageBusinessPage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const makeSnapshot = useCallback(
    () => ({
      businessName: user?.businessName ?? "",
      businessEmail: user?.businessEmail ?? "",
      phone: user?.phone ?? "",
      defaultTaxPercent: Number(user?.defaultTaxPercent ?? 0),
      invoicePaymentMethodNote: user?.invoicePaymentMethodNote ?? "",
    }),
    [user],
  );

  const initialRef = useRef(makeSnapshot());

  const [businessName, setBusinessName] = useState(
    initialRef.current.businessName,
  );
  const [businessEmail, setBusinessEmail] = useState(
    initialRef.current.businessEmail,
  );
  const [phone, setPhone] = useState(initialRef.current.phone);
  const [defaultTaxPercent, setDefaultTaxPercent] = useState<number>(
    Number(initialRef.current.defaultTaxPercent),
  );
  const [invoicePaymentMethodNote, setInvoicePaymentMethodNote] = useState(
    initialRef.current.invoicePaymentMethodNote,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);

  const hasChanges =
    businessName !== initialRef.current.businessName ||
    businessEmail !== initialRef.current.businessEmail ||
    phone !== initialRef.current.phone ||
    defaultTaxPercent !== initialRef.current.defaultTaxPercent ||
    invoicePaymentMethodNote !== initialRef.current.invoicePaymentMethodNote;

  const handleSave = async () => {
    if (!user?.tenantId) return;
    setSaving(true);
    setError("");
    try {
      const result = await api.updateTenant(user.tenantId, {
        businessName: businessName || undefined,
        businessEmail: businessEmail || undefined,
        phone: phone || undefined,
        defaultTaxPercent:
          defaultTaxPercent !== undefined ? defaultTaxPercent : undefined,
        invoicePaymentMethodNote: invoicePaymentMethodNote || undefined,
      });
      updateUser({
        businessName: result.businessName,
        businessEmail: result.businessEmail,
        phone: result.phone,
        defaultTaxPercent: result.defaultTaxPercent,
        invoicePaymentMethodNote: result.invoicePaymentMethodNote,
      });
      // Reset baseline so save button disables again
      initialRef.current = {
        businessName: result.businessName ?? "",
        businessEmail: result.businessEmail ?? "",
        phone: result.phone ?? "",
        defaultTaxPercent: result.defaultTaxPercent ?? 0,
        invoicePaymentMethodNote: result.invoicePaymentMethodNote ?? "",
      };
      setShowToast(true);
    } catch (err: any) {
      setError(err.message || "Failed to update business");
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
          <IonTitle>Manage Business</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div style={{ maxWidth: 500, width: "100%", margin: "20px auto" }}>
          <IonItem>
            <IonLabel position="stacked">Business Name</IonLabel>
            <IonInput
              value={businessName}
              onIonInput={(e) => setBusinessName(e.detail.value!)}
              placeholder="Your Company Inc."
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Business Email</IonLabel>
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
              value={phone}
              onIonInput={(e) => setPhone(e.detail.value!)}
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

          {error && (
            <IonText color="danger">
              <p style={{ fontSize: 13, margin: "12px 0 0" }}>{error}</p>
            </IonText>
          )}

          <IonButton
            expand="block"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            style={{ marginTop: 20 }}
          >
            {saving ? <IonSpinner /> : "Save Changes"}
          </IonButton>
        </div>

        <IonToast
          isOpen={showToast}
          message="Business details updated successfully"
          duration={5000}
          onDidDismiss={() => setShowToast(false)}
          color="success"
        />
      </IonContent>
    </IonPage>
  );
};

export default ManageBusinessPage;
