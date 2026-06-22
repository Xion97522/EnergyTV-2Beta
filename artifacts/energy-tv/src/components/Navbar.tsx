/**
 * Navbar.tsx  (updated — adds Google auth UI)
 * -------------------------------------------
 * Changes from original:
 *  • Imports useAuth from AuthContext
 *  • Right side shows: user avatar + dropdown (Profile / Sign out)  OR  Sign In button
 *  • Mobile menu also gets the sign-in / user section
 */

import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Search, Bookmark, Home, Tv, Film, Menu, X, Settings, Zap, LogIn, LogOut, User,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const { user, signIn, signOut } = useAuth();

  const navItems = [
    { href: "/",          label: "Home",      icon: Home },
    { href: "/movies",    label: "Movies",    icon: Film },
    { href: "/tv",        label: "TV Shows",  icon: Tv },
    { href: "/watchlist", label: "Watchlist", icon: Bookmark },
    { href: "/search",    label: "Search",    icon: Search },
  ];

  const isActive = (href: string) => location === href;

  // Close avatar dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // ── Shared hover helpers ──────────────────────────────────────────────────
  const navHoverIn = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.background = "rgba(255,255,255,0.05)";
    el.style.backdropFilter = "blur(8px)";
  };
  const navHoverOut = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.background = "";
    el.style.backdropFilter = "";
  };

  // ── Avatar / Sign-in section ──────────────────────────────────────────────
  const AuthSection = ({ mobile = false }: { mobile?: boolean }) => {
    if (user) {
      return (
        <div className="relative" ref={mobile ? undefined : avatarRef}>
          <button
            onClick={() => setAvatarMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-2xl px-2 py-1.5 transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <img
              src={user.picture}
              alt={user.name}
              className="w-7 h-7 rounded-full object-cover"
              style={{ border: "1.5px solid rgba(57,255,20,0.5)" }}
            />
            {mobile && (
              <span className="text-sm font-medium text-white">
                {user.given_name}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {avatarMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-2xl overflow-hidden z-50"
              style={{
                background: "rgba(10,12,18,0.96)",
                border: "1px solid rgba(57,255,20,0.15)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(57,255,20,0.04)",
                backdropFilter: "blur(24px)",
              }}
            >
              {/* User info header */}
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>

              {/* Menu items */}
              <div className="py-1.5">
                <Link href="/settings">
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-white transition-colors"
                    onClick={() => setAvatarMenuOpen(false)}
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) => { (e.currentTarget).style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={(e) => { (e.currentTarget).style.background = "transparent"; }}
                  >
                    <User className="w-4 h-4" /> Profile &amp; Settings
                  </button>
                </Link>

                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                  onClick={() => { signOut(); setAvatarMenuOpen(false); }}
                  style={{ color: "hsl(112,100%,54%)", background: "transparent" }}
                  onMouseEnter={(e) => { (e.currentTarget).style.background = "rgba(57,255,20,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget).style.background = "transparent"; }}
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Not signed in
    return (
      <Link href="/signin">
        <button
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, hsl(112,100%,54%) 0%, hsl(112,100%,36%) 100%)",
            color: "#000",
            boxShadow: "0 0 16px rgba(57,255,20,0.3)",
          }}
          onMouseEnter={(e) => { (e.currentTarget).style.boxShadow = "0 0 24px rgba(57,255,20,0.55)"; }}
          onMouseLeave={(e) => { (e.currentTarget).style.boxShadow = "0 0 16px rgba(57,255,20,0.3)"; }}
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </button>
      </Link>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
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

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <div
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer select-none ${
                  isActive(href) ? "glass-nav-active" : "text-muted-foreground hover:text-foreground"
                }`}
                onMouseEnter={!isActive(href) ? navHoverIn : undefined}
                onMouseLeave={!isActive(href) ? navHoverOut : undefined}
              >
                <Icon className="w-4 h-4" />
                {label}
              </div>
            </Link>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Settings (desktop, only when signed in) */}
          {user && (
            <Link href="/settings">
              <button
                className="hidden md:flex p-2 rounded-xl transition-all text-muted-foreground hover:text-foreground"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                onMouseEnter={(e) => { (e.currentTarget).style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget).style.background = "rgba(255,255,255,0.04)"; }}
              >
                <Settings className="w-4 h-4" />
              </button>
            </Link>
          )}

          {/* Auth section — desktop */}
          <div className="hidden md:flex">
            <AuthSection />
          </div>

          {/* Hamburger — mobile */}
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

            {/* Auth in mobile menu */}
            <div
              className="mt-2 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(57,255,20,0.1)" }}
              onClick={() => setMobileOpen(false)}
            >
              <AuthSection mobile />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
