import { useState, useEffect } from "react";
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
  IonToast,
} from "@ionic/react";
import { addOutline, removeOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { api, CreateCustomerPayload } from "../services/api";
import {
  isValidEmail,
  isValidPhone,
  detectCountryFromPostalCode,
  validatePostalCode,
} from "../services/validation";
import { formatPhone, stripPhone } from "../services/format";

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
  useEffect(() => {
    document.title = "Sprout CRM - Create Customer";
  }, []);

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
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastIsError, setToastIsError] = useState(false);

  const addAddress = () => {
    setAddresses([...addresses, emptyAddress()]);
  };

  const handleZipChange = (index: number, value: string) => {
    const updated = [...addresses];
    updated[index] = { ...updated[index], zipPostalCode: value };
    const detected = detectCountryFromPostalCode(value);
    if (detected) {
      updated[index] = { ...updated[index], countryCode: detected };
    }
    setAddresses(updated);
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

  const showToastMsg = (msg: string, isError = true) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setShowToast(true);
  };

  const handleSave = async () => {
    for (const addr of addresses) {
      if (addr.zipPostalCode.trim()) {
        const err = validatePostalCode(addr.zipPostalCode);
        if (err) {
          showToastMsg(err);
          return;
        }
      }
    }

    if (!firstName.trim()) {
      showToastMsg("First name is required");
      return;
    }
    if (!lastName.trim()) {
      showToastMsg("Last name is required");
      return;
    }
    if (!phone.trim()) {
      showToastMsg("Phone is required");
      return;
    }
    if (!isValidPhone(phone)) {
      showToastMsg("Please enter a valid 10-digit phone number");
      return;
    }
    if (email.trim() && !isValidEmail(email.trim())) {
      showToastMsg("Please enter a valid email address");
      return;
    }

    const validAddresses = addresses.filter(
      (a) =>
        a.addressLine1.trim().length > 0 &&
        a.city.trim().length > 0 &&
        a.stateProvince.trim().length > 0 &&
        a.zipPostalCode.trim().length > 0,
    );
    if (validAddresses.length === 0) {
      showToastMsg(
        "At least one address must have Address Line 1, City, State/Province, and ZIP/Postal Code filled in",
      );
      return;
    }

    const payload: CreateCustomerPayload = {
      type,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      companyName: companyName.trim() || undefined,
      phone: stripPhone(phone),
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
      setToastMessage("Customer created successfully");
      setShowToast(true);
    } catch (err) {
      showToastMsg(
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
        <div className="page-container">
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
              inputMode="numeric"
              value={formatPhone(phone)}
              onIonInput={(e) => {
                const digits = stripPhone(e.detail.value || "").slice(0, 10);
                setPhone(digits);
                if (e.target) {
                  (e.target as HTMLIonInputElement).value = formatPhone(digits);
                }
              }}
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
                    handleZipChange(index, e.detail.value || "")
                  }
                  placeholder="e.g. 12345 or A1A 1A1"
                />
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
                !isValidPhone(phone) ||
                (email.trim().length > 0 && !isValidEmail(email.trim())) ||
                addresses.filter(
                  (a) =>
                    a.addressLine1.trim().length > 0 &&
                    a.city.trim().length > 0 &&
                    a.stateProvince.trim().length > 0 &&
                    a.zipPostalCode.trim().length > 0,
                ).length === 0
              }
            >
              {saving ? <IonSpinner /> : "Save Customer"}
            </IonButton>
          </div>
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

export default CreateCustomerPage;
