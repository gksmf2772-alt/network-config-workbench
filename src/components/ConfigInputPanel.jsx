import React, { useState } from "react";
import {
  ChevronLeft,
  Download,
  Eraser,
  FileCode2,
  GitCompare,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { motion } from "framer-motion";
import ConfigEditor from "./ConfigEditor.jsx";
import { AppButton } from "./ui/AppButton.jsx";
import { AppCheckbox } from "./ui/AppCheckbox.jsx";
import { AppIconButton } from "./ui/AppIconButton.jsx";
import { AppPanel } from "./ui/AppPanel.jsx";
import { AppSectionHeader } from "./ui/AppSectionHeader.jsx";
import { AppSelect } from "./ui/AppSelect.jsx";
import { AppToolbar } from "./ui/AppToolbar.jsx";

function SwitchRow({ id, defaultChecked, children }) {
  return <AppCheckbox id={id} defaultChecked={defaultChecked} label={children} className="switch-row ncw-switch-row" />;
}

export default function ConfigInputPanel() {
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  return (
    <section id="compareTab" className="tab-panel active">
      <div className="workspace">
        <motion.aside
          className="control-panel ncw-control-panel"
          initial={{ opacity: 0, x: -18 }}
          animate={{
            opacity: controlsCollapsed ? 0.92 : 1,
            x: controlsCollapsed ? -10 : 0,
            width: controlsCollapsed ? 44 : "auto",
          }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <AppIconButton
            id="toggleControlsBtn"
            className="control-collapse-btn"
            type="button"
            title="Hide compare options"
            aria-label="Hide compare options"
            onClick={() => setControlsCollapsed((value) => !value)}
          >
            <ChevronLeft className="h-4 w-4" />
          </AppIconButton>

          <AppPanel className="ncw-side-card">
            <AppSectionHeader icon={SlidersHorizontal} title="Compare Options" description="Normalize, align, and filter semantic diff output." />
            <div className="app-panel__content grid gap-3">
              <SwitchRow id="normalizeSpacingToggle" defaultChecked>Normalize spacing</SwitchRow>
              <SwitchRow id="sortObjectsToggle">Sort object keys</SwitchRow>
              <SwitchRow id="autoAlignToggle">Auto-align normalized objects</SwitchRow>
              <SwitchRow id="ignoreCommentsToggle" defaultChecked>Ignore comments and blank lines</SwitchRow>
              <SwitchRow id="ignoreGeneratedToggle" defaultChecked>Ignore generated lines</SwitchRow>
              <SwitchRow id="semanticDebugToggle">Show semantic debug keys</SwitchRow>
            </div>
          </AppPanel>

          <AppPanel className="ncw-side-card">
            <AppSectionHeader title="Profile" description="Apply vendor mapping and semantic rules." />
            <div className="app-panel__content grid gap-3">
              <label>Profile<AppSelect id="profileSelect" /></label>
              <AppButton id="loadProfileBtn" type="button" variant="secondary">Apply profile</AppButton>
            </div>
          </AppPanel>

          <AppPanel className="ncw-side-card">
            <AppSectionHeader title="Object Scope" />
            <div className="app-panel__content">
              <div id="objectToggles" className="chip-grid" />
            </div>
          </AppPanel>

          <AppPanel className="ncw-side-card">
            <AppSectionHeader title="View" />
            <div className="app-panel__content grid gap-3">
              <label>
                Theme
                <AppSelect id="themeSelect">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="contrast">High contrast</option>
                </AppSelect>
              </label>
              <label>
                Editor font
                <AppSelect id="fontSelect">
                  <option value="Consolas">Consolas</option>
                  <option value="D2Coding">D2Coding</option>
                  <option value="Cascadia Mono">Cascadia Mono</option>
                  <option value="monospace">Monospace</option>
                </AppSelect>
              </label>
              <label>Search<input id="filterInput" placeholder="interface, static-route, missing" /></label>
              <SwitchRow id="fieldHighlightToggle" defaultChecked>Field highlight</SwitchRow>
              <label>
                Result filter
                <AppSelect id="resultFilterSelect">
                  <option value="all">All</option>
                  <option value="changed">Changed</option>
                  <option value="missing">Missing</option>
                  <option value="added">Added</option>
                  <option value="syntax">Syntax</option>
                  <option value="required">Required</option>
                </AppSelect>
              </label>
            </div>
          </AppPanel>

          <AppPanel className="ncw-side-card">
            <AppSectionHeader title="Status" />
            <div className="app-panel__content">
              <div className="status-card">
                <strong id="compareStatus">Ready</strong>
                <span id="lastComparedAt">Last compare: none</span>
              </div>
            </div>
          </AppPanel>
        </motion.aside>

        <section className="compare-area">
          <motion.div
            className="action-bar ncw-action-bar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: "easeOut", delay: 0.04 }}
          >
            <AppToolbar>
              <AppButton id="compareBtn" type="button"><GitCompare />Run compare</AppButton>
              <AppButton id="alignBtn" type="button" variant="secondary">Align objects</AppButton>
              <AppIconButton id="restoreInitialBtn" type="button" title="Restore initial config"><RotateCcw /></AppIconButton>
              <AppIconButton id="exportReportBtn" type="button" title="Export report"><Download /></AppIconButton>
              <AppIconButton id="clearAllBtn" type="button" title="Clear all"><Eraser /></AppIconButton>
            </AppToolbar>
          </motion.div>

          <div className="editor-grid">
            <ConfigEditor side="old" title="Source Config" icon={FileCode2} />
            <div className="diff-gutter" aria-hidden="true">
              <div className="diff-gutter__rail" />
            </div>
            <ConfigEditor side="new" title="Target Config" icon={FileCode2} />
            <svg id="diffConnectorSvg" className="diff-connector-overlay" aria-hidden="true" />
          </div>
        </section>
      </div>
    </section>
  );
}
