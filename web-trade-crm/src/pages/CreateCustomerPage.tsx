import { useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonIcon,
  IonSpinner,
} from "@ionic/react";
import { addOutline, removeOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { api, CreateCustomerPayload } from "../services/api";
import { isValidEmail, isValidPhone } from "../services/validation";

interface AddressForm {
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  countryCode: string;
}

const emptyAddress = (): AddressForm => ({
  label: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateProvince: "",
  zipPostalCode: "",
  countryCode: "US",
});

const CreateCustomerPage: React.FC = () => {
  const history = useHistory();
  const [type, setType] = useState<string>("PERSON");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [addresses, setAddresses] = useState<AddressForm[]>([emptyAddress()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addAddress = () => {
    setAddresses([...addresses, emptyAddress()]);
  };

  const removeAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const updateAddress = (
    index: number,
    field: keyof AddressForm,
    value: string,
  ) => {
    const updated = [...addresses];
    updated[index] = { ...updated[index], [field]: value };
    setAddresses(updated);
  };

  const handleSave = async () => {
    setError("");

    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }
    if (!lastName.trim()) {
      setError("Last name is required");
      return;
    }
    if (!phone.trim()) {
      setError("Phone is required");
      return;
    }
    if (!isValidPhone(phone.trim())) {
      setError("Please enter a valid phone number");
      return;
    }
    if (email.trim() && !isValidEmail(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    const validAddresses = addresses.filter(
      (a) => a.addressLine1.trim().length > 0,
    );
    if (validAddresses.length === 0) {
      setError("At least one address is required");
      return;
    }

    const payload: CreateCustomerPayload = {
      type,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      companyName: companyName.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      addresses: validAddresses.map((a) => ({
        label: a.label.trim() || "Main",
        addressLine1: a.addressLine1.trim(),
        addressLine2: a.addressLine2.trim() || undefined,
        city: a.city.trim(),
        stateProvince: a.stateProvince.trim(),
        zipPostalCode: a.zipPostalCode.trim(),
        countryCode: a.countryCode.trim().toUpperCase(),
        isDefault: true,
      })),
    };

    setSaving(true);
    try {
      await api.createCustomer(payload);
      history.goBack();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create customer",
      );
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
          <IonTitle>New Customer</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {error && (
          <IonText color="danger">
            <p style={{ marginBottom: "16px" }}>{error}</p>
          </IonText>
        )}

        <IonSegment
          value={type}
          onIonChange={(e) => setType((e.detail.value as string) || "PERSON")}
        >
          <IonSegmentButton value="PERSON">
            <IonLabel>Person</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="BUSINESS">
            <IonLabel>Business</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        <IonItem>
          <IonLabel position="stacked">
            First Name <IonText color="danger">*</IonText>
          </IonLabel>
          <IonInput
            value={firstName}
            onIonInput={(e) => setFirstName(e.detail.value || "")}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">
            Last Name <IonText color="danger">*</IonText>
          </IonLabel>
          <IonInput
            value={lastName}
            onIonInput={(e) => setLastName(e.detail.value || "")}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Company Name</IonLabel>
          <IonInput
            value={companyName}
            onIonInput={(e) => setCompanyName(e.detail.value || "")}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">
            Phone <IonText color="danger">*</IonText>
          </IonLabel>
          <IonInput
            type="tel"
            value={phone}
            onIonInput={(e) => setPhone(e.detail.value || "")}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Email</IonLabel>
          <IonInput
            type="email"
            value={email}
            onIonInput={(e) => setEmail(e.detail.value || "")}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Notes</IonLabel>
          <IonTextarea
            rows={3}
            value={notes}
            onIonInput={(e) => setNotes(e.detail.value || "")}
          />
        </IonItem>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
            marginBottom: "12px",
          }}
        >
          <IonText>
            <strong>Addresses</strong>
          </IonText>
          <IonButton size="small" fill="outline" onClick={addAddress}>
            <IonIcon slot="start" icon={addOutline} />
            Add Address
          </IonButton>
        </div>

        {addresses.map((addr, index) => (
          <div
            key={index}
            style={{
              border: "1px solid var(--ion-color-light-shade)",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "12px",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <IonText color="medium">
                <small>Address {index + 1}</small>
              </IonText>
              <IonButton
                size="small"
                fill="clear"
                color="danger"
                onClick={() => removeAddress(index)}
              >
                <IonIcon icon={removeOutline} />
              </IonButton>
            </div>

            <IonItem>
              <IonLabel position="stacked">Label</IonLabel>
              <IonInput
                value={addr.label}
                onIonInput={(e) =>
                  updateAddress(index, "label", e.detail.value || "")
                }
                placeholder="e.g. Main, Warehouse"
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Address Line 1</IonLabel>
              <IonInput
                value={addr.addressLine1}
                onIonInput={(e) =>
                  updateAddress(index, "addressLine1", e.detail.value || "")
                }
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Address Line 2</IonLabel>
              <IonInput
                value={addr.addressLine2}
                onIonInput={(e) =>
                  updateAddress(index, "addressLine2", e.detail.value || "")
                }
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">City</IonLabel>
              <IonInput
                value={addr.city}
                onIonInput={(e) =>
                  updateAddress(index, "city", e.detail.value || "")
                }
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">State / Province</IonLabel>
              <IonInput
                value={addr.stateProvince}
                onIonInput={(e) =>
                  updateAddress(index, "stateProvince", e.detail.value || "")
                }
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">ZIP / Postal Code</IonLabel>
              <IonInput
                value={addr.zipPostalCode}
                onIonInput={(e) =>
                  updateAddress(index, "zipPostalCode", e.detail.value || "")
                }
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Country Code</IonLabel>
              <IonSelect
                value={addr.countryCode}
                onIonChange={(e) =>
                  updateAddress(index, "countryCode", e.detail.value)
                }
              >
                <IonSelectOption value="US">US</IonSelectOption>
                <IonSelectOption value="CA">CA</IonSelectOption>
              </IonSelect>
            </IonItem>
          </div>
        ))}

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
            disabled={
              saving ||
              !firstName.trim() ||
              !lastName.trim() ||
              !phone.trim() ||
              !isValidPhone(phone.trim()) ||
              (email.trim().length > 0 && !isValidEmail(email.trim())) ||
              addresses.filter((a) => a.addressLine1.trim().length > 0)
                .length === 0
            }
          >
            {saving ? <IonSpinner /> : "Save Customer"}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CreateCustomerPage;
