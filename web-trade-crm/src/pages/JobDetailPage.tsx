import { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonText,
  IonToast,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonChip,
  IonActionSheet,
} from "@ionic/react";
import { trashOutline, downloadOutline, eyeOutline } from "ionicons/icons";
import { useParams, useHistory } from "react-router-dom";
import { api, JobDetailResult } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { formatInvoiceNumber } from "../services/format";
import { downloadPdf } from "../services/pdfCache";

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type LineItemType = "SERVICE" | "MATERIAL" | "FEE";

const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { user } = useAuth();
  const [job, setJob] = useState<JobDetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [statusRef, setStatusRef] = useState("");

  // Note input
  const [newNote, setNewNote] = useState("");

  // Line item add form
  const [liType, setLiType] = useState<LineItemType>("SERVICE");
  const [liDesc, setLiDesc] = useState("");
  const [liQty, setLiQty] = useState("");
  const [liPrice, setLiPrice] = useState("");

  // Tax
  const [taxPercent, setTaxPercent] = useState(0);

  // Invoice
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [statusSheetInvoice, setStatusSheetInvoice] = useState<string | null>(
    null,
  );

  // Toast
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastIsError, setToastIsError] = useState(false);

  const showToastMsg = (msg: string, isError = true) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setShowToast(true);
  };

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    setLoading(true);
    try {
      const data = await api.fetchJob(id);
      setJob(data);
      setStatus(data.status);
      setStatusRef(data.status);
      // Use latest invoice tax% if available, otherwise default from tenant
      const latestInv =
        data.invoices && data.invoices.length > 0 ? data.invoices[0] : null;
      const tax = latestInv
        ? Number(latestInv.taxPercent)
        : (user?.defaultTaxPercent ?? 0);
      setTaxPercent(Number(tax));
    } catch {
      showToastMsg("Failed to load job");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const prev = status;
    setStatus(newStatus);
    try {
      await api.updateJob(id, { status: newStatus });
      setStatusRef(newStatus);
    } catch (err) {
      setStatus(prev);
      showToastMsg(
        err instanceof Error ? err.message : "Failed to update status",
      );
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !user) return;
    const notePayload = { note: newNote.trim(), userId: user.id };
    try {
      const notes = job?.notes || [];
      // We send the full notes array with the new one appended
      await api.updateJob(id, {
        notes: [
          ...notes.map((n) => ({ note: n.note, userId: n.user.id })),
          notePayload,
        ],
      });
      setNewNote("");
      await loadJob();
    } catch (err) {
      showToastMsg(err instanceof Error ? err.message : "Failed to add note");
    }
  };

  const deleteLineItem = async (lineItemId: string) => {
    if (!job) return;
    const remaining = job.lineItems.filter((li) => li.id !== lineItemId);
    const lineItemsPayload = remaining.map((li) => ({
      type: li.type,
      description: li.description,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      lineTotal: Number(li.lineTotal),
      sortOrder: Number(li.sortOrder),
    }));
    try {
      await api.updateJob(id, { lineItems: lineItemsPayload });
      await loadJob();
    } catch (err) {
      showToastMsg(
        err instanceof Error ? err.message : "Failed to delete line item",
      );
    }
  };

  const addLineItem = async () => {
    if (!liDesc.trim() || !liQty || !liPrice || !job) return;
    const qty = parseFloat(liQty);
    const price = parseFloat(liPrice);
    if (isNaN(qty) || isNaN(price)) return;
    const lineTotal = qty * price;
    const newItem = {
      type: liType,
      description: liDesc.trim(),
      quantity: qty,
      unitPrice: price,
      lineTotal,
      sortOrder: job.lineItems.length,
    };
    try {
      const existing = job.lineItems.map((li) => ({
        type: li.type,
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        lineTotal: Number(li.lineTotal),
        sortOrder: Number(li.sortOrder),
      }));
      await api.updateJob(id, { lineItems: [...existing, newItem] });
      setLiDesc("");
      setLiQty("");
      setLiPrice("");
      await loadJob();
    } catch (err) {
      showToastMsg(
        err instanceof Error ? err.message : "Failed to add line item",
      );
    }
  };

  const lineItemsByType = (type: string) =>
    job?.lineItems.filter((li) => li.type === type) || [];

  const sumByType = (type: string) =>
    lineItemsByType(type).reduce((sum, li) => sum + Number(li.lineTotal), 0);

  const totalServices = sumByType("SERVICE");
  const totalMaterials = sumByType("MATERIAL");
  const totalFees = sumByType("FEE");
  const preTaxTotal = totalServices + totalMaterials + totalFees;
  const taxAmount = preTaxTotal * (taxPercent / 100);
  const grandTotal = preTaxTotal + taxAmount;

  const invoiceOutOfDate = (() => {
    if (!job || job.invoices.length === 0) return true;
    const latest = job.invoices[0];
    return (
      Number(latest.subtotal) !== preTaxTotal ||
      Number(latest.taxPercent) !== taxPercent ||
      Number(latest.taxAmount) !== taxAmount ||
      Number(latest.total) !== grandTotal
    );
  })();

  const handleCreateInvoice = async () => {
    if (!job) return;
    setCreatingInvoice(true);
    try {
      await api.createInvoice(job.id, {
        subtotal: preTaxTotal,
        taxPercent,
        taxAmount,
        total: grandTotal,
      });
      await loadJob();
    } catch (err) {
      showToastMsg(
        err instanceof Error ? err.message : "Failed to create invoice",
      );
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleInvoiceStatusChange = async (
    invoiceId: string,
    newStatus: string,
  ) => {
    // Optimistically update local state
    setJob((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        invoices: prev.invoices.map((inv) =>
          inv.id === invoiceId ? { ...inv, status: newStatus } : inv,
        ),
      };
    });
    try {
      await api.updateInvoiceStatus(invoiceId, newStatus);
    } catch (err) {
      // Revert on failure
      setJob((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          invoices: prev.invoices.map((inv) =>
            inv.id === invoiceId ? { ...inv, status: inv.status } : inv,
          ),
        };
      });
      showToastMsg(
        err instanceof Error ? err.message : "Failed to update invoice status",
      );
    }
  };

  const currency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n);

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/home" />
            </IonButtons>
            <IonTitle>Job Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ textAlign: "center", padding: "32px" }}>
            <IonSpinner />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!job) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/home" />
            </IonButtons>
            <IonTitle>Job Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonText color="danger">Job not found</IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Job Details</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* === SUMMARY === */}
        <IonText>
          <h2 style={{ marginTop: 0 }}>{job.title}</h2>
        </IonText>
        <IonText color="medium">
          <p style={{ margin: "2px 0" }}>
            Created:{" "}
            {new Date(job.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </IonText>
        <IonText color="medium">
          <p style={{ margin: "2px 0" }}>
            Customer: {job.customer.firstName} {job.customer.lastName}
            {job.customer.companyName ? ` — ${job.customer.companyName}` : ""}
          </p>
        </IonText>
        {job.customerAddress && job.customerAddress.addressLine1 && (
          <IonText color="medium">
            <p style={{ margin: "2px 0" }}>
              Location: {job.customerAddress.addressLine1}
              {job.customerAddress.city ? `, ${job.customerAddress.city}` : ""}
            </p>
          </IonText>
        )}
        {job.description && (
          <IonText>
            <p>{job.description}</p>
          </IonText>
        )}

        {/* === STATUS === */}
        <IonItem style={{ marginTop: "16px" }}>
          <IonLabel>Status</IonLabel>
          <IonSelect
            value={status}
            onIonChange={(e) => handleStatusChange(e.detail.value)}
            interface="popover"
          >
            {Object.entries(statusLabel).map(([val, label]) => (
              <IonSelectOption key={val} value={val}>
                {label}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        {/* === NOTES === */}
        <IonText>
          <h3 style={{ marginBottom: "8px" }}>Notes</h3>
        </IonText>

        {job.notes.length === 0 && (
          <IonText color="medium">
            <p>No notes yet.</p>
          </IonText>
        )}

        {job.notes.map((note) => (
          <div
            key={note.id}
            style={{
              padding: "8px 12px",
              marginBottom: "8px",
              borderLeft: "3px solid var(--ion-color-primary)",
              background: "var(--ion-color-light)",
              borderRadius: "4px",
            }}
          >
            <IonText>
              <p style={{ margin: "0 0 4px 0" }}>{note.note}</p>
            </IonText>
            <IonText color="medium">
              <small>
                {note.user.firstName} {note.user.lastName} —{" "}
                {new Date(note.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </small>
            </IonText>
          </div>
        ))}

        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <IonTextarea
            rows={2}
            value={newNote}
            onIonInput={(e) => setNewNote(e.detail.value || "")}
            placeholder="Add a note..."
            style={{ flex: 1 }}
          />
          <IonButton onClick={addNote} disabled={!newNote.trim()}>
            Add
          </IonButton>
        </div>

        {/* === LINE ITEMS === */}
        <IonText>
          <h3 style={{ marginTop: "24px", marginBottom: "8px" }}>Line Items</h3>
        </IonText>

        {(["SERVICE", "MATERIAL", "FEE"] as const).map((type) => {
          const items = lineItemsByType(type);
          const typeLabel = {
            SERVICE: "Services",
            MATERIAL: "Materials",
            FEE: "Fees",
          }[type];
          return (
            <div key={type} style={{ marginBottom: "16px" }}>
              <IonText>
                <strong>{typeLabel}</strong>
              </IonText>
              {items.length === 0 && (
                <IonText color="medium">
                  <p>No {typeLabel.toLowerCase()} yet.</p>
                </IonText>
              )}
              {items.map((li) => (
                <div
                  key={li.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: "1px solid var(--ion-color-light-shade)",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <IonText>
                      <p style={{ margin: 0 }}>
                        {li.description}
                        <IonText color="medium">
                          {" "}
                          (x{li.quantity} @ {currency(Number(li.unitPrice))})
                        </IonText>
                      </p>
                    </IonText>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <IonText>{currency(Number(li.lineTotal))}</IonText>
                    <IonButton
                      size="small"
                      fill="clear"
                      color="danger"
                      onClick={() => deleteLineItem(li.id)}
                    >
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* === ADD LINE ITEM FORM === */}
        <div
          style={{
            border: "1px solid var(--ion-color-light-shade)",
            borderRadius: "8px",
            padding: "12px",
            marginTop: "8px",
          }}
        >
          <IonText>
            <strong>Add Line Item</strong>
          </IonText>

          <IonItem style={{ "--padding-start": "0", marginTop: "8px" }}>
            <IonLabel>Type</IonLabel>
            <IonSelect
              value={liType}
              onIonChange={(e) => setLiType(e.detail.value)}
              interface="popover"
            >
              <IonSelectOption value="SERVICE">Service</IonSelectOption>
              <IonSelectOption value="MATERIAL">Material</IonSelectOption>
              <IonSelectOption value="FEE">Fee</IonSelectOption>
            </IonSelect>
          </IonItem>

          <IonItem style={{ "--padding-start": "0" }}>
            <IonLabel position="stacked">Description</IonLabel>
            <IonInput
              value={liDesc}
              onIonInput={(e) => setLiDesc(e.detail.value || "")}
            />
          </IonItem>

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <IonItem style={{ "--padding-start": "0", flex: 1 }}>
              <IonLabel position="stacked">Quantity</IonLabel>
              <IonInput
                type="number"
                value={liQty}
                onIonInput={(e) => setLiQty(e.detail.value || "")}
              />
            </IonItem>
            <IonItem style={{ "--padding-start": "0", flex: 1 }}>
              <IonLabel position="stacked">Unit Price</IonLabel>
              <IonInput
                type="number"
                value={liPrice}
                onIonInput={(e) => setLiPrice(e.detail.value || "")}
              />
            </IonItem>
          </div>

          <IonButton
            expand="block"
            onClick={addLineItem}
            disabled={!liDesc.trim() || !liQty || !liPrice}
            style={{ marginTop: "8px" }}
          >
            Add Line Item
          </IonButton>
        </div>

        {/* === COSTING SUMMARY === */}
        <IonText>
          <h3 style={{ marginTop: "24px", marginBottom: "8px" }}>Costing</h3>
        </IonText>

        <div
          style={{
            border: "1px solid var(--ion-color-light-shade)",
            borderRadius: "8px",
            padding: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
            }}
          >
            <IonText>Services (pre-tax)</IonText>
            <IonText>{currency(totalServices)}</IonText>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
            }}
          >
            <IonText>Materials (pre-tax)</IonText>
            <IonText>{currency(totalMaterials)}</IonText>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
            }}
          >
            <IonText>Fees (pre-tax)</IonText>
            <IonText>{currency(totalFees)}</IonText>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderTop: "1px solid var(--ion-color-light-shade)",
              marginTop: "4px",
            }}
          >
            <IonText>Subtotal (pre-tax)</IonText>
            <IonText>{currency(preTaxTotal)}</IonText>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "4px 0",
              marginTop: "4px",
            }}
          >
            <IonText>Tax %</IonText>
            <IonInput
              type="number"
              value={taxPercent}
              onIonInput={(e) => {
                const v = parseFloat(e.detail.value || "0");
                setTaxPercent(isNaN(v) ? 0 : v);
              }}
              style={{
                maxWidth: "100px",
                textAlign: "right",
                "--padding-top": "0",
                "--padding-bottom": "0",
                border: "1px solid var(--ion-color-light-shade)",
                borderRadius: "4px",
                "--padding-start": "8px",
                "--padding-end": "8px",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
            }}
          >
            <IonText>Tax Amount</IonText>
            <IonText>{currency(taxAmount)}</IonText>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderTop: "1px solid var(--ion-color-light-shade)",
              fontWeight: "bold",
            }}
          >
            <IonText>
              <strong>Total</strong>
            </IonText>
            <IonText>
              <strong>{currency(grandTotal)}</strong>
            </IonText>
          </div>
        </div>

        {/* === INVOICES === */}
        <IonText>
          <h3 style={{ marginTop: "24px", marginBottom: "8px" }}>Invoices</h3>
        </IonText>

        <IonButton
          expand="block"
          onClick={handleCreateInvoice}
          disabled={creatingInvoice || !invoiceOutOfDate}
          style={{ marginBottom: "12px" }}
        >
          {creatingInvoice ? <IonSpinner /> : "Create Invoice"}
        </IonButton>

        {job.invoices.length === 0 && (
          <IonText color="medium">
            <p>No invoices yet.</p>
          </IonText>
        )}

        {job.invoices.map((inv) => (
          <IonCard key={inv.id}>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: "16px 16px 0 16px",
                marginBottom: "4px",
              }}
            >
              <IonChip
                color={
                  inv.status === "DRAFT"
                    ? "medium"
                    : inv.status === "SUPERSEDED"
                      ? "warning"
                      : inv.status === "PAID"
                        ? "success"
                        : "primary"
                }
                onClick={() => setStatusSheetInvoice(inv.id)}
              >
                {inv.status}
              </IonChip>
            </div>
            <div style={{ padding: "0 16px 0 16px" }}>
              <IonText>
                <p style={{ margin: "0 0 2px 0", fontSize: "12px" }}>
                  INVOICE #
                </p>
              </IonText>
              <IonText>
                <h2 style={{ margin: "0 0 4px 0" }}>
                  {formatInvoiceNumber(inv.invoiceNumber)}
                </h2>
              </IonText>
              <IonText>
                <p style={{ margin: "0 0 2px 0", fontSize: "12px" }}>
                  {new Date(inv.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </IonText>
              <IonText>
                <p style={{ margin: 0, fontSize: "12px" }}>
                  VER: {inv.version}
                </p>
              </IonText>
            </div>
            <IonCardContent>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "2px 0",
                }}
              >
                <IonText>Subtotal</IonText>
                <IonText>{currency(Number(inv.subtotal))}</IonText>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "2px 0",
                }}
              >
                <IonText>Tax ({Number(inv.taxPercent)}%)</IonText>
                <IonText>{currency(Number(inv.taxAmount))}</IonText>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "2px 0",
                  fontWeight: "bold",
                  borderTop: "1px solid var(--ion-color-light-shade)",
                  marginTop: "4px",
                  paddingTop: "4px",
                }}
              >
                <IonText>
                  <strong>Total</strong>
                </IonText>
                <IonText>
                  <strong>{currency(Number(inv.total))}</strong>
                </IonText>
              </div>
              <div
                style={{
                  display: "flex",
                  borderTop: "1px solid var(--ion-color-light-shade)",
                  marginTop: "8px",
                  paddingTop: "8px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    justifyContent: "center",
                    borderRight: "1px solid var(--ion-color-light-shade)",
                  }}
                >
                  <IonButton
                    size="small"
                    fill="clear"
                    onClick={() =>
                      downloadPdf(inv.id, inv.invoiceNumber, user?.businessName)
                    }
                  >
                    <IonIcon icon={downloadOutline} slot="start" />
                    Download
                  </IonButton>
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <IonButton
                    size="small"
                    fill="clear"
                    routerLink={`/invoice-preview/${inv.id}`}
                  >
                    <IonIcon icon={eyeOutline} slot="start" />
                    Preview
                  </IonButton>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        ))}

        <IonActionSheet
          isOpen={statusSheetInvoice !== null}
          onDidDismiss={() => setStatusSheetInvoice(null)}
          header="Change Status"
          buttons={[
            {
              text: "Draft",
              handler: () => {
                if (statusSheetInvoice) {
                  handleInvoiceStatusChange(statusSheetInvoice, "DRAFT");
                }
              },
            },
            {
              text: "Issued",
              handler: () => {
                if (statusSheetInvoice) {
                  handleInvoiceStatusChange(statusSheetInvoice, "ISSUED");
                }
              },
            },
            {
              text: "Paid",
              handler: () => {
                if (statusSheetInvoice) {
                  handleInvoiceStatusChange(statusSheetInvoice, "PAID");
                }
              },
            },
            {
              text: "Void",
              role: "destructive",
              handler: () => {
                if (statusSheetInvoice) {
                  handleInvoiceStatusChange(statusSheetInvoice, "VOID");
                }
              },
            },
            {
              text: "Cancel",
              role: "cancel",
            },
          ]}
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

export default JobDetailPage;
