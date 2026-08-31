import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import MaintenanceTasks from "./pages/MaintenanceTasks";
import BlockPlanning from "./pages/BlockPlanning";
import OptimizedSchedule from "./pages/OptimizedSchedule";
import WhatIfSimulator from "./pages/WhatIfSimulator";
import Analytics from "./pages/Analytics";
import Assistant from "./pages/Assistant";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =========================================
            ALL APPLICATION PAGES USE THE LAYOUT
        ========================================== */}

        <Route element={<Layout />}>

          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/tasks"
            element={<MaintenanceTasks />}
          />

          <Route
            path="/planning"
            element={<BlockPlanning />}
          />

          <Route
            path="/schedule"
            element={<OptimizedSchedule />}
          />

          <Route
            path="/simulator"
            element={<WhatIfSimulator />}
          />

          <Route
            path="/analytics"
            element={<Analytics />}
          />

          <Route
            path="/assistant"
            element={<Assistant />}
          />

        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;