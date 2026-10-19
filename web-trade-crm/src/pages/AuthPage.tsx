import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonPage,
  IonSpinner,
  IonText,
  IonToast,
} from "@ionic/react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { isValidEmail } from "../services/validation";
import PublicHeader from "../components/PublicHeader";
import PrivacyPolicy from "../legal/PrivacyPolicy";
import TermsOfService from "../legal/TermsOfService";
import AppFooter from "../components/AppFooter";

/**
 * A consent row for the signup form: a checkbox plus a button that opens the
 * document in a modal so it can be read before agreeing. A real `<button>` (not
 * a span) keeps it keyboard-reachable and unambiguous next to the checkbox.
 */
const LegalConsent: React.FC<{
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onOpen: () => void;
  label: string;
  linkLabel: string;
}> = ({ checked, onCheckedChange, onOpen, label, linkLabel }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      margin: "12px 16px 0",
    }}
  >
    <IonCheckbox
      checked={checked}
      onIonChange={(e) => onCheckedChange(e.detail.checked)}
      aria-label={`${label} ${linkLabel}`}
    />
    <span style={{ fontSize: 14, color: "var(--ion-color-medium)" }}>
      {label}{" "}
      <button
        type="button"
        onClick={onOpen}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          font: "inherit",
          color: "var(--ion-color-primary)",
          textDecoration: "underline",
          cursor: "pointer",
        }}
      >
        {linkLabel}
      </button>
    </span>
  </div>
);

const AuthPage: React.FC = () => {
  useEffect(() => {
    document.title = "Sprout CRM - Sign In";
  }, []);
  const history = useHistory();
  const { login } = useAuth();
  const [mode, setMode] = useState<
    "login" | "register" | "reset" | "reset-confirm"
  >("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  // Signup consent: each document opens in a modal from its consent row.
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [openDocument, setOpenDocument] = useState<
    null | "privacy" | "terms"
  >(null);

  const agreementsAccepted = agreedToPrivacy && agreedToTerms;

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !inviteCode) {
      setError("All fields are required");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!agreementsAccepted) {
      setError(
        "Please agree to the Privacy Policy and Terms of Service to create an account",
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.register({ email, password, inviteCode });
      setToast(
        "Registration successful! Please check your email to verify your account before signing in.",
      );
      setMode("login");
      setInviteCode("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.sendPasswordResetEmail(email);
      setToast("Password reset code sent! Check your inbox.");
      setMode("reset-confirm");
    } catch (err: any) {
      setError(err.message || "Failed to send password reset");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!resetCode || !newPassword) {
      setError("Code and new password are required");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.confirmPasswordReset(email, resetCode, newPassword);
      setToast("Password reset successfully! You can now sign in.");
      setMode("login");
      setResetCode("");
      setNewPassword("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <PublicHeader />
      <IonContent className="ion-padding center-content">
        <div className="capped-container">
          <div style={{ textAlign: "center" }}>
            <img
              src="/logowithname.png"
              alt="Sprout CRM"
              style={{
                maxWidth: "240px",
                height: "auto",
                cursor: "pointer",
              }}
              onClick={() => history.push("/")}
            />
            <p
              style={{
                color: "#666",
                marginTop: 8,
                fontSize: 15,
              }}
            >
              Simple customer management and invoicing for growing businesses.
            </p>
          </div>

          <div style={{ textAlign: "center", marginTop: 24, marginBottom: 24 }}>
            <p style={{ color: "#666", margin: 0 }}>
              {mode === "login"
                ? "Sign in to your account"
                : mode === "register"
                  ? "Create a new account"
                  : mode === "reset"
                    ? "Reset your password"
                    : "Enter the code from your email"}
            </p>
          </div>

          <IonItem>
            <IonLabel position="stacked">Email</IonLabel>
            <IonInput
              type="email"
              value={email}
              onIonInput={(e) => setEmail(e.detail.value!)}
              placeholder="you@example.com"
            />
          </IonItem>

          {mode !== "reset" && mode !== "reset-confirm" && (
            <IonItem>
              <IonLabel position="stacked">Password</IonLabel>
              <IonInput
                type="password"
                value={password}
                onIonInput={(e) => setPassword(e.detail.value!)}
                placeholder="••••••••"
              />
            </IonItem>
          )}

          {mode === "register" && (
            <>
              <IonItem>
                <IonLabel position="stacked">Invite Code</IonLabel>
                <IonInput
                  value={inviteCode}
                  onIonInput={(e) => setInviteCode(e.detail.value!)}
                  placeholder="Enter your invite code"
                />
              </IonItem>

              <LegalConsent
                checked={agreedToPrivacy}
                onCheckedChange={setAgreedToPrivacy}
                onOpen={() => setOpenDocument("privacy")}
                label="I have read and agree to the"
                linkLabel="Privacy Policy"
              />
              <LegalConsent
                checked={agreedToTerms}
                onCheckedChange={setAgreedToTerms}
                onOpen={() => setOpenDocument("terms")}
                label="I have read and agree to the"
                linkLabel="Terms of Service"
              />
            </>
          )}

          {mode === "reset-confirm" && (
            <>
              <IonItem>
                <IonLabel position="stacked">Reset Code</IonLabel>
                <IonInput
                  value={resetCode}
                  onIonInput={(e) => setResetCode(e.detail.value!)}
                  placeholder="Enter the code from your email"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">New Password</IonLabel>
                <IonInput
                  type="password"
                  value={newPassword}
                  onIonInput={(e) => setNewPassword(e.detail.value!)}
                  placeholder="••••••••"
                />
              </IonItem>
            </>
          )}

          {error && (
            <IonText color="danger">
              <p style={{ fontSize: 13, margin: "8px 0 0" }}>{error}</p>
            </IonText>
          )}

          <IonButton
            expand="block"
            onClick={
              mode === "login"
                ? handleLogin
                : mode === "register"
                  ? handleRegister
                  : mode === "reset"
                    ? handleResetPassword
                    : handleConfirmReset
            }
            disabled={loading || (mode === "register" && !agreementsAccepted)}
            style={{ marginTop: 16 }}
            data-testid="auth-submit"
          >
            {loading ? (
              <IonSpinner />
            ) : mode === "login" ? (
              "Sign In"
            ) : mode === "register" ? (
              "Register"
            ) : mode === "reset" ? (
              "Send Reset Code"
            ) : (
              "Reset Password"
            )}
          </IonButton>

          <div style={{ textAlign: "center", marginTop: 12 }}>
            {mode === "login" && (
              <div style={{ marginBottom: "8px" }}>
                <IonText color="primary">
                  <span
                    style={{ cursor: "pointer", fontSize: 14 }}
                    onClick={() => {
                      setMode("reset");
                      setError("");
                    }}
                  >
                    Forgot Password?
                  </span>
                </IonText>
              </div>
            )}
            {(mode === "reset" || mode === "reset-confirm") && (
              <IonText color="primary">
                <span
                  style={{ cursor: "pointer", fontSize: 14 }}
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setResetCode("");
                    setNewPassword("");
                  }}
                >
                  Back to Sign In
                </span>
              </IonText>
            )}
            {mode !== "reset" && mode !== "reset-confirm" && (
              <IonText color="primary">
                <span
                  style={{ cursor: "pointer", fontSize: 14 }}
                  onClick={toggleMode}
                >
                  {mode === "login"
                    ? "Don't have an account? Register"
                    : "Already have an account? Sign In"}
                </span>
              </IonText>
            )}
          </div>
        </div>

        <IonToast
          isOpen={!!toast}
          message={toast}
          duration={6000}
          onDidDismiss={() => setToast("")}
          color="success"
        />
      </IonContent>

      <AppFooter />

      {/* The legal documents, opened from the signup consent rows. */}
      <IonModal
        isOpen={openDocument === "privacy"}
        onDidDismiss={() => setOpenDocument(null)}
      >
        <PrivacyPolicy onClose={() => setOpenDocument(null)} />
      </IonModal>
      <IonModal
        isOpen={openDocument === "terms"}
        onDidDismiss={() => setOpenDocument(null)}
      >
        <TermsOfService onClose={() => setOpenDocument(null)} />
      </IonModal>
    </IonPage>
  );
};

export default AuthPage;
