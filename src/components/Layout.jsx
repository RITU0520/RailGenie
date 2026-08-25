import React from "react";
import { NavLink, Outlet } from "react-router-dom";

import {
  LayoutDashboard,
  Wrench,
  CalendarClock,
  GitBranch,
  FlaskConical,
  BarChart3,
} from "lucide-react";

function Layout() {
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
    <div className="app">

      {/* ================================
          SIDEBAR
      ================================= */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">
            🚆
          </div>

          <div>
            <h1>RailGenie</h1>

            <span>
              Railway Intelligence
            </span>
          </div>

        </div>

        <nav className="navigation">

          {navigation.map(
            ({
              label,
              path,
              icon: Icon,
            }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                className={({ isActive }) =>
                  isActive
                    ? "nav-item active"
                    : "nav-item"
                }
              >
                <Icon size={18} />

                <span>
                  {label}
                </span>
              </NavLink>
            )
          )}

        </nav>

        {/* ================================
            SIDEBAR STATUS
        ================================= */}

        <div className="sidebar-bottom">

          <div className="system-status">

            <span className="status-dot" />

            <div>
              <strong>
                System Online
              </strong>

              <small>
                Optimization engine ready
              </small>
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
  );
}

export default Layout;