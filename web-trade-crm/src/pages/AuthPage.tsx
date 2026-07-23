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
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
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
      setToast("Password reset email sent! Check your inbox.");
      setMode("login");
    } catch (err: any) {
      setError(err.message || "Failed to send password reset");
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
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#1a73e8",
                margin: 0,
              }}
            >
              Trade CRM
            </h1>
            <p style={{ color: "#666", marginTop: 4 }}>
              {mode === "login"
                ? "Sign in to your account"
                : mode === "register"
                  ? "Create a new account"
                  : "Reset your password"}
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

          {mode !== "reset" && (
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
                  : handleResetPassword
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
            ) : (
              "Send Reset Email"
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
            {mode === "reset" && (
              <IonText color="primary">
                <span
                  style={{ cursor: "pointer", fontSize: 14 }}
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                >
                  Back to Sign In
                </span>
              </IonText>
            )}
            {mode !== "reset" && (
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
