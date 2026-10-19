import { IonButton, IonFooter, IonToolbar } from "@ionic/react";
import "./AppFooter.css";

/**
 * App-wide footer, shared by the authenticated and public spaces.
 *
 * Ionic only lays an `IonFooter` out correctly as a direct child of an
 * `IonPage` (it is ordered after `IonContent` in the page's flex column), so
 * every routed page renders `<AppFooter />` immediately after its content
 * rather than the app mounting one global instance.
 *
 * `routerLink` keeps navigation inside the current router outlet — `/terms`
 * and `/privacy` are registered in both the public and authenticated outlets
 * (see App.tsx), so the same footer works in both versions of the app.
 */
const AppFooter: React.FC = () => (
  <IonFooter className="app-footer">
    <IonToolbar>
      <nav className="app-footer__inner" aria-label="Legal">
        <IonButton
          fill="clear"
          size="small"
          routerLink="/terms"
          routerDirection="none"
          data-testid="footer-terms"
        >
          Terms of Service
        </IonButton>
        <IonButton
          fill="clear"
          size="small"
          routerLink="/privacy"
          routerDirection="none"
          data-testid="footer-privacy"
        >
          Privacy Policy
        </IonButton>
      </nav>
    </IonToolbar>
  </IonFooter>
);

export default AppFooter;
