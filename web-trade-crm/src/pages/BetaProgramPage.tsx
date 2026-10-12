import { useEffect } from "react";
import { IonContent, IonPage } from "@ionic/react";
import PublicHeader from "../components/PublicHeader";

/**
 * Landing page for the "early access" public nav item (internally the beta
 * program). Placeholder for now — just the program title.
 */
const BetaProgramPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM - Founding Customer Program";
  }, []);

  return (
    <IonPage>
      <PublicHeader />
      <IonContent className="ion-padding">
        <div className="capped-container" style={{ marginTop: 40 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            Founding Customer Program
          </h1>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default BetaProgramPage;
