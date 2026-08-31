```jsx
import React, { useEffect, useState } from "react";
import {
  RefreshCw,
  Play,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const API_URL =
  process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function BlockPlanning() {
  const [tasks, setTasks] = useState([]);
  const [trains, setTrains] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [score, setScore] = useState(null);

  const [planningStart, setPlanningStart] = useState(0);
  const [planningEnd, setPlanningEnd] = useState(1439);

  const [safetyBefore, setSafetyBefore] = useState(10);
  const [safetyAfter, setSafetyAfter] = useState(10);

  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD PLANNING DATA
  // =====================================================

  useEffect(() => {
    const loadPlanningData = async () => {
      setLoading(true);
      setError("");

      try {
        const tasksResponse = await fetch(
          `${API_URL}/api/maintenance-tasks`
        );

        const trainsResponse = await fetch(
          `${API_URL}/api/trains`
        );

        if (!tasksResponse.ok || !trainsResponse.ok) {
          throw new Error(
            "Unable to load planning data."
          );
        }

        const tasksData = await tasksResponse.json();
        const trainsData = await trainsResponse.json();

        setTasks(tasksData.tasks || []);
        setTrains(trainsData.trains || []);
      } catch (err) {
        console.error(err);

        setError(
          err.message ||
            "Unable to load planning data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPlanningData();
  }, []);

  // =====================================================
  // OPTIMIZATION
  // =====================================================

  const runOptimization = async (
    maintenanceTasks = tasks,
    trainMovements = trains,
    bufferBefore = safetyBefore,
    bufferAfter = safetyAfter
  ) => {
    setOptimizing(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/optimize`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            planning_date: "2026-08-27",

            planning_start: Number(planningStart),

            planning_end: Number(planningEnd),

            maintenance_tasks: maintenanceTasks,

            train_movements: trainMovements,

            safety_buffer_before: Number(bufferBefore),

            safety_buffer_after: Number(bufferAfter),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        let message = "Optimization failed.";

        if (typeof data.detail === "string") {
          message = data.detail;
        } else if (
          data.detail &&
          typeof data.detail === "object"
        ) {
          message =
            data.detail.message ||
            message;
        } else if (data.message) {
          message = data.message;
        }

        throw new Error(message);
      }

      if (data.status === "infeasible") {
        setSchedule([]);
        setScore(null);

        throw new Error(
          data.message ||
            "No feasible schedule was found."
        );
      }

      setSchedule(data.schedule || []);
      setScore(data.score || null);
    } catch (err) {
      console.error(err);

      setSchedule([]);
      setScore(null);

      setError(
        err.message ||
          "Unable to generate schedule."
      );
    } finally {
      setOptimizing(false);
    }
  };

  // =====================================================
  // MANUAL OPTIMIZATION
  // =====================================================

  const handleOptimize = () => {
    runOptimization(
      tasks,
      trains,
      safetyBefore,
      safetyAfter
    );
  };

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {
    setLoading(true);
    setError("");

    try {
      const tasksResponse = await fetch(
        `${API_URL}/api/maintenance-tasks`
      );

      const trainsResponse = await fetch(
        `${API_URL}/api/trains`
      );

      if (!tasksResponse.ok || !trainsResponse.ok) {
        throw new Error(
          "Unable to refresh planning data."
        );
      }

      const tasksData = await tasksResponse.json();
      const trainsData = await trainsResponse.json();

      const loadedTasks =
        tasksData.tasks || [];

      const loadedTrains =
        trainsData.trains || [];

      setTasks(loadedTasks);
      setTrains(loadedTrains);

      await runOptimization(
        loadedTasks,
        loadedTrains,
        safetyBefore,
        safetyAfter
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to refresh planning data."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FORMAT TIME
  // =====================================================

  const formatTime = (minutes) => {
    if (
      minutes === undefined ||
      minutes === null
    ) {
      return "--:--";
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return (
      `${String(hours).padStart(2, "0")}:` +
      `${String(mins).padStart(2, "0")}`
    );
  };

  // =====================================================
  // PRIORITY CLASS
  // =====================================================

  const priorityClass = (priority) => {
    if (priority === "critical") {
      return "critical";
    }

    if (priority === "high") {
      return "high";
    }

    if (priority === "medium") {
      return "medium";
    }

    return "low";
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="card">
        Loading Block Planning...
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <>
      {/* HEADER */}

      <header className="topbar">
        <div>
          <p className="eyebrow">
            MAINTENANCE OPTIMIZATION
          </p>

          <h2>
            Block Planning
          </h2>
        </div>

        <div className="topbar-right">
          <button
            className="outline-button"
            onClick={handleRefresh}
            disabled={optimizing}
          >
            <RefreshCw size={14} />
            Refresh
          </button>

          <div className="profile">
            RG
          </div>
        </div>
      </header>

      {/* ERROR */}

      {error && (
        <div className="planning-error">
          <AlertTriangle size={18} />

          <div>
            <strong>
              Planning error
            </strong>

            <p>{error}</p>
          </div>
        </div>
      )}

      {/* PLANNING CONFIGURATION */}

      <section className="card">
        <div className="card-header">
          <div>
            <h3>
              Planning Configuration
            </h3>

            <p>
              Configure the planning horizon
              and railway safety buffers.
            </p>
          </div>

          <span className="simulation-badge">
            LIVE OPTIMIZER
          </span>
        </div>

        <div className="planning-controls">
          <div className="planning-field">
            <label>
              Planning Start
            </label>

            <input
              type="number"
              min="0"
              max="1438"
              value={planningStart}
              onChange={(e) =>
                setPlanningStart(
                  Number(e.target.value)
                )
              }
            />

            <small>
              {formatTime(planningStart)}
            </small>
          </div>

          <div className="planning-field">
            <label>
              Planning End
            </label>

            <input
              type="number"
              min="1"
              max="1439"
              value={planningEnd}
              onChange={(e) =>
                setPlanningEnd(
                  Number(e.target.value)
                )
              }
            />

            <small>
              {formatTime(planningEnd)}
            </small>
          </div>

          <div className="planning-field">
            <label>
              Safety Before
            </label>

            <input
              type="number"
              min="0"
              value={safetyBefore}
              onChange={(e) =>
                setSafetyBefore(
                  Number(e.target.value)
                )
              }
            />

            <small>
              minutes
            </small>
          </div>

          <div className="planning-field">
            <label>
              Safety After
            </label>

            <input
              type="number"
              min="0"
              value={safetyAfter}
              onChange={(e) =>
                setSafetyAfter(
                  Number(e.target.value)
                )
              }
            />

            <small>
              minutes
            </small>
          </div>
        </div>

        <div className="planning-actions">
          <div className="planning-data-summary">
            <span>
              {tasks.length} maintenance tasks
            </span>

            <span>
              {trains.length} train movements
            </span>

            <span>
              Safety buffers:{" "}
              {safetyBefore}/
              {safetyAfter} min
            </span>
          </div>

          <button
            className="generate-button"
            onClick={handleOptimize}
            disabled={
              optimizing ||
              planningEnd <= planningStart
            }
          >
            {optimizing ? (
              <>
                <RefreshCw
                  size={17}
                  className="spin"
                />

                Optimizing...
              </>
            ) : (
              <>
                <Play size={17} />

                Generate Schedule
              </>
            )}
          </button>
        </div>
      </section>

      {/* SCORE SUMMARY */}

      {score && (
        <section className="stats-grid">
          <StatCard
            icon={
              <CheckCircle2 size={21} />
            }
            type="green"
            label="Plan Score"
            value={`${score.score}%`}
            description="Overall optimization quality"
          />

          <StatCard
            icon={
              <ShieldCheck size={21} />
            }
            type="green"
            label="Safety Score"
            value={`${score.safety_score}%`}
            description="Protected train intervals"
          />

          <StatCard
            icon={
              <AlertTriangle size={21} />
            }
            type="orange"
            label="Train Impact"
            value={`${score.train_impact} min`}
            description="Operational disruption"
          />

          <StatCard
            icon={
              <CheckCircle2 size={21} />
            }
            type="blue"
            label="Priority Score"
            value={`${score.priority_score}%`}
            description="Priority-aware planning"
          />
        </section>
      )}

      {/* OPTIMIZED BLOCKS */}

      <section className="card schedule-card">
        <div className="card-header">
          <div>
            <h3>
              Optimized Maintenance Blocks
            </h3>

            <p>
              Generated directly by the RailGenie
              constraint optimizer.
            </p>
          </div>

          <span className="recommended-badge">
            {schedule.length} BLOCKS
          </span>
        </div>

        <div className="block-planning-table">
          <div className="block-planning-header">
            <span>Task</span>
            <span>Asset</span>
            <span>Section</span>
            <span>Start</span>
            <span>End</span>
            <span>Duration</span>
            <span>Priority</span>
          </div>

          {schedule.map((item) => (
            <div
              className="block-planning-row"
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
                {formatTime(item.start)}
              </span>

              <span>
                {formatTime(item.end)}
              </span>

              <span>
                {item.duration} min
              </span>

              <span
                className={`priority ${priorityClass(
                  item.priority
                )}`}
              >
                {item.priority}
              </span>
            </div>
          ))}
        </div>

        {schedule.length === 0 && !error && (
          <div className="analysis-empty">
            <AlertTriangle size={30} />

            <strong>
              No schedule generated
            </strong>

            <span>
              Run the optimizer to generate
              maintenance blocks.
            </span>
          </div>
        )}
      </section>

      {/* SAFETY INFORMATION */}

      <section className="card planning-safety-card">
        <div className="planning-safety-icon">
          <ShieldCheck size={22} />
        </div>

        <div>
          <strong>
            Train safety protection enabled
          </strong>

          <p>
            The optimizer protects train
            movement intervals using a{" "}
            {safetyBefore}-minute buffer
            before and a{" "}
            {safetyAfter}-minute buffer
            after each train movement.
          </p>
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

export default BlockPlanning;
```
