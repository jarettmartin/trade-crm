import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import { IonContent, IonIcon, IonPage } from "@ionic/react";
import {
  briefcaseOutline,
  checkmarkCircle,
  documentTextOutline,
  peopleOutline,
  sparklesOutline,
} from "ionicons/icons";
import PublicHeader from "../components/PublicHeader";
import MarketingFooter from "../components/MarketingFooter";
import { goToDemo } from "../components/publicNav";

/** One tile in the "what's inside" rail under the hero. */
interface Capability {
  title: string;
  text: string;
  icon: string;
}

/** One step in the estimate → job → invoice story. */
interface WorkflowStep {
  title: string;
  body: string;
}

/** One alternating copy + screenshot feature row. */
interface Feature {
  kicker: string;
  title: string;
  body: string;
  /** Short, concrete supporting points (all shipped behaviour). */
  points: string[];
  /** Screenshot served from `public/landing/` at 16:10. */
  image: string;
  alt: string;
  width: number;
  height: number;
}

const capabilities: Capability[] = [
  {
    title: "Customers",
    text: "Contact details and service addresses, together.",
    icon: peopleOutline,
  },
  {
    title: "Jobs",
    text: "Every job, its notes, and its line items.",
    icon: briefcaseOutline,
  },
  {
    title: "Estimates",
    text: "AI-assisted line items from your own catalog.",
    icon: sparklesOutline,
  },
  {
    title: "Invoices",
    text: "Itemized totals, tax, and one-click email.",
    icon: documentTextOutline,
  },
];

const workflow: WorkflowStep[] = [
  {
    title: "Describe the work",
    body: "Type the job in plain language. Sprout suggests services and materials from your catalog for you to review and edit.",
  },
  {
    title: "Build the job",
    body: "Attach the customer, the service location, and any notes, then price the work from the same catalog.",
  },
  {
    title: "Send the invoice",
    body: "Turn the job into an itemized invoice with tax and totals, then email the PDF in a single click.",
  },
];

const features: Feature[] = [
  {
    kicker: "Estimating",
    title: "AI-assisted estimating",
    body: "Describe the work in your own words and get suggestions from your service catalog. Review and edit the suggested services and materials before adding them to a job.",
    points: [
      "Suggestions come from your own catalog, not a generic price list",
      "Every suggested line stays editable",
      "Services and materials on the same estimate",
    ],
    image: "/landing/ai-estimator.png",
    alt: "The Sprout CRM AI estimator suggesting catalog line items from a plain-language job description",
    width: 1560,
    height: 975,
  },
  {
    kicker: "Customers",
    title: "Customer records that stay findable",
    body: "Store customer contact details, addresses, and related information in one organized place. Spend less time looking for records and keep the details you need ready when work comes in.",
    points: [
      "Contact details and service addresses together",
      "Search that keeps up as your customer list grows",
      "Jobs linked to the customer they belong to",
    ],
    image: "/landing/customer-management.png",
    alt: "The Sprout CRM customer list showing names, contact details, and addresses",
    width: 1060,
    height: 663,
  },
  {
    kicker: "Catalog",
    title: "A catalog you only build once",
    body: "Build a reusable catalog of services, materials, and other items with descriptions and pricing. Add catalog items to jobs to make quoting and job entry more consistent.",
    points: [
      "Reusable services and materials",
      "Descriptions and pricing stored in one place",
      "Add catalog items straight to a job",
    ],
    image: "/landing/catalog-management.png",
    alt: "The Sprout CRM service catalog listing saved items, descriptions, and prices",
    width: 1152,
    height: 720,
  },
  {
    kicker: "Invoicing",
    title: "Simple, professional invoicing",
    body: "Create itemized invoices with pricing, tax, and totals based on the work. Keep the details organized and generate a consistent document for your records, then email it to your customer in a single click.",
    points: [
      "Itemized pricing, tax, and totals",
      "A consistent invoice document for your records",
      "Email the invoice to your customer in one click",
    ],
    image: "/landing/invoice-management.png",
    alt: "A Sprout CRM invoice with itemized services, tax, and the total due",
    width: 1030,
    height: 643,
  },
];


/**
 * Public landing page (the unauthenticated home, `/`).
 *
 * Structure: a copy-led hero with the primary conversion path, a framed product
 * capture, a "what's inside" rail, the three-step workflow, alternating feature
 * rows, and the founding-customer CTA band. Styling lives in
 * `theme/marketing.css` (shared with the other public pages).
 */
