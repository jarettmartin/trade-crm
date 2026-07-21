import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
} from "@ionic/react";
import { useHistory } from "react-router-dom";

const Home: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Home</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <IonButton
            size="small"
            fill="outline"
            onClick={() => history.push("/create-job")}
          >
            New Job
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
