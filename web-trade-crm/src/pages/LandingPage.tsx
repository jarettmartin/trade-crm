import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonPage,
  IonText,
} from "@ionic/react";
import PublicHeader from "../components/PublicHeader";
import { goToDemo } from "../components/publicNav";

/** One highlighted product capability on the landing page. */
interface Feature {
  title: string;
  /** Bold lead sentence shown directly under the title. */
  subtitle: string;
  body: string;
  /** Screenshot shown below the copy in the card. */
  image: string;
}

/**
 * Feature highlights. Each `image` is a screenshot served from `public/landing/`
 * captured at 16:10 (see the frame in `theme/variables.css`); the frame
 * letterboxes anything that is not exactly that ratio.
 */
const features: Feature[] = [
  {
    title: "AI-Assisted Estimating",
    subtitle: "Turn job descriptions into line items.",
    body: "Describe the work in your own words and get AI-powered suggestions from your service catalog. Review and edit suggested services and materials before adding them to a job.",
    image: "/landing/ai-estimator.png",
  },
  {
    title: "Customer Management",
    subtitle: "Keep customer information close at hand.",
    body: "Store customer contact details, addresses, and related information in one organized place. Spend less time looking for records and keep the details you need ready when work comes in.",
    image: "/landing/customer-management.png",
  },
  {
    title: "Job Management",
    subtitle: "Keep every job organized from start to finish.",
    body: "Connect jobs to customers, record important notes, track service locations, and organize the billing line items associated with each job.",
    image: "/landing/job-management.png",
  },
  {
    title: "Simple, Professional Invoicing",
    subtitle: "Make billing part of your workflow.",
    body: "Create itemized invoices with pricing, tax, and totals based on your work. Keep invoice details organized and generate a consistent document for your business records. Email to your customers in a single click.",
    image: "/landing/invoice-management.png",
  },
  {
    title: "Service Catalog",
    subtitle: "Stop entering the same items over and over.",
    body: "Build a reusable catalog of services, materials, and other items with descriptions and pricing. Add catalog items to jobs to make quoting and job entry more consistent.",
    image: "/landing/catalog-management.png",
  },
];

interface CtaCardProps {
  title: string;
  body: string;
  buttonLabel: string;
  onClick: () => void;
}

/** A centered card with a short body and a single call-to-action button. */
const CtaCard: React.FC<CtaCardProps> = ({
  title,
  body,
  buttonLabel,
  onClick,
}) => (
  <IonCard>
    <IonCardHeader>
      <IonCardTitle>{title}</IonCardTitle>
    </IonCardHeader>
    <IonCardContent>
      <IonText>
        <p style={{ marginTop: 0 }}>{body}</p>
      </IonText>
      <IonButton expand="block" style={{ marginTop: 16 }} onClick={onClick}>
        {buttonLabel}
      </IonButton>
    </IonCardContent>
  </IonCard>
);

/**
 * Public landing page (the unauthenticated home, `/`).
 *
 * Layout: a centered logo hero, a centered intro card, a full-width feature
 * grid (2-up on desktop — the fifth card wraps to its own left-aligned row —
 * and 1-up below 992px), then stacked calls to action. The widths and the grid
 * live in `theme/variables.css` under "LANDING PAGE".
 */
const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM";
  }, []);

  const history = useHistory();

  return (
    <IonPage>
      <PublicHeader />
      <IonContent className="ion-padding">
        <div className="landing-container">
          {/* Hero - logo only (the old one-line descriptor was removed). */}
          <div className="landing-hero">
            <img
              src="/logowithname.png"
              alt="Sprout CRM"
              className="landing-hero__logo"
            />
          </div>

          {/* Centered intro card */}
          <div className="capped-container landing-intro">
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  Everything you need to keep work organized
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonText>
                  <p style={{ marginTop: 0 }}>
                    From managing customer relationships to tracking jobs and
                    preparing invoices, Sprout brings the essentials of running
                    a service business into one simple workspace.
                  </p>
                </IonText>
              </IonCardContent>
            </IonCard>
          </div>

          {/* Feature highlights */}
          <div className="landing-features">
            {features.map((feature) => (
              <IonCard key={feature.title}>
                {/* Copy first: the screenshots contain clipped UI text, which
                    reads badly as the first thing on a mobile screen. */}
                <IonCardHeader>
                  {/* iOS card headers lay out in reverse DOM order
                      (flex-direction: column-reverse), so the subtitle is
                      written first here to render *under* the title. */}
                  <IonCardSubtitle className="landing-feature__subtitle">
                    {feature.subtitle}
                  </IonCardSubtitle>
                  <IonCardTitle>{feature.title}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonText>
                    <p style={{ marginTop: 0 }}>{feature.body}</p>
                  </IonText>
                </IonCardContent>
                <div className="landing-feature__media">
                  <img
                    className="landing-feature__image"
                    src={feature.image}
                    alt={`${feature.title} screenshot`}
                  />
                </div>
              </IonCard>
            ))}
          </div>

          {/* Centered calls to action */}
          <div className="capped-container">
            <div className="landing-ctas">
              <CtaCard
                title="Explore Demo"
                body="Experience Sprout immediately, no account required."
                buttonLabel="Explore Demo"
                onClick={goToDemo}
              />
              <CtaCard
                title="Early Access"
                body="Join the founding customer program and help shape Sprout. Request early access and we'll send you an invite code."
                buttonLabel="Request Early Access"
                onClick={() => history.push("/beta-program")}
              />
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LandingPage;
