import { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonText,
  useIonViewWillEnter,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { api, CustomerResult } from "../services/api";
import CustomerSearch from "../components/CustomerSearch";
import CustomerTable from "../components/CustomerTable";
import AppFooter from "../components/AppFooter";

const CUSTOMERS_TABLE_PAGE_SIZE = 10;

/**
 * Customers list. Selecting a customer (from the search box or the table)
 * opens the customer editor on its own screen — `/edit-customer/:id` — the same
 * way Catalog and Jobs do, rather than editing inline on this page.
 */
const ManageCustomersPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM - Manage Customers";
  }, []);

  const history = useHistory();
  const [customersList, setCustomersList] = useState<CustomerResult[]>([]);
  const [customersPage, setCustomersPage] = useState(1);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [customersTotalPages, setCustomersTotalPages] = useState(1);
  const [customersLoading, setCustomersLoading] = useState(false);

  const loadCustomersTable = async (pageNum: number) => {
    setCustomersLoading(true);
    try {
      const res = await api.fetchCustomers(
        pageNum,
        CUSTOMERS_TABLE_PAGE_SIZE,
      );
      setCustomersList(res.data);
      setCustomersTotal(res.meta.total);
      setCustomersTotalPages(res.meta.totalPages);
    } catch {
      setCustomersList([]);
      setCustomersTotal(0);
      setCustomersTotalPages(1);
    } finally {
      setCustomersLoading(false);
    }
  };

  useIonViewWillEnter(() => {
    setCustomersPage(1);
    loadCustomersTable(1);
  });

  const handleCustomersPageChange = (nextPage: number) => {
    setCustomersPage(nextPage);
    loadCustomersTable(nextPage);
  };

  const openCustomer = (customer: CustomerResult) => {
    history.push(`/edit-customer/${customer.id}`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Manage Customers</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="page-container">
          <CustomerSearch onSelect={openCustomer} />

          {/* All Customers — paginated table (history view) */}
          <div style={{ margin: "16px 0 8px" }}>
            <IonText color="medium">
              <small>
                <strong>All Customers</strong>
              </small>
            </IonText>
          </div>
          <CustomerTable
            data={customersList}
            loading={customersLoading}
            page={customersPage}
            pageSize={CUSTOMERS_TABLE_PAGE_SIZE}
            total={customersTotal}
            totalPages={customersTotalPages}
            onPageChange={handleCustomersPageChange}
            onSelectCustomer={openCustomer}
            emptyMessage="No customers found."
          />
        </div>
      </IonContent>
      <AppFooter />
    </IonPage>
  );
};

export default ManageCustomersPage;
