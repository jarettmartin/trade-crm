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
  IonSpinner,
  IonIcon,
} from "@ionic/react";
import { closeOutline, sparklesOutline, trashOutline } from "ionicons/icons";
import LineItemFields from "./LineItemFields";
import type { LineItemFieldName } from "./LineItemFields";
import { api, AiEstimatorUsage } from "../services/api";

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
  // Demo mode supplies one fixed, read-only prompt (api.getEstimatorDemoPrompt).
  const [demoPrompt, setDemoPrompt] = useState<string | null>(null);
  const [usage, setUsage] = useState<AiEstimatorUsage | null>(null);
  const [suggestions, setSuggestions] = useState<EditableSuggestion[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Reset and load the (demo-only) fixed prompt + remaining budget each time
  // the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    const prompt = api.getEstimatorDemoPrompt();
    setDemoPrompt(prompt);
    setDescription(prompt ?? "");
    setSuggestions([]);
    setMessage("");
    setError("");
    setLoading(false);
    setConfirming(false);
    api
      .fetchAiEstimatorUsage()
      .then(setUsage)
      .catch(() => setUsage(null));
  }, [isOpen]);

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
    field: LineItemFieldName,
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
            {demoPrompt
              ? "This demo runs one fixed example through the estimator"
              : "Describe the work and we'll suggest line items"}{" "}
            from your catalog{jobTitle ? ` for “${jobTitle}”` : ""}. Nothing is
            added until you confirm.
          </p>
        </IonText>

        <IonTextarea
          rows={4}
          value={description}
          onIonInput={(e) => setDescription(e.detail.value || "")}
          placeholder="e.g. Replace two outdoor light fixtures, inspect the existing wiring, and supply weatherproof fittings."
          className="control-bordered"
          maxlength={DESCRIPTION_MAX_LENGTH}
          counter
          readonly={Boolean(demoPrompt)}
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

            <div style={{ marginTop: "4px" }}>
              <LineItemFields
                values={{
                  type: s.type,
                  description: s.description,
                  quantity: s.quantity,
                  unitPrice: s.unitPrice,
                }}
                disabled={busy}
                onChange={(field, value) => updateField(s.key, field, value)}
                testIdPrefix="estimator"
              />
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
