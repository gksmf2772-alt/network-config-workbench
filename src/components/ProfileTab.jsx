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
      setBackupStatus(`프로파일 ${count}개 내보냄`);
    } catch (error) {
      console.error(error);
      setBackupStatus(`내보내기 실패: ${error.message}`);
      alert(`프로파일 내보내기 실패\n${error.message}`);
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
      "같은 ID의 기존 프로파일을 덮어쓸까요?\n\n확인: 덮어쓰기\n취소: 새 ID로 가져오기"
    );

    try {
      const count = await importProfilesFromFile(file, { overwrite });
      setBackupStatus(`프로파일 ${count}개 가져옴. 목록 갱신을 위해 새로고침합니다.`);
      alert(`프로파일 ${count}개 가져옴`);
      window.location.reload();
    } catch (error) {
      console.error(error);
      setBackupStatus(`가져오기 실패: ${error.message}`);
      alert(`프로파일 가져오기 실패\n${error.message}`);
    }
  };

  return (
    <section id="profilesTab" className="tab-panel">
      <div className="profiles-layout">
        <ProfileEditor />

        <AppPanel as="article" className="profile-library">
          <AppSectionHeader title="저장된 프로파일" description="프로파일을 가져오기, 내보내기, 삭제합니다." />

          <AppToolbar className="profile-backup-actions">
            <AppButton type="button" onClick={handleExportProfiles} variant="secondary">
              <Download />내보내기
            </AppButton>
            <AppButton type="button" onClick={handleImportClick} variant="secondary">
              <Upload />가져오기
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

          <AppIconButton id="deleteProfileBtn" type="button" title="선택한 프로파일 삭제">
            <Trash2 />
          </AppIconButton>
          <div id="savedProfilesList" className="saved-profile-list" />
        </AppPanel>
      </div>
    </section>
  );
}
