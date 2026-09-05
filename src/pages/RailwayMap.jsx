import React, { useMemo } from "react";
import {
  TrainFront,
  Wrench,
  AlertTriangle,
  Radio,
  MapPin,
} from "lucide-react";

function RailwayMap({ trains = [], schedule = [] }) {
  
   const trainList = useMemo(() => {
    return Array.isArray(trains) ? trains : [];
  }, [trains]);

  const scheduleList = useMemo(() => {
    return Array.isArray(schedule) ? schedule : [];
  }, [schedule]);
  
  const sections = useMemo(() => {
  const values = trainList
    .map((train) => train.section ?? train.section_id)
    .filter(Boolean);

  return [...new Set(values)].sort();
}, [trainList]);

 
  const getTrainId = (train, index) =>
    train.train_id ??
    train.id ??
    train.asset_id ??
    train.number ??
    `TRAIN-${index + 1}`;

  const getTrainSection = (train, index) =>
    train.section ??
    train.section_id ??
    sections[index % sections.length];

  const getTaskSection = (task) =>
    task.section ??
    task.section_id ??
    null;

  const getPriority = (value) =>
    String(value ?? "medium").toLowerCase();

  const getTaskStatus = (task) => {
    const priority = getPriority(task.priority);

    if (priority === "critical") return "critical";
    if (priority === "high") return "maintenance";

    return "maintenance";
  };

  const trainsBySection = sections.map((section) => ({
    section,
    trains: trainList.filter(
      (train, index) =>
        getTrainSection(train, index) === section
    ),
  }));

  const maintenanceBySection = sections.map((section) => ({
    section,
    tasks: scheduleList.filter(
      (task) => getTaskSection(task) === section
    ),
  }));

  const totalMaintenance = scheduleList.length;

  return (
    <section
      className="railway-control-map"
      style={{
        width: "100%",
        background: "#0d151d",
        border: "1px solid #263746",
        borderRadius: "14px",
        overflow: "hidden",
        color: "#e8f0f7",
        boxSizing: "border-box",
      }}
    >
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid #263746",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          background:
            "linear-gradient(180deg, #111d27 0%, #0d151d 100%)",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              marginBottom: "5px",
            }}
          >
            <Radio
              size={17}
              color="#27a9f5"
            />

            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                letterSpacing: "-0.2px",
                color: "#f2f7fb",
              }}
            >
              Railway Network Control
            </h3>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 8px",
                borderRadius: "20px",
                background: "#103a2d",
                color: "#41d49b",
                fontSize: "9px",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#35d399",
                  boxShadow:
                    "0 0 8px rgba(53,211,153,.7)",
                }}
              />
              Live
            </span>
          </div>

          <p
            style={{
              margin: 0,
              color: "#8295a7",
              fontSize: "11px",
            }}
          >
            Live train movements and maintenance occupancy
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            fontSize: "10px",
            color: "#8295a7",
          }}
        >
          <span>
            <strong
              style={{
                color: "#e8f0f7",
                marginRight: "4px",
              }}
            >
              {trainList.length}
            </strong>
            trains
          </span>

          <span>
            <strong
              style={{
                color: "#e8f0f7",
                marginRight: "4px",
              }}
            >
              {totalMaintenance}
            </strong>
            blocks
          </span>
        </div>
      </div>

      {/* ================================================= */}
      {/* MAP */}
      {/* ================================================= */}

      <div
        style={{
          position: "relative",
          minHeight: "330px",
          padding: "28px 22px 24px",
          background:
            "radial-gradient(circle at 50% 40%, rgba(28,105,145,.10), transparent 48%), #0b141c",
          overflow: "hidden",
        }}
      >
        {/* subtle grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.18,
            pointerEvents: "none",
            backgroundImage: `
              linear-gradient(#29404f 1px, transparent 1px),
              linear-gradient(90deg, #29404f 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            maskImage:
              "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
          }}
        />

        {/* NORTH INDICATOR */}
        <div
          style={{
            position: "absolute",
            right: "18px",
            top: "16px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#607789",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: ".8px",
          }}
        >
          <span
            style={{
              width: "20px",
              height: "1px",
              background: "#344b5b",
            }}
          />
          NORTH
        </div>

        {/* ================================================= */}
        {/* TRACKS */}
        {/* ================================================= */}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            gap: "28px",
            marginTop: "24px",
          }}
        >
          {trainsBySection.map(
            ({ section, trains: sectionTrains }, sectionIndex) => {
              const sectionTasks =
                maintenanceBySection.find(
                  (item) => item.section === section
                )?.tasks ?? [];

              return (
                <div
                  key={section}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "54px minmax(0, 1fr)",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  {/* SECTION */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    <strong
                      style={{
                        color: "#dce8f1",
                        fontSize: "13px",
                      }}
                    >
                      {section}
                    </strong>

                    <span
                      style={{
                        color: "#607789",
                        fontSize: "8px",
                        textTransform: "uppercase",
                      }}
                    >
                      Sector
                    </span>
                  </div>

                  {/* TRACK AREA */}
                  <div
                    style={{
                      position: "relative",
                      height: "70px",
                      borderRadius: "10px",
                      background:
                        "linear-gradient(180deg, #111e28, #0e1922)",
                      border: "1px solid #263b4b",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,.025)",
                    }}
                  >
                    {/* Track rails */}
                    <div
                      style={{
                        position: "absolute",
                        left: "18px",
                        right: "18px",
                        top: "28px",
                        height: "2px",
                        background: "#344b5b",
                      }}
                    />

                    <div
                      style={{
                        position: "absolute",
                        left: "18px",
                        right: "18px",
                        top: "39px",
                        height: "2px",
                        background: "#344b5b",
                      }}
                    />

                    {/* sleepers */}
                    <div
                      style={{
                        position: "absolute",
                        inset: "22px 18px",
                        background:
                          "repeating-linear-gradient(90deg, transparent 0 26px, rgba(98,125,143,.25) 26px 29px)",
                        pointerEvents: "none",
                      }}
                    />

                    {/* Station nodes */}
                    {[0, 1, 2, 3].map((node) => (
                      <div
                        key={node}
                        style={{
                          position: "absolute",
                          left: `${10 + node * 27}%`,
                          top: "31px",
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: "#0c1821",
                          border: "2px solid #2e769d",
                          transform: "translate(-50%, -50%)",
                          zIndex: 3,
                        }}
                      />
                    ))}

                    {/* Station labels */}
                    {["N1", "N2", "N3", "N4"].map(
                      (label, node) => (
                        <span
                          key={label}
                          style={{
                            position: "absolute",
                            left: `${10 + node * 27}%`,
                            bottom: "8px",
                            transform:
                              "translateX(-50%)",
                            color: "#607789",
                            fontSize: "8px",
                            fontWeight: 600,
                          }}
                        >
                          {section}-{label}
                        </span>
                      )
                    )}

                    {/* Trains */}
                    {sectionTrains.map(
                      (train, trainIndex) => {
                        const trainId =
                          getTrainId(
                            train,
                            trainIndex
                          );

                        const left =
                          sectionTrains.length === 1
                            ? 50
                            : 24 +
                              trainIndex *
                                (52 /
                                  Math.max(
                                    sectionTrains.length -
                                      1,
                                    1
                                  ));

                        return (
                          <div
                            key={`${section}-${trainId}`}
                            title={`Train ${trainId}`}
                            style={{
                              position: "absolute",
                              left: `${left}%`,
                              top: "13px",
                              transform:
                                "translateX(-50%)",
                              zIndex: 6,
                              display: "flex",
                              flexDirection:
                                "column",
                              alignItems: "center",
                              gap: "2px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent:
                                  "center",
                                width: "30px",
                                height: "30px",
                                borderRadius: "8px",
                                background:
                                  "#0b2f44",
                                border:
                                  "1px solid #168fd0",
                                boxShadow:
                                  "0 0 14px rgba(22,143,208,.22)",
                              }}
                            >
                              <TrainFront
                                size={17}
                                color="#38bdf8"
                              />
                            </div>

                            <span
                              style={{
                                color: "#d9e9f4",
                                fontSize: "8px",
                                fontWeight: 700,
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {trainId}
                            </span>
                          </div>
                        );
                      }
                    )}

                    {/* Maintenance markers */}
                    {sectionTasks
                      .slice(0, 3)
                      .map((task, taskIndex) => {
                        const status =
                          getTaskStatus(task);

                        const isCritical =
                          status === "critical";

                        return (
                          <div
                            key={
                              task.task_id ??
                              task.id ??
                              `task-${taskIndex}`
                            }
                            title={
                              task.task_id ??
                              task.id ??
                              "Maintenance"
                            }
                            style={{
                              position:
                                "absolute",
                              left: `${
                                35 +
                                taskIndex * 22
                              }%`,
                              top: "45px",
                              transform:
                                "translate(-50%, -50%)",
                              zIndex: 7,
                              width: "22px",
                              height: "22px",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              background:
                                isCritical
                                  ? "#421d29"
                                  : "#3b2b13",
                              border: `1px solid ${
                                isCritical
                                  ? "#ef536f"
                                  : "#d59a2a"
                              }`,
                            }}
                          >
                            {isCritical ? (
                              <AlertTriangle
                                size={12}
                                color="#ff6b81"
                              />
                            ) : (
                              <Wrench
                                size={12}
                                color="#f3b83f"
                              />
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* ================================================= */}
      {/* LEGEND / STATUS BAR */}
      {/* ================================================= */}

      <div
        style={{
          borderTop: "1px solid #263746",
          padding: "13px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "15px",
          background: "#101b24",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            flexWrap: "wrap",
          }}
        >
          <LegendItem
            color="#38bdf8"
            label="Train movement"
          />

          <LegendItem
            color="#f3b83f"
            label="Maintenance"
          />

          <LegendItem
            color="#ff5d73"
            label="Critical"
          />

          <LegendItem
            color="#2e769d"
            label="Station"
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#667d8e",
            fontSize: "9px",
          }}
        >
          <MapPin size={12} />
          Live network view
        </div>
      </div>
    </section>
  );
}

function LegendItem({ color, label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        color: "#8195a5",
        fontSize: "9px",
      }}
    >
      <span
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 7px ${color}55`,
        }}
      />

      {label}
    </span>
  );
}

export default RailwayMap;