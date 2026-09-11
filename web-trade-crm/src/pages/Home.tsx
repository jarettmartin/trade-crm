import { useState, useEffect } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonText,
  IonChip,
  IonSelect,
  IonSelectOption,
  useIonViewWillEnter,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { api, JobResult } from "../services/api";
import PaginatedTable, {
  PaginatedTableColumn,
} from "../components/PaginatedTable";

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

const JOBS_TABLE_PAGE_SIZE = 10;

const Home: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM - Manage Jobs";
  }, []);

  const history = useHistory();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tableJobs, setTableJobs] = useState<JobResult[]>([]);
  const [tablePage, setTablePage] = useState(1);
  const [tableTotal, setTableTotal] = useState(0);
  const [tableTotalPages, setTableTotalPages] = useState(1);
  const [tableLoading, setTableLoading] = useState(false);

  const loadJobsTable = async (pageNum: number, status?: string) => {
    setTableLoading(true);
    try {
      const filterStatus = status && status !== "ALL" ? status : undefined;
      const res = await api.fetchJobs(
        pageNum,
        JOBS_TABLE_PAGE_SIZE,
        filterStatus,
      );
      setTableJobs(res.data);
      setTableTotal(res.meta.total);
      setTableTotalPages(res.meta.totalPages);
    } catch {
      setTableJobs([]);
      setTableTotal(0);
      setTableTotalPages(1);
    } finally {
      setTableLoading(false);
    }
  };

  useIonViewWillEnter(() => {
    setTablePage(1);
    loadJobsTable(1, statusFilter);
  });

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setTablePage(1);
    loadJobsTable(1, value);
  };

  const handleTablePageChange = (nextPage: number) => {
    setTablePage(nextPage);
    loadJobsTable(nextPage, statusFilter);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const jobTableColumns: PaginatedTableColumn<JobResult>[] = [
    {
      label: "Job",
      render: (job) => <span style={{ fontWeight: 600 }}>{job.title}</span>,
    },
    {
      label: "Customer",
      render: (job) => (
        <>
          {job.customer.firstName} {job.customer.lastName}
          {job.customer.companyName ? ` — ${job.customer.companyName}` : ""}
        </>
      ),
    },
    {
      label: "Status",
      render: (job) => (
        <IonChip
          color={statusColor[job.status] || "medium"}
          style={{ margin: 0 }}
        >
          {statusLabel[job.status] || job.status}
        </IonChip>
      ),
    },
    {
      label: "Created",
      render: (job) => formatDate(job.createdAt),
    },
  ];

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

          {/* All Jobs — paginated table (history view) */}
          <div style={{ marginBottom: "8px" }}>
            <IonText color="medium">
              <small>
                <strong>All Jobs</strong>
              </small>
            </IonText>
          </div>
          <PaginatedTable
            columns={jobTableColumns}
            data={tableJobs}
            loading={tableLoading}
            page={tablePage}
            pageSize={JOBS_TABLE_PAGE_SIZE}
            total={tableTotal}
            totalPages={tableTotalPages}
            onPageChange={handleTablePageChange}
            rowKey={(job) => job.id}
            onRowClick={(job) => history.push(`/job/${job.id}`)}
            emptyMessage="No jobs found."
          />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
