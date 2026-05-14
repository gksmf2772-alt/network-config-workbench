// src/components/ProfileTab.jsx

import React, { useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import ProfileEditor from "./ProfileEditor.jsx";
import { AppButton } from "./ui/AppButton.jsx";
import { AppIconButton } from "./ui/AppIconButton.jsx";
import { AppPanel } from "./ui/AppPanel.jsx";
import { AppSectionHeader } from "./ui/AppSectionHeader.jsx";
import { AppToolbar } from "./ui/AppToolbar.jsx";
import {
  exportProfiles,
  importProfilesFromFile,
} from "../core/profileBackup.js";

export default function ProfileTab() {
  const fileInputRef = useRef(null);
  const [backupStatus, setBackupStatus] = useState("");

  const handleExportProfiles = async () => {
    try {
      const count = await exportProfiles();
      setBackupStatus(`${count} profiles exported.`);
    } catch (error) {
      console.error(error);
      setBackupStatus(`Export failed: ${error.message}`);
      alert(`Profile export failed\n${error.message}`);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportProfiles = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const overwrite = window.confirm(
      "Overwrite existing profiles with the same ID?\n\nOK: overwrite\nCancel: import as new IDs"
    );

    try {
      const count = await importProfilesFromFile(file, { overwrite });
      setBackupStatus(`${count} profiles imported. Reloading refreshes the legacy profile list.`);
      alert(`${count} profiles imported.`);
      window.location.reload();
    } catch (error) {
      console.error(error);
      setBackupStatus(`Import failed: ${error.message}`);
      alert(`Profile import failed\n${error.message}`);
    }
  };

  return (
    <section id="profilesTab" className="tab-panel">
      <div className="profiles-layout">
        <ProfileEditor />

        <AppPanel as="article" className="profile-library">
          <AppSectionHeader title="Saved Profiles" description="Import, export, and remove stored profile presets." />

          <AppToolbar className="profile-backup-actions">
            <AppButton type="button" onClick={handleExportProfiles} variant="secondary">
              <Download />Export
            </AppButton>
            <AppButton type="button" onClick={handleImportClick} variant="secondary">
              <Upload />Import
            </AppButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={handleImportProfiles}
            />
            {backupStatus ? (
              <div className="profile-backup-status">{backupStatus}</div>
            ) : null}
          </AppToolbar>

          <AppIconButton id="deleteProfileBtn" type="button" title="Delete selected profile">
            <Trash2 />
          </AppIconButton>
          <div id="savedProfilesList" className="saved-profile-list" />
        </AppPanel>
      </div>
    </section>
  );
}
