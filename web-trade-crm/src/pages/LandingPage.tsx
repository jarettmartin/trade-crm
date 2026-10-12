import { useEffect } from "react";
import {
  IonButton,
  IonContent,
  IonPage,
  IonText,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
} from "@ionic/react";
import PublicHeader from "../components/PublicHeader";

const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM";
  }, []);

  return (
    <IonPage>
      <PublicHeader />
      <IonContent className="ion-padding">
        <div className="capped-container">
          {/* Hero Section */}
          <div style={{ textAlign: "center", marginTop: 32, marginBottom: 48 }}>
            <img
              src="/logowithname.png"
              alt="Sprout CRM"
              style={{ maxWidth: "280px", height: "auto" }}
            />
            <p
              style={{
                color: "#666",
                marginTop: 12,
                fontSize: 16,
                lineHeight: 1.5,
                maxWidth: 400,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Simple customer management and invoicing for growing businesses.
            </p>
          </div>

          {/* Explore Demo Section */}
          <IonCard style={{ marginBottom: 24 }}>
            <IonCardHeader>
              <IonCardTitle>Explore Demo</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonText color="medium">
                <p>Experience Sprout immediately, no account required.</p>
              </IonText>
              <IonButton
                expand="block"
                style={{ marginTop: 16 }}
                onClick={() => {
                  window.location.href = "/manage-jobs?demo=true";
                }}
              >
                Explore Demo
              </IonButton>
            </IonCardContent>
          </IonCard>

          {/* About Section */}
          <IonCard style={{ marginBottom: 32 }}>
            <IonCardHeader>
              <IonCardTitle>About Sprout</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonText color="medium">
                <p>
                  Sprout is a CRM built for trades and service businesses.
                  Track customers, manage jobs, and send polished invoices —
                  all in one place, so you spend less time on paperwork and
                  more time on the work.
                </p>
              </IonText>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LandingPage;
