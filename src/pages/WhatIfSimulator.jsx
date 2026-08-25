import React, { useEffect, useState } from "react";
import { FlaskConical, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

function WhatIfSimulator() {
  const [tasks, setTasks] = useState([]);
  const [trains, setTrains] = useState([]);

  const [taskId, setTaskId] = useState("M001");
  const [trainId, setTrainId] = useState("12001");

  const [trainDelay, setTrainDelay] = useState(0);
  const [newDuration, setNewDuration] = useState(120);
  const [newPriority, setNewPriority] = useState("critical");

  const [safetyBefore, setSafetyBefore] = useState(10);
  const [safetyAfter, setSafetyAfter] = useState(10);

  const [currentSchedule, setCurrentSchedule] = useState([]);
  const [scenarioSchedule, setScenarioSchedule] = useState([]);

  const [currentScore, setCurrentScore] = useState(null);
  const [scenarioScore, setScenarioScore] = useState(null);

  const [changes, setChanges] = useState([]);
  const [diagnostics, setDiagnostics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const [simulated, setSimulated] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD INITIAL DATA
  // =====================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
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

      if (loadedTasks.length > 0) {
        const firstTask =
          loadedTasks.find(
            (task) =>
              task.task_id === "M001"
          ) || loadedTasks[0];

        setTaskId(firstTask.task_id);
        setNewDuration(
          firstTask.duration
        );
        setNewPriority(
          firstTask.priority
        );
      }

      if (loadedTrains.length > 0) {
        const firstTrain =
          loadedTrains.find(
            (train) =>
              train.train_id === "12001"
          ) || loadedTrains[0];

        setTrainId(
          firstTrain.train_id
        );
      }

      await loadBaseline(
        loadedTasks,
        loadedTrains
      );

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load simulator data."
      );

    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // BASELINE
  // =====================================================

  const loadBaseline = async (
    loadedTasks,
    loadedTrains
  ) => {
    if (
      !loadedTasks.length ||
      !loadedTrains.length
    ) {
      return;
    }

    try {
      const response = await fetch(
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

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          "Unable to generate baseline schedule."
        );
      }

      setCurrentSchedule(
        data.schedule || []
      );

      setCurrentScore(
        data.score || null
      );

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to generate baseline schedule."
      );
    }
  };

  // =====================================================
  // SELECTED TASK
  // =====================================================

  const selectedTask =
    tasks.find(
      (task) =>
        task.task_id === taskId
    );

  const selectedTrain =
    trains.find(
      (train) =>
        train.train_id === trainId
    );

  // =====================================================
  // RUN SIMULATION
  // =====================================================

  const runSimulation = async () => {
    setSimulating(true);
    setSimulated(false);
    setError("");
    setDiagnostics(null);
    setScenarioSchedule([]);
    setScenarioScore(null);

    try {
      const response = await fetch(
        `${API_URL}/api/simulate`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            train_id:
              trainDelay > 0
                ? trainId
                : null,

            train_delay:
              trainDelay,

            task_id:
              taskId,

            new_duration:
              newDuration,

            new_priority:
              newPriority,

            safety_buffer_before:
              safetyBefore,

            safety_buffer_after:
              safetyAfter,

            planning_start: 0,

            planning_end: 1439,

            planning_date:
              "2026-08-27",
          }),
        }
      );

      const data =
        await response.json();

      setSimulated(true);

      setChanges(
        data.changes || []
      );

      // -------------------------------------------------
      // Successful scenario
      // -------------------------------------------------

      if (
        data.status === "optimal"
      ) {
        setScenarioSchedule(
          data.schedule || []
        );

        setScenarioScore(
          data.score || null
        );

        setDiagnostics(null);

        return;
      }

      // -------------------------------------------------
      // Infeasible scenario
      // -------------------------------------------------

      if (
        data.status === "infeasible"
      ) {
        setScenarioSchedule([]);
        setScenarioScore(null);

        setDiagnostics(
          data.diagnostics || null
        );

        return;
      }

      throw new Error(
        data.message ||
          "Simulation failed."
      );

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to run simulation."
      );

    } finally {
      setSimulating(false);
    }
  };

  // =====================================================
  // RESET
  // =====================================================

  const resetSimulation = () => {
    setTrainDelay(0);

    if (selectedTask) {
      setNewDuration(
        selectedTask.duration
      );

      setNewPriority(
        selectedTask.priority
      );
    }

    setSafetyBefore(10);
    setSafetyAfter(10);

    setSimulated(false);
    setChanges([]);
    setDiagnostics(null);
    setScenarioSchedule([]);
    setScenarioScore(null);
    setError("");
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

    const hours =
      Math.floor(minutes / 60);

    const mins =
      minutes % 60;

    return (
      `${String(hours).padStart(2, "0")}:` +
      `${String(mins).padStart(2, "0")}`
    );
  };

  // =====================================================
  // FIND SCHEDULED TASK
  // =====================================================

  const findTaskSchedule = (
    schedule,
    id
  ) => {
    return schedule.find(
      (item) =>
        item.task_id === id
    );
  };

  const currentTaskSchedule =
    findTaskSchedule(
      currentSchedule,
      taskId
    );

  const simulatedTaskSchedule =
    findTaskSchedule(
      scenarioSchedule,
      taskId
    );

  // =====================================================
  // RENDER
  // =====================================================

  if (loading) {
    return (
      <div className="card">
        Loading RailGenie simulator...
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
            DECISION SIMULATION
          </p>

          <h2>
            What-if Simulator
          </h2>
        </div>

        <div className="topbar-right">

          <div className="date-box">

            <span>
              Scenario
            </span>

            <strong>
              {taskId || "Select task"}
            </strong>

          </div>

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
              Simulator error
            </strong>

            <p>
              {error}
            </p>

          </div>

        </div>
      )}

      {/* ================================================= */}
      {/* CONTROLS */}
      {/* ================================================= */}

      <section className="card simulator-control">

        <div className="card-header">

          <div>
            <h3>
              Test a Schedule Change
            </h3>

            <p>
              Change railway conditions and
              let the RailGenie optimizer
              calculate the impact.
            </p>
          </div>

          <span className="simulation-badge">
            WHAT-IF
          </span>

        </div>

        <div className="scenario-summary">

          <div>
            <span>
              Maintenance Task
            </span>

            <select
              value={taskId}
              onChange={(e) => {
                const id =
                  e.target.value;

                setTaskId(id);

                const task =
                  tasks.find(
                    (item) =>
                      item.task_id === id
                  );

                if (task) {
                  setNewDuration(
                    task.duration
                  );

                  setNewPriority(
                    task.priority
                  );
                }

                setSimulated(false);
              }}
            >
              {tasks.map(
                (task) => (
                  <option
                    key={task.task_id}
                    value={task.task_id}
                  >
                    {task.task_id} —{" "}
                    {task.asset_id}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <span>
              Section
            </span>

            <strong>
              {selectedTask?.section ||
                "—"}
            </strong>
          </div>

          <div>
            <span>
              Current Block
            </span>

            <strong>
              {currentTaskSchedule
                ? `${formatTime(
                    currentTaskSchedule.start
                  )} – ${formatTime(
                    currentTaskSchedule.end
                  )}`
                : "Not scheduled"}
            </strong>
          </div>

          <div>
            <span>
              Current Duration
            </span>

            <strong>
              {selectedTask?.duration ||
                0}{" "}
              min
            </strong>
          </div>

        </div>

        {/* ================================================= */}
        {/* SCENARIO INPUTS */}
        {/* ================================================= */}

        <div className="simulator-input-grid">

          <div className="simulator-field">

            <label>
              Train
            </label>

            <select
              value={trainId}
              onChange={(e) => {
                setTrainId(
                  e.target.value
                );
                setSimulated(false);
              }}
            >
              {trains.map(
                (train) => (
                  <option
                    key={train.train_id}
                    value={train.train_id}
                  >
                    {train.train_id} —{" "}
                    {train.section}
                  </option>
                )
              )}
            </select>

          </div>

          <div className="simulator-field">

            <label>
              Train Delay
            </label>

            <input
              type="number"
              min="0"
              step="5"
              value={trainDelay}
              onChange={(e) => {
                setTrainDelay(
                  Number(e.target.value)
                );
                setSimulated(false);
              }}
            />

            <small>
              minutes
            </small>

          </div>

          <div className="simulator-field">

            <label>
              Maintenance Duration
            </label>

            <input
              type="number"
              min="1"
              value={newDuration}
              onChange={(e) => {
                setNewDuration(
                  Number(e.target.value)
                );
                setSimulated(false);
              }}
            />

            <small>
              minutes
            </small>

          </div>

          <div className="simulator-field">

            <label>
              Priority
            </label>

            <select
              value={newPriority}
              onChange={(e) => {
                setNewPriority(
                  e.target.value
                );
                setSimulated(false);
              }}
            >
              <option value="critical">
                Critical
              </option>

              <option value="high">
                High
              </option>

              <option value="medium">
                Medium
              </option>

              <option value="low">
                Low
              </option>
            </select>

          </div>

          <div className="simulator-field">

            <label>
              Safety Before
            </label>

            <input
              type="number"
              min="0"
              value={safetyBefore}
              onChange={(e) => {
                setSafetyBefore(
                  Number(e.target.value)
                );
                setSimulated(false);
              }}
            />

            <small>
              minutes
            </small>

          </div>

          <div className="simulator-field">

            <label>
              Safety After
            </label>

            <input
              type="number"
              min="0"
              value={safetyAfter}
              onChange={(e) => {
                setSafetyAfter(
                  Number(e.target.value)
                );
                setSimulated(false);
              }}
            />

            <small>
              minutes
            </small>

          </div>

        </div>

        {/* ================================================= */}
        {/* ACTIONS */}
        {/* ================================================= */}

        <div className="simulator-actions">

          <button
            className="outline-button"
            onClick={resetSimulation}
          >
            Reset
          </button>

          <button
            className="generate-button simulate-button"
            onClick={runSimulation}
            disabled={simulating}
          >

            {simulating ? (
              <>
                <RefreshCw
                  size={18}
                />

                Optimizing...
              </>
            ) : (
              <>
                <FlaskConical
                  size={18}
                />

                Simulate Scenario
              </>
            )}

          </button>

        </div>

      </section>

      {/* ================================================= */}
      {/* COMPARISON */}
      {/* ================================================= */}

      <section className="comparison-grid">

        <ScenarioCard
          title="Current Plan"
          subtitle="Actual optimizer result"
          schedule={
            currentTaskSchedule
          }
          score={currentScore}
          recommended
        />

        <ScenarioCard
          title="What-if Scenario"
          subtitle={
            simulating
              ? "Simulation running..."
              : simulated
              ? diagnostics
                ? "Scenario infeasible"
                : "Simulation completed"
              : "Not simulated yet"
          }
          schedule={
            simulatedTaskSchedule
          }
          score={scenarioScore}
          scenario
          infeasible={
            !!diagnostics
          }
        />

      </section>

      {/* ================================================= */}
      {/* DIAGNOSTICS */}
      {/* ================================================= */}

      {diagnostics && (
        <section className="card simulator-analysis">

          <div className="card-header">

            <div>
              <h3>
                Scenario Analysis
              </h3>

              <p>
                RailGenie found no safe feasible
                schedule for this scenario.
              </p>
            </div>

            <span className="count-badge">
              INFEASIBLE
            </span>

          </div>

          {diagnostics.tasks
            ?.filter(
              (task) =>
                task.status ===
                "infeasible"
            )
            .map(
              (task) => (
                <div
                  className="diagnostic-result"
                  key={task.task_id}
                >

                  <div className="analysis-icon warning">
                    !
                  </div>

                  <div>

                    <strong>
                      {task.task_id} —{" "}
                      {task.asset_id}
                    </strong>

                    <p>
                      {task.reason}
                    </p>

                    {task.details?.[0] && (
                      <div className="diagnostic-details">

                        <span>
                          Required:{" "}
                          <strong>
                            {
                              task.details[0]
                                .required_duration
                            }{" "}
                            min
                          </strong>
                        </span>

                        <span>
                          Largest safe slot:{" "}
                          <strong>
                            {
                              task.details[0]
                                .largest_safe_slot
                            }{" "}
                            min
                          </strong>
                        </span>

                        <span>
                          Safety buffer:{" "}
                          <strong>
                            {safetyBefore} /{" "}
                            {safetyAfter} min
                          </strong>
                        </span>

                      </div>
                    )}

                  </div>

                </div>
              )
            )}

          <div className="safe-slots">

            <strong>
              Available safe slots
            </strong>

            {diagnostics.tasks
              ?.find(
                (task) =>
                  task.status ===
                  "infeasible"
              )
              ?.safe_slots?.map(
                (slot, index) => (
                  <span
                    key={index}
                  >
                    {formatTime(
                      slot.start
                    )}
                    {" – "}
                    {formatTime(
                      slot.end
                    )}
                    {" "}
                    ({slot.duration} min)
                  </span>
                )
              )}

          </div>

        </section>
      )}

      {/* ================================================= */}
      {/* SUCCESS ANALYSIS */}
      {/* ================================================= */}

      {simulated &&
        !diagnostics &&
        scenarioScore && (
          <section className="card simulator-analysis">

            <div className="card-header">

              <div>
                <h3>
                  Scenario Analysis
                </h3>

                <p>
                  Current plan vs actual
                  optimizer scenario
                </p>
              </div>

            </div>

            <div className="analysis-result">

              <div className="analysis-message">

                <div className="analysis-icon good">
                  <CheckCircle2
                    size={20}
                  />
                </div>

                <div>

                  <strong>
                    Scenario is feasible
                  </strong>

                  <p>
                    RailGenie successfully
                    generated a safe schedule
                    for the requested scenario.
                  </p>

                </div>

              </div>

              <div className="impact-bars">

                <ImpactBar
                  label="Overall score"
                  current={
                    currentScore?.score ||
                    0
                  }
                  scenario={
                    scenarioScore.score ||
                    0
                  }
                  max={100}
                />

                <ImpactBar
                  label="Safety score"
                  current={
                    currentScore?.safety_score ||
                    0
                  }
                  scenario={
                    scenarioScore.safety_score ||
                    0
                  }
                  max={100}
                />

              </div>

            </div>

          </section>
        )}

    </>
  );
}


// =========================================================
// SCENARIO CARD
// =========================================================

function ScenarioCard({
  title,
  subtitle,
  schedule,
  score,
  recommended,
  scenario,
  infeasible,
}) {
  const task =
    schedule;

  return (
    <div
      className={`card scenario-card ${
        scenario
          ? "scenario-card-highlight"
          : ""
      }`}
    >

      <div className="scenario-heading">

        <div>

          <h3>
            {title}
          </h3>

          <span>
            {subtitle}
          </span>

        </div>

        {recommended && (
          <span className="recommended-badge">
            RECOMMENDED
          </span>
        )}

      </div>

      <div className="scenario-time">

        <span>
          Maintenance Window
        </span>

        {infeasible ? (
          <strong>
            No feasible window
          </strong>
        ) : task ? (
          <strong>
            {formatTime(
              task.start
            )}
            {" – "}
            {formatTime(
              task.end
            )}
          </strong>
        ) : (
          <strong>
            —
          </strong>
        )}

      </div>

      <div className="scenario-metrics">

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
            Safety
          </span>

          <strong>
            {score
              ? `${score.safety_score}%`
              : "—"}
          </strong>
        </div>

        <div>
          <span>
            Priority
          </span>

          <strong>
            {score
              ? `${score.priority_score}%`
              : "—"}
          </strong>
        </div>

        <div>
          <span>
            Plan Score
          </span>

          <strong>
            {score
              ? `${score.score}`
              : "—"}
          </strong>
        </div>

      </div>

    </div>
  );
}


// =========================================================
// IMPACT BAR
// =========================================================

function ImpactBar({
  label,
  current,
  scenario,
  max,
}) {
  const currentWidth =
    Math.min(
      (current / max) * 100,
      100
    );

  const scenarioWidth =
    Math.min(
      (scenario / max) * 100,
      100
    );

  return (
    <div className="impact-bar-row">

      <div className="impact-bar-header">

        <span>
          {label}
        </span>

        <span>
          Current: {current} · Scenario:{" "}
          {scenario}
        </span>

      </div>

      <div className="impact-track">

        <div
          className="impact-current"
          style={{
            width:
              `${currentWidth}%`,
          }}
        />

        <div
          className="impact-scenario"
          style={{
            width:
              `${scenarioWidth}%`,
          }}
        />

      </div>

    </div>
  );
}


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


export default WhatIfSimulator;