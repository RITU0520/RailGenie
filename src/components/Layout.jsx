import React, { createContext, useContext, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import {
  LayoutDashboard,
  Wrench,
  CalendarClock,
  GitBranch,
  FlaskConical,
  BarChart3,
  Bot,
  Sun,
  Moon,
} from "lucide-react";

// ================================
// THEME CONTEXT
// ================================
const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches;
    return prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

const navigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Maintenance Tasks", path: "/tasks", icon: Wrench },
  { label: "Block Planning", path: "/planning", icon: CalendarClock },
  { label: "Optimized Schedule", path: "/schedule", icon: GitBranch },
  { label: "What-if Simulator", path: "/simulator", icon: FlaskConical },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
];

function TopBar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="topbar">
      <div className="topbar-spacer" />

      <div className="topbar-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <NavLink
          to="/assistant"
          className={({ isActive }) =>
            isActive ? "assistant-btn active" : "assistant-btn"
          }
        >
          <Bot size={18} />
          <span>Assistant</span>
        </NavLink>
      </div>
    </header>
  );
}

function LayoutInner() {
  return (
    <div className="app">
      {/* ================================
          SIDEBAR
      ================================= */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🚆</div>
          <div>
            <h1>RailGenie</h1>
            <span>Railway Intelligence</span>
          </div>
        </div>

        <nav className="navigation">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot" />
            <div>
              <strong>System Online</strong>
              <small>Optimization engine ready</small>
            </div>
          </div>
        </div>
      </aside>

      {/* ================================
          MAIN CONTENT
      ================================= */}
      <div className="main-column">
        <TopBar />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Layout() {
  return (
    <ThemeProvider>
      <LayoutInner />
    </ThemeProvider>
  );
}

export default Layout;