import React from "react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { AppSelect } from "./ui/AppSelect.jsx";

export default function ObjectMatchTable() {
  return (
    <motion.section
      className="ncw-object-match-table"
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <div className="object-tools">
        <label className="ncw-search-label">
          <Search className="h-4 w-4" />
          <input id="objectSearchInput" placeholder="Object, type, next-hop, tag, description" />
        </label>
        <AppSelect id="objectSortSelect" title="Object sort">
          <option value="identity">Identity</option>
          <option value="source">Source / target</option>
          <option value="line">Line</option>
          <option value="field">Semantic field</option>
        </AppSelect>
      </div>
      <motion.div
        id="objectList"
        className="object-list"
        whileHover={{ boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)" }}
      />
    </motion.section>
  );
}
