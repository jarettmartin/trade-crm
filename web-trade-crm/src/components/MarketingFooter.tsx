import { useHistory } from "react-router-dom";
import { goToDemo } from "./publicNav";
import "./MarketingFooter.css";

/**
 * Footer for the public marketing pages (landing, Early Access, Contact).
 *
 * Deliberately *not* `IonFooter`: Ionic pins an `IonFooter` to the bottom of the
 * viewport, which is right for the slim app-wide `AppFooter` bar but wrong for
 * a full marketing footer. This renders inside `IonContent`, at the end of the
 * page's scroll, and keeps the same `footer-terms` / `footer-privacy` test ids
 * the shared footer exposes.
 */
const MarketingFooter: React.FC = () => {
  const history = useHistory();
  const year = new Date().getFullYear();

  return (
    <footer className="mkt-footer">
      <div className="mkt-footer__inner">
        <div className="mkt-footer__brand">
          <div className="mkt-footer__lockup">
            <img
              src="/logo.png"
              alt=""
              aria-hidden="true"
              className="mkt-footer__logo"
            />
            <span className="mkt-footer__brandname">
              Sprout<span> CRM</span>
            </span>
          </div>
          <p className="mkt-footer__tagline">
            The workspace for trade and service businesses — customers, jobs,
            estimates, and invoices in one place.
          </p>
        </div>

        <nav className="mkt-footer__col" aria-label="Product">
          <h2 className="mkt-footer__title">Product</h2>
          <ul className="mkt-footer__list">
            <li>
              <button
                type="button"
                className="mkt-footer__link"
                onClick={() => history.push("/")}
              >
                Overview
              </button>
            </li>
            <li>
              <button
                type="button"
                className="mkt-footer__link"
                onClick={() => history.push("/beta-program")}
              >
                Early Access
              </button>
            </li>
            <li>
              <button
                type="button"
                className="mkt-footer__link"
                onClick={goToDemo}
              >
                Live demo
              </button>
            </li>
          </ul>
        </nav>

        <nav className="mkt-footer__col" aria-label="Company">
          <h2 className="mkt-footer__title">Company</h2>
          <ul className="mkt-footer__list">
            <li>
              <button
                type="button"
                className="mkt-footer__link"
                onClick={() => history.push("/contact")}
              >
                Contact
              </button>
            </li>
            <li>
              <button
                type="button"
                className="mkt-footer__link"
                onClick={() => history.push("/sign-in")}
              >
                Sign in
              </button>
            </li>
          </ul>
        </nav>

        <nav className="mkt-footer__col" aria-label="Legal">
          <h2 className="mkt-footer__title">Legal</h2>
          <ul className="mkt-footer__list">
            <li>
              <button
                type="button"
                className="mkt-footer__link"
                data-testid="footer-terms"
                onClick={() => history.push("/terms")}
              >
                Terms of Service
              </button>
            </li>
            <li>
              <button
                type="button"
                className="mkt-footer__link"
                data-testid="footer-privacy"
                onClick={() => history.push("/privacy")}
              >
                Privacy Policy
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="mkt-footer__bottom">
        <span>© {year} Sprout CRM. All rights reserved.</span>
        <span>Built for trade and service businesses.</span>
      </div>
    </footer>
  );
};

export default MarketingFooter;
