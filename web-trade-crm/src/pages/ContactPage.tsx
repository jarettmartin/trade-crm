import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTextarea,
  IonToast,
} from "@ionic/react";
import PublicHeader from "../components/PublicHeader";
import AppFooter from "../components/AppFooter";
import { api } from "../services/api";
import { isValidEmail } from "../services/validation";

const MESSAGE_MAX_LENGTH = 1000;
const SUBJECT_MAX_LENGTH = 255;

/**
 * Subject types the public contact form offers. `EARLY_ACCESS` is the one the
 * Early Access page links here with (`/contact?type=EARLY_ACCESS`).
 */
const CONTACT_TYPES = ["CONTACT", "EARLY_ACCESS"] as const;
type ContactType = (typeof CONTACT_TYPES)[number];

const DEFAULT_CONTACT_TYPE: ContactType = "CONTACT";

const contactTypeLabel: Record<ContactType, string> = {
  CONTACT: "General inquiry",
  EARLY_ACCESS: "Early Access",
};

/**
 * Resolve a `?type=` value to a type the form actually offers, falling back to
 * the default when it's missing or unknown — so a stale or mistyped link still
 * lands on a usable form instead of an empty select.
 */
function resolveContactType(value: string | null): ContactType {
  const candidate = (value ?? "").trim().toUpperCase();
  return (CONTACT_TYPES as readonly string[]).includes(candidate)
    ? (candidate as ContactType)
    : DEFAULT_CONTACT_TYPE;
}

/**
 * The public (unauthenticated) contact form. Reuses the in-app feedback form's
 * field set and validation, minus the account-only bits: there is no tenant or
 * user, and an email address is required so we can actually reply. Submissions
 * go to the unguarded `POST /contact`.
 */
const ContactPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM - Contact";
  }, []);

  const { search } = useLocation();

  const [type, setType] = useState<ContactType>(DEFAULT_CONTACT_TYPE);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  // Pre-select the subject type from `?type=`, re-applying it if the query
  // changes (e.g. arriving here from the Early Access page).
  useEffect(() => {
    setType(resolveContactType(new URLSearchParams(search).get("type")));
  }, [search]);

  const trimmedEmail = email.trim();
  const trimmedMessage = message.trim();
  const isValid =
    isValidEmail(trimmedEmail) &&
    trimmedMessage.length > 0 &&
    trimmedMessage.length <= MESSAGE_MAX_LENGTH;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await api.submitContact({
        type,
        email: trimmedEmail,
        subject: subject.trim() || undefined,
        message: trimmedMessage,
      });
      setSubmitted(true);
      setSubject("");
      setMessage("");
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to send your message",
      );
      setShowToast(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      <PublicHeader />
      <IonContent className="ion-padding">
        <div className="page-container" style={{ marginTop: "20px" }}>
          <div className="capped-container">
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
                Contact Us
              </h1>
            </div>

            {submitted ? (
              <div className="form-card" style={{ textAlign: "center" }}>
                <IonText color="medium">
                  <p style={{ marginTop: 0 }}>
                    Thanks! Your message is on its way — we'll reply to you at{" "}
                    <strong>{trimmedEmail}</strong>.
                  </p>
                </IonText>
                <IonButton
                  expand="block"
                  fill="outline"
                  style={{ marginTop: 8 }}
                  onClick={() => setSubmitted(false)}
                >
                  Send another message
                </IonButton>
              </div>
            ) : (
              <>
                <IonText color="medium">
                  <p style={{ margin: "0 0 12px", fontSize: "0.875rem" }}>
                    Questions, early access, or just want to say hello? Send us
                    a note and we'll get back to you by email.
                  </p>
                </IonText>

                <div className="form-card">
                  <IonItem>
                    <IonLabel position="stacked">
                      Type <IonText color="danger">*</IonText>
                    </IonLabel>
                    <IonSelect
                      value={type}
                      onIonChange={(e) =>
                        setType(e.detail.value as ContactType)
                      }
                      interface="popover"
                    >
                      {CONTACT_TYPES.map((contactType) => (
                        <IonSelectOption key={contactType} value={contactType}>
                          {contactTypeLabel[contactType]}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">
                      Your Email <IonText color="danger">*</IonText>
                    </IonLabel>
                    <IonInput
                      type="email"
                      value={email}
                      onIonInput={(e) => setEmail(e.detail.value || "")}
                      placeholder="you@example.com"
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">Subject</IonLabel>
                    <IonInput
                      value={subject}
                      maxlength={SUBJECT_MAX_LENGTH}
                      onIonInput={(e) => setSubject(e.detail.value || "")}
                      placeholder="Optional short summary"
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">
                      Message <IonText color="danger">*</IonText>
                    </IonLabel>
                    <IonTextarea
                      rows={5}
                      value={message}
                      maxlength={MESSAGE_MAX_LENGTH}
                      onIonInput={(e) => setMessage(e.detail.value || "")}
                      placeholder="Tell us a little about yourself and your business..."
                    />
                  </IonItem>

                  <IonNote
                    color={
                      message.length > MESSAGE_MAX_LENGTH ? "danger" : "medium"
                    }
                    style={{
                      display: "block",
                      margin: "4px 16px 0",
                      fontSize: 12,
                    }}
                  >
                    {message.length}/{MESSAGE_MAX_LENGTH} characters
                  </IonNote>
                </div>

                <IonButton
                  expand="block"
                  onClick={handleSubmit}
                  disabled={submitting || !isValid}
                  style={{ marginTop: 20 }}
                  data-testid="submit-contact"
                >
                  {submitting ? <IonSpinner /> : "Send Message"}
                </IonButton>
              </>
            )}

            <IonToast
              isOpen={showToast}
              message={toastMessage}
              color="danger"
              buttons={[
                { text: "Dismiss", handler: () => setShowToast(false) },
              ]}
              onDidDismiss={() => setShowToast(false)}
            />
          </div>
        </div>
      </IonContent>
      <AppFooter />
    </IonPage>
  );
};

export default ContactPage;
