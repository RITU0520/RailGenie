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
// THEME
// ================================
const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function AppHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="app-header">
      <button
        type="button"
        className="theme-toggle-btn"
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <NavLink
        to="/assistant"
        className={({ isActive }) =>
          isActive ? "assistant-quick-btn active" : "assistant-quick-btn"
        }
        title="Assistant"
      >
        <Bot size={16} />
        <span>Assistant</span>
      </NavLink>
    </header>
  );
}

function Layout() {
  const navigation = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Maintenance Tasks", path: "/tasks", icon: Wrench },
    { label: "Block Planning", path: "/planning", icon: CalendarClock },
    { label: "Optimized Schedule", path: "/schedule", icon: GitBranch },
    { label: "What-if Simulator", path: "/simulator", icon: FlaskConical },
    { label: "Analytics", path: "/analytics", icon: BarChart3 },
    { label: "Assistant", path: "/assistant", icon: Bot },
  ];

  return (
    <ThemeProvider>
      <div className="shell">
        <AppHeader />

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
          <main className="main">
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default Layout;