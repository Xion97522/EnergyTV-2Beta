import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Bookmark, Home, Tv, Film, Menu, X, Settings, Zap } from "lucide-react";

export default function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/",          label: "Home",      icon: Home },
    { href: "/movies",    label: "Movies",    icon: Film },
    { href: "/tv",        label: "TV Shows",  icon: Tv },
    { href: "/watchlist", label: "Watchlist", icon: Bookmark },
    { href: "/search",    label: "Search",    icon: Search },
  ];

  const isActive = (href: string) => location === href;

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 h-14"
        style={{
          background: "rgba(4, 5, 9, 0.6)",
          backdropFilter: "blur(28px) saturate(180%) brightness(0.98)",
          WebkitBackdropFilter: "blur(28px) saturate(180%) brightness(0.98)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(57,255,20,0.05)",
        }}
      >
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer select-none">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(145deg, hsl(112,100%,54%), hsl(112,100%,34%))",
                boxShadow: "0 0 12px rgba(57,255,20,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              <Zap className="w-4 h-4 text-black fill-black" />
            </div>
            <span className="text-foreground font-black text-lg tracking-tight">
              Energy<span className="neon-text" style={{ color: "hsl(112,100%,54%)" }}>TV</span>
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <div
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer select-none ${
                  isActive(href) ? "glass-nav-active" : "text-muted-foreground hover:text-foreground"
                }`}
                style={!isActive(href) ? {
                  transition: "all 0.2s",
                } : {}}
                onMouseEnter={!isActive(href) ? (e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = "rgba(255,255,255,0.05)";
                  el.style.backdropFilter = "blur(8px)";
                } : undefined}
                onMouseLeave={!isActive(href) ? (e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = "";
                  el.style.backdropFilter = "";
                } : undefined}
              >
                <Icon className="w-4 h-4" />
                {label}
              </div>
            </Link>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <Link href="/settings">
            <button
              className="hidden md:flex p-2 rounded-xl transition-all text-muted-foreground hover:text-foreground"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
            >
              <Settings className="w-4 h-4" />
            </button>
          </Link>
          <button
            className="md:hidden p-2 rounded-xl text-muted-foreground"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{
            top: "56px",
            background: "rgba(3,4,8,0.82)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            borderTop: "1px solid rgba(255,255,255,0.055)",
          }}
        >
          {/* Top specular edge */}
          <div style={{ height: "1px", background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 40%, rgba(57,255,20,0.1) 60%, transparent 100%)" }} />
          <div className="flex flex-col gap-1.5 p-5">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all cursor-pointer ${
                    isActive(href) ? "glass-nav-active" : "text-muted-foreground"
                  }`}
                  style={!isActive(href) ? { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" } : {}}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </div>
              </Link>
            ))}
            <Link href="/settings">
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-muted-foreground cursor-pointer"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                onClick={() => setMobileOpen(false)}
              >
                <Settings className="w-5 h-5" /> Settings
              </div>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
