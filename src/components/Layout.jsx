import React, { createContext, useContext, useEffect, useState } from "react";

import { NavLink, Outlet, useLocation } from "react-router-dom";

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
  Bell,
  ChevronDown,
} from "lucide-react";

import "../App.css";

// =====================================================
// THEME CONTEXT
// =====================================================

const ThemeContext = createContext(null);

export const useTheme = () => useContext(ThemeContext);

// =====================================================
// THEME PROVIDER
// =====================================================

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    localStorage.getItem("railgenie-theme") || "light",
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("railgenie-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// =====================================================
// ROUTE INFORMATION
// =====================================================

const routeInfo = {
  "/": {
    title: "Dashboard",
    section: "Operations Control",
  },
  "/tasks": {
    title: "Maintenance Tasks",
    section: "Maintenance Management",
  },
  "/planning": {
    title: "Block Planning",
    section: "Planning & Optimization",
  },
  "/schedule": {
    title: "Optimized Schedule",
    section: "Operations Control",
  },
  "/simulator": {
    title: "What-if Simulator",
    section: "Scenario Analysis",
  },
  "/analytics": {
    title: "Analytics",
    section: "Performance Intelligence",
  },
  "/assistant": {
    title: "RailGenie Assistant",
    section: "AI Planning Assistant",
  },
};

// =====================================================
// HEADER
// =====================================================

function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");

  useEffect(() => {
    let isMounted = true;

    const checkBackend = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/health");

        if (!response.ok) {
          throw new Error("Backend unavailable");
        }

        if (isMounted) {
          setBackendStatus("online");
        }
      } catch (error) {
        if (isMounted) {
          setBackendStatus("offline");
        }
      }
    };

    checkBackend();

    const interval = setInterval(checkBackend, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // =====================================================
  // CURRENT PAGE
  // =====================================================

  const current = routeInfo[location.pathname] || routeInfo["/"];

  return (
    <header className="app-header">
      {/* LEFT */}
      <div className="header-left">
        <div className="breadcrumb">
          <span>RailGenie</span>

          <span className="breadcrumb-separator">/</span>

          <strong>{current.section}</strong>

          <span className="breadcrumb-separator">/</span>

          <strong>{current.title}</strong>
        </div>
      </div>

      {/* RIGHT */}
      <div className="header-actions">
        {/* BACKEND STATUS */}
        <div
          className={`header-status header-status-${backendStatus}`}
          title={
            backendStatus === "online"
              ? "RailGenie backend is connected"
              : backendStatus === "offline"
                ? "RailGenie backend is unavailable"
                : "Checking RailGenie backend"
          }
        >
          <span className="header-status-dot" />

          <span>
            {backendStatus === "online"
              ? "System Online"
              : backendStatus === "offline"
                ? "Backend Offline"
                : "Checking..."}
          </span>
        </div>

        {/* NOTIFICATIONS */}
        <div className="notification-wrapper">
          <button
            type="button"
            className="header-icon-btn"
            title="Notifications"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((current) => !current)}
          >
            <Bell size={17} />

            {!notificationsOpen && <span className="notification-dot" />}
          </button>

          {notificationsOpen && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <strong>Notifications</strong>

                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="notification-item">
                <span className="notification-status-dot" />

                <div>
                  <strong>Optimization engine ready</strong>

                  <span>
                    RailGenie is ready to generate a maintenance plan.
                  </span>
                </div>
              </div>

              <div className="notification-item">
                <span className="notification-status-dot" />

                <div>
                  <strong>Safety constraints active</strong>

                  <span>Train movement protection is enabled.</span>
                </div>
              </div>

              <div className="notification-item">
                <span className="notification-status-dot" />

                <div>
                  <strong>AI Assistant available</strong>

                  <span>Ask RailGenie to simulate a planning scenario.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* THEME */}
        <button
          type="button"
          className="header-icon-btn"
          onClick={toggleTheme}
          title={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* USER */}
        <div className="header-user">
          <div className="user-avatar">RG</div>

          <div className="user-info">
            <strong>RailGenie</strong>

            <span>Administrator</span>
          </div>

          <ChevronDown className="user-chevron" size={15} />
        </div>
      </div>
    </header>
  );
}

// =====================================================
// SIDEBAR
// =====================================================

function Sidebar() {
  const navigation = [
    {
      label: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      label: "Maintenance Tasks",
      path: "/tasks",
      icon: Wrench,
    },
    {
      label: "Block Planning",
      path: "/planning",
      icon: CalendarClock,
    },
    {
      label: "Optimized Schedule",
      path: "/schedule",
      icon: GitBranch,
    },
    {
      label: "What-if Simulator",
      path: "/simulator",
      icon: FlaskConical,
    },
    {
      label: "Analytics",
      path: "/analytics",
      icon: BarChart3,
    },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">🚆</div>

        <div className="brand-text">
          <h1>RailGenie</h1>
          <span>Railway Intelligence</span>
        </div>
      </div>

      <div className="sidebar-section-title">OPERATIONS</div>

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
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="system-status">
          <span className="status-dot" />

          <div className="system-status-text">
            <strong>System Online</strong>
            <small>Optimization engine ready</small>
          </div>
        </div>

        <div className="sidebar-version">RailGenie · v1.0</div>
      </div>
    </aside>
  );
}

// =====================================================
// FLOATING AI ASSISTANT
// =====================================================

function FloatingAssistant() {
  const location = useLocation();

  // Do not show the floating launcher on the
  // dedicated Assistant page.
  if (location.pathname === "/assistant") {
    return null;
  }

  return (
    <div className="floating-assistant">
      <NavLink
        to="/assistant"
        className="floating-assistant-btn"
        title="Open RailGenie AI Assistant"
        aria-label="Open RailGenie AI Assistant"
      >
        <Bot size={23} />

        <span className="assistant-online-dot" aria-hidden="true" />
      </NavLink>
    </div>
  );
}

// =====================================================
// LAYOUT
// =====================================================

function Layout() {
  return (
    <ThemeProvider>
      <div className="shell">
        <Sidebar />

        <div className="app">
          {/* ONE AND ONLY GLOBAL HEADER */}
          <AppHeader />

          {/* SELECTED PAGE ONLY */}
          <main className="main">
            <Outlet />
          </main>
        </div>

        {/* FIXED AI BUTTON */}
        <FloatingAssistant />
      </div>
    </ThemeProvider>
  );
}

export default Layout;
