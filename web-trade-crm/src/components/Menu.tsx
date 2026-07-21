import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote,
  IonButton,
} from "@ionic/react";

import { useLocation } from "react-router-dom";
import {
  archiveOutline,
  archiveSharp,
  bookmarkOutline,
  heartOutline,
  heartSharp,
  mailOutline,
  mailSharp,
  paperPlaneOutline,
  paperPlaneSharp,
  trashOutline,
  trashSharp,
  warningOutline,
  warningSharp,
  logOutOutline,
} from "ionicons/icons";
import { useAuth } from "../contexts/AuthContext";
import "./Menu.css";

interface AppPage {
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
}

const appPages: AppPage[] = [
  {
    title: "Inbox",
    url: "/folder/Inbox",
    iosIcon: mailOutline,
    mdIcon: mailSharp,
  },
  {
    title: "Outbox",
    url: "/folder/Outbox",
    iosIcon: paperPlaneOutline,
    mdIcon: paperPlaneSharp,
  },
  {
    title: "Favorites",
    url: "/folder/Favorites",
    iosIcon: heartOutline,
    mdIcon: heartSharp,
  },
  {
    title: "Archived",
    url: "/folder/Archived",
    iosIcon: archiveOutline,
    mdIcon: archiveSharp,
  },
  {
    title: "Trash",
    url: "/folder/Trash",
    iosIcon: trashOutline,
    mdIcon: trashSharp,
  },
  {
    title: "Spam",
    url: "/folder/Spam",
    iosIcon: warningOutline,
    mdIcon: warningSharp,
  },
];

const labels = ["Family", "Friends", "Notes", "Work", "Travel", "Reminders"];

const Menu: React.FC = () => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <IonMenu contentId="main" type="overlay">
      <IonContent>
        <IonList id="inbox-list">
          <IonListHeader>Trade CRM</IonListHeader>
          <IonNote>{user?.email}</IonNote>
          {appPages.map((appPage, index) => {
            return (
              <IonMenuToggle key={index} autoHide={false}>
                <IonItem
                  className={
                    location.pathname === appPage.url ? "selected" : ""
                  }
                  routerLink={appPage.url}
                  routerDirection="none"
                  lines="none"
                  detail={false}
                >
                  <IonIcon
                    aria-hidden="true"
                    slot="start"
                    ios={appPage.iosIcon}
                    md={appPage.mdIcon}
                  />
                  <IonLabel>{appPage.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            );
          })}
        </IonList>

        <IonList id="labels-list">
          <IonListHeader>Labels</IonListHeader>
          {labels.map((label, index) => (
            <IonItem lines="none" key={index}>
              <IonIcon aria-hidden="true" slot="start" icon={bookmarkOutline} />
              <IonLabel>{label}</IonLabel>
            </IonItem>
          ))}
        </IonList>

        <IonList>
          <IonItem button onClick={handleLogout} lines="none" detail={false}>
            <IonIcon
              aria-hidden="true"
              slot="start"
              icon={logOutOutline}
              color="danger"
            />
            <IonLabel color="danger">Logout</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default Menu;
