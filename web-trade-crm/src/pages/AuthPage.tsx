import React, { useState } from "react";
import {
  IonContent,
  IonPage,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonToast,
  IonSpinner,
} from "@ionic/react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { isValidEmail } from "../services/validation";

const AuthPage: React.FC = () => {
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
      <IonContent
        className="ion-padding"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <div style={{ maxWidth: 400, width: "100%", margin: "auto" }}>
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--ion-color-primary)",
                margin: 0,
              }}
            >
              Sprout CRM
            </h1>
            <p
              style={{
                color: "#666",
                marginTop: 4,
                fontSize: 15,
              }}
            >
              Simple customer management and invoicing for growing businesses.
            </p>
          </div>

          <div style={{ textAlign: "center", marginTop: 48, marginBottom: 24 }}>
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
            <IonItem>
              <IonLabel position="stacked">Invite Code</IonLabel>
              <IonInput
                value={inviteCode}
                onIonInput={(e) => setInviteCode(e.detail.value!)}
                placeholder="Enter your invite code"
              />
            </IonItem>
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
            disabled={loading}
            style={{ marginTop: 16 }}
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
    </IonPage>
  );
};

export default AuthPage;
