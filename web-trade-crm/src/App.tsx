import { useEffect } from "react";
import {
  IonApp,
  IonRouterOutlet,
  IonSplitPane,
  IonSpinner,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Redirect, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Menu from "./components/Menu";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import CreateTenantPage from "./pages/CreateTenantPage";
import CreateJobPage from "./pages/CreateJobPage";
import CreateCustomerPage from "./pages/CreateCustomerPage";
import JobDetailPage from "./pages/JobDetailPage";
import InvoicePreviewPage from "./pages/InvoicePreviewPage";
import ManageBusinessPage from "./pages/ManageBusinessPage";
import ManageCustomersPage from "./pages/ManageCustomersPage";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import "@ionic/react/css/palettes/dark.system.css";

/* Theme variables */
import "./theme/variables.css";

setupIonicReact();

const AppContent: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM";
  }, []);

  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <IonApp>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <IonSpinner />
        </div>
      </IonApp>
    );
  }

  if (!isAuthenticated) {
    return (
      <IonApp>
        <AuthPage />
      </IonApp>
    );
  }

  // Force create tenant page if user has no tenant
  if (!user?.tenantId) {
    return (
      <IonApp>
        <CreateTenantPage />
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonReactRouter>
        <IonSplitPane contentId="main">
          <Menu />
          <IonRouterOutlet id="main">
            <Route path="/" exact={true}>
              <Redirect to="/home" />
            </Route>
            <Route path="/home" exact={true}>
              <Home />
            </Route>
            <Route path="/manage-business" exact={true}>
              <ManageBusinessPage />
            </Route>
            <Route path="/create-job" exact={true}>
              <CreateJobPage />
            </Route>
            <Route path="/create-customer" exact={true}>
              <CreateCustomerPage />
            </Route>
            <Route path="/job/:id" exact={true}>
              <JobDetailPage />
            </Route>
            <Route path="/manage-customers" exact={true}>
              <ManageCustomersPage />
            </Route>
            <Route path="/invoice-preview/:id" exact={true}>
              <InvoicePreviewPage />
            </Route>
          </IonRouterOutlet>
        </IonSplitPane>
      </IonReactRouter>
    </IonApp>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
