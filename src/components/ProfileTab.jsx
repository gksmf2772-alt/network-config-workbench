// src/components/ProfileTab.jsx

import React, { useRef, useState } from "react";
import ProfileEditor from "./ProfileEditor.jsx";
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
      setBackupStatus(`${count}개 프로파일을 내보냈습니다.`);
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
      "같은 ID의 프로파일이 있으면 덮어쓸까요?\n\n확인: 덮어쓰기\n취소: 새 ID로 추가"
    );

    try {
      const count = await importProfilesFromFile(file, { overwrite });
      setBackupStatus(`${count}개 프로파일을 가져왔습니다. 페이지를 새로고침합니다.`);
      alert(`${count}개 프로파일을 가져왔습니다.`);

      // 기존 legacy 렌더링/목록 갱신 로직을 확실히 다시 태우기 위해 새로고침
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

        <article className="profile-library">
          <h2>저장된 프로파일</h2>

          <div className="profile-backup-actions">
            <button type="button" onClick={handleExportProfiles}>
              프로파일 내보내기
            </button>
            <button type="button" onClick={handleImportClick}>
              프로파일 가져오기
            </button>
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
          </div>

          <button id="deleteProfileBtn" type="button">
            선택 프로파일 삭제
          </button>
          <div id="savedProfilesList" className="saved-profile-list" />
        </article>
      </div>
    </section>
  );
}