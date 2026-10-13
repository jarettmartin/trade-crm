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

/** A bullet in a program card; `label` renders bold ahead of the text. */
interface ProgramBullet {
  label?: string;
  text: string;
}

/** One card on the early-access page. All fields but `title` are optional. */
interface ProgramCard {
  title: string;
  subtitle?: string;
  body?: string;
  bullets?: ProgramBullet[];
  /** Optional call to action rendered as a full-width button at the card foot. */
  cta?: { label: string; url: string };
}

const programCards: ProgramCard[] = [
  {
    title: "Become a Sprout Founding Customer",
    subtitle:
      "Help shape Sprout. Build better workflows. Get rewarded for being part of the journey.",
    body: "Sprout is inviting a limited number of service businesses to use the platform, share practical feedback, and help guide its development. Businesses that actively participate in the program may qualify for lifetime free access.",
  },
  {
    title: "Program Requirements",
    subtitle: "Help us help you grow!",
    bullets: [
      {
        text: "Use Sprout regularly for genuine customer, job, and invoicing workflows.",
      },
      {
        text: "Submit at least one useful piece of feedback each month through the in-app feedback page.",
      },
      {
        text: "Respond to occasional follow-up questions about reported issues or new features when reasonably possible via email.",
      },
    ],
  },
  {
    title: "Program Benefits",
    subtitle: "Maintain free access to the core platform for life!",
    bullets: [
      {
        label: "Early access",
        text: "Start using Sprout before wider availability.",
      },
      {
        label: "A voice in development",
        text: "Influence improvements based on how your business actually works.",
      },
      {
        label: "A long-term reward",
        text: "Qualifying founding customers receive lifetime free access to the core plan.",
      },
    ],
  },
  {
    title: "How to Join",
    body: `Simply use our contact form with the "Early Access" subject type. Send us a quick 1-paragraph description of yourself and your business! Nothing too specific, just let us know you're real. You'll receive an invite code to sign up with via email.`,
    cta: {
      label: "Request Early Access",
      // Opens the public contact form with the Early Access type pre-selected.
      url: "/contact?type=EARLY_ACCESS",
    },
  },
];

/**
 * Landing page for the "Early Access" public nav item (internally the beta
 * program). A placeholder for the founding-customer program details — the
 * feedback-page CTA will be added once that page exists.
 */
const BetaProgramPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM - Founding Customer Program";
  }, []);

  const history = useHistory();

  return (
    <IonPage>
      <PublicHeader />
      <IonContent className="ion-padding">
        <div className="capped-container" style={{ marginTop: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
              Founding Customer Program
            </h1>
          </div>

          {programCards.map((card) => (
            <IonCard key={card.title} style={{ marginBottom: 24 }}>
              <IonCardHeader>
                {/* iOS card headers lay out in reverse DOM order
                    (flex-direction: column-reverse), so the subtitle is written
                    first here in order to render *under* the title. */}
                {card.subtitle && (
                  <IonCardSubtitle
                    style={{
                      textTransform: "none",
                      letterSpacing: "normal",
                      fontWeight: 500,
                      color: "var(--ion-color-primary)",
                    }}
                  >
                    {card.subtitle}
                  </IonCardSubtitle>
                )}
                <IonCardTitle>{card.title}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {card.body && (
                  <IonText color="medium">
                    <p style={{ marginTop: 0 }}>{card.body}</p>
                  </IonText>
                )}
                {card.bullets && (
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 20,
                      color: "var(--ion-color-medium)",
                    }}
                  >
                    {card.bullets.map((bullet) => (
                      <li key={bullet.text} style={{ marginBottom: 8 }}>
                        {bullet.label && <strong>{bullet.label}: </strong>}
                        {bullet.text}
                      </li>
                    ))}
                  </ul>
                )}
                {card.cta && (
                  <IonButton
                    expand="block"
                    style={{ marginTop: 16 }}
                    onClick={() => history.push(card.cta!.url)}
                  >
                    {card.cta.label}
                  </IonButton>
                )}
              </IonCardContent>
            </IonCard>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default BetaProgramPage;
