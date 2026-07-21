import React, { useState } from "react";
import {
  IonContent,
  IonPage,
  IonCard,
  IonCardContent,
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

const AuthPage: React.FC = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
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
          <IonCard>
            <IonCardContent>
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
                    : "Create a new account"}
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

              <IonItem>
                <IonLabel position="stacked">Password</IonLabel>
                <IonInput
                  type="password"
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value!)}
                  placeholder="••••••••"
                />
              </IonItem>

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
                onClick={mode === "login" ? handleLogin : handleRegister}
                disabled={loading}
                style={{ marginTop: 16 }}
              >
                {loading ? (
                  <IonSpinner />
                ) : mode === "login" ? (
                  "Sign In"
                ) : (
                  "Register"
                )}
              </IonButton>

              <div style={{ textAlign: "center", marginTop: 12 }}>
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
              </div>
            </IonCardContent>
          </IonCard>
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
