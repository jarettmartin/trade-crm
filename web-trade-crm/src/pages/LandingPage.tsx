import { useEffect } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonText,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { logoGithub } from "ionicons/icons";

const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM";
  }, []);

  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Sprout CRM</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push("/sign-in")}>
              Sign In
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="page-container">
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

          {/* GitHub Section */}
          <IonCard style={{ marginBottom: 24 }}>
            <IonCardHeader>
              <IonCardTitle>GitHub</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonText color="medium">
                <p>
                  View the source code, or report issues on{" "}
                  <a
                    href="https://github.com/jarettmartin/trade-crm"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--ion-color-primary)" }}
                  >
                    GitHub
                  </a>
                  .
                </p>
              </IonText>
            </IonCardContent>
          </IonCard>

          {/* About Section */}
          <IonCard style={{ marginBottom: 32 }}>
            <IonCardHeader>
              <IonCardTitle>About this project</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonText color="medium">
                <p>
                  Sprout CRM is a SaaS application built as both a real product
                  and a platform engineering portfolio. It's goal is to
                  demonstrate modern cloud architecture, containerization,
                  CI/CD, infrastructure automation, and scalable backend design.
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
