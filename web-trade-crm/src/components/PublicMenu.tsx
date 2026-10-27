import {
  IonContent,
  IonIcon,
  IonMenu,
  IonMenuToggle,
} from "@ionic/react";
import { useHistory, useLocation } from "react-router-dom";
import { goToDemo, publicNavItems } from "./publicNav";
import "./PublicMenu.css";

/**
 * The mobile drawer for the unauthenticated space — the standard Ionic menu
 * (`ion-menu`) opened by the hamburger in `PublicHeader`. It carries everything
 * the desktop bar cannot fit: the nav links, the demo link and sign-in.
 *
 * Rendered once as a sibling of the main content (the public router outlet),
 * which it links to via `contentId`.
 */
const PublicMenu: React.FC = () => {
  const history = useHistory();
  const { pathname } = useLocation();

  return (
    <IonMenu
      menuId="public-menu"
      contentId="public-main"
      type="overlay"
      className="public-menu"
    >
      <IonContent className="public-menu__content">
        <div className="public-menu__body">
          <button
            type="button"
            className="public-menu__brand"
            onClick={() => history.push("/")}
          >
            <img
              src="/logo.png"
              alt=""
              aria-hidden="true"
              className="public-menu__logo"
            />
            <span className="public-menu__brandname">
              Sprout<span> CRM</span>
            </span>
          </button>

          <nav aria-label="Main">
            <ul className="public-menu__nav">
              {publicNavItems.map((item) => {
                const isActive = item.url === pathname;
                return (
                  <li key={item.title}>
                    {item.url ? (
                      <IonMenuToggle autoHide={false}>
                        <button
                          type="button"
                          className={`public-menu__item${
                            isActive ? " public-menu__item--active" : ""
                          }`}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => history.push(item.url!)}
                        >
                          <IonIcon
                            aria-hidden="true"
                            icon={item.icon}
                            className="public-menu__icon"
                          />
                          {item.title}
                        </button>
                      </IonMenuToggle>
                    ) : (
                      <span className="public-menu__item public-menu__item--inactive">
                        <IonIcon
                          aria-hidden="true"
                          icon={item.icon}
                          className="public-menu__icon"
                        />
                        {item.title}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="public-menu__actions">
            <button
              type="button"
              className="mkt-btn mkt-btn--primary mkt-btn--block"
              onClick={() => history.push("/beta-program")}
            >
              Get early access
            </button>
            <button
              type="button"
              className="mkt-btn mkt-btn--ghost mkt-btn--block"
              onClick={goToDemo}
            >
              Explore the live demo
            </button>
            <button
              type="button"
              className="mkt-btn mkt-btn--ghost mkt-btn--block"
              onClick={() => history.push("/sign-in")}
            >
              Sign in
            </button>
          </div>
        </div>
      </IonContent>
    </IonMenu>
  );
};

export default PublicMenu;
