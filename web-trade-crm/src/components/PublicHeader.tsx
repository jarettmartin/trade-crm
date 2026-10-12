import {
  IonButton,
  IonHeader,
  IonMenuButton,
  IonToolbar,
} from "@ionic/react";
import { useHistory, useLocation } from "react-router-dom";
import { goToDemo, publicNavItems } from "./publicNav";
import "./PublicHeader.css";

/**
 * Responsive header for the unauthenticated (public) space.
 *
 * Ionic has no built-in horizontal top menu (`ion-menu` is side-only), so the
 * bar is hand-rolled. On mobile the text links collapse into the standard Ionic
 * drawer (`PublicMenu`, opened by a hamburger), while the logo and the
 * Try Demo / Login buttons stay in the bar. Visibility is decided purely by CSS
 * (see PublicHeader.css).
 *
 * Drop `<PublicHeader />` as the first child of any public `IonPage`.
 */
const PublicHeader: React.FC = () => {
  const history = useHistory();
  const { pathname } = useLocation();

  return (
    <IonHeader>
      <IonToolbar className="public-header">
        <nav className="public-header__inner" aria-label="Main">
          {/* Mobile only — opens the PublicMenu drawer. */}
          <span className="public-header__hamburger">
            <IonMenuButton menu="public-menu" autoHide={false} />
          </span>

          <img
            src="/logo.png"
            alt="Sprout CRM home"
            className="public-header__logo"
            onClick={() => history.push("/")}
          />

          {/* Desktop only — inline nav items. */}
          <div className="public-header__links">
            {publicNavItems.map((item) =>
              item.url ? (
                <button
                  key={item.title}
                  type="button"
                  className={`public-header__item${
                    item.url === pathname ? " public-header__item--active" : ""
                  }`}
                  onClick={() => history.push(item.url!)}
                >
                  {item.title}
                </button>
              ) : (
                <span
                  key={item.title}
                  className="public-header__item public-header__item--inactive"
                >
                  {item.title}
                </span>
              ),
            )}
          </div>

          {/* Right-justified CTAs — kept in the bar at every width. */}
          <div className="public-header__actions">
            <IonButton size="small" fill="outline" onClick={goToDemo}>
              Try Demo
            </IonButton>
            <IonButton size="small" onClick={() => history.push("/sign-in")}>
              Login
            </IonButton>
          </div>
        </nav>
      </IonToolbar>
    </IonHeader>
  );
};

export default PublicHeader;
