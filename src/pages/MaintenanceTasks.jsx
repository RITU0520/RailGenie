import React, { useEffect, useState } from "react";
import {
  Wrench,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

function MaintenanceTasks() {
  const [tasks, setTasks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/maintenance-tasks`
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load maintenance tasks."
        );
      }

      const data = await response.json();

      setTasks(data.tasks || []);

      // Load optimized schedule so the page
      // can show scheduled/unscheduled state.
      const trainsResponse = await fetch(
        `${API_URL}/api/trains`
      );

      if (!trainsResponse.ok) {
        throw new Error(
          "Unable to load train movements."
        );
      }

      const trainsData =
        await trainsResponse.json();

      const optimizeResponse = await fetch(
        `${API_URL}/api/optimize`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            planning_date: "2026-08-27",
            planning_start: 0,
            planning_end: 1439,
            maintenance_tasks:
              data.tasks || [],
            train_movements:
              trainsData.trains || [],
            safety_buffer_before: 10,
            safety_buffer_after: 10,
          }),
        }
      );

      const optimizeData =
        await optimizeResponse.json();

      if (optimizeResponse.ok) {
        setSchedule(
          optimizeData.schedule || []
        );
      } else {
        setSchedule([]);
      }
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load maintenance tasks."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshTasks = () => {
    setRefreshing(true);
    loadTasks();
  };

  const formatTime = (minutes) => {
    if (
      minutes === undefined ||
      minutes === null
    ) {
      return "--:--";
    }

    const hours = Math.floor(
      minutes / 60
    );

    const mins = minutes % 60;

    return (
      `${String(hours).padStart(2, "0")}:` +
      `${String(mins).padStart(2, "0")}`
    );
  };

  const getScheduledTask = (taskId) => {
    return schedule.find(
      (item) =>
        item.task_id === taskId
    );
  };

  const getPriorityClass = (priority) => {
    return priority || "medium";
  };

  if (loading) {
    return (
      <div className="card">
        Loading maintenance tasks...
      </div>
    );
  }

  return (
    <>
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="topbar">
        <div>
          <p className="eyebrow">
            MAINTENANCE MANAGEMENT
          </p>

          <h2>
            Maintenance Tasks
          </h2>
        </div>

        <div className="topbar-right">
          <button
            className="outline-button"
            onClick={refreshTasks}
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
              Maintenance data unavailable
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

      <section className="stats-grid">
        <StatCard
          icon={<Wrench size={21} />}
          type="blue"
          label="Total Tasks"
          value={tasks.length}
          description="Loaded from backend"
        />

        <StatCard
          icon={
            <AlertTriangle size={21} />
          }
          type="red"
          label="Critical"
          value={
            tasks.filter(
              (task) =>
                task.priority ===
                "critical"
            ).length
          }
          description="Highest priority"
        />

        <StatCard
          icon={
            <CheckCircle2 size={21} />
          }
          type="green"
          label="Scheduled"
          value={schedule.length}
          description="Optimizer result"
        />

        <StatCard
          icon={<Wrench size={21} />}
          type="orange"
          label="Unscheduled"
          value={Math.max(
            0,
            tasks.length -
              schedule.length
          )}
          description="Requires attention"
        />
      </section>

      {/* ================================================= */}
      {/* TASK TABLE */}
      {/* ================================================= */}

      <section className="card schedule-card">
        <div className="card-header">
          <div>
            <h3>
              Maintenance Task Register
            </h3>

            <p>
              Live tasks loaded from
              maintenance_tasks.json
            </p>
          </div>

          <span className="recommended-badge">
            {tasks.length} TASKS
          </span>
        </div>

        <div className="maintenance-table">
          <div className="maintenance-table-header">
            <span>Task</span>
            <span>Asset</span>
            <span>Section</span>
            <span>Duration</span>
            <span>Priority</span>
            <span>Availability</span>
            <span>Status</span>
          </div>

          {tasks.map((task) => {
            const scheduled =
              getScheduledTask(
                task.task_id
              );

            return (
              <div
                className="maintenance-table-row"
                key={task.task_id}
              >
                <strong>
                  {task.task_id}
                </strong>

                <span>
                  {task.asset_id}
                </span>

                <span>
                  {task.section}
                </span>

                <span>
                  {task.duration} min
                </span>

                <span
                  className={`priority ${getPriorityClass(
                    task.priority
                  )}`}
                >
                  {task.priority}
                </span>

                <div className="availability-cell">
                  {task.available_windows?.map(
                    (window, index) => (
                      <span
                        key={index}
                      >
                        {formatTime(
                          window.start
                        )}
                        {" – "}
                        {formatTime(
                          window.end
                        )}
                      </span>
                    )
                  )}
                </div>

                {scheduled ? (
                  <span className="task-status scheduled">
                    <CheckCircle2
                      size={13}
                    />

                    Scheduled
                  </span>
                ) : (
                  <span className="task-status pending">
                    <AlertTriangle
                      size={13}
                    />

                    Unscheduled
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {tasks.length === 0 && (
          <div className="analysis-empty">
            <Wrench size={30} />

            <strong>
              No maintenance tasks found
            </strong>

            <span>
              Check your backend data files.
            </span>
          </div>
        )}
      </section>

      {/* ================================================= */}
      {/* SCHEDULED TASKS */}
      {/* ================================================= */}

      <section className="card">
        <div className="card-header">
          <div>
            <h3>
              Optimized Task Windows
            </h3>

            <p>
              Actual windows generated by
              the RailGenie optimizer
            </p>
          </div>
        </div>

        <div className="optimized-task-list">
          {schedule.map((item) => (
            <div
              className="optimized-task"
              key={item.task_id}
            >
              <div className="task-id">
                {item.task_id}
              </div>

              <div className="task-info">
                <strong>
                  {item.asset_id}
                </strong>

                <span>
                  Section {item.section}
                  {" · "}
                  {item.duration} minutes
                </span>
              </div>

              <strong className="optimized-time">
                {formatTime(item.start)}
                {" – "}
                {formatTime(item.end)}
              </strong>

              <span
                className={`priority ${getPriorityClass(
                  item.priority
                )}`}
              >
                {item.priority}
              </span>
            </div>
          ))}
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
        <span>{label}</span>

        <strong>{value}</strong>

        <small>
          {description}
        </small>
      </div>
    </div>
  );
}

export default MaintenanceTasks;