import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import MarkdownContent from "../components/MarkdownContent";
import privacyPolicy from "./privacy-policy.md?raw";

/**
 * The Privacy Policy.
 *
 * The wording lives in `privacy-policy.md` (imported raw, so it is never
 * re-typed) and is rendered by the dependency-free `MarkdownContent`. Passing
 * `onClose` adds a close button, so it works both inside a modal (signup) and,
 * later, as a routed page with no close button.
 */
const PrivacyPolicy: React.FC<{ onClose?: () => void }> = ({ onClose }) => (
  <>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Privacy Policy</IonTitle>
        {onClose && (
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Close</IonButton>
          </IonButtons>
        )}
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding">
      <div className="capped-container">
        <MarkdownContent source={privacyPolicy} />
      </div>
    </IonContent>
  </>
);

export default PrivacyPolicy;
