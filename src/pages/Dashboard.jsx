import React, { useEffect, useState } from "react";
import {
  TrainFront,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  BarChart3,
  RefreshCw,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

function Dashboard() {
  const [trains, setTrains] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [score, setScore] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        trainsResponse,
        tasksResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/trains`),
        fetch(
          `${API_URL}/api/maintenance-tasks`
        ),
      ]);

      if (
        !trainsResponse.ok ||
        !tasksResponse.ok
      ) {
        throw new Error(
          "Unable to load RailGenie data."
        );
      }

      const trainsData =
        await trainsResponse.json();

      const tasksData =
        await tasksResponse.json();

      const loadedTrains =
        trainsData.trains || [];

      const loadedTasks =
        tasksData.tasks || [];

      setTrains(loadedTrains);
      setTasks(loadedTasks);

      // -------------------------------------------------
      // Run real optimizer
      // -------------------------------------------------

      const optimizeResponse =
        await fetch(
          `${API_URL}/api/optimize`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              planning_date:
                "2026-08-27",

              planning_start: 0,

              planning_end: 1439,

              maintenance_tasks:
                loadedTasks,

              train_movements:
                loadedTrains,

              safety_buffer_before: 10,

              safety_buffer_after: 10,
            }),
          }
        );

      const optimizeData =
        await optimizeResponse.json();

      if (!optimizeResponse.ok) {
        throw new Error(
          optimizeData.detail?.message ||
            "Optimizer request failed."
        );
      }

      setSchedule(
        optimizeData.schedule || []
      );

      setScore(
        optimizeData.score || null
      );

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =====================================================
  // REFRESH
  // =====================================================

  const refreshDashboard = () => {
    setRefreshing(true);
    loadDashboard();
  };

  // =====================================================
  // COUNTS
  // =====================================================

  const criticalTasks =
    tasks.filter(
      (task) =>
        task.priority === "critical"
    ).length;

  const highTasks =
    tasks.filter(
      (task) =>
        task.priority === "high"
    ).length;

  const scheduledIds =
    new Set(
      schedule.map(
        (item) => item.task_id
      )
    );

  const scheduledCount =
    scheduledIds.size;

  const pendingCount =
    Math.max(
      0,
      tasks.length -
        scheduledCount
    );

  // =====================================================
  // TOTAL MAINTENANCE TIME
  // =====================================================

  const totalMaintenanceMinutes =
    schedule.reduce(
      (total, item) =>
        total +
        Number(item.duration || 0),
      0
    );

  // =====================================================
  // PRIORITY HELPERS
  // =====================================================

  const getPriorityClass = (
    priority
  ) => {
    if (
      priority === "critical"
    ) {
      return "critical";
    }

    if (
      priority === "high"
    ) {
      return "high";
    }

    return "medium";
  };

  // =====================================================
  // TIME FORMAT
  // =====================================================

  const formatTime = (
    minutes
  ) => {
    if (
      minutes === undefined ||
      minutes === null
    ) {
      return "--:--";
    }

    const hours =
      Math.floor(
        minutes / 60
      );

    const mins =
      minutes % 60;

    return (
      `${String(hours).padStart(2, "0")}:` +
      `${String(mins).padStart(2, "0")}`
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="card">
        Loading RailGenie dashboard...
      </div>
    );
  }

  return (
    <>
      {/* ================================================= */}
      {/* TOPBAR */}
      {/* ================================================= */}

      <header className="topbar">

        <div>
          <p className="eyebrow">
            RAILWAY INTELLIGENCE
          </p>

          <h2>
            Dashboard
          </h2>
        </div>

        <div className="topbar-right">

          <button
            className="outline-button"
            onClick={
              refreshDashboard
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={14}
              className={
                refreshing
                  ? "spin"
                  : ""
              }
            />

            Refresh
          </button>

          <div className="profile">
            RG
          </div>

        </div>

      </header>

      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error && (
        <div className="analytics-error">

          <AlertTriangle
            size={18}
          />

          <div>

            <strong>
              Dashboard unavailable
            </strong>

            <p>
              {error}
            </p>

          </div>

        </div>
      )}

      {/* ================================================= */}
      {/* STATS */}
      {/* ================================================= */}

      <section className="stats-grid">

        <StatCard
          icon={
            <TrainFront size={21} />
          }
          type="blue"
          label="Active Trains"
          value={trains.length}
          description="Loaded from railway data"
        />

        <StatCard
          icon={
            <Wrench size={21} />
          }
          type="orange"
          label="Maintenance Tasks"
          value={tasks.length}
          description={`${scheduledCount} scheduled`}
        />

        <StatCard
          icon={
            <AlertTriangle
              size={21}
            />
          }
          type="red"
          label="Critical Tasks"
          value={criticalTasks}
          description={`${highTasks} high priority`}
        />

        <StatCard
          icon={
            <CheckCircle2
              size={21}
            />
          }
          type="green"
          label="Optimization Score"
          value={
            score
              ? `${score.score}%`
              : "—"
          }
          description="Current optimized plan"
        />

      </section>

      {/* ================================================= */}
      {/* SECONDARY STATS */}
      {/* ================================================= */}

      <section className="stats-grid">

        <StatCard
          icon={
            <ShieldCheck size={21} />
          }
          type="green"
          label="Safety Score"
          value={
            score
              ? `${score.safety_score}%`
              : "—"
          }
          description="Train protection compliance"
        />

        <StatCard
          icon={
            <BarChart3 size={21} />
          }
          type="blue"
          label="Priority Score"
          value={
            score
              ? `${score.priority_score}%`
              : "—"
          }
          description="Maintenance priority quality"
        />

        <StatCard
          icon={
            <TrainFront size={21} />
          }
          type="orange"
          label="Train Impact"
          value={
            score
              ? `${score.train_impact} min`
              : "—"
          }
          description="Operational disruption"
        />

        <StatCard
          icon={
            <Wrench size={21} />
          }
          type="blue"
          label="Maintenance Time"
          value={
            `${totalMaintenanceMinutes} min`
          }
          description="Total optimized work"
        />

      </section>

      {/* ================================================= */}
      {/* MAIN CONTENT */}
      {/* ================================================= */}

      <section className="dashboard-grid">

        {/* --------------------------------------------- */}
        {/* SYSTEM OVERVIEW */}
        {/* --------------------------------------------- */}

        <div className="card">

          <div className="card-header">

            <div>
              <h3>
                Optimization Overview
              </h3>

              <p>
                Current railway maintenance plan
              </p>
            </div>

            <span className="recommended-badge">
              AI OPTIMIZED
            </span>

          </div>

          <div className="dashboard-overview">

            <OverviewMetric
              label="Scheduled Tasks"
              value={`${scheduledCount}/${tasks.length}`}
            />

            <OverviewMetric
              label="Pending Tasks"
              value={pendingCount}
            />

            <OverviewMetric
              label="Train Movements"
              value={trains.length}
            />

            <OverviewMetric
              label="Safety"
              value={
                score
                  ? `${score.safety_score}%`
                  : "—"
              }
            />

          </div>

          <div className="dashboard-status">

            <CheckCircle2 size={20} />

            <div>
              <strong>
                Optimization engine ready
              </strong>

              <span>
                Maintenance scheduling is being
                calculated using train conflicts,
                safety buffers and task priority.
              </span>
            </div>

          </div>

        </div>

        {/* --------------------------------------------- */}
        {/* PRIORITY TASKS */}
        {/* --------------------------------------------- */}

        <div className="card">

          <div className="card-header">

            <div>
              <h3>
                Priority Tasks
              </h3>

              <p>
                Highest-priority maintenance work
              </p>
            </div>

            <span className="count-badge">
              {criticalTasks +
                highTasks}
            </span>

          </div>

          {tasks
            .filter(
              (task) =>
                task.priority ===
                  "critical" ||
                task.priority ===
                  "high"
            )
            .sort(
              (a, b) => {
                const rank = {
                  critical: 1,
                  high: 2,
                };

                return (
                  rank[a.priority] -
                  rank[b.priority]
                );
              }
            )
            .slice(0, 5)
            .map(
              (task) => (
                <div
                  className="task"
                  key={
                    task.task_id
                  }
                >

                  <div className="task-id">
                    {task.task_id}
                  </div>

                  <div className="task-info">

                    <strong>
                      {task.asset_id}
                    </strong>

                    <span>
                      Section{" "}
                      {task.section}
                      {" · "}
                      {task.duration} min
                    </span>

                  </div>

                  <span
                    className={`priority ${getPriorityClass(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>

                </div>
              )
            )}

        </div>

      </section>

      {/* ================================================= */}
      {/* OPTIMIZED SCHEDULE */}
      {/* ================================================= */}

      <section className="card schedule-card">

        <div className="card-header">

          <div>
            <h3>
              Today's Optimized Schedule
            </h3>

            <p>
              Maintenance blocks generated by the optimizer
            </p>
          </div>

          <span className="recommended-badge">
            {schedule.length} BLOCKS
          </span>

        </div>

        <div className="analytics-table">

          <div className="analytics-table-header">

            <span>
              Task
            </span>

            <span>
              Asset
            </span>

            <span>
              Section
            </span>

            <span>
              Time
            </span>

            <span>
              Duration
            </span>

            <span>
              Priority
            </span>

          </div>

          {schedule.map(
            (item) => (
              <div
                className="analytics-table-row"
                key={
                  item.task_id
                }
              >

                <strong>
                  {item.task_id}
                </strong>

                <span>
                  {item.asset_id}
                </span>

                <span>
                  {item.section}
                </span>

                <span>
                  {formatTime(
                    item.start
                  )}
                  {" – "}
                  {formatTime(
                    item.end
                  )}
                </span>

                <span>
                  {item.duration} min
                </span>

                <span
                  className={`priority ${getPriorityClass(
                    item.priority
                  )}`}
                >
                  {item.priority}
                </span>

              </div>
            )
          )}

        </div>

        {schedule.length === 0 && (
          <div className="analysis-empty">

            <AlertTriangle
              size={30}
            />

            <strong>
              No maintenance blocks generated
            </strong>

            <span>
              The optimizer did not return a
              feasible schedule.
            </span>

          </div>
        )}

      </section>

      {/* ================================================= */}
      {/* SYSTEM SUMMARY */}
      {/* ================================================= */}

      <section className="analytics-summary">

        <div className="analytics-summary-item">

          <ShieldCheck size={20} />

          <div>

            <strong>
              Safety buffers active
            </strong>

            <span>
              10-minute protection before and
              after train movements.
            </span>

          </div>

        </div>

        <div className="analytics-summary-item">

          <TrainFront size={20} />

          <div>

            <strong>
              {trains.length} train movements
            </strong>

            <span>
              Loaded from the RailGenie railway
              movement dataset.
            </span>

          </div>

        </div>

        <div className="analytics-summary-item">

          <Wrench size={20} />

          <div>

            <strong>
              {scheduledCount} tasks scheduled
            </strong>

            <span>
              {totalMaintenanceMinutes} minutes
              of maintenance work planned.
            </span>

          </div>

        </div>

      </section>
    </>
  );
}


// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  icon,
  type,
  label,
  value,
  description,
}) {
  return (
    <div className="stat-card">

      <div
        className={`stat-icon ${type}`}
      >
        {icon}
      </div>

      <div className="stat-content">

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {description}
        </small>

      </div>

    </div>
  );
}


// =========================================================
// OVERVIEW METRIC
// =========================================================

function OverviewMetric({
  label,
  value,
}) {
  return (
    <div className="dashboard-overview-item">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


export default Dashboard;