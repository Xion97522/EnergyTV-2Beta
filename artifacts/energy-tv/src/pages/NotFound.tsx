import { Link } from "wouter";
import { Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, hsl(112,100%,54%), hsl(112,100%,38%))",
          boxShadow: "0 0 30px hsl(112 100% 54% / 0.4)",
        }}
      >
        <Zap className="w-8 h-8 text-black fill-black" />
      </div>
      <div className="text-center">
        <h1 className="text-6xl font-black neon-text" style={{ color: "hsl(112,100%,54%)" }}>404</h1>
        <p className="text-lg font-semibold text-foreground mt-2">Page not found</p>
        <p className="text-sm text-muted-foreground mt-1">The page you're looking for doesn't exist.</p>
      </div>
      <Link href="/">
        <button
          className="mt-2 px-6 py-2.5 rounded-xl font-bold text-sm text-black transition-all hover:scale-105"
          style={{
            background: "linear-gradient(135deg, hsl(112,100%,54%), hsl(112,100%,40%))",
            boxShadow: "0 0 14px hsl(112 100% 54% / 0.4)",
          }}
        >
          Back to Home
        </button>
      </Link>
    </div>
  );
}
