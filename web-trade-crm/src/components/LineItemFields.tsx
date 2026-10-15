import {
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";

/** The editable values of one line item, as strings (inputs are text). */
export interface LineItemFieldValues {
  type: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export type LineItemFieldName = keyof LineItemFieldValues;

interface LineItemFieldsProps {
  values: LineItemFieldValues;
  onChange: (field: LineItemFieldName, value: string) => void;
  disabled?: boolean;
  /** Prefix for `data-testid` hooks, e.g. "estimator" → "estimator-type". */
  testIdPrefix?: string;
}

const TYPE_OPTIONS = [
  { value: "SERVICE", label: "Service" },
  { value: "MATERIAL", label: "Material" },
  { value: "FEE", label: "Fee" },
] as const;

/**
 * The Type / Description / Quantity / Unit price field set.
 *
 * Shared by the manual "Add Line Item" form (JobDetailPage) and each AI
 * estimator suggestion card (ServiceEstimatorModal) so both render identically:
 * every field is its own row with a stacked label and a bottom hairline, and
 * Quantity + Unit price share a row split by a vertical rule. Styling lives in
 * `.line-item-fields` (src/theme/variables.css). Controlled — the caller owns
 * the state, so the same component works for a form or a repeatable list.
 */
const LineItemFields: React.FC<LineItemFieldsProps> = ({
  values,
  onChange,
  disabled = false,
  testIdPrefix,
}) => {
  const testId = (field: LineItemFieldName) =>
    testIdPrefix ? `${testIdPrefix}-${field}` : undefined;

  return (
    <div className="line-item-fields">
      <IonItem>
        <IonLabel position="stacked">Type</IonLabel>
        <IonSelect
          value={values.type}
          interface="popover"
          disabled={disabled}
          data-testid={testId("type")}
          onIonChange={(e) => onChange("type", String(e.detail.value))}
        >
          {TYPE_OPTIONS.map((option) => (
            <IonSelectOption key={option.value} value={option.value}>
              {option.label}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>

      <IonItem>
        <IonLabel position="stacked">Description</IonLabel>
        <IonInput
          value={values.description}
          disabled={disabled}
          data-testid={testId("description")}
          onIonInput={(e) => onChange("description", e.detail.value || "")}
        />
      </IonItem>

      <div className="line-item-fields__row">
        <IonItem>
          <IonLabel position="stacked">Quantity</IonLabel>
          <IonInput
            type="number"
            inputMode="decimal"
            value={values.quantity}
            disabled={disabled}
            data-testid={testId("quantity")}
            onIonInput={(e) => onChange("quantity", e.detail.value || "")}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Unit price</IonLabel>
          <IonInput
            type="number"
            inputMode="decimal"
            value={values.unitPrice}
            disabled={disabled}
            data-testid={testId("unitPrice")}
            onIonInput={(e) => onChange("unitPrice", e.detail.value || "")}
          />
        </IonItem>
      </div>
    </div>
  );
};

export default LineItemFields;
