import { useState, useEffect, useRef, useCallback } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonSpinner,
  IonText,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonItem,
  IonLabel,
  IonIcon,
  IonToast,
} from "@ionic/react";
import { addOutline, removeOutline } from "ionicons/icons";
import { api, CustomerResult } from "../services/api";
import CustomerSearch from "../components/CustomerSearch";
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

const ManageCustomersPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM - Manage Customers";
  }, []);

  const [customer, setCustomer] = useState<CustomerResult | null>(null);
  const [type, setType] = useState<string>("PERSON");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [addresses, setAddresses] = useState<AddressForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastIsError, setToastIsError] = useState(false);
  const baselineRef = useRef<string>("");

  const showToastMsg = (msg: string, isError = true) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setShowToast(true);
  };

  const makeSnapshot = useCallback(() => {
    return JSON.stringify({
      type,
      firstName,
      lastName,
      companyName,
      phone,
      email,
      notes,
      addresses,
    });
  }, [type, firstName, lastName, companyName, phone, email, notes, addresses]);

  const hasChanges =
    customer !== null && makeSnapshot() !== baselineRef.current;

  const setBaseline = () => {
    baselineRef.current = makeSnapshot();
  };

  const handleSelectCustomer = async (selected: CustomerResult) => {
    // Fetch full customer with addresses
    try {
      const full = await api.fetchCustomer(selected.id);
      const addrs = (full.addresses || []).map((a) => ({
        label: "",
        addressLine1: a.addressLine1,
        addressLine2: a.addressLine2 || "",
        city: a.city,
        stateProvince: a.stateProvince,
        zipPostalCode: a.zipPostalCode,
        countryCode: "US",
      }));
      // Set baseline from the data we're about to load
      baselineRef.current = JSON.stringify({
        type: full.type,
        firstName: full.firstName,
        lastName: full.lastName,
        companyName: full.companyName || "",
        phone: full.phone,
        email: full.email || "",
        notes: full.notes || "",
        addresses: addrs,
      });
      setCustomer(full);
      setType(full.type);
      setFirstName(full.firstName);
      setLastName(full.lastName);
      setCompanyName(full.companyName || "");
      setPhone(full.phone);
      setEmail(full.email || "");
      setNotes(full.notes || "");
      setAddresses(addrs);
    } catch {
      showToastMsg("Failed to load customer details");
    }
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
    if (!customer) return;
    setSaving(true);
    try {
      // Validate postal codes
      for (const addr of addresses) {
        if (addr.zipPostalCode.trim()) {
          const err = validatePostalCode(addr.zipPostalCode);
          if (err) {
            showToastMsg(err);
            setSaving(false);
            return;
          }
        }
      }
      if (email.trim() && !isValidEmail(email.trim())) {
        showToastMsg("Please enter a valid email address");
        setSaving(false);
        return;
      }
      if (phone.trim() && !isValidPhone(phone.trim())) {
        showToastMsg("Please enter a valid phone number");
        setSaving(false);
        return;
      }
      const validAddresses = addresses.filter(
        (a) => a.addressLine1.trim().length > 0,
      );
      await api.updateCustomer(customer.id, {
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
      });
      setBaseline();
      showToastMsg("Customer saved", false);
    } catch (err) {
      showToastMsg(
        err instanceof Error ? err.message : "Failed to save customer",
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
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Manage Customers</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="page-container">
          <CustomerSearch
            onSelect={handleSelectCustomer}
            clearOnSelect={false}
          />

          {customer && (
            <>
              <IonSegment
                value={type}
                onIonChange={(e) =>
                  setType((e.detail.value as string) || "PERSON")
                }
                style={{ marginTop: "16px" }}
              >
                <IonSegmentButton value="PERSON">
                  <IonLabel>Person</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="BUSINESS">
                  <IonLabel>Business</IonLabel>
                </IonSegmentButton>
              </IonSegment>

              <IonItem>
                <IonLabel position="stacked">First Name</IonLabel>
                <IonInput
                  value={firstName}
                  onIonInput={(e) => setFirstName(e.detail.value || "")}
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Last Name</IonLabel>
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
                <IonLabel position="stacked">Phone</IonLabel>
                <IonInput
                  type="tel"
                  inputMode="numeric"
                  value={formatPhone(phone)}
                  onIonInput={(e) => {
                    const digits = stripPhone(e.detail.value || "").slice(
                      0,
                      10,
                    );
                    setPhone(digits);
                    if (e.target) {
                      (e.target as HTMLIonInputElement).value =
                        formatPhone(digits);
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
                        updateAddress(
                          index,
                          "addressLine1",
                          e.detail.value || "",
                        )
                      }
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">Address Line 2</IonLabel>
                    <IonInput
                      value={addr.addressLine2}
                      onIonInput={(e) =>
                        updateAddress(
                          index,
                          "addressLine2",
                          e.detail.value || "",
                        )
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
                        updateAddress(
                          index,
                          "stateProvince",
                          e.detail.value || "",
                        )
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

              <IonButton
                expand="block"
                onClick={handleSave}
                disabled={saving || !hasChanges}
                style={{ marginTop: "16px" }}
              >
                {saving ? <IonSpinner /> : "Save"}
              </IonButton>
            </>
          )}
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

export default ManageCustomersPage;
