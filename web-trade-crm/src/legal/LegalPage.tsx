import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import AppFooter from "../components/AppFooter";
import MarkdownContent from "../components/MarkdownContent";
import PublicHeader from "../components/PublicHeader";

/** Which surrounding chrome the document is displayed in. */
export type LegalPageChrome = "public" | "app";

interface LegalPageProps {
  title: string;
  source: string;
  /**
   * `public` shows the unauthenticated header (nav + Try Demo / Login);
   * `app` (the default) shows a standard app header with a back button.
   * App.tsx registers the same routes in both outlets and picks the right
   * chrome for each, so the document body itself never differs.
   */
  chrome?: LegalPageChrome;
}

/**
 * A legal document on its own route (`/terms`, `/privacy`).
 *
 * Reuses the same `.md` source and `MarkdownContent` renderer as the signup
 * modals, and always renders the shared footer so the two documents (and the
 * rest of the app) are reachable from it.
 */
const LegalPage: React.FC<LegalPageProps> = ({
  title,
  source,
  chrome = "app",
}) => (
  <IonPage>
    {chrome === "public" ? (
      <PublicHeader />
    ) : (
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/manage-jobs" />
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
    )}
    <IonContent className="ion-padding">
      <div className="capped-container legal-page">
        <MarkdownContent source={source} />
      </div>
    </IonContent>
    <AppFooter />
  </IonPage>
);

export default LegalPage;
