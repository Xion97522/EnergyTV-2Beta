/**
 * SignIn.tsx
 * ----------
 * Full-screen sign-in page that matches EnergyTV's dark neon-green aesthetic.
 * Route: /signin
 *
 * Usage in App.tsx:
 *   import SignIn from "@/pages/SignIn";
 *   <Route path="/signin" component={SignIn} />
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SignIn() {
  const { user, loading, signIn } = useAuth();
  const [, navigate] = useLocation();

  // If already signed in, go home
  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(57,255,20,0.07) 0%, transparent 70%), #040509",
      }}
    >
      {/* Glowing card */}
      <div
        className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center gap-6 text-center"
        style={{
          background: "rgba(10,12,18,0.85)",
          border: "1px solid rgba(57,255,20,0.18)",
          boxShadow:
            "0 0 60px rgba(57,255,20,0.06), 0 2px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
          backdropFilter: "blur(32px)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(145deg, hsl(112,100%,54%), hsl(112,100%,30%))",
              boxShadow:
                "0 0 32px rgba(57,255,20,0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            <Zap className="w-8 h-8 text-black fill-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Energy
              <span style={{ color: "hsl(112,100%,54%)" }}>TV</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Stream with the world's most electrifying content
            </p>
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-full h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(57,255,20,0.2), transparent)",
          }}
        />

        {/* Sign-in copy */}
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-white">
            Sign in to continue
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your watchlist, preferences, and playback history follow you
            everywhere.
          </p>
        </div>

        {/* Google Sign-In button */}
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 select-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.background = "rgba(255,255,255,0.10)";
            el.style.borderColor = "rgba(57,255,20,0.35)";
            el.style.boxShadow = "0 0 20px rgba(57,255,20,0.08)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.background = "rgba(255,255,255,0.06)";
            el.style.borderColor = "rgba(255,255,255,0.12)";
            el.style.boxShadow = "";
          }}
        >
          {/* Google "G" SVG — official brand colors */}
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Footer note */}
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          By signing in you agree to our{" "}
          <span
            className="underline underline-offset-2 cursor-pointer"
            style={{ color: "hsl(112,100%,54%)" }}
          >
            Terms
          </span>{" "}
          and{" "}
          <span
            className="underline underline-offset-2 cursor-pointer"
            style={{ color: "hsl(112,100%,54%)" }}
          >
            Privacy Policy
          </span>
          .
        </p>
      </div>
    </div>
  );
}
