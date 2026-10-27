import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import { IonContent, IonIcon, IonPage } from "@ionic/react";
import {
  chatbubblesOutline,
  checkmarkCircle,
  rocketOutline,
  trophyOutline,
} from "ionicons/icons";
import PublicHeader from "../components/PublicHeader";
import MarketingFooter from "../components/MarketingFooter";
import { goToDemo } from "../components/publicNav";

/** The contact form opens with the Early Access subject pre-selected. */
const EARLY_ACCESS_CONTACT_URL = "/contact?type=EARLY_ACCESS";

/** One "what you get" card. */
interface Benefit {
  title: string;
  text: string;
  icon: string;
}

/** One step in the "how to join" panel. */
interface JoinStep {
  title: string;
  text: string;
}

const benefits: Benefit[] = [
  {
    title: "Early access",
    text: "Start using Sprout before wider availability.",
    icon: rocketOutline,
  },
  {
    title: "A voice in development",
    text: "Influence improvements based on how your business actually works.",
    icon: chatbubblesOutline,
  },
  {
    title: "A long-term reward",
    text: "Qualifying founding customers receive lifetime free access to the core plan.",
    icon: trophyOutline,
  },
];

const requirements: string[] = [
  "Use Sprout regularly for genuine customer, job, and invoicing workflows.",
  "Submit at least one useful piece of feedback each month through the in-app feedback page.",
  "Respond to occasional follow-up questions about reported issues or new features when reasonably possible via email.",
];

const joinSteps: JoinStep[] = [
  {
    title: "Send us a note",
    text: "Use the contact form with the Early Access subject type.",
  },
  {
    title: "Tell us about your business",
    text: "A quick paragraph is enough — nothing too specific, just let us know you're real.",
  },
  {
    title: "Get your invite code",
    text: "We'll email you an invite code to sign up with.",
  },
];

/**
 * Early Access page (`/beta-program`) — the founding customer program.
 *
 * Structure: a program hero, the benefit cards, then a split block pairing what
 * we ask of participants with the three-step "how to join" panel, and a closing
 * CTA band. The primary action opens the public contact form with the Early
 * Access subject pre-selected (`/contact?type=EARLY_ACCESS`).
 */
const BetaProgramPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM — Founding Customer Program";
  }, []);

  const history = useHistory();

  return (
    <IonPage>
      <PublicHeader />
      <IonContent className="mkt-content">
        <div className="mkt">
          <main>
            {/* Hero */}
            <section className="mkt-hero mkt-hero--compact">
              <div className="mkt-container">
                <p className="mkt-eyebrow">
                  <span className="mkt-eyebrow__dot" aria-hidden="true" />
                  Founding customer program
                </p>
                <h1 className="mkt-hero__title">
                  Use Sprout early and{" "}
                  <span className="mkt-hero__accent">
                    help shape what it becomes
                  </span>
                  .
                </h1>
                <p className="mkt-hero__lede">
                  Sprout is inviting a limited number of service businesses to
                  use the platform, share practical feedback, and help guide its
                  development. Businesses that actively participate may qualify
                  for lifetime free access.
                </p>
                <div className="mkt-hero__actions">
                  <button
                    type="button"
                    className="mkt-btn mkt-btn--primary mkt-btn--lg"
                    onClick={() => history.push(EARLY_ACCESS_CONTACT_URL)}
                  >
                    Request early access
                  </button>
                  <button
                    type="button"
                    className="mkt-btn mkt-btn--ghost mkt-btn--lg"
                    onClick={goToDemo}
                  >
                    Explore the live demo
                  </button>
                </div>
                <p className="mkt-hero__note">
                  Invite codes are sent by email after we've read your note.
                </p>
              </div>
            </section>

            {/* Benefits */}
            <section className="mkt-section" aria-labelledby="benefits-title">
              <div className="mkt-container">
                <header className="mkt-head mkt-head--center">
                  <p className="mkt-kicker">Program benefits</p>
                  <h2 id="benefits-title">What founding customers get</h2>
                  <p className="mkt-head__lede">
                    Maintain free access to the core platform for life, with a
                    direct line into how the product develops.
                  </p>
                </header>

                <ul className="mkt-cards">
                  {benefits.map((benefit) => (
                    <li key={benefit.title} className="mkt-card">
                      <span className="mkt-card__icon">
                        <IonIcon aria-hidden="true" icon={benefit.icon} />
                      </span>
                      <h3 className="mkt-card__title">{benefit.title}</h3>
                      <p className="mkt-card__body">{benefit.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Requirements + how to join */}
            <section
              className="mkt-section mkt-section--tint"
              aria-labelledby="requirements-title"
            >
              <div className="mkt-container mkt-split">
                <div>
                  <p className="mkt-kicker">What we ask</p>
                  <h2 id="requirements-title" className="mkt-title">
                    Program requirements
                  </h2>
                  <p className="mkt-head__lede">
                    Help us help you grow. The program works when the feedback
                    comes from real jobs and real invoices.
                  </p>
                  <ul className="mkt-checks">
                    {requirements.map((requirement) => (
                      <li key={requirement}>
                        <IonIcon aria-hidden="true" icon={checkmarkCircle} />
                        <span>{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <aside className="mkt-panel" aria-labelledby="join-title">
                  <h2 id="join-title" className="mkt-panel__title">
                    How to join
                  </h2>
                  <p className="mkt-panel__body">
                    Tell us a little about yourself and your business, and we'll
                    take it from there.
                  </p>

                  <ol className="mkt-steps">
                    {joinSteps.map((step, index) => (
                      <li key={step.title} className="mkt-step">
                        <span className="mkt-step__num" aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3 className="mkt-step__title">{step.title}</h3>
                        <p className="mkt-step__body">{step.text}</p>
                      </li>
                    ))}
                  </ol>

                  <button
                    type="button"
                    className="mkt-btn mkt-btn--primary mkt-btn--block mkt-panel__action"
                    onClick={() => history.push(EARLY_ACCESS_CONTACT_URL)}
                  >
                    Request early access
                  </button>
                  <p className="mkt-note">
                    Already have an invite code?{" "}
                    <button
                      type="button"
                      className="mkt-link"
                      onClick={() => history.push("/sign-in")}
                    >
                      Sign in
                    </button>
                  </p>
                </aside>
              </div>
            </section>

            {/* Closing call to action */}
            <section className="mkt-cta-band" aria-labelledby="cta-title">
              <div className="mkt-container mkt-cta-band__inner">
                <div>
                  <p className="mkt-kicker">Limited spots</p>
                  <h2 id="cta-title">Ready to join the founding program?</h2>
                  <p>
                    Send us a paragraph about your business. We'll reply by email
                    with an invite code so you can start using Sprout.
                  </p>
                </div>
                <div className="mkt-cta-band__actions">
                  <button
                    type="button"
                    className="mkt-btn mkt-btn--primary mkt-btn--lg"
                    onClick={() => history.push(EARLY_ACCESS_CONTACT_URL)}
                  >
                    Request early access
                  </button>
                  <button
                    type="button"
                    className="mkt-btn mkt-btn--ghost mkt-btn--lg"
                    onClick={goToDemo}
                  >
                    Try the demo first
                  </button>
                </div>
              </div>
            </section>
          </main>

          <MarketingFooter />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default BetaProgramPage;

