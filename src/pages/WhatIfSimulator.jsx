import React, { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function WhatIfSimulator() {
  const [trains, setTrains] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [trainId, setTrainId] = useState("");
  const [trainDelay, setTrainDelay] = useState(30);

  const [taskId, setTaskId] = useState("");
  const [newDuration, setNewDuration] = useState(90);
  const [newPriority, setNewPriority] = useState("high");

  const [bufferBefore, setBufferBefore] = useState(10);
  const [bufferAfter, setBufferAfter] = useState(10);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  /*
   * Load real trains and maintenance tasks from PostgreSQL
   */
  useEffect(() => {
    let cancelled = false;

    const loadScenarioData = async () => {
      try {
        setLoadingData(true);
        setError("");

        const [trainsResponse, tasksResponse] = await Promise.all([
          fetch(`${API_URL}/api/trains`),
          fetch(`${API_URL}/api/maintenance-tasks`),
        ]);

        const trainsData = await trainsResponse.json();
        const tasksData = await tasksResponse.json();

        if (!trainsResponse.ok) {
          throw new Error(
            trainsData.detail?.message ||
              trainsData.detail ||
              "Unable to load trains.",
          );
        }

        if (!tasksResponse.ok) {
          throw new Error(
            tasksData.detail?.message ||
              tasksData.detail ||
              "Unable to load maintenance tasks.",
          );
        }

        if (cancelled) {
          return;
        }

        const loadedTrains = trainsData.trains || [];
        const loadedTasks = tasksData.tasks || [];

        setTrains(loadedTrains);
        setTasks(loadedTasks);

        /*
         * Select the first real records automatically.
         * This replaces the old hardcoded train/task lists.
         */
        if (loadedTrains.length > 0) {
          setTrainId(String(loadedTrains[0].train_id));
        }

        if (loadedTasks.length > 0) {
          setTaskId(String(loadedTasks[0].task_id));

          /*
           * Use the task's actual duration/priority as the
           * starting scenario values when available.
           */
          if (loadedTasks[0].duration) {
            setNewDuration(Number(loadedTasks[0].duration));
          }

          if (loadedTasks[0].priority) {
            setNewPriority(String(loadedTasks[0].priority).toLowerCase());
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Scenario data error:", err);
          setError(err.message || "Unable to load scenario data.");
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    };

    loadScenarioData();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Run real backend what-if optimization
   */
  const runSimulation = async () => {
    if (!trainId) {
      setError("Please select a train.");
      return;
    }

    if (!taskId) {
      setError("Please select a maintenance task.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const response = await fetch(`${API_URL}/api/simulate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          train_id: trainId,
          train_delay: Number(trainDelay),

          task_id: taskId,
          new_duration: Number(newDuration),
          new_priority: newPriority,

          safety_buffer_before: Number(bufferBefore),
          safety_buffer_after: Number(bufferAfter),

          planning_start: 0,
          planning_end: 1439,

          /*
           * Use today's actual date instead of the old
           * hardcoded demo date.
           */
          planning_date: new Date().toISOString().slice(0, 10),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail?.message ||
            data.detail ||
            "Simulation failed",
        );
      }

      setResult(data);
    } catch (err) {
      console.error("Simulation error:", err);
      setError(err.message || "Simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="simulator-layout">
        {/* CONTROLS */}

        <section className="simulator-panel">
          <div className="panel-header">
            <h3>Scenario Configuration</h3>
            <p>Modify operational conditions and generate a new schedule.</p>
          </div>

          <div className="form-section">
            <h4>Train Scenario</h4>

            <label>
              Train
              <select
                value={trainId}
                onChange={(e) => setTrainId(e.target.value)}
                disabled={loadingData || loading}
              >
                {trains.length === 0 && (
                  <option value="">
                    {loadingData ? "Loading trains..." : "No trains available"}
                  </option>
                )}

                {trains.map((train) => (
                  <option
                    key={train.train_id}
                    value={train.train_id}
                  >
                    {train.train_id}
                    {train.train_name
                      ? ` — ${train.train_name}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Train Delay
              <input
                type="number"
                min="0"
                value={trainDelay}
                onChange={(e) => setTrainDelay(e.target.value)}
                disabled={loading}
              />
              <small>Minutes</small>
            </label>
          </div>

          <div className="form-section">
            <h4>Maintenance Scenario</h4>

            <label>
              Maintenance Task
              <select
                value={taskId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setTaskId(selectedId);

                  /*
                   * When the user changes task, use its actual
                   * database duration/priority as the baseline.
                   */
                  const selectedTask = tasks.find(
                    (task) => String(task.task_id) === selectedId,
                  );

                  if (selectedTask) {
                    if (selectedTask.duration) {
                      setNewDuration(Number(selectedTask.duration));
                    }

                    if (selectedTask.priority) {
                      setNewPriority(
                        String(selectedTask.priority).toLowerCase(),
                      );
                    }
                  }
                }}
                disabled={loadingData || loading}
              >
                {tasks.length === 0 && (
                  <option value="">
                    {loadingData
                      ? "Loading tasks..."
                      : "No maintenance tasks available"}
                  </option>
                )}

                {tasks.map((task) => (
                  <option
                    key={task.task_id}
                    value={task.task_id}
                  >
                    {task.task_id}
                    {task.asset_id
                      ? ` — ${task.asset_id}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              New Duration
              <input
                type="number"
                min="1"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                disabled={loading}
              />
              <small>Minutes</small>
            </label>

            <label>
              New Priority
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                disabled={loading}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>

          <div className="form-section">
            <h4>Safety Buffers</h4>

            <div className="buffer-grid">
              <label>
                Before
                <input
                  type="number"
                  min="0"
                  value={bufferBefore}
                  onChange={(e) => setBufferBefore(e.target.value)}
                  disabled={loading}
                />
              </label>

              <label>
                After
                <input
                  type="number"
                  min="0"
                  value={bufferAfter}
                  onChange={(e) => setBufferAfter(e.target.value)}
                  disabled={loading}
                />
              </label>
            </div>
          </div>

          <button
            className="simulate-button"
            onClick={runSimulation}
            disabled={
              loading ||
              loadingData ||
              !trainId ||
              !taskId
            }
          >
            {loading
              ? "Re-optimizing..."
              : "Run What-if Simulation"}
          </button>

          {error && (
            <div className="simulator-error">
              {error}
            </div>
          )}
        </section>

        {/* RESULTS */}

        <section className="simulator-panel">
          <div className="panel-header">
            <h3>Simulation Result</h3>
            <p>Dynamically generated schedule</p>
          </div>

          {!result && !loading && (
            <div className="simulator-empty">
              {loadingData
                ? "Loading real railway data..."
                : "Configure a scenario and run the simulation."}
            </div>
          )}

          {loading && (
            <div className="simulator-empty">
              Running CP-SAT optimization...
            </div>
          )}

          {result && (
            <>
              <div className="simulation-status">
                <div>
                  <span>Status</span>
                  <strong>
                    {result.status?.toUpperCase()}
                  </strong>
                </div>

                {result.score && (
                  <>
                    <div>
                      <span>Plan Score</span>
                      <strong>
                        {result.score.score}%
                      </strong>
                    </div>

                    <div>
                      <span>Safety</span>
                      <strong>
                        {result.score.safety_score}%
                      </strong>
                    </div>

                    <div>
                      <span>Train Impact</span>
                      <strong>
                        {result.score.train_impact} min
                      </strong>
                    </div>

                    <div>
                      <span>Priority</span>
                      <strong>
                        {result.score.priority_score}%
                      </strong>
                    </div>
                  </>
                )}
              </div>

              {result.changes && (
                <div className="simulation-changes">
                  <h4>Scenario Changes</h4>

                  <div className="scenario-change-grid">
                    <div className="scenario-change-item">
                      <span>Train</span>
                      <strong>{trainId}</strong>
                    </div>

                    <div className="scenario-change-item">
                      <span>Train Delay</span>
                      <strong>
                        +{trainDelay} min
                      </strong>
                    </div>

                    <div className="scenario-change-item">
                      <span>Maintenance Task</span>
                      <strong>{taskId}</strong>
                    </div>

                    <div className="scenario-change-item">
                      <span>New Duration</span>
                      <strong>
                        {newDuration} min
                      </strong>
                    </div>

                    <div className="scenario-change-item">
                      <span>Priority</span>
                      <strong>{newPriority}</strong>
                    </div>

                    <div className="scenario-change-item">
                      <span>Safety Buffers</span>
                      <strong>
                        {bufferBefore}/{bufferAfter} min
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {result.schedule && (
                <div className="simulation-schedule">
                  <h4>Re-planned Schedule</h4>

                  <div className="schedule-table-wrapper">
                    <table className="schedule-table">
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Asset</th>
                          <th>Section</th>
                          <th>Start</th>
                          <th>End</th>
                          <th>Priority</th>
                        </tr>
                      </thead>

                      <tbody>
                        {result.schedule.map((item) => (
                          <tr key={item.task_id}>
                            <td>
                              <strong>
                                {item.task_id}
                              </strong>
                            </td>

                            <td>{item.asset_id}</td>

                            <td>{item.section}</td>

                            <td>
                              {formatTime(item.start)}
                            </td>

                            <td>
                              {formatTime(item.end)}
                            </td>

                            <td>{item.priority}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.diagnostics && (
                <div className="simulation-diagnostics">
                  <h4>Diagnostics</h4>

                  <pre>
                    {JSON.stringify(
                      result.diagnostics,
                      null,
                      2,
                    )}
                  </pre>
                </div>
              )}
            </>
          )}

          {result &&
            result.score &&
            result.status === "optimal" && (
              <div className="simulation-explanation">
                <div className="simulation-explanation-header">
                  <div>
                    <h4>Why this scenario works</h4>
                    <p>
                      RailGenie re-optimized the maintenance
                      plan against the changed operating
                      conditions.
                    </p>
                  </div>

                  <span className="recommended-badge">
                    RE-OPTIMIZED
                  </span>
                </div>

                <div className="simulation-explanation-list">
                  <div className="simulation-explanation-item">
                    <span className="explanation-check">
                      ✓
                    </span>

                    <div>
                      <strong>
                        Feasible schedule found
                      </strong>

                      <span>
                        The optimizer successfully rebuilt the
                        plan under the requested scenario.
                      </span>
                    </div>
                  </div>

                  <div className="simulation-explanation-item">
                    <span className="explanation-check">
                      ✓
                    </span>

                    <div>
                      <strong>
                        {result.score.safety_score}%
                        {" "}safety compliance
                      </strong>

                      <span>
                        Train movement protection remains
                        within the configured safety
                        constraints.
                      </span>
                    </div>
                  </div>

                  <div className="simulation-explanation-item">
                    <span className="explanation-check">
                      ✓
                    </span>

                    <div>
                      <strong>
                        {result.score.train_impact}
                        {" "}minutes train impact
                      </strong>

                      <span>
                        Direct maintenance overlap with train
                        movements is minimized by the
                        optimizer.
                      </span>
                    </div>
                  </div>

                  <div className="simulation-explanation-item">
                    <span className="explanation-check">
                      ✓
                    </span>

                    <div>
                      <strong>
                        Priority score:{" "}
                        {result.score.priority_score}%
                      </strong>

                      <span>
                        Maintenance priority is included in
                        the resulting schedule evaluation.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </section>
      </div>
    </div>
  );
}

export default WhatIfSimulator;