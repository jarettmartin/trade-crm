import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { publicNavItems } from "./publicNav";

/**
 * The mobile drawer for the unauthenticated space — the standard Ionic menu
 * (`ion-menu`) opened by the hamburger in `PublicHeader`. Holds the text nav
 * links; the Try Demo / Login CTAs stay in the header bar at every width.
 * Hidden on desktop, and the split pane in App.tsx is collapsed with
 * `when={false}` so this is always an overlay.
 *
 * Rendered once as a sibling of the main content (the public router outlet),
 * which it links to via `contentId`.
 */
const PublicMenu: React.FC = () => {
  const history = useHistory();

  return (
    <IonMenu menuId="public-menu" contentId="public-main" type="overlay">
      <IonContent>
        <IonList>
          <div style={{ padding: "16px 16px 8px" }}>
            <img
              src="/logo.png"
              alt="Sprout CRM home"
              style={{ maxWidth: "60px", height: "auto", cursor: "pointer" }}
              onClick={() => history.push("/")}
            />
          </div>

          {publicNavItems.map((item) =>
            item.url ? (
              <IonMenuToggle key={item.title}>
                <IonItem
                  routerLink={item.url}
                  routerDirection="none"
                  lines="none"
                  detail={false}
                >
                  <IonIcon aria-hidden="true" slot="start" icon={item.icon} />
                  <IonLabel>{item.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            ) : (
              <IonItem key={item.title} lines="none" detail={false}>
                <IonIcon
                  aria-hidden="true"
                  slot="start"
                  icon={item.icon}
                  color="medium"
                />
                <IonLabel color="medium">{item.title}</IonLabel>
              </IonItem>
            ),
          )}
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default PublicMenu;
