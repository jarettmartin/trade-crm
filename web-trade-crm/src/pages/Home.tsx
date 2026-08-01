import { useState, useEffect } from "react";
import {
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonSpinner,
  IonText,
  IonToast,
  IonChip,
  IonIcon,
  IonSelect,
  IonSelectOption,
  useIonViewWillEnter,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { calendarOutline } from "ionicons/icons";
import { api, JobResult } from "../services/api";

const statusLabel: Record<string, string> = {
  ALL: "All Statuses",
  DRAFT: "Draft",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusColor: Record<string, string> = {
  DRAFT: "medium",
  ASSIGNED: "primary",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const Home: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM - Manage Jobs";
  }, []);

  const history = useHistory();
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadJobs = async (
    pageNum: number,
    append: boolean,
    status?: string,
  ) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const filterStatus = status && status !== "ALL" ? status : undefined;
      const res = await api.fetchJobs(pageNum, 5, filterStatus);
      if (append) {
        setJobs((prev) => [...prev, ...res.data]);
      } else {
        setJobs(res.data);
      }
      setHasMore(pageNum < res.meta.totalPages);
      if (append && res.data.length === 0) {
        setToastMessage("No more jobs found");
        setShowToast(true);
      }
    } catch {
      if (append) {
        setToastMessage("No more jobs found");
        setShowToast(true);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useIonViewWillEnter(() => {
    setPage(1);
    loadJobs(1, false, statusFilter);
  });

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    loadJobs(1, false, value);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadJobs(nextPage, true, statusFilter);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Manage Jobs</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="page-container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <IonText color="medium">
                <small>Filter by status</small>
              </IonText>
              <IonSelect
                value={statusFilter}
                onIonChange={(e) => handleStatusChange(e.detail.value)}
                interface="popover"
                style={{ minWidth: "120px" }}
              >
                <IonSelectOption value="ALL">All Statuses</IonSelectOption>
                <IonSelectOption value="DRAFT">Draft</IonSelectOption>
                <IonSelectOption value="ASSIGNED">Assigned</IonSelectOption>
                <IonSelectOption value="IN_PROGRESS">
                  In Progress
                </IonSelectOption>
                <IonSelectOption value="COMPLETED">Completed</IonSelectOption>
                <IonSelectOption value="CANCELLED">Cancelled</IonSelectOption>
              </IonSelect>
            </div>
            <IonButton
              size="small"
              fill="outline"
              onClick={() => history.push("/create-job")}
            >
              New Job
            </IonButton>
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "32px" }}>
              <IonSpinner />
            </div>
          )}

          {!loading && jobs.length === 0 && (
            <IonText color="medium">
              <p style={{ textAlign: "center", marginTop: "32px" }}>
                No jobs found.
              </p>
            </IonText>
          )}

          {jobs.map((job) => (
            <IonCard
              key={job.id}
              button
              onClick={() => history.push(`/job/${job.id}`)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  padding: "16px 16px 0 16px",
                  marginBottom: "4px",
                }}
              >
                <IonChip color={statusColor[job.status] || "medium"}>
                  {statusLabel[job.status] || job.status}
                </IonChip>
              </div>
              <IonCardHeader>
                <IonCardTitle>{job.title}</IonCardTitle>
                <IonCardSubtitle>
                  {job.customer.firstName} {job.customer.lastName}
                  {job.customer.companyName
                    ? ` — ${job.customer.companyName}`
                    : ""}
                </IonCardSubtitle>
              </IonCardHeader>
              <IonCardContent>
                {job.description && (
                  <IonText color="medium">
                    <p style={{ margin: "0 0 8px 0" }}>{job.description}</p>
                  </IonText>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <IonIcon icon={calendarOutline} size="small" color="medium" />
                  <IonText color="medium">
                    <small>{formatDate(job.createdAt)}</small>
                  </IonText>
                </div>
              </IonCardContent>
            </IonCard>
          ))}

          {hasMore && jobs.length > 0 && (
            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <IonButton
                fill="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? <IonSpinner /> : "Load More"}
              </IonButton>
            </div>
          )}
        </div>

        <IonToast
          isOpen={showToast}
          message={toastMessage}
          duration={3000}
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Home;
