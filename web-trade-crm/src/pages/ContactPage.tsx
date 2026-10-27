import { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTextarea,
  IonToast,
} from "@ionic/react";
import { checkmarkCircle } from "ionicons/icons";
import PublicHeader from "../components/PublicHeader";
import MarketingFooter from "../components/MarketingFooter";
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
 *
 * Layout: a short hero, then a two-column block — context cards on the left
 * (early access, in-app feedback, what to include) and the form panel on the
 * right. The Ionic controls are kept for validation/a11y; `mkt-field` repaints
 * each one as a bordered marketing field (see theme/marketing.css).
 */
const ContactPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM — Contact";
  }, []);

  const history = useHistory();
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
      <IonContent className="mkt-content">
        <div className="mkt">
          <main>
            <section className="mkt-hero mkt-hero--compact mkt-hero--left">
              <div className="mkt-container">
                <p className="mkt-eyebrow">
                  <span className="mkt-eyebrow__dot" aria-hidden="true" />
                  Contact
                </p>
                <h1 className="mkt-hero__title">
                  Let's talk about{" "}
                  <span className="mkt-hero__accent">your business</span>.
                </h1>
                <p className="mkt-hero__lede">
                  Questions about Sprout, an early access request, or feedback
                  from using the app — send us a note and we'll get back to you
                  by email.
                </p>
              </div>
            </section>

            <section className="mkt-section mkt-section--last">
              <div className="mkt-container mkt-contact">
                <aside className="mkt-contact__aside">
                  <div className="mkt-card">
                    <h2 className="mkt-card__title">
                      Requesting early access?
                    </h2>
                    <p className="mkt-card__body">
                      The founding customer program is open to a limited number
                      of service businesses, and qualifying customers may get
                      lifetime free access.
                    </p>
                    <p className="mkt-card__action">
                      <button
                        type="button"
                        className="mkt-link"
                        onClick={() => history.push("/beta-program")}
                      >
                        Read about the program →
                      </button>
                    </p>
                  </div>

                  <div className="mkt-card">
                    <h2 className="mkt-card__title">Already using Sprout?</h2>
                    <p className="mkt-card__body">
                      Signed-in customers can send feedback straight from the
                      in-app feedback page. Questions about the product are best
                      sent through this form.
                    </p>
                  </div>

                  <div className="mkt-card">
                    <h2 className="mkt-card__title">What to include</h2>
                    <ul className="mkt-checks">
                      <li>
                        <IonIcon aria-hidden="true" icon={checkmarkCircle} />
                        <span>A sentence or two about your business</span>
                      </li>
                      <li>
                        <IonIcon aria-hidden="true" icon={checkmarkCircle} />
                        <span>What you're hoping Sprout can do</span>
                      </li>
                      <li>
                        <IonIcon aria-hidden="true" icon={checkmarkCircle} />
                        <span>An email address we can reply to</span>
                      </li>
                    </ul>
                  </div>
                </aside>

                <div className="mkt-panel mkt-contact__form">
                  {submitted ? (
                    <div className="mkt-success" role="status">
                      <span className="mkt-success__icon">
                        <IonIcon aria-hidden="true" icon={checkmarkCircle} />
                      </span>
                      <h2 className="mkt-success__title">Message sent</h2>
                      <p className="mkt-success__body">
                        Thanks! Your message is on its way — we'll reply to you
                        at <strong>{trimmedEmail}</strong>.
                      </p>
                      <button
                        type="button"
                        className="mkt-btn mkt-btn--ghost mkt-success__action"
                        onClick={() => setSubmitted(false)}
                      >
                        Send another message
                      </button>
                    </div>
                  ) : (
                    <>

                      <h2 className="mkt-form__heading">Send us a message</h2>
                      <p className="mkt-form__intro">
                        All fields marked with an asterisk are required.
                      </p>

                      <div className="mkt-form__fields">
                        <IonItem className="mkt-field" lines="none">
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
                              <IonSelectOption
                                key={contactType}
                                value={contactType}
                              >
                                {contactTypeLabel[contactType]}
                              </IonSelectOption>
                            ))}
                          </IonSelect>
                        </IonItem>

                        <IonItem className="mkt-field" lines="none">
                          <IonLabel position="stacked">
                            Your email <IonText color="danger">*</IonText>
                          </IonLabel>
                          <IonInput
                            type="email"
                            value={email}
                            onIonInput={(e) => setEmail(e.detail.value || "")}
                            placeholder="you@example.com"
                            data-testid="contact-email"
                          />
                        </IonItem>

                        <IonItem className="mkt-field" lines="none">
                          <IonLabel position="stacked">Subject</IonLabel>
                          <IonInput
                            value={subject}
                            maxlength={SUBJECT_MAX_LENGTH}
                            onIonInput={(e) =>
                              setSubject(e.detail.value || "")
                            }
                            placeholder="Optional short summary"
                          />
                        </IonItem>

                        <IonItem
                          className="mkt-field mkt-field--textarea"
                          lines="none"
                        >
                          <IonLabel position="stacked">
                            Message <IonText color="danger">*</IonText>
                          </IonLabel>
                          <IonTextarea
                            rows={5}
                            value={message}
                            maxlength={MESSAGE_MAX_LENGTH}
                            onIonInput={(e) =>
                              setMessage(e.detail.value || "")
                            }
                            placeholder="Tell us a little about yourself and your business..."
                            data-testid="contact-message"
                          />
                        </IonItem>
                      </div>

                      <p
                        className={`mkt-form__hint${
                          message.length > MESSAGE_MAX_LENGTH
                            ? " mkt-form__hint--over"
                            : ""
                        }`}
                      >
                        {message.length}/{MESSAGE_MAX_LENGTH} characters
                      </p>

                      <button
                        type="button"
                        className="mkt-btn mkt-btn--primary mkt-btn--lg mkt-btn--block mkt-form__submit"
                        onClick={handleSubmit}
                        disabled={submitting || !isValid}
                        data-testid="submit-contact"
                      >
                        {submitting ? <IonSpinner /> : "Send message"}
                      </button>
                      <p className="mkt-form__footnote">
                        We'll reply to the email address you enter here.
                      </p>
                    </>
                  )}

                  <IonToast
                    isOpen={showToast}
                    message={toastMessage}
                    color="danger"
                    buttons={[
                      {
                        text: "Dismiss",
                        handler: () => setShowToast(false),
                      },
                    ]}
                    onDidDismiss={() => setShowToast(false)}
                  />
                </div>
              </div>
            </section>
          </main>

          <MarketingFooter />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ContactPage;

