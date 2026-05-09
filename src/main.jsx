import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/global.css";
import "./styles/profile-mapping.css";
import { registerLegacyProfileMappingRenderer } from "./components/ProfileMappingWorkbench.jsx";

createRoot(document.getElementById("root")).render(<App />);

registerLegacyProfileMappingRenderer();
