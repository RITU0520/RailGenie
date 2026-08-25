import React, { useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [tasks, setTasks] = useState([]);
  const [trains, setTrains] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [score, setScore] = useState(null);

  // =====================================================
  // LOAD ANALYTICS
  // =====================================================

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError("");

    try {
      const [tasksResponse, trainsResponse] =
        await Promise.all([
          fetch(
            `${API_URL}/api/maintenance-tasks`
          ),
          fetch(
            `${API_URL}/api/trains`
          ),
        ]);

      if (
        !tasksResponse.ok ||
        !trainsResponse.ok
      ) {
        throw new Error(
          "Unable to load RailGenie data."
        );
      }

      const tasksData =
        await tasksResponse.json();

      const trainsData =
        await trainsResponse.json();

      const loadedTasks =
        tasksData.tasks || [];

      const loadedTrains =
        trainsData.trains || [];

      setTasks(loadedTasks);
      setTrains(loadedTrains);

      // -------------------------------------------------
      // Run the real optimizer
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
            "Optimization failed."
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
          "Unable to load analytics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =====================================================
  // REFRESH
  // =====================================================

  const refreshAnalytics = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  // =====================================================
  // TASK COUNTS
  // =====================================================

  const priorityCounts = {
    critical: tasks.filter(
      (task) =>
        task.priority === "critical"
    ).length,

    high: tasks.filter(
      (task) =>
        task.priority === "high"
    ).length,

    medium: tasks.filter(
      (task) =>
        task.priority === "medium"
    ).length,

    low: tasks.filter(
      (task) =>
        task.priority === "low"
    ).length,
  };

  // =====================================================
  // SCHEDULED TASK COUNT
  // =====================================================

  const scheduledTaskIds =
    new Set(
      schedule.map(
        (item) => item.task_id
      )
    );

  const scheduledCount =
    scheduledTaskIds.size;

  const unscheduledCount =
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
  // AVERAGE TASK DURATION
  // =====================================================

  const averageDuration =
    scheduledCount > 0
      ? Math.round(
          totalMaintenanceMinutes /
            scheduledCount
        )
      : 0;

  // =====================================================
  // SECTION DISTRIBUTION
  // =====================================================

  const sectionCounts = {};

  schedule.forEach((item) => {
    sectionCounts[item.section] =
      (sectionCounts[item.section] || 0) +
      1;
  });

  const maxSectionCount =
    Math.max(
      1,
      ...Object.values(
        sectionCounts
      )
    );

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="card">
        Loading RailGenie analytics...
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <>
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="topbar">
        <div>
          <p className="eyebrow">
            PERFORMANCE INTELLIGENCE
          </p>

          <h2>
            Analytics
          </h2>
        </div>

        <div className="topbar-right">
          <button
            className="outline-button"
            onClick={
              refreshAnalytics
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
          <AlertTriangle size={18} />

          <div>
            <strong>
              Analytics unavailable
            </strong>

            <p>
              {error}
            </p>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* KPI CARDS */}
      {/* ================================================= */}

      <section className="stats-grid">

        <StatCard
          icon={
            <BarChart3 size={21} />
          }
          type="blue"
          label="Optimization Score"
          value={
            score
              ? `${score.score}%`
              : "—"
          }
          description="Current optimized plan"
        />

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
            <Clock3 size={21} />
          }
          type="orange"
          label="Train Impact"
          value={
            score
              ? `${score.train_impact} min`
              : "—"
          }
          description="Estimated operational impact"
        />

        <StatCard
          icon={
            <CheckCircle2 size={21} />
          }
          type="green"
          label="Scheduled Tasks"
          value={`${scheduledCount}/${tasks.length}`}
          description={
            unscheduledCount === 0
              ? "All tasks scheduled"
              : `${unscheduledCount} not scheduled`
          }
        />

      </section>

      {/* ================================================= */}
      {/* MAIN ANALYTICS */}
      {/* ================================================= */}

      <section className="dashboard-grid">

        {/* PRIORITY DISTRIBUTION */}

        <div className="card">

          <div className="card-header">
            <div>
              <h3>
                Maintenance Priority
              </h3>

              <p>
                Current maintenance task distribution
              </p>
            </div>

            <span className="simulation-badge">
              {tasks.length} TASKS
            </span>
          </div>

          <PriorityRow
            label="Critical"
            count={
              priorityCounts.critical
            }
            total={tasks.length}
            className="critical"
          />

          <PriorityRow
            label="High"
            count={
              priorityCounts.high
            }
            total={tasks.length}
            className="high"
          />

          <PriorityRow
            label="Medium"
            count={
              priorityCounts.medium
            }
            total={tasks.length}
            className="medium"
          />

          <PriorityRow
            label="Low"
            count={
              priorityCounts.low
            }
            total={tasks.length}
            className="low"
          />

        </div>

        {/* SCORE BREAKDOWN */}

        <div className="card">

          <div className="card-header">
            <div>
              <h3>
                Optimization Quality
              </h3>

              <p>
                Score components from the optimizer
              </p>
            </div>
          </div>

          <ScoreRow
            label="Overall Score"
            value={
              score?.score || 0
          }
          />

          <ScoreRow
            label="Priority Score"
            value={
              score?.priority_score ||
              0
            }
          />

          <ScoreRow
            label="Safety Score"
            value={
              score?.safety_score ||
              0
            }
          />

          <div className="analytics-impact">

            <div>
              <span>
                Train Impact
              </span>

              <strong>
                {score
                  ? `${score.train_impact} min`
                  : "—"}
              </strong>
            </div>

            <div>
              <span>
                Maintenance Time
              </span>

              <strong>
                {totalMaintenanceMinutes} min
              </strong>
            </div>

          </div>

        </div>

      </section>

      {/* ================================================= */}
      {/* SECTION ANALYSIS */}
      {/* ================================================= */}

      <section className="card analytics-section">

        <div className="card-header">

          <div>
            <h3>
              Maintenance by Railway Section
            </h3>

            <p>
              Distribution of optimized maintenance blocks
            </p>
          </div>

          <span>
            {Object.keys(sectionCounts).length} sections
          </span>

        </div>

        {Object.keys(sectionCounts)
          .sort()
          .map((section) => {

            const count =
              sectionCounts[section];

            const width =
              (count /
                maxSectionCount) *
              100;

            return (
              <div
                className="section-analysis-row"
                key={section}
              >

                <div className="section-analysis-label">
                  <strong>
                    {section}
                  </strong>

                  <span>
                    {count} maintenance{" "}
                    {count === 1
                      ? "block"
                      : "blocks"}
                  </span>
                </div>

                <div className="section-analysis-track">

                  <div
                    className="section-analysis-fill"
                    style={{
                      width:
                        `${width}%`,
                    }}
                  />

                </div>

              </div>
            );
          })}

      </section>

      {/* ================================================= */}
      {/* OPTIMIZED SCHEDULE */}
      {/* ================================================= */}

      <section className="card schedule-card">

        <div className="card-header">

          <div>
            <h3>
              Optimized Maintenance Schedule
            </h3>

            <p>
              Live result from the RailGenie optimization engine
            </p>
          </div>

          <span className="recommended-badge">
            AI OPTIMIZED
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
                key={item.task_id}
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
                  className={`priority ${
                    item.priority
                  }`}
                >
                  {item.priority}
                </span>

              </div>
            )
          )}

        </div>

      </section>

      {/* ================================================= */}
      {/* SYSTEM SUMMARY */}
      {/* ================================================= */}

      <section className="analytics-summary">

        <div className="analytics-summary-item">

          <CheckCircle2 size={20} />

          <div>
            <strong>
              Safety constraints active
            </strong>

            <span>
              10-minute protection buffer before and after train movements
            </span>
          </div>

        </div>

        <div className="analytics-summary-item">

          <BarChart3 size={20} />

          <div>
            <strong>
              {trains.length} train movements analyzed
            </strong>

            <span>
              Current planning horizon: 00:00–23:59
            </span>
          </div>

        </div>

        <div className="analytics-summary-item">

          <Clock3 size={20} />

          <div>
            <strong>
              Average maintenance duration
            </strong>

            <span>
              {averageDuration} minutes per scheduled task
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
// PRIORITY ROW
// =========================================================

function PriorityRow({
  label,
  count,
  total,
  className,
}) {
  const percentage =
    total > 0
      ? (count / total) * 100
      : 0;

  return (
    <div className="priority-analysis-row">

      <div className="priority-analysis-header">

        <span>
          {label}
        </span>

        <strong>
          {count}
        </strong>

      </div>

      <div className="priority-analysis-track">

        <div
          className={`priority-analysis-fill ${className}`}
          style={{
            width:
              `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}


// =========================================================
// SCORE ROW
// =========================================================

function ScoreRow({
  label,
  value,
}) {
  return (
    <div className="score-analysis-row">

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}%
        </strong>
      </div>

      <div className="score-analysis-track">

        <div
          className="score-analysis-fill"
          style={{
            width:
              `${Math.min(
                value,
                100
              )}%`,
          }}
        />

      </div>

    </div>
  );
}


// =========================================================
// TIME FORMAT
// =========================================================

function formatTime(minutes) {
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
}


export default Analytics;