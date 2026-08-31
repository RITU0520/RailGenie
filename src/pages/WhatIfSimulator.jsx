import React, { useState } from "react";

const trains = [
  "12001",
  "12002",
  "12003",
  "12004",
  "12005",
  "12006",
];

const tasks = [
  "M001",
  "M002",
  "M003",
  "M004",
  "M005",
  "M006",
];

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    mins
  ).padStart(2, "0")}`;
}

function WhatIfSimulator() {
  const [trainId, setTrainId] = useState("12001");
  const [trainDelay, setTrainDelay] = useState(30);

  const [taskId, setTaskId] = useState("M002");
  const [newDuration, setNewDuration] = useState(90);
  const [newPriority, setNewPriority] = useState("high");

  const [bufferBefore, setBufferBefore] = useState(10);
  const [bufferAfter, setBufferAfter] = useState(10);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runSimulation = async () => {
    try {
      setLoading(true);
      setError("");
      setResult(null);

      const response = await fetch(
        "http://127.0.0.1:8000/api/simulate",
        {
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

            planning_date: "2026-08-27",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail?.message ||
          data.detail ||
          "Simulation failed"
        );
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">

      <div className="page-header">
        <div>
          <h2>What-if Simulator</h2>
          <p>
            Test operational changes and dynamically re-plan maintenance
          </p>
        </div>
      </div>

      <div className="simulator-layout">

        {/* CONTROLS */}

        <section className="simulator-panel">

          <div className="panel-header">
            <h3>Scenario Configuration</h3>
            <p>
              Modify operational conditions and generate a new schedule.
            </p>
          </div>

          <div className="form-section">

            <h4>Train Scenario</h4>

            <label>
              Train
              <select
                value={trainId}
                onChange={(e) =>
                  setTrainId(e.target.value)
                }
              >
                {trains.map((id) => (
                  <option key={id} value={id}>
                    {id}
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
                onChange={(e) =>
                  setTrainDelay(e.target.value)
                }
              />

              <small>
                Minutes
              </small>
            </label>

          </div>

          <div className="form-section">

            <h4>Maintenance Scenario</h4>

            <label>
              Maintenance Task
              <select
                value={taskId}
                onChange={(e) =>
                  setTaskId(e.target.value)
                }
              >
                {tasks.map((id) => (
                  <option key={id} value={id}>
                    {id}
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
                onChange={(e) =>
                  setNewDuration(e.target.value)
                }
              />

              <small>
                Minutes
              </small>
            </label>

            <label>
              New Priority
              <select
                value={newPriority}
                onChange={(e) =>
                  setNewPriority(e.target.value)
                }
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
                  onChange={(e) =>
                    setBufferBefore(e.target.value)
                  }
                />
              </label>

              <label>
                After
                <input
                  type="number"
                  min="0"
                  value={bufferAfter}
                  onChange={(e) =>
                    setBufferAfter(e.target.value)
                  }
                />
              </label>

            </div>

          </div>

          <button
            className="simulate-button"
            onClick={runSimulation}
            disabled={loading}
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
            <p>
              Dynamically generated schedule
            </p>
          </div>

          {!result && !loading && (
            <div className="simulator-empty">
              Configure a scenario and run the simulation.
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
                    {result.status}
                  </strong>
                </div>

                {result.score && (
                  <div>
                    <span>Score</span>
                    <strong>
                      {result.score.score}
                    </strong>
                  </div>
                )}
              </div>

              {result.changes && (
                <div className="simulation-changes">

                  <h4>Scenario Changes</h4>

                  <pre>
                    {JSON.stringify(
                      result.changes,
                      null,
                      2
                    )}
                  </pre>

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

                        {result.schedule.map(
                          (item) => (
                            <tr key={item.task_id}>

                              <td>
                                <strong>
                                  {item.task_id}
                                </strong>
                              </td>

                              <td>
                                {item.asset_id}
                              </td>

                              <td>
                                {item.section}
                              </td>

                              <td>
                                {formatTime(
                                  item.start
                                )}
                              </td>

                              <td>
                                {formatTime(
                                  item.end
                                )}
                              </td>

                              <td>
                                {item.priority}
                              </td>

                            </tr>
                          )
                        )}

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
                      2
                    )}
                  </pre>

                </div>
              )}

            </>
          )}

        </section>

      </div>

    </div>
  );
}

export default WhatIfSimulator;