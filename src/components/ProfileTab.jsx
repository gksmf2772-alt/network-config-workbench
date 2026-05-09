import React from "react";
import ProfileEditor from "./ProfileEditor.jsx";

export default function ProfileTab() {
  return (
    <section id="profilesTab" className="tab-panel">
      <div className="profiles-layout">
        <ProfileEditor />
        <article className="profile-library">
          <h2>저장된 프로파일</h2>
          <button id="deleteProfileBtn" type="button">선택 프로파일 삭제</button>
          <div id="savedProfilesList" className="saved-profile-list" />
        </article>
      </div>
    </section>
  );
}
