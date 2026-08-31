import React, { useCallback, useEffect, useState } from "react";
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
  const [runId, setRunId] = useState(null);
  const [status, setStatus] = useState(null);
  const [createdAt, setCreatedAt] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD DASHBOARD DATA FROM POSTGRESQL
  // =====================================================

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        trainsResponse,
        tasksResponse,
        scheduleResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/trains`),
        fetch(`${API_URL}/api/maintenance-tasks`),
        fetch(`${API_URL}/api/schedule/latest`),
      ]);

      if (
        !trainsResponse.ok ||
        !tasksResponse.ok ||
        !scheduleResponse.ok
      ) {
        throw new Error(
          "Unable to load RailGenie dashboard data."
        );
      }

      const trainsData =
        await trainsResponse.json();

      const tasksData =
        await tasksResponse.json();

      const scheduleData =
        await scheduleResponse.json();

      const loadedTrains =
        trainsData.trains || [];

      const loadedTasks =
        tasksData.tasks || [];

      setTrains(loadedTrains);
      setTasks(loadedTasks);

      setSchedule(
        scheduleData.schedule || []
      );

      setScore(
        scheduleData.score !== undefined
          ? {
              score: Number(scheduleData.score),
              priority_score:
                scheduleData.priority_score ?? null,
              train_impact:
                scheduleData.train_impact ?? 0,
              safety_score:
                scheduleData.safety_score ?? null,
            }
          : null
      );

      setRunId(
        scheduleData.run_id ?? null
      );

      setStatus(
        scheduleData.status ?? null
      );

      setCreatedAt(
        scheduleData.created_at ?? null
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
  }, []);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // =====================================================
  // REFRESH WHEN WINDOW REGAINS FOCUS
  // =====================================================

  useEffect(() => {
    const handleFocus = () => {
      loadDashboard();
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [loadDashboard]);

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

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
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
            <TrainFront
              size={21}
            />
          }
          type="blue"
          label="Active Trains"
          value={trains.length}
          description="Loaded from PostgreSQL"
        />

        <StatCard
          icon={
            <Wrench
              size={21}
            />
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
          description={
            runId
              ? `Run #${runId}`
              : "No run available"
          }
        />

      </section>

      {/* ================================================= */}
      {/* SECONDARY STATS */}
      {/* ================================================= */}

      <section className="stats-grid">

        <StatCard
          icon={
            <ShieldCheck
              size={21}
            />
          }
          type="green"
          label="Safety Score"
          value={
            score?.safety_score !== null &&
            score?.safety_score !== undefined
              ? `${score.safety_score}%`
              : "—"
          }
          description="Train protection compliance"
        />

        <StatCard
          icon={
            <BarChart3
              size={21}
            />
          }
          type="blue"
          label="Priority Score"
          value={
            score?.priority_score !== null &&
            score?.priority_score !== undefined
              ? `${score.priority_score}%`
              : "—"
          }
          description="Maintenance priority quality"
        />

        <StatCard
          icon={
            <TrainFront
              size={21}
            />
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
            <Wrench
              size={21}
            />
          }
          type="blue"
          label="Maintenance Time"
          value={`${totalMaintenanceMinutes} min`}
          description="Total optimized work"
        />

      </section>

      {/* ================================================= */}
      {/* MAIN CONTENT */}
      {/* ================================================= */}

      <section className="dashboard-grid">

        {/* SYSTEM OVERVIEW */}

        <div className="card">

          <div className="card-header">

            <div>

              <h3>
                Optimization Overview
              </h3>

              <p>
                Current applied railway
                maintenance plan
              </p>

            </div>

            <span className="recommended-badge">
              {status
                ? status.toUpperCase()
                : "AI OPTIMIZED"}
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
                score?.safety_score !== null &&
                score?.safety_score !== undefined
                  ? `${score.safety_score}%`
                  : "—"
              }
            />

          </div>

          <div className="dashboard-status">

            <CheckCircle2
              size={20}
            />

            <div>

              <strong>
                {runId
                  ? `Optimization Run #${runId} active`
                  : "Optimization engine ready"}
              </strong>

              <span>
                {createdAt
                  ? `Latest schedule generated ${new Date(
                      createdAt
                    ).toLocaleString()}.`
                  : "Maintenance scheduling uses train conflicts, safety buffers and task priority."}
              </span>

            </div>

          </div>

        </div>

        {/* PRIORITY TASKS */}

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
              Latest Applied Schedule
            </h3>

            <p>
              {runId
                ? `PostgreSQL Run #${runId}`
                : "No applied schedule"}
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
              Apply an optimized schedule
              from the Assistant.
            </span>

          </div>
        )}

      </section>

      {/* ================================================= */}
      {/* SYSTEM SUMMARY */}
      {/* ================================================= */}

      <section className="analytics-summary">

        <div className="analytics-summary-item">

          <ShieldCheck
            size={20}
          />

          <div>

            <strong>
              Safety buffers active
            </strong>

            <span>
              10-minute protection before
              and after train movements.
            </span>

          </div>

        </div>

        <div className="analytics-summary-item">

          <TrainFront
            size={20}
          />

          <div>

            <strong>
              {trains.length} train movements
            </strong>

            <span>
              Loaded from PostgreSQL
              railway movement data.
            </span>

          </div>

        </div>

        <div className="analytics-summary-item">

          <Wrench
            size={20}
          />

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