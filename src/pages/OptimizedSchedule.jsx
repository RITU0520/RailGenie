import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    mins
  ).padStart(2, "0")}`;
}

function OptimizedSchedule() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://127.0.0.1:8000/api/schedule/latest"
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load optimized schedule"
        );
      }

      const result = await response.json();

      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Refresh when browser tab becomes active
  useEffect(() => {
    const handleFocus = () => {
      fetchSchedule();
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
  }, [fetchSchedule]);

  if (loading && !data) {
    return (
      <div className="page">
        
        <div className="schedule-state">
          Loading optimized schedule...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="page">
        

        <div className="schedule-error">
          <strong>
            Unable to load schedule
          </strong>

          <span>{error}</span>

          <button onClick={fetchSchedule}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.schedule?.length) {
    return (
      <div className="page">
        

        <div className="schedule-state">
          No optimized schedule available.
        </div>
      </div>
    );
  }

  return (
    <div className="page">

      {/* HEADER */}

      

      {/* ERROR WHILE REFRESHING */}

      {error && (
        <div className="schedule-error">
          <span>{error}</span>
        </div>
      )}

      {/* SUMMARY */}

      <div className="schedule-summary">

        <div className="schedule-summary-card">
          <span>Run</span>
          <strong>
            #{data.run_id}
          </strong>
        </div>

        <div className="schedule-summary-card">
          <span>Score</span>
          <strong>
            {data.score}
          </strong>
        </div>

        <div className="schedule-summary-card">
          <span>Tasks</span>
          <strong>
            {data.schedule.length}
          </strong>
        </div>

        <div className="schedule-summary-card">
          <span>Source</span>
          <strong>
            PostgreSQL
          </strong>
        </div>

      </div>

      {/* SCHEDULE TABLE */}

      <section className="schedule-panel">

        <div className="schedule-panel-header">

          <div>
            <h3>
              Maintenance Schedule
            </h3>

            <p>
              Run #{data.run_id} · Generated{" "}
              {data.created_at
                ? new Date(
                    data.created_at
                  ).toLocaleString()
                : "—"}
            </p>
          </div>

        </div>

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

              {data.schedule.map(
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

                    <td className="time-cell">
                      {formatTime(
                        item.start
                      )}
                    </td>

                    <td className="time-cell">
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

      </section>

    </div>
  );
}

export default OptimizedSchedule;