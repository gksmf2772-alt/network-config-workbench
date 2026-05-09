import React, { useEffect, useState } from "react";
import Layout from "./components/Layout.jsx";

export default function App() {
  const [legacyError, setLegacyError] = useState("");

  useEffect(() => {
    let cancelled = false;
    import("./core/legacyCore.js").catch((error) => {
      if (cancelled) return;
      setLegacyError(error?.message || "기존 core 로드 실패");
      console.error(error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Layout />
      {legacyError ? (
        <div className="startup-error">
          <strong>시작 오류</strong>
          <span>{legacyError}</span>
        </div>
      ) : null}
    </>
  );
}
