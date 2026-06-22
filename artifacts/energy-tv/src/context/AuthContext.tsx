/**
 * AuthContext.tsx  (updated — adds Google Drive token for cloud sync)
 * -------------------------------------------------------------------
 * Key change: after the user signs in via One-Tap we also request an
 * OAuth2 access token with the drive.appdata scope so the cloud sync
 * hook can read/write the user's App Data folder.
 *
 * The token is exposed as `driveToken` and refreshed automatically
 * when it expires (Google tokens last ~1 hour).
 *
 * CLIENT_ID must have:
 *   - Authorised JavaScript origin for your GitHub Pages URL
 *   - Google Drive API enabled with scope:
 *     https://www.googleapis.com/auth/drive.appdata
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GoogleUser {
  sub:          string;
  email:        string;
  name:         string;
  picture:      string;
  given_name:   string;
  family_name:  string;
}

interface AuthState {
  user:        GoogleUser | null;
  driveToken:  string | null;   // access token for Google Drive API
  loading:     boolean;
  signIn:      () => void;
  signOut:     () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLIENT_ID =
  "679978786947-kg4mi20712i0fhfl2klnnrtl14opkvjf.apps.googleusercontent.com";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

const USER_KEY  = "energytv_google_user";
const TOKEN_KEY = "energytv_drive_token";

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  user:       null,
  driveToken: null,
  loading:    true,
  signIn:  () => {},
  signOut: () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,       setUser]       = useState<GoogleUser | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);

  // Token client ref (GIS token flow)
  const tokenClientRef = useRef<any>(null);

  // ── Restore persisted session on mount ──────────────────────────────────
  useEffect(() => {
    try {
      const storedUser  = localStorage.getItem(USER_KEY);
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedUser)  setUser(JSON.parse(storedUser));
      if (storedToken) setDriveToken(storedToken);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // ── Load the GIS script once ─────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById("gsi-script")) return;
    const script = document.createElement("script");
    script.id    = "gsi-script";
    script.src   = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // ── Request Drive access token after sign-in ────────────────────────────
  const requestDriveToken = useCallback(() => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) return;

    if (!tokenClientRef.current) {
      tokenClientRef.current = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope:     DRIVE_SCOPE,
        callback:  (resp: { access_token?: string; error?: string }) => {
          if (resp.access_token) {
            setDriveToken(resp.access_token);
            localStorage.setItem(TOKEN_KEY, resp.access_token);
            // Tokens expire in ~1hr; clear from storage after 55 min
            setTimeout(() => {
              localStorage.removeItem(TOKEN_KEY);
              setDriveToken(null);
            }, 55 * 60 * 1000);
          }
        },
      });
    }
    // prompt: false = silent grant if already consented; falls back to popup
    tokenClientRef.current.requestAccessToken({ prompt: "" });
  }, []);

  // ── Handle One-Tap credential response ──────────────────────────────────
  const handleCredentialResponse = useCallback(
    (response: { credential: string }) => {
      const payload     = JSON.parse(atob(response.credential.split(".")[1]));
      const googleUser: GoogleUser = {
        sub:         payload.sub,
        email:       payload.email,
        name:        payload.name,
        picture:     payload.picture,
        given_name:  payload.given_name  ?? "",
        family_name: payload.family_name ?? "",
      };
      setUser(googleUser);
      localStorage.setItem(USER_KEY, JSON.stringify(googleUser));

      // Now silently fetch a Drive token
      // Small delay to ensure GIS token client is ready
      setTimeout(requestDriveToken, 500);
    },
    [requestDriveToken]
  );

  // ── Sign-in ──────────────────────────────────────────────────────────────
  const signIn = useCallback(() => {
    const google = (window as any).google;
    if (!google?.accounts?.id) {
      console.error("GSI not loaded yet — try again in a moment.");
      return;
    }
    google.accounts.id.initialize({
      client_id:            CLIENT_ID,
      callback:             handleCredentialResponse,
      auto_select:          false,
      cancel_on_tap_outside: true,
    });
    google.accounts.id.prompt();
  }, [handleCredentialResponse]);

  // ── Sign-out ─────────────────────────────────────────────────────────────
  const signOut = useCallback(() => {
    const google = (window as any).google;
    if (google?.accounts?.id)    google.accounts.id.disableAutoSelect();
    if (google?.accounts?.oauth2 && driveToken)
      google.accounts.oauth2.revoke(driveToken, () => {});

    setUser(null);
    setDriveToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }, [driveToken]);

  return (
    <AuthContext.Provider value={{ user, driveToken, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}
