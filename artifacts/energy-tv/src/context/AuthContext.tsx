/**
 * AuthContext.tsx
 * ---------------
 * Wraps Google Identity Services (GSI) One-Tap / popup flow.
 * Add `<AuthProvider>` around your app in main.tsx or App.tsx,
 * then use `useAuth()` anywhere to get the current user.
 *
 * Setup:
 *   1. npm install @react-oauth/google
 *   2. Wrap <App /> with <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
 *      (or just use the plain GSI script tag approach below — no extra package needed)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GoogleUser {
  sub: string;          // unique Google user id
  email: string;
  name: string;
  picture: string;      // avatar URL
  given_name: string;
  family_name: string;
}

interface AuthState {
  user: GoogleUser | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLIENT_ID =
  "679978786947-kg4mi20712i0fhfl2klnnrtl14opkvjf.apps.googleusercontent.com";

const STORAGE_KEY = "energytv_google_user";

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signIn: () => {},
  signOut: () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Restore persisted session ────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      /* ignore malformed data */
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load the GSI script once ─────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById("gsi-script")) return;

    const script = document.createElement("script");
    script.id = "gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // ── Handle credential response ───────────────────────────────────────────
  const handleCredentialResponse = useCallback(
    (response: { credential: string }) => {
      // Decode the JWT payload (no signature verification needed here —
      // for production you should verify on your backend).
      const payload = JSON.parse(atob(response.credential.split(".")[1]));
      const googleUser: GoogleUser = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        given_name: payload.given_name ?? "",
        family_name: payload.family_name ?? "",
      };
      setUser(googleUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser));
    },
    []
  );

  // ── Sign-in: open Google popup ───────────────────────────────────────────
  const signIn = useCallback(() => {
    const google = (window as any).google;
    if (!google?.accounts?.id) {
      console.error("GSI not loaded yet — try again in a moment.");
      return;
    }

    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    google.accounts.id.prompt(); // shows One-Tap; falls back to popup
  }, [handleCredentialResponse]);

  // ── Sign-out ─────────────────────────────────────────────────────────────
  const signOut = useCallback(() => {
    const google = (window as any).google;
    if (google?.accounts?.id) {
      google.accounts.id.disableAutoSelect();
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}