const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title =
      "Sprout CRM — Estimating, jobs, and invoicing for service businesses";
  }, []);

  const history = useHistory();

  return (
    <IonPage>
      <PublicHeader />
      <IonContent className="mkt-content">
        <div className="mkt">
          <main>
            {/* Hero */}
            <section className="mkt-hero">
              <div className="mkt-container">
                <p className="mkt-eyebrow">
                  <span className="mkt-eyebrow__dot" aria-hidden="true" />
                  Now onboarding founding customers
                </p>
                <h1 className="mkt-hero__title">
                  Run the whole job,{" "}
                  <span className="mkt-hero__accent">
                    from estimate to invoice
                  </span>
                  .
                </h1>
                <p className="mkt-hero__lede">
                  Sprout keeps customers, job details, and billing in one calm
                  workspace — with AI-assisted estimating that turns a plain
                  description of the work into line items.
                </p>
                <div className="mkt-hero__actions">
                  <button
                    type="button"
                    className="mkt-btn mkt-btn--primary mkt-btn--lg"
                    onClick={() => history.push("/beta-program")}
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
                  No credit card required · Founding customers may qualify for
                  lifetime free access
                </p>

                <div className="mkt-hero__visual">
                  <figure className="mkt-shot mkt-shot--hero">
                    <div className="mkt-shot__bar" aria-hidden="true">
                      <span className="mkt-shot__dot" />
                      <span className="mkt-shot__dot" />
                      <span className="mkt-shot__dot" />
                      <span className="mkt-shot__url">
                        sprout-crm.com/manage-jobs
                      </span>
                    </div>
                    <img
                      className="mkt-shot__img"
                      src="/landing/job-management.png"
                      alt="The Sprout CRM job list, showing jobs with their customer, status, and totals"
                      width={1296}
                      height={810}
                      fetchPriority="high"
                    />
                  </figure>
                </div>
              </div>
            </section>

            {/* What's inside */}
            <section className="mkt-strip" aria-label="What Sprout includes">
              <div className="mkt-container">
                <ul className="mkt-strip__list">
                  {capabilities.map((capability) => (
                    <li key={capability.title} className="mkt-strip__item">
                      <IonIcon
                        aria-hidden="true"
                        icon={capability.icon}
                        className="mkt-strip__icon"
                      />
                      <div>
                        <h2 className="mkt-strip__title">{capability.title}</h2>
                        <p className="mkt-strip__text">{capability.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>


            {/* Workflow */}
            <section className="mkt-section" aria-labelledby="workflow-title">
              <div className="mkt-container">
                <header className="mkt-head mkt-head--center">
                  <p className="mkt-kicker">How it works</p>
                  <h2 id="workflow-title">
                    Three steps from first call to final invoice
                  </h2>
                  <p className="mkt-head__lede">
                    One workspace and one set of records — no re-typing the same
                    job into a spreadsheet, an invoice template, and a text
                    message.
                  </p>
                </header>

                <ol className="mkt-steps">
                  {workflow.map((step, index) => (
                    <li key={step.title} className="mkt-step">
                      <span className="mkt-step__num" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="mkt-step__title">{step.title}</h3>
                      <p className="mkt-step__body">{step.body}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* Feature rows */}
            <section
              className="mkt-section mkt-section--tint"
              id="features"
              aria-labelledby="features-title"
            >
              <div className="mkt-container">
                <header className="mkt-head">
                  <p className="mkt-kicker">Product tour</p>
                  <h2 id="features-title">
                    The essentials of the business, without the busywork
                  </h2>
                  <p className="mkt-head__lede">
                    Sprout is built around the way service work actually moves:
                    the customer, the estimate, the job, and the invoice.
                  </p>
                </header>

                <div className="mkt-rows">
                  {features.map((feature, index) => (
                    <article
                      key={feature.title}
                      className={`mkt-row${
                        index % 2 === 1 ? " mkt-row--flip" : ""
                      }`}
                    >
                      <div className="mkt-row__copy">
                        <p className="mkt-kicker">{feature.kicker}</p>
                        <h3 className="mkt-row__title">{feature.title}</h3>
                        <p className="mkt-row__body">{feature.body}</p>
                        <ul className="mkt-checks">
                          {feature.points.map((point) => (
                            <li key={point}>
                              <IonIcon
                                aria-hidden="true"
                                icon={checkmarkCircle}
                              />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <figure className="mkt-row__media">
                        <div className="mkt-shot">
                          <img
                            className="mkt-shot__img"
                            src={feature.image}
                            alt={feature.alt}
                            width={feature.width}
                            height={feature.height}
                            loading="lazy"
                          />
                        </div>
                      </figure>
                    </article>
                  ))}
                </div>
              </div>
            </section>


            {/* Closing call to action */}
            <section className="mkt-cta-band" aria-labelledby="cta-title">
              <div className="mkt-container mkt-cta-band__inner">
                <div>
                  <p className="mkt-kicker">Founding customer program</p>
                  <h2 id="cta-title">Get in early and help shape Sprout</h2>
                  <p>
                    We're inviting a limited number of service businesses to use
                    Sprout, share practical feedback, and guide its development.
                    Businesses that actively participate may qualify for
                    lifetime free access.
                  </p>
                </div>
                <div className="mkt-cta-band__actions">
                  <button
                    type="button"
                    className="mkt-btn mkt-btn--primary mkt-btn--lg"
                    onClick={() => history.push("/beta-program")}
                  >
                    Request early access
                  </button>
                  <button
                    type="button"
                    className="mkt-btn mkt-btn--ghost mkt-btn--lg"
                    onClick={goToDemo}
                  >
                    Explore the demo
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

export default LandingPage;

