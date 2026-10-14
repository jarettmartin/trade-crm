import { useEffect, useState } from "react";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonTextarea,
  IonText,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonIcon,
} from "@ionic/react";
import { closeOutline, sparklesOutline, trashOutline } from "ionicons/icons";
import {
  api,
  AiEstimatorExample,
  AiEstimatorUsage,
} from "../services/api";

const LINE_ITEM_TYPES = ["SERVICE", "MATERIAL", "FEE"] as const;
const DESCRIPTION_MAX_LENGTH = 1000;

/** A suggestion while it is being edited in the modal (numbers kept as text). */
interface EditableSuggestion {
  key: string;
  catalogItemId: string;
  type: string;
  description: string;
  unitPrice: string;
  quantity: string;
  matchReason?: string;
}

export interface EstimatorLineItemDraft {
  catalogItemId: string;
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface ServiceEstimatorModalProps {
  isOpen: boolean;
  /** Job the confirmed line items will be added to. */
  jobTitle?: string;
  onDismiss: () => void;
  /**
   * Called only when the user explicitly confirms. The parent performs the
   * writes (through the existing job line-item endpoint) and reloads the job.
   */
  onConfirm: (items: EstimatorLineItemDraft[]) => Promise<void>;
}

let nextKey = 0;

const currency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const parseNumber = (value: string): number => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : Number.NaN;
};

/**
 * "AI service estimator" modal.
 *
 * Suggests catalog line items from a plain-language description. It only
 * *suggests*: the user can edit every field or remove a suggestion, and nothing
 * is written until they press "Add line items" — cancel saves nothing.
 */
const ServiceEstimatorModal: React.FC<ServiceEstimatorModalProps> = ({
  isOpen,
  jobTitle,
  onDismiss,
  onConfirm,
}) => {
  const [description, setDescription] = useState("");
  const [examples, setExamples] = useState<AiEstimatorExample[]>([]);
  const [usage, setUsage] = useState<AiEstimatorUsage | null>(null);
  const [suggestions, setSuggestions] = useState<EditableSuggestion[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Reset and load the (demo-only) example prompts + remaining budget each
  // time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setDescription("");
    setSuggestions([]);
    setMessage("");
    setError("");
    setLoading(false);
    setConfirming(false);
    setExamples(api.getEstimatorExamples());
    api
      .fetchAiEstimatorUsage()
      .then(setUsage)
      .catch(() => setUsage(null));
  }, [isOpen]);

  const applyExample = (example: AiEstimatorExample) => {
    setDescription(example.description);
    setSuggestions([]);
    setMessage("");
    setError("");
  };

  const submit = async () => {
    if (!description.trim() || loading) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.estimateCatalogMatches(description.trim());
      setSuggestions(
        res.suggestions.map((s) => ({
          key: `s-${nextKey++}`,
          catalogItemId: s.catalogItemId,
          type: s.type,
          description: s.description,
          unitPrice: String(s.unitPrice),
          quantity: String(s.quantity),
          matchReason: s.matchReason,
        })),
      );
      setMessage(res.message ?? "");
      setUsage(res.usage);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to get suggestions",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (
    key: string,
    field: "type" | "description" | "unitPrice" | "quantity",
    value: string,
  ) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)),
    );
  };

  const removeSuggestion = (key: string) => {
    setSuggestions((prev) => prev.filter((s) => s.key !== key));
  };

  const isValid = (s: EditableSuggestion) =>
    s.description.trim().length > 0 &&
    parseNumber(s.quantity) > 0 &&
    parseNumber(s.unitPrice) >= 0;

  const confirm = async () => {
    const items = suggestions.filter(isValid);
    if (items.length === 0 || confirming) return;
    setConfirming(true);
    try {
      await onConfirm(
        items.map((s) => {
          const quantity = parseNumber(s.quantity);
          const unitPrice = parseNumber(s.unitPrice);
          return {
            catalogItemId: s.catalogItemId,
            type: s.type,
            description: s.description.trim(),
            quantity,
            unitPrice,
            lineTotal: quantity * unitPrice,
          };
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add line items",
      );
    } finally {
      setConfirming(false);
    }
  };

  const validCount = suggestions.filter(isValid).length;
  const busy = loading || confirming;

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>AI service estimator</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={onDismiss}
              disabled={busy}
              data-testid="estimator-cancel-top"
            >
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="capped-container">{renderBody()}</div>
      </IonContent>
    </IonModal>
  );

  function renderBody() {
    return (
      <>
        <IonText color="medium">
          <p style={{ marginTop: 0 }}>
            Describe the work and we&rsquo;ll suggest line items from your
            catalog{jobTitle ? ` for “${jobTitle}”` : ""}. Nothing is added until
            you confirm.
          </p>
        </IonText>

        {examples.length > 0 && (
          <div style={{ marginBottom: "12px" }}>
            <IonText color="medium">
              <small>Try an example:</small>
            </IonText>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginTop: "6px",
              }}
            >
              {examples.map((example) => (
                <IonButton
                  key={example.label}
                  size="small"
                  fill="outline"
                  disabled={busy}
                  onClick={() => applyExample(example)}
                >
                  {example.label}
                </IonButton>
              ))}
            </div>
          </div>
        )}

        <IonTextarea
          rows={4}
          value={description}
          onIonInput={(e) => setDescription(e.detail.value || "")}
          placeholder="e.g. Replace two outdoor light fixtures, inspect the existing wiring, and supply weatherproof fittings."
          className="control-bordered"
          maxlength={DESCRIPTION_MAX_LENGTH}
          counter
          disabled={busy}
        />

        <IonButton
          expand="block"
          onClick={submit}
          disabled={!description.trim() || busy}
          style={{ marginTop: "8px" }}
          data-testid="estimator-submit"
        >
          {loading ? (
            <IonSpinner name="dots" />
          ) : (
            <>
              <IonIcon slot="start" icon={sparklesOutline} />
              Suggest line items
            </>
          )}
        </IonButton>

        {usage && (
          <IonText color={usage.remaining > 0 ? "medium" : "danger"}>
            <p style={{ textAlign: "center", margin: "8px 0 0" }}>
              {usage.remaining} of {usage.limit} AI requests remaining this hour
            </p>
          </IonText>
        )}

        {error && (
          <IonText color="danger">
            <p data-testid="estimator-error">{error}</p>
          </IonText>
        )}

        {message && !error && (
          <IonText color="medium">
            <p data-testid="estimator-message">{message}</p>
          </IonText>
        )}

        {renderSuggestions()}
      </>
    );
  }

  function renderSuggestions() {
    if (suggestions.length === 0) return null;

    return (
      <div style={{ marginTop: "16px" }}>
        <IonText>
          <h3 style={{ marginBottom: "4px" }}>Suggested line items</h3>
        </IonText>
        <IonText color="medium">
          <p style={{ marginTop: 0, fontSize: "13px" }}>
            Edit or remove anything before confirming.
          </p>
        </IonText>

        {suggestions.map((s) => (
          <div
            key={s.key}
            className="form-card"
            data-testid="estimator-suggestion"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <IonText color="medium">
                <small>{s.matchReason ? s.matchReason : "Catalog match"}</small>
              </IonText>
              <IonButton
                size="small"
                fill="clear"
                color="danger"
                disabled={busy}
                onClick={() => removeSuggestion(s.key)}
                data-testid="estimator-remove"
              >
                <IonIcon slot="icon-only" icon={trashOutline} />
              </IonButton>
            </div>

            <IonItem style={{ "--padding-start": "0" }} lines="none">
              <IonLabel position="stacked">Type</IonLabel>
              <IonSelect
                value={s.type}
                interface="popover"
                disabled={busy}
                onIonChange={(e) =>
                  updateField(s.key, "type", String(e.detail.value))
                }
              >
                {LINE_ITEM_TYPES.map((type) => (
                  <IonSelectOption key={type} value={type}>
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            <IonItem style={{ "--padding-start": "0" }} lines="none">
              <IonLabel position="stacked">Description</IonLabel>
              <IonInput
                value={s.description}
                disabled={busy}
                onIonInput={(e) =>
                  updateField(s.key, "description", e.detail.value || "")
                }
              />
            </IonItem>

            <div style={{ display: "flex", gap: "8px" }}>
              <IonItem style={{ "--padding-start": "0", flex: 1 }} lines="none">
                <IonLabel position="stacked">Quantity</IonLabel>
                <IonInput
                  type="number"
                  value={s.quantity}
                  disabled={busy}
                  onIonInput={(e) =>
                    updateField(s.key, "quantity", e.detail.value || "")
                  }
                />
              </IonItem>
              <IonItem style={{ "--padding-start": "0", flex: 1 }} lines="none">
                <IonLabel position="stacked">Unit price</IonLabel>
                <IonInput
                  type="number"
                  value={s.unitPrice}
                  disabled={busy}
                  onIonInput={(e) =>
                    updateField(s.key, "unitPrice", e.detail.value || "")
                  }
                />
              </IonItem>
            </div>

            <IonText color="medium">
              <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
                Line total:{" "}
                {currency(
                  (parseNumber(s.quantity) || 0) *
                    (parseNumber(s.unitPrice) || 0),
                )}
              </p>
            </IonText>
          </div>
        ))}

        <IonButton
          expand="block"
          color="success"
          onClick={confirm}
          disabled={validCount === 0 || busy}
          data-testid="estimator-confirm"
        >
          {confirming ? (
            <IonSpinner name="dots" />
          ) : (
            `Add ${validCount} line item${validCount === 1 ? "" : "s"}`
          )}
        </IonButton>

        <IonButton
          expand="block"
          fill="clear"
          disabled={busy}
          onClick={onDismiss}
          data-testid="estimator-cancel"
        >
          Cancel
        </IonButton>
      </div>
    );
  }
};

export default ServiceEstimatorModal;
