import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import MarkdownContent from "../components/MarkdownContent";
import LegalPage, { LegalPageChrome } from "./LegalPage";
import termsOfService from "./terms-of-service.md?raw";

/**
 * The Terms of Service.
 *
 * The wording lives in `terms-of-service.md` (imported raw, so it is never
 * re-typed) and is rendered by the dependency-free `MarkdownContent`. Passing
 * `onClose` adds a close button, so it works both inside a modal (signup) and,
 * later, as a routed page with no close button.
 */
const TermsOfService: React.FC<{ onClose?: () => void }> = ({ onClose }) => (
  <>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Terms of Service</IonTitle>
        {onClose && (
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Close</IonButton>
          </IonButtons>
        )}
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding">
      <div className="capped-container">
        <MarkdownContent source={termsOfService} />
      </div>
    </IonContent>
  </>
);

/**
 * The Terms of Service on their own route (`/terms`), linked from the app
 * footer. `chrome` picks the surrounding header for the public or signed-in
 * space; the document itself is the same one the signup modal shows.
 */
export const TermsOfServicePage: React.FC<{ chrome?: LegalPageChrome }> = ({
  chrome,
}) => (
  <LegalPage title="Terms of Service" source={termsOfService} chrome={chrome} />
);

export default TermsOfService;
