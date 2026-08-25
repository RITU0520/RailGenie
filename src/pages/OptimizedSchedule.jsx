import React, { useEffect, useState } from "react";
import {
  CalendarClock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

function OptimizedSchedule() {
  const [tasks, setTasks] = useState([]);
  const [trains, setTrains] = useState([]);

  const [schedule, setSchedule] = useState([]);
  const [score, setScore] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    generateSchedule();
  }, []);

  const generateSchedule = async () => {
    setLoading(true);
    setError("");

    try {
      // -----------------------------------------------------
      // Load backend data
      // -----------------------------------------------------

      const [
        tasksResponse,
        trainsResponse,
      ] = await Promise.all([
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
          "Unable to load railway data."
        );
      }

      const tasksData =
        await tasksResponse.json();

      const trainsData =
        await trainsResponse.json();

      const backendTasks =
        tasksData.tasks || [];

      const backendTrains =
        trainsData.trains || [];

      setTasks(backendTasks);
      setTrains(backendTrains);

      // -----------------------------------------------------
      // Build multi-task optimization request
      // -----------------------------------------------------

      const requestBody = {
        planning_date: "2026-08-27",

        planning_start: 0,

        planning_end: 1439,

        safety_buffer_before: 10,

        safety_buffer_after: 10,

        maintenance_tasks:
          backendTasks,

        train_movements:
          backendTrains,
      };

      // -----------------------------------------------------
      // Run optimizer
      // -----------------------------------------------------

      const response = await fetch(
        `${API_URL}/api/optimize`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(requestBody),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail?.message ||
            "Unable to generate schedule."
        );
      }

      setSchedule(
        data.schedule || []
      );

      setScore(
        data.score || null
      );

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to generate optimized schedule."
      );

    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // Helpers
  // =========================================================

  const criticalTasks =
    schedule.filter(
      (task) =>
        task.priority === "critical"
    ).length;

  const totalDuration =
    schedule.reduce(
      (total, task) =>
        total + task.duration,
      0
    );

  return (
    <div>

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="topbar">

        <div>
          <p className="eyebrow">
            OPTIMIZATION
          </p>

          <h2>
            Optimized Schedule
          </h2>
        </div>

        <div className="topbar-right">

          <button
            className="outline-button"
            onClick={
              generateSchedule
            }
            disabled={loading}
          >
            <RefreshCw
              size={14}
              style={{
                marginRight: 6,
              }}
            />

            {loading
              ? "Optimizing..."
              : "Regenerate"}
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
        <div className="result-message error-message">

          <AlertTriangle size={18} />

          <div>
            <strong>
              Schedule generation failed
            </strong>

            <p>
              {error}
            </p>
          </div>

        </div>
      )}

      {/* ================================================= */}
      {/* SUMMARY */}
      {/* ================================================= */}

      <div className="stats-grid">

        <StatCard
          label="Scheduled Tasks"
          value={
            loading
              ? "—"
              : schedule.length
          }
          detail="Maintenance blocks"
        />

        <StatCard
          label="Critical Tasks"
          value={
            loading
              ? "—"
              : criticalTasks
          }
          detail="Priority protected"
        />

        <StatCard
          label="Total Block Time"
          value={
            loading
              ? "—"
              : `${totalDuration} min`
          }
          detail="Scheduled maintenance"
        />

        <StatCard
          label="Optimization Score"
          value={
            loading
              ? "—"
              : score
              ? `${score.score}%`
              : "—"
          }
          detail="RailGenie score"
        />

      </div>

      {/* ================================================= */}
      {/* SCHEDULE CARD */}
      {/* ================================================= */}

      <section className="card schedule-card">

        <div className="card-header">

          <div>
            <h3>
              Recommended Maintenance Schedule
            </h3>

            <p>
              Multi-task schedule generated by
              the RailGenie optimization engine
            </p>
          </div>

          {!loading &&
            schedule.length > 0 && (
              <span className="ai-badge">
                OPTIMIZED
              </span>
            )}

        </div>

        {loading ? (

          <div className="empty-result">

            <CalendarClock
              size={40}
            />

            <strong>
              Generating optimized schedule...
            </strong>

            <span>
              RailGenie is evaluating maintenance
              tasks, train movements and safety
              buffers.
            </span>

          </div>

        ) : schedule.length === 0 ? (

          <div className="empty-result">

            <AlertTriangle
              size={40}
            />

            <strong>
              No feasible schedule
            </strong>

            <span>
              RailGenie could not find a valid
              schedule for the current constraints.
            </span>

          </div>

        ) : (

          <div className="schedule-table">

            {/* Table header */}

            <div className="table-row table-header">

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

            {/* Schedule rows */}

            {schedule.map(
              (item) => (
                <div
                  className="table-row"
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

                  <strong>
                    {formatTime(
                      item.start
                    )}
                    {" – "}
                    {formatTime(
                      item.end
                    )}
                  </strong>

                  <span>
                    {item.duration} min
                  </span>

                  <PriorityBadge
                    priority={
                      item.priority
                    }
                  />

                </div>
              )
            )}

          </div>

        )}

      </section>

      {/* ================================================= */}
      {/* SCORE DETAILS */}
      {/* ================================================= */}

      {score && !loading && (
        <section className="card">

          <div className="card-header">

            <div>
              <h3>
                Optimization Quality
              </h3>

              <p>
                Evaluation of the generated schedule
              </p>
            </div>

          </div>

          <div className="result-grid">

            <Metric
              label="Overall Score"
              value={`${score.score}%`}
              good
            />

            <Metric
              label="Priority Score"
              value={`${score.priority_score}%`}
              good
            />

            <Metric
              label="Train Impact"
              value={`${score.train_impact} min`}
              good={
                score.train_impact === 0
              }
            />

            <Metric
              label="Safety Score"
              value={`${score.safety_score}%`}
              good={
                score.safety_score === 100
              }
            />

          </div>

          <div className="result-message">

            <CheckCircle2 size={18} />

            <div>

              <strong>
                Schedule validated
              </strong>

              <p>
                The schedule was generated
                using maintenance availability,
                section conflicts, train movements,
                priority and safety-buffer constraints.
              </p>

            </div>

          </div>

        </section>
      )}

    </div>
  );
}


// =========================================================
// Stat Card
// =========================================================

function StatCard({
  label,
  value,
  detail,
}) {
  return (
    <div className="stat-card">

      <div className="stat-icon blue">
        <CalendarClock
          size={20}
        />
      </div>

      <div className="stat-content">

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {detail}
        </small>

      </div>

    </div>
  );
}


// =========================================================
// Priority Badge
// =========================================================

function PriorityBadge({
  priority,
}) {
  const normalized =
    priority?.toLowerCase() ||
    "low";

  return (
    <span
      className={`priority ${normalized}`}
    >
      {capitalize(
        normalized
      )}
    </span>
  );
}


// =========================================================
// Metric
// =========================================================

function Metric({
  label,
  value,
  good,
}) {
  return (
    <div className="result-metric">

      <span>
        {label}
      </span>

      <strong
        className={
          good
            ? "good-value"
            : ""
        }
      >
        {value}
      </strong>

    </div>
  );
}


// =========================================================
// Helpers
// =========================================================

function formatTime(totalMinutes) {
  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  return (
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}`
  );
}


function capitalize(value) {
  if (!value) {
    return "";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}


export default OptimizedSchedule;