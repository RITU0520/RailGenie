import React from "react";
import "./SplashScreen.css";

function SplashScreen() {
  return (
    <div className="railgenie-splash">
      <div className="railgenie-logo">
        <div className="railgenie-logo-mark">
          <span className="rail-line rail-line-1" />
          <span className="rail-line rail-line-2" />
          <span className="rail-train">◆</span>
        </div>

        <div className="railgenie-brand">
          <h1>RailGenie</h1>
          <p>Intelligent Railway Operations</p>
        </div>
      </div>

      <div className="railgenie-loading">
        <span />
      </div>

      <div className="railgenie-tagline">
        Optimizing · Safer · Smarter
      </div>
    </div>
  );
}

export default SplashScreen;