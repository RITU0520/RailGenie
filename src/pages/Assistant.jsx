import React, { useState } from "react";

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    mins
  ).padStart(2, "0")}`;
}

function Assistant() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(null);
  const [error, setError] = useState("");

  // =====================================================
  // ASK RAILGENIE
  // =====================================================

  const askRailGenie = async () => {
    if (!message.trim()) {
      setError("Please enter a planning request.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);
      setApplied(null);

      const response = await fetch(
        "http://127.0.0.1:8000/api/assistant",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: message.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail?.message ||
            data.detail ||
            "Unable to process request."
        );
      }
       
      console.log("RailGenie response:", data);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // APPLY SCHEDULE
  // =====================================================

  const applySchedule = async () => {
    const simulation = result?.simulation;

    if (!simulation?.schedule?.length) {
      setError("There is no schedule available to apply.");
      return;
    }

    try {
      setApplying(true);
      setError("");

      const score =
        typeof simulation.score === "object"
          ? simulation.score.score
          : simulation.score;

      const response = await fetch(
        "http://127.0.0.1:8000/api/schedule/apply",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
              status: simulation.status,
              score: score,
              priority_score:
                simulation.score?.priority_score ?? null,
              train_impact:
                simulation.score?.train_impact ?? null,
              safety_score:
                simulation.score?.safety_score ?? null,
              schedule: simulation.schedule,
            }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail?.message ||
            data.detail ||
            "Unable to apply schedule."
        );
      }

      setApplied(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  // =====================================================
  // CLEAR
  // =====================================================

  const clearAssistant = () => {
    setMessage("");
    setResult(null);
    setApplied(null);
    setError("");
  };

  const simulation = result?.simulation;
  const score = simulation?.score;

  return (
    <div className="page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="page-header">

        <div>
          <h2>RailGenie Assistant</h2>

          <p>
            Describe a railway disruption or maintenance
            change in natural language.
          </p>
        </div>

      </div>

      {/* =================================================
          INPUT
      ================================================= */}

      <section className="assistant-panel">

        <div className="assistant-input-area">

          <label>
            Planning Request
          </label>

          <textarea
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            placeholder="Example: Delay train 12001 by 30 minutes and extend M002 to 90 minutes"
            rows={5}
          />

          <div className="assistant-actions">

            <button
              onClick={askRailGenie}
              disabled={loading || applying}
              className="assistant-button"
            >
              {loading
                ? "Optimizing..."
                : "Ask RailGenie"}
            </button>

            <button
              onClick={clearAssistant}
              disabled={loading || applying}
              className="assistant-clear-button"
            >
              Clear
            </button>

          </div>

          {error && (
            <div className="assistant-error">
              {error}
            </div>
          )}

        </div>

      </section>

      {/* =================================================
          RESULT
      ================================================= */}

      {result && (
        <>

          {/* =============================================
              REQUEST UNDERSTOOD
          ============================================= */}

          <section className="assistant-panel">

            <div className="assistant-section-header">

              <h3>
                Request Understood
              </h3>

              <span className="assistant-success">
                ✓ Success
              </span>

            </div>

            <p className="assistant-message">
              {result.message}
            </p>

            <div className="assistant-parsed">

              <div>
                <span>Train</span>

                <strong>
                  {result.parsed.train_id || "—"}
                </strong>
              </div>

              <div>
                <span>Delay</span>

                <strong>
                  {result.parsed.train_delay || 0} min
                </strong>
              </div>

              <div>
                <span>Task</span>

                <strong>
                  {result.parsed.task_id || "—"}
                </strong>
              </div>

              <div>
                <span>Duration</span>

                <strong>
                  {result.parsed.new_duration
                    ? `${result.parsed.new_duration} min`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>Priority</span>

                <strong>
                  {result.parsed.new_priority || "—"}
                </strong>
              </div>

            </div>

          </section>

          {/* =============================================
              OPTIMIZATION RESULT
          ============================================= */}

          {simulation && (
            <section className="assistant-panel">

              <div className="assistant-section-header">

                <div>

                  <h3>
                    Optimization Result
                  </h3>

                  <p>
                    RailGenie generated a new
                    safety-aware maintenance schedule.
                  </p>

                </div>

                <span className="assistant-optimal">
                  {simulation.status}
                </span>

              </div>

              {/* =======================================
                  METRICS
              ======================================= */}

              {score && (
                <div className="assistant-metrics">

                  <div className="assistant-metric">
                    <span>
                      Overall Score
                    </span>

                    <strong>
                      {score.score}
                    </strong>
                  </div>

                  <div className="assistant-metric">
                    <span>
                      Priority Score
                    </span>

                    <strong>
                      {score.priority_score}
                    </strong>
                  </div>

                  <div className="assistant-metric">
                    <span>
                      Train Impact
                    </span>

                    <strong>
                      {score.train_impact}
                    </strong>
                  </div>

                  <div className="assistant-metric">
                    <span>
                      Safety Score
                    </span>

                    <strong>
                      {score.safety_score}
                    </strong>
                  </div>

                </div>
              )}

              {/* =======================================
                  CHANGES
              ======================================= */}

              {simulation.changes?.length > 0 && (
                <div className="assistant-result-section">

                  <h4>
                    Scenario Changes
                  </h4>

                  <div className="assistant-changes">

                    {simulation.changes.map(
                      (change, index) => (

                        <div
                          className="assistant-change"
                          key={index}
                        >

                          {change.type ===
                            "train_delay" && (
                            <>
                              <strong>
                                Train{" "}
                                {change.train_id}
                              </strong>

                              <span>
                                Delayed by{" "}
                                {change.arrival_change}{" "}
                                minutes
                              </span>
                            </>
                          )}

                          {change.type ===
                            "duration_change" && (
                            <>
                              <strong>
                                Task{" "}
                                {change.task_id}
                              </strong>

                              <span>
                                Duration changed from{" "}
                                {change.old_duration}{" "}
                                to{" "}
                                {change.new_duration}{" "}
                                minutes
                              </span>
                            </>
                          )}

                        </div>

                      )
                    )}

                  </div>

                </div>
              )}

              {/* =======================================
                  SCHEDULE
              ======================================= */}

              {simulation.schedule?.length > 0 && (
                <div className="assistant-result-section">

                  <h4>
                    Re-planned Schedule
                  </h4>

                  <div className="schedule-table-wrapper">

                    <table className="schedule-table">

                      <thead>

                        <tr>
                          <th>Task</th>
                          <th>Asset</th>
                          <th>Section</th>
                          <th>Start</th>
                          <th>End</th>
                          <th>Duration</th>
                          <th>Priority</th>
                        </tr>

                      </thead>

                      <tbody>

                        {simulation.schedule.map(
                          (item) => (

                            <tr
                              key={item.task_id}
                            >

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
                                {item.duration} min
                              </td>

                              <td>

                                <span
                                  className={`priority-badge priority-${item.priority}`}
                                >
                                  {item.priority}
                                </span>

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              )}

              {/* =======================================
                  APPLY SCHEDULE
              ======================================= */}

              {simulation.status === "optimal" &&
                simulation.schedule?.length > 0 && (
                  <div className="assistant-apply-section">

                    {!applied ? (
                      <>

                        <div>
                          <h4>
                            Apply This Schedule
                          </h4>

                          <p>
                            Save this optimized schedule
                            to PostgreSQL and make it
                            available as the latest
                            schedule.
                          </p>
                        </div>

                        <button
                          onClick={applySchedule}
                          disabled={applying}
                          className="assistant-apply-button"
                        >
                          {applying
                            ? "Applying..."
                            : "✓ Apply Schedule"}
                        </button>

                      </>
                    ) : (
                      <div className="assistant-applied">

                        <div>
                          <strong>
                            ✓ Schedule Applied
                          </strong>

                          <span>
                            Saved successfully to
                            PostgreSQL.
                          </span>
                        </div>

                        <div className="assistant-run-id">
                          Run #{applied.run_id}
                        </div>

                      </div>
                    )}

                  </div>
                )}

            </section>
          )}

        </>
      )}

    </div>
  );
}

export default Assistant;