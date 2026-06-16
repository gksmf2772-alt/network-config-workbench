import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/tailwind.css";
import "./styles/global-base.css";
import "./styles/global-layout.css";
import "./styles/global-diff.css";
import "./styles/global-report.css";
import "./styles/global-profile.css";
import "./styles/global-summary.css";
import "./styles/global-ui.css";
import "./styles/global-semantic-diff.css";
import "./styles/global-compare-settings.css";
import "./styles/profile-mapping.css";
import { registerLegacyProfileMappingRenderer } from "./components/ProfileMappingWorkbench.jsx";

createRoot(document.getElementById("root")).render(<App />);

registerLegacyProfileMappingRenderer();
