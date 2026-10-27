import { IonHeader, IonMenuButton, IonToolbar } from "@ionic/react";
import { useHistory, useLocation } from "react-router-dom";
import { goToDemo, publicNavItems } from "./publicNav";
import "./PublicHeader.css";

/**
 * Responsive header for the unauthenticated (public) space.
 *
 * Ionic has no built-in horizontal top menu (`ion-menu` is side-only), so the
 * bar is hand-rolled. On mobile the text links and the secondary actions
 * collapse into the standard Ionic drawer (`PublicMenu`, opened by a
 * hamburger), while the brand and the primary Early Access button stay in the
 * bar. Visibility is decided purely by CSS (see PublicHeader.css).
 *
 * Drop `<PublicHeader />` as the first child of any public `IonPage`.
 */
const PublicHeader: React.FC = () => {
  const history = useHistory();
  const { pathname } = useLocation();

  return (
    <IonHeader className="public-header">
      <IonToolbar className="public-header__toolbar">
        <nav className="public-header__inner" aria-label="Main">
          <button
            type="button"
            className="public-header__brand"
            onClick={() => history.push("/")}
          >
            <img
              src="/logo.png"
              alt=""
              className="public-header__logo"
              aria-hidden="true"
            />
            <span className="public-header__brandname">
              Sprout<span> CRM</span>
            </span>
          </button>

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
                  aria-current={item.url === pathname ? "page" : undefined}
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

          {/* Right-justified actions. Sign in and the demo link move into the
              drawer on mobile; the primary CTA stays in the bar. */}
          <div className="public-header__actions">
            <button
              type="button"
              className="public-header__signin"
              onClick={() => history.push("/sign-in")}
            >
              Sign in
            </button>
            <button
              type="button"
              className="mkt-btn mkt-btn--ghost mkt-btn--sm public-header__demo"
              onClick={goToDemo}
            >
              Live demo
            </button>
            <button
              type="button"
              className="mkt-btn mkt-btn--primary mkt-btn--sm public-header__cta"
              onClick={() => history.push("/beta-program")}
            >
              <span className="public-header__cta-full">Get early access</span>
              <span className="public-header__cta-short">Early access</span>
            </button>
          </div>

          {/* Mobile only — opens the PublicMenu drawer. */}
          <span className="public-header__hamburger">
            <IonMenuButton menu="public-menu" autoHide={false} />
          </span>
        </nav>
      </IonToolbar>
    </IonHeader>
  );
};

export default PublicHeader;
