import { useState, useRef } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonText,
  useIonViewWillEnter,
} from "@ionic/react";
import { useParams } from "react-router-dom";
import { getPdfBlob } from "../services/pdfCache";

const InvoicePreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const blobUrlRef = useRef<string | null>(null);

  useIonViewWillEnter(() => {
    setError("");
    setObjectUrl(null);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    (async () => {
      try {
        const blob = await getPdfBlob(id);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setObjectUrl(url);
      } catch {
        setError("Failed to load PDF");
      }
    })();
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
          <IonTitle>Invoice Preview</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {!objectUrl && !error && (
          <div style={{ textAlign: "center", padding: "32px" }}>
            <IonSpinner />
          </div>
        )}
        {error && (
          <div style={{ textAlign: "center", padding: "32px" }}>
            <IonText color="danger">{error}</IonText>
          </div>
        )}
        {objectUrl && (
          <iframe
            src={objectUrl}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            title="Invoice PDF"
          />
        )}
      </IonContent>
    </IonPage>
  );
};

export default InvoicePreviewPage;
