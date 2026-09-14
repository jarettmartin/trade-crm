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
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonToast,
  IonAlert,
} from "@ionic/react";
import { useHistory, useParams } from "react-router-dom";
import { api, CatalogItemResult } from "../services/api";

type CatalogFormMode = "create" | "edit";

const CATALOG_TYPES = ["SERVICE", "MATERIAL", "FEE"] as const;

const typeLabel: Record<string, string> = {
  SERVICE: "Service",
  MATERIAL: "Material",
  FEE: "Fee",
};

const CatalogItemFormPage: React.FC = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const history = useHistory();
  const mode: CatalogFormMode = routeId ? "edit" : "create";
  // Param-routes caveat: useParams can be empty after client-side navigation,
  // so fall back to the current path (same pattern as JobDetailPage).
  const itemId =
    routeId ||
    (window.location.pathname.startsWith("/edit-catalog-item/")
      ? window.location.pathname.split("/").pop() || ""
      : "");

  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("SERVICE");
  const [unitPrice, setUnitPrice] = useState("");
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastIsError, setToastIsError] = useState(false);

  useEffect(() => {
    document.title = `Sprout CRM - ${
      mode === "edit" ? "Edit" : "New"
    } Catalog Item`;
  }, [mode]);

  const showToastMsg = (msg: string, isError = true) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setShowToast(true);
  };

  useEffect(() => {
    if (mode !== "edit" || !itemId) return;
    let active = true;
    (async () => {
      try {
        const item: CatalogItemResult = await api.fetchCatalogItem(itemId);
        if (!active) return;
        setDescription(item.description);
        setType(item.type);
        setUnitPrice(String(item.unitPrice));
      } catch {
        if (active) showToastMsg("Failed to load catalog item");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
     
  }, [mode, itemId]);

  const parsedPrice = parseFloat(unitPrice);
  const isValid =
    description.trim().length > 0 &&
    unitPrice.trim().length > 0 &&
    !isNaN(parsedPrice) &&
    parsedPrice >= 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      const payload = {
        type,
        description: description.trim(),
        unitPrice: parsedPrice,
      };
      if (mode === "edit") {
        await api.updateCatalogItem(itemId, payload);
      } else {
        await api.createCatalogItem(payload);
      }
      history.goBack();
    } catch (err) {
      showToastMsg(
        err instanceof Error ? err.message : "Failed to save catalog item",
      );
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await api.deleteCatalogItem(itemId);
      history.goBack();
    } catch (err) {
      showToastMsg(
        err instanceof Error ? err.message : "Failed to delete catalog item",
      );
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/manage-catalog" />
            </IonButtons>
            <IonTitle>Edit Catalog Item</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <IonSpinner />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/manage-catalog" />
          </IonButtons>
          <IonTitle>
            {mode === "edit" ? "Edit Catalog Item" : "New Catalog Item"}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: "16px" }}>
          <IonItem>
            <IonLabel position="stacked">
              Description <IonText color="danger">*</IonText>
            </IonLabel>
            <IonTextarea
              rows={3}
              value={description}
              onIonInput={(e) => setDescription(e.detail.value || "")}
              placeholder="e.g. Tree pruning"
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">
              Type <IonText color="danger">*</IonText>
            </IonLabel>
            <IonSelect
              value={type}
              onIonChange={(e) => setType(e.detail.value)}
              interface="popover"
            >
              {CATALOG_TYPES.map((t) => (
                <IonSelectOption key={t} value={t}>
                  {typeLabel[t]}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">
              Unit Price <IonText color="danger">*</IonText>
            </IonLabel>
            <IonInput
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onIonInput={(e) => setUnitPrice(e.detail.value || "")}
              placeholder="0.00"
            />
          </IonItem>

          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "16px",
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
              disabled={saving || deleting || !isValid}
            >
              {saving ? (
                <IonSpinner />
              ) : mode === "edit" ? (
                "Save Changes"
              ) : (
                "Save"
              )}
            </IonButton>
          </div>

          {mode === "edit" && (
            <IonButton
              expand="block"
              fill="outline"
              color="danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              style={{ marginTop: "12px" }}
            >
              {deleting ? <IonSpinner /> : "Delete Catalog Item"}
            </IonButton>
          )}
        </div>

        <IonAlert
          isOpen={showDeleteConfirm}
          header="Delete catalog item?"
          message={
            "Existing line items keep their details — only the reference to " +
            "this catalog item is removed."
          }
          buttons={[
            { text: "Cancel", role: "cancel" },
            { text: "Delete", role: "destructive", handler: handleDelete },
          ]}
          onDidDismiss={() => setShowDeleteConfirm(false)}
        />

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

export default CatalogItemFormPage;