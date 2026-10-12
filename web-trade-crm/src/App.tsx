import { useEffect } from "react";
import {
  IonApp,
  IonRouterOutlet,
  IonSplitPane,
  IonSpinner,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Redirect, Route, Switch } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Menu from "./components/Menu";
import PublicMenu from "./components/PublicMenu";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import BetaProgramPage from "./pages/BetaProgramPage";
import Home from "./pages/Home";
import CreateTenantPage from "./pages/CreateTenantPage";
import CreateJobPage from "./pages/CreateJobPage";
import CustomerFormPage from "./pages/CustomerFormPage";
import JobDetailPage from "./pages/JobDetailPage";
import InvoicePreviewPage from "./pages/InvoicePreviewPage";
import ManageBusinessPage from "./pages/ManageBusinessPage";
import ManageCustomersPage from "./pages/ManageCustomersPage";
import ManageCatalogPage from "./pages/ManageCatalogPage";
import CatalogItemFormPage from "./pages/CatalogItemFormPage";
import FeedbackPage from "./pages/FeedbackPage";

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

// Force iOS mode for every Ionic component so the UI looks identical across
// platforms (desktop browsers would otherwise default to Material Design).
setupIonicReact({ mode: "ios" });

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

  return (
    <IonApp>
      <IonReactRouter>
        {isAuthenticated && user?.tenantId ? (
          <IonSplitPane contentId="main">
            <Menu />
            <IonRouterOutlet id="main">
              <Route path="/manage-jobs" exact={true}>
                <Home />
              </Route>
              <Route path="/manage-business" exact={true}>
                <ManageBusinessPage />
              </Route>
              <Route path="/create-job" exact={true}>
                <CreateJobPage />
              </Route>
              <Route path="/create-customer" exact={true}>
                <CustomerFormPage />
              </Route>
              <Route path="/edit-customer/:id" exact={true}>
                <CustomerFormPage />
              </Route>
              <Route path="/job/:id" exact={true}>
                <JobDetailPage />
              </Route>
              <Route path="/manage-customers" exact={true}>
                <ManageCustomersPage />
              </Route>
              <Route path="/manage-catalog" exact={true}>
                <ManageCatalogPage />
              </Route>
              <Route path="/create-catalog-item" exact={true}>
                <CatalogItemFormPage />
              </Route>
              <Route path="/edit-catalog-item/:id" exact={true}>
                <CatalogItemFormPage />
              </Route>
              <Route path="/feedback" exact={true}>
                <FeedbackPage />
              </Route>
              <Route path="/invoice-preview/:id" exact={true}>
                <InvoicePreviewPage />
              </Route>
              <Route>
                <Redirect to="/manage-jobs" />
              </Route>
            </IonRouterOutlet>
          </IonSplitPane>
        ) : isAuthenticated && !user?.tenantId ? (
          <Switch>
            <Route path="/create-tenant" exact={true}>
              <CreateTenantPage />
            </Route>
            <Route>
              <Redirect to="/create-tenant" />
            </Route>
          </Switch>
        ) : (
          <IonSplitPane contentId="public-main" when={false}>
            <PublicMenu />
            {/* animated={false}: the public space is a simple header menu, so the
                iOS page-slide transition just looks out of place on desktop. */}
            <IonRouterOutlet id="public-main" animated={false}>
              <Route path="/" exact={true}>
                <LandingPage />
              </Route>
              <Route path="/beta-program" exact={true}>
                <BetaProgramPage />
              </Route>
              <Route path="/sign-in" exact={true}>
                <AuthPage />
              </Route>
              <Route>
                <Redirect to="/" />
              </Route>
            </IonRouterOutlet>
          </IonSplitPane>
        )}
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
