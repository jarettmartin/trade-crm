import { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonText,
  IonNote,
  IonSpinner,
  IonToast,
  useIonViewWillEnter,
} from "@ionic/react";
import { api, FeedbackResult } from "../services/api";
import PaginatedTable from "../components/PaginatedTable";
import AppFooter from "../components/AppFooter";

const PAGE_SIZE = 10;
const MESSAGE_MAX_LENGTH = 1000;
const SUBJECT_MAX_LENGTH = 255;

const FEEDBACK_TYPES = [
  "FEEDBACK",
  "BUG",
  "FEATURE_REQUEST",
  "CONTACT",
] as const;

const typeLabel: Record<string, string> = {
  FEEDBACK: "Feedback",
  BUG: "Bug",
  FEATURE_REQUEST: "Feature request",
  CONTACT: "Contact",
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const FeedbackPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM - Feedback";
  }, []);

  const [type, setType] = useState<string>("FEEDBACK");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [submissions, setSubmissions] = useState<FeedbackResult[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastIsError, setToastIsError] = useState(false);

  const showToastMsg = (msg: string, isError = true) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setShowToast(true);
  };

  const loadSubmissions = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await api.fetchFeedback(pageNum, PAGE_SIZE);
      setSubmissions(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
      setPage(pageNum);
    } catch {
      setSubmissions([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Refresh on every view enter so submissions made elsewhere (or in a prior
  // session) show up when the page is revisited.
  useIonViewWillEnter(() => {
    loadSubmissions(1);
  });

  const trimmedMessage = message.trim();
  const isValid =
    trimmedMessage.length > 0 && trimmedMessage.length <= MESSAGE_MAX_LENGTH;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await api.submitFeedback({
        type,
        subject: subject.trim() || undefined,
        message: trimmedMessage,
      });
      setSubject("");
      setMessage("");

      showToastMsg("Thanks! Your submission was sent.", false);
      // Newest-first, so the new submission is on the first page.
      await loadSubmissions(1);
    } catch (err) {
      showToastMsg(
        err instanceof Error ? err.message : "Failed to send feedback",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Feedback</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="page-container" style={{ marginTop: "20px" }}>
          <div className="capped-container">
            <IonText color="medium">
              <p style={{ margin: "0 0 12px", fontSize: "0.875rem" }}>
                Send us feedback, report a bug, request a feature, or ask us to
                get in touch.
              </p>
            </IonText>

            <div className="form-card">
              <IonItem>
                <IonLabel position="stacked">
                  Type <IonText color="danger">*</IonText>
                </IonLabel>
                <IonSelect
                  value={type}
                  onIonChange={(e) => setType(e.detail.value)}
                  interface="popover"
                >
                  {FEEDBACK_TYPES.map((t) => (
                    <IonSelectOption key={t} value={t}>
                      {typeLabel[t]}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Subject</IonLabel>
                <IonInput
                  value={subject}
                  maxlength={SUBJECT_MAX_LENGTH}
                  onIonInput={(e) => setSubject(e.detail.value || "")}
                  placeholder="Optional short summary"
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">
                  Message <IonText color="danger">*</IonText>
                </IonLabel>
                <IonTextarea
                  rows={5}
                  value={message}
                  maxlength={MESSAGE_MAX_LENGTH}
                  onIonInput={(e) => setMessage(e.detail.value || "")}
                  placeholder="Tell us what's on your mind..."
                />
              </IonItem>

              <IonNote
                color={
                  message.length > MESSAGE_MAX_LENGTH ? "danger" : "medium"
                }
                style={{ display: "block", margin: "4px 16px 0", fontSize: 12 }}
              >
                {message.length}/{MESSAGE_MAX_LENGTH} characters
              </IonNote>
            </div>

            <IonButton
              expand="block"
              onClick={handleSubmit}
              disabled={submitting || !isValid}
              style={{ marginTop: 20 }}
              data-testid="submit-feedback"
            >
              {submitting ? <IonSpinner /> : "Send Feedback"}
            </IonButton>
          </div>
        </div>

        <div style={{ marginTop: "32px" }}>
          <IonText color="medium">
            <p style={{ margin: "0 0 8px", fontSize: "0.875rem" }}>
              Your submissions (newest first)
            </p>
          </IonText>

          <PaginatedTable
            columns={[
              {
                label: "Type",
                render: (item) => typeLabel[item.type] ?? item.type,
              },
              {
                label: "Subject",
                render: (item) => item.subject || "—",
              },
              {
                label: "Message",
                render: (item) => (
                  <span>
                    {item.message.length > 120
                      ? `${item.message.slice(0, 120)}…`
                      : item.message}
                  </span>
                ),
              },
              {
                label: "Submitted",
                render: (item) => formatDate(item.createdAt),
              },
            ]}
            data={submissions}
            loading={loading}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            totalPages={totalPages}
            onPageChange={(nextPage) => loadSubmissions(nextPage)}
            rowKey={(item) => item.id}
            emptyMessage="No submissions yet."
          />
        </div>

        <IonToast
          isOpen={showToast}
          message={toastMessage}
          color={toastIsError ? "danger" : "success"}
          duration={toastIsError ? undefined : 5000}
          buttons={
            toastIsError
              ? [{ text: "Dismiss", handler: () => setShowToast(false) }]
              : undefined
          }
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
      <AppFooter />
    </IonPage>
  );
};

export default FeedbackPage;
