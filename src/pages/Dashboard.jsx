import React, { useCallback, useEffect, useState } from "react";
import {
  TrainFront,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  BarChart3,
  RefreshCw,
  Radio,
  MapPin,
  Clock3,
} from "lucide-react";
import RailwayMap from "./RailwayMap";

const API_URL = "http://127.0.0.1:8000";

function Dashboard() {
  const [trains, setTrains] = useState([]);
  const [liveTrains, setLiveTrains] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [score, setScore] = useState(null);
  const [runId, setRunId] = useState(null);
  const [status, setStatus] = useState(null);
  const [createdAt, setCreatedAt] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [error, setError] = useState("");
  const [liveError, setLiveError] = useState("");

  // =====================================================
  // LOAD LIVE TRAIN DATA
  // =====================================================

  const loadLiveTrains = useCallback(async (loadedTrains) => {
    if (!loadedTrains || loadedTrains.length === 0) {
      setLiveTrains([]);
      return;
    }

    try {
      setLiveLoading(true);
      setLiveError("");

      const results = await Promise.all(
        loadedTrains.map(async (train) => {
          try {
            const response = await fetch(
              `${API_URL}/api/trains/${encodeURIComponent(
                train.train_id,
              )}/live`,
            );

            if (!response.ok) {
              return {
                ...train,
                live_available: false,
                data_source: "postgresql",
              };
            }

            const data = await response.json();

            if (!data.success || !data.train) {
              return {
                ...train,
                live_available: false,
                data_source: "postgresql",
              };
            }

            return {
              // PostgreSQL baseline
              ...train,

              // RailRadar live fields
              ...data.train,

              // Always preserve PostgreSQL planning fields
              train_id: train.train_id,
              section: train.section,
              arrival: train.arrival,
              departure: train.departure,
              priority: train.priority,

              // Live metadata
              live_available: true,
              data_source: data.data_source || "postgresql+railradar",
            };
          } catch (err) {
            console.error(
              `Unable to load live data for train ${train.train_id}:`,
              err,
            );

            return {
              ...train,
              live_available: false,
              data_source: "postgresql",
            };
          }
        }),
      );

      setLiveTrains(results);
    } catch (err) {
      console.error(err);
      setLiveError("Live train data is temporarily unavailable.");

      setLiveTrains(
        loadedTrains.map((train) => ({
          ...train,
          live_available: false,
          data_source: "postgresql",
        })),
      );
    } finally {
      setLiveLoading(false);
    }
  }, []);

  // =====================================================
  // LOAD DASHBOARD DATA FROM POSTGRESQL
  // =====================================================

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [trainsResponse, tasksResponse, scheduleResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/trains`),
          fetch(`${API_URL}/api/maintenance-tasks`),
          fetch(`${API_URL}/api/schedule/latest`),
        ]);

      if (!trainsResponse.ok || !tasksResponse.ok || !scheduleResponse.ok) {
        throw new Error("Unable to load RailGenie dashboard data.");
      }

      const trainsData = await trainsResponse.json();
      const tasksData = await tasksResponse.json();
      const scheduleData = await scheduleResponse.json();

      const loadedTrains = trainsData.trains || [];
      const loadedTasks = tasksData.tasks || [];

      setTrains(loadedTrains);
      setTasks(loadedTasks);
      setSchedule(scheduleData.schedule || []);

      setScore(
        scheduleData.score !== undefined
          ? {
              score: Number(scheduleData.score),
              priority_score: scheduleData.priority_score ?? null,
              train_impact: scheduleData.train_impact ?? 0,
              safety_score: scheduleData.safety_score ?? null,
            }
          : null,
      );

      setRunId(scheduleData.run_id ?? null);
      setStatus(scheduleData.status ?? null);
      setCreatedAt(scheduleData.created_at ?? null);

      // Load live data after PostgreSQL data is available.
      await loadLiveTrains(loadedTrains);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadLiveTrains]);

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

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadDashboard]);

  // =====================================================
  // AUTOMATIC LIVE REFRESH
  // =====================================================

  useEffect(() => {
    if (!trains.length) {
      return undefined;
    }

    const interval = setInterval(() => {
      loadLiveTrains(trains);
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [trains, loadLiveTrains]);

  // =====================================================
  // MANUAL REFRESH
  // =====================================================

  const refreshDashboard = () => {
    setRefreshing(true);
    loadDashboard();
  };

  // =====================================================
  // MERGED TRAIN DATA
  // =====================================================

  const displayTrains = liveTrains.length > 0 ? liveTrains : trains;
  // =====================================================
  // COUNTS
  // =====================================================

  const criticalTasks = tasks.filter(
    (task) => task.priority === "critical",
  ).length;

  const highTasks = tasks.filter((task) => task.priority === "high").length;

  const scheduledIds = new Set(schedule.map((item) => item.task_id));

  const scheduledCount = scheduledIds.size;

  const pendingCount = Math.max(0, tasks.length - scheduledCount);

  // =====================================================
  // LIVE COUNTS
  // =====================================================

  const liveCount = liveTrains.filter((train) => train.live_available).length;

  const delayedCount = liveTrains.filter(
    (train) => train.live_available && Number(train.delay_minutes) > 0,
  ).length;
  // =====================================================
  // TOTAL MAINTENANCE TIME
  // =====================================================

  const totalMaintenanceMinutes = schedule.reduce(
    (total, item) => total + Number(item.duration || 0),
    0,
  );

  // =====================================================
  // PRIORITY HELPERS
  // =====================================================

  const getPriorityClass = (priority) => {
    if (priority === "critical") {
      return "critical";
    }

    if (priority === "high") {
      return "high";
    }

    return "medium";
  };

  // =====================================================
  // TIME FORMAT
  // =====================================================

  const formatTime = (minutes) => {
    if (minutes === undefined || minutes === null) {
      return "--:--";
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };
  const formatDelay = (minutes) => {
    const value = Number(minutes);

    if (!Number.isFinite(value)) {
      return "—";
    }

    const rounded = Math.round(value);

    if (rounded === 0) {
      return "On time";
    }

    if (rounded > 0) {
      return `${rounded} min late`;
    }

    return `${Math.abs(rounded)} min early`;
  };
  // =====================================================
  // LIVE STATUS FORMAT
  // =====================================================

  const formatLiveStatus = (train) => {
    if (!train.live_available) {
      return "DATABASE";
    }

    if (train.status === "not-started") {
      return "NOT STARTED";
    }

    if (train.status) {
      return String(train.status).replaceAll("-", " ").toUpperCase();
    }

    return "LIVE";
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return <div className="card">Loading RailGenie dashboard...</div>;
  }

  return (
    <>
      {/* ================================================= */}
      {/* TOPBAR */}
      {/* ================================================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "16px",
        }}
      >
        <button
          type="button"
          onClick={refreshDashboard}
          disabled={refreshing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: refreshing ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw size={16} className={refreshing ? "spin" : ""} />

          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error && (
        <div className="analytics-error">
          <AlertTriangle size={18} />

          <div>
            <strong>Dashboard unavailable</strong>

            <p>{error}</p>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* LIVE DATA STATUS */}
      {/* ================================================= */}

      <div
        className="card"
        style={{
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div
            className="live-railway-data"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <Radio size={20} />

            <div>
              <strong>Live Railway Data</strong>

              <div
                style={{
                  marginTop: "4px",
                  opacity: 0.75,
                }}
              >
                {liveLoading
                  ? "Updating live train status..."
                  : liveError
                    ? liveError
                    : `${liveCount}/${trains.length} trains connected to RailRadar`}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span className="recommended-badge">
              {liveLoading ? "UPDATING" : liveCount > 0 ? "LIVE" : "DATABASE"}
            </span>

            {delayedCount > 0 && (
              <span className="count-badge">{delayedCount} DELAYED</span>
            )}
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* STATS */}
      {/* ================================================= */}

      <section className="stats-grid">
        <StatCard
          icon={<TrainFront size={21} />}
          type="blue"
          label="Active Trains"
          value={trains.length}
          description={
            liveCount > 0
              ? `${liveCount} live from RailRadar`
              : "Loaded from PostgreSQL"
          }
        />

        <StatCard
          icon={<Wrench size={21} />}
          type="orange"
          label="Maintenance Tasks"
          value={tasks.length}
          description={`${scheduledCount} scheduled`}
        />

        <StatCard
          icon={<AlertTriangle size={21} />}
          type="red"
          label="Critical Tasks"
          value={criticalTasks}
          description={`${highTasks} high priority`}
        />

        <StatCard
          icon={<CheckCircle2 size={21} />}
          type="green"
          label="Optimization Score"
          value={score ? `${score.score}%` : "—"}
          description={runId ? `Run #${runId}` : "No run available"}
        />
      </section>

      {/* ================================================= */}
      {/* SECONDARY STATS */}
      {/* ================================================= */}

      <section className="stats-grid">
        <StatCard
          icon={<ShieldCheck size={21} />}
          type="green"
          label="Safety Score"
          value={
            score?.safety_score !== null && score?.safety_score !== undefined
              ? `${score.safety_score}%`
              : "—"
          }
          description="Train protection compliance"
        />

        <StatCard
          icon={<BarChart3 size={21} />}
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
          icon={<TrainFront size={21} />}
          type="orange"
          label="Train Impact"
          value={score ? `${score.train_impact} min` : "—"}
          description="Operational disruption"
        />

        <StatCard
          icon={<Wrench size={21} />}
          type="blue"
          label="Maintenance Time"
          value={`${totalMaintenanceMinutes} min`}
          description="Total optimized work"
        />
      </section>

      {/* ================================================= */}
      {/* RAILWAY MAP */}
      {/* ================================================= */}

      <RailwayMap trains={displayTrains} schedule={schedule} />

      {/* ================================================= */}
      {/* LIVE TRAIN STATUS */}
      {/* ================================================= */}

      <section
        className="card"
        style={{
          marginTop: "20px",
          marginBottom: "20px",
        }}
      >
        <div className="card-header">
          <div>
            <h3>Live Train Status</h3>

            <p>Real-time railway movement data</p>
          </div>

          <span className="recommended-badge">{liveCount} LIVE</span>
        </div>

        <div className="analytics-table">
          <div className="analytics-table-header">
            <span>Train</span>
            <span>Status</span>
            <span>Current</span>
            <span>Next</span>
            <span>Delay</span>
            <span>Source</span>
          </div>

          {displayTrains.map((train) => (
            <div className="analytics-table-row" key={train.train_id}>
              <strong>{train.train_id}</strong>

              <span>{formatLiveStatus(train)}</span>

              <span>
                <MapPin
                  size={14}
                  style={{
                    verticalAlign: "middle",
                    marginRight: "4px",
                  }}
                />

                {train.current_station || "—"}
              </span>

              <span>{train.next_station || "—"}</span>

              <span>{train.live_available ? formatDelay(train) : "—"}</span>

              <span>{train.live_available ? "RAILRADAR" : "POSTGRESQL"}</span>
            </div>
          ))}
        </div>

        {displayTrains.length === 0 && (
          <div className="analysis-empty">
            <TrainFront size={30} />

            <strong>No trains available</strong>

            <span>Railway movement data is currently unavailable.</span>
          </div>
        )}
      </section>

      {/* ================================================= */}
      {/* MAIN CONTENT */}
      {/* ================================================= */}

      <section className="dashboard-grid">
        {/* SYSTEM OVERVIEW */}

        <div className="card">
          <div className="card-header">
            <div>
              <h3>Optimization Overview</h3>

              <p>Current applied railway maintenance plan</p>
            </div>

            <span className="recommended-badge">
              {status ? status.toUpperCase() : "AI OPTIMIZED"}
            </span>
          </div>

          <div className="dashboard-overview">
            <OverviewMetric
              label="Scheduled Tasks"
              value={`${scheduledCount}/${tasks.length}`}
            />

            <OverviewMetric label="Pending Tasks" value={pendingCount} />

            <OverviewMetric label="Train Movements" value={trains.length} />

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
            <CheckCircle2 size={20} />

            <div>
              <strong>
                {runId
                  ? `Optimization Run #${runId} active`
                  : "Optimization engine ready"}
              </strong>

              <span>
                {createdAt
                  ? `Latest schedule generated ${new Date(
                      createdAt,
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
              <h3>Priority Tasks</h3>

              <p>Highest-priority maintenance work</p>
            </div>

            <span className="count-badge">{criticalTasks + highTasks}</span>
          </div>

          {tasks
            .filter(
              (task) =>
                task.priority === "critical" || task.priority === "high",
            )
            .sort((a, b) => {
              const rank = {
                critical: 1,
                high: 2,
              };

              return rank[a.priority] - rank[b.priority];
            })
            .slice(0, 5)
            .map((task) => (
              <div className="task" key={task.task_id}>
                <div className="task-id">{task.task_id}</div>

                <div className="task-info">
                  <strong>{task.asset_id}</strong>

                  <span>
                    Section {task.section}
                    {" · "}
                    {task.duration} min
                  </span>
                </div>

                <span className={`priority ${getPriorityClass(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
            ))}
        </div>
      </section>

      {/* ================================================= */}
      {/* OPTIMIZED SCHEDULE */}
      {/* ================================================= */}

      <section className="card schedule-card">
        <div className="card-header">
          <div>
            <h3>Latest Applied Schedule</h3>

            <p>{runId ? `PostgreSQL Run #${runId}` : "No applied schedule"}</p>
          </div>

          <span className="recommended-badge">{schedule.length} BLOCKS</span>
        </div>

        <div className="analytics-table">
          <div className="analytics-table-header">
            <span>Task</span>
            <span>Asset</span>
            <span>Section</span>
            <span>Time</span>
            <span>Duration</span>
            <span>Priority</span>
          </div>

          {schedule.map((item) => (
            <div className="analytics-table-row" key={item.task_id}>
              <strong>{item.task_id}</strong>

              <span>{item.asset_id}</span>

              <span>{item.section}</span>

              <span>
                {formatTime(item.start)}
                {" – "}
                {formatTime(item.end)}
              </span>

              <span>{item.duration} min</span>

              <span className={`priority ${getPriorityClass(item.priority)}`}>
                {item.priority}
              </span>
            </div>
          ))}
        </div>

        {schedule.length === 0 && (
          <div className="analysis-empty">
            <AlertTriangle size={30} />

            <strong>No maintenance blocks generated</strong>

            <span>Apply an optimized schedule from the Assistant.</span>
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
            <strong>Safety buffers active</strong>

            <span>10-minute protection before and after train movements.</span>
          </div>
        </div>

        <div className="analytics-summary-item">
          <TrainFront size={20} />

          <div>
            <strong>{trains.length} train movements</strong>

            <span>
              {liveCount > 0
                ? `${liveCount} movements currently enriched with RailRadar live data.`
                : "Loaded from PostgreSQL railway movement data."}
            </span>
          </div>
        </div>

        <div className="analytics-summary-item">
          <Wrench size={20} />

          <div>
            <strong>{scheduledCount} tasks scheduled</strong>

            <span>
              {totalMaintenanceMinutes} minutes of maintenance work planned.
            </span>
          </div>
        </div>

        <div className="analytics-summary-item">
          <Clock3 size={20} />

          <div>
            <strong>Live refresh: 60 seconds</strong>

            <span>
              Train status is automatically refreshed while the dashboard is
              open.
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

function StatCard({ icon, type, label, value, description }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${type}`}>{icon}</div>

      <div className="stat-content">
        <span>{label}</span>

        <strong>{value}</strong>

        <small>{description}</small>
      </div>
    </div>
  );
}

// =========================================================
// OVERVIEW METRIC
// =========================================================

function OverviewMetric({ label, value }) {
  return (
    <div className="dashboard-overview-item">
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

export default Dashboard;
