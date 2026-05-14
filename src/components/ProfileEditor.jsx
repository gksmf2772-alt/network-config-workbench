import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, RotateCcw, Save, Sparkles, Undo2 } from "lucide-react";
import { AppButton } from "./ui/AppButton.jsx";
import { AppIconButton } from "./ui/AppIconButton.jsx";
import { AppPanel } from "./ui/AppPanel.jsx";
import { AppSectionHeader } from "./ui/AppSectionHeader.jsx";
import { AppSelect } from "./ui/AppSelect.jsx";
import { AppToolbar } from "./ui/AppToolbar.jsx";

function CollapsibleSection({ id, title, summary, defaultOpen = false, children }) {
  const storageKey = `profile-section-open:${id}`;
  const [open, setOpen] = useState(() => {
    const saved = window.localStorage?.getItem(storageKey);
    if (saved === "open") return true;
    if (saved === "closed") return false;
    return defaultOpen;
  });

  useEffect(() => {
    window.localStorage?.setItem(storageKey, open ? "open" : "closed");
  }, [open, storageKey]);

  return (
    <section className={`profile-section collapsible-section ${open ? "is-open" : "is-closed"}`}>
      <AppButton type="button" variant="ghost" className="collapsible-header" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={`${id}-content`}>
        <span className="collapsible-icon" aria-hidden="true">
          {open ? <ChevronDown /> : <ChevronRight />}
        </span>
        <span className="collapsible-title">{title}</span>
        <span className="collapsible-summary">{summary}</span>
      </AppButton>
      <div id={`${id}-content`} className="collapsible-content">
        {children}
      </div>
    </section>
  );
}

function SectionIntro({ step, title, children }) {
  return (
    <div className="profile-section-title">
      <span className="profile-step">{step}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}

export default function ProfileEditor() {
  return (
    <AppPanel as="article" className="profile-editor">
      <AppSectionHeader
        title="Profile Editor"
        description="Object identity, semantic field, normalization, and policy rule configuration."
        actions={<AppButton id="newProfileBtn" type="button" variant="secondary"><Plus />New profile</AppButton>}
      />

      <div className="profile-flow-note">
        <strong>Rule flow</strong>
        <span>Object mapping to identity rules to field extraction to normalization to GUI mapping to validation policy to exceptions.</span>
      </div>

      <label>Profile name<input id="profileNameInput" defaultValue="Nokia default validation" /></label>
      <label>
        Vendor / OS
        <AppSelect id="vendorSelect">
          <option value="nokia">Nokia Classic / MD-CLI</option>
          <option value="cisco">Cisco</option>
          <option value="juniper">Juniper</option>
        </AppSelect>
      </label>

      <CollapsibleSection id="object-type-mapping" title="1. Object Type Mapping" summary="Link old and new object types" defaultOpen>
        <SectionIntro step="1" title="Object Type Mapping">Map source and target object types before identity and field extraction rules run.</SectionIntro>
        <div id="mappingEditor" className="mapping-editor" />
      </CollapsibleSection>

      <CollapsibleSection id="identity-rule" title="2. Identity Rules" summary="Object identity matching criteria" defaultOpen>
        <SectionIntro step="2" title="Identity Rules">Define how old and new objects are recognized as the same semantic object.</SectionIntro>
        <div id="identityRuleEditor" className="identity-rule-editor" />
      </CollapsibleSection>

      <CollapsibleSection id="mapping-workbench" title="3. Mapping Workbench" summary="Line, block, group, and token GUI mapping" defaultOpen>
        <SectionIntro step="3" title="Mapping Workbench">Create line groups, structural mappings, and token mappings from representative examples.</SectionIntro>
        <label>Object type<AppSelect id="profileObjectTypeSelect" /></label>
        <div className="profile-example-grid">
          <div>
            <div className="profile-example-title">Source example</div>
            <textarea id="profileOldExampleInput" className="profile-example-input" spellCheck="false" wrap="off" />
            <div id="profileOldPreview" className="profile-example-preview" />
          </div>
          <div>
            <div className="profile-example-title">Target example</div>
            <textarea id="profileNewExampleInput" className="profile-example-input" spellCheck="false" wrap="off" />
            <div id="profileNewPreview" className="profile-example-preview" />
          </div>
          <svg id="profileExampleConnectorSvg" className="profile-example-connector-overlay" aria-hidden="true" />
          <div id="profileRulePopover" className="profile-rule-popover" hidden />
        </div>
        <AppToolbar className="profile-example-actions">
          <AppButton id="autoLearnRulesBtn" type="button" variant="secondary"><Sparkles />Generate candidates</AppButton>
          <AppButton id="addLineMappingBtn" type="button" variant="secondary">Add structure mapping</AppButton>
          <AppButton id="addContextMappingBtn" type="button" variant="secondary">Add block mapping</AppButton>
          <AppButton id="addFieldMappingBtn" type="button" variant="secondary">Add field mapping</AppButton>
          <AppButton id="createTokenGroupBtn" type="button" variant="secondary">Create token group</AppButton>
          <AppButton id="createLineGroupBtn" type="button" variant="secondary">Create line group</AppButton>
          <AppButton id="addOldLineRuleBtn" type="button" variant="secondary">Add source exception</AppButton>
          <AppButton id="addNewLineRuleBtn" type="button" variant="secondary">Add target exception</AppButton>
        </AppToolbar>
        <div className="candidate-scope-list" aria-label="Candidate generation scope">
          <span>identity</span>
          <span>field extraction</span>
          <span>normalization</span>
          <span>structure mapping</span>
          <span>token mapping</span>
          <span>validation policy</span>
        </div>
        <div id="profileSelectionGuide" className="profile-guide">Select tokens, lines, or groups.</div>
        <div id="profileMappingReactRoot" className="profile-mapping-react-root" />
        <div className="profile-section-subtitle">
          <h4>Semantic token mapping</h4>
          <p>Token mappings are managed separately from line and group mappings.</p>
        </div>
        <div id="semanticRuleEditor" className="semantic-rule-editor" />
        <details className="profile-compat-panel">
          <summary>Advanced compatibility mappings</summary>
          <div className="profile-manual-rule-panels">
            <div>
              <h4>Structure mapping</h4>
              <div id="profileMappingRows" className="profile-mapping-rows" />
            </div>
            <div>
              <h4>Block mapping compatibility</h4>
              <div id="profileContextMappingRows" className="profile-mapping-rows" />
            </div>
            <div>
              <h4>Field mapping compatibility</h4>
              <div id="profileFieldMappingRows" className="profile-mapping-rows" />
            </div>
          </div>
        </details>
        <details className="profile-compat-panel">
          <summary>Line exceptions</summary>
          <div className="profile-section-subtitle">
            <h4>Line exceptions</h4>
            <p>Final line-level exceptions such as ignore, required, added, and missing.</p>
          </div>
          <div id="profileRuleRows" className="profile-rule-rows" />
        </details>
      </CollapsibleSection>

      <CollapsibleSection id="advanced-compare-policy" title="4. Advanced Compare Policy" summary="Validation policy, normalization, parser rules" defaultOpen={false}>
        <SectionIntro step="4" title="Validation Policy">Control required, presence, ignore, and compare behavior after field extraction and normalization.</SectionIntro>
        <div id="policyEditor" className="policy-editor" />
        <div className="profile-section-subtitle">
          <h4>Normalization rules</h4>
          <p>Normalize equivalent expressions such as no shutdown and admin-state enable before compare.</p>
        </div>
        <div id="normalizeEditor" className="normalize-editor" />
        <div className="profile-section-subtitle">
          <h4>Parser rules / field extraction</h4>
          <p>Advanced field extraction rules used by compare and semantic preview.</p>
        </div>
        <div id="parserRuleEditor" className="parser-rule-editor" />
      </CollapsibleSection>

      <div className="profile-section">
        <h3>Change History</h3>
        <div id="profileChangesList" className="profile-changes-list" />
        <AppToolbar className="profile-rollback-actions">
          <AppIconButton id="undoProfileBtn" type="button" title="Undo last change"><Undo2 /></AppIconButton>
          <AppButton id="rollbackProfileBtn" type="button" variant="secondary"><RotateCcw />Restore saved state</AppButton>
        </AppToolbar>
      </div>

      <div className="profile-save-panel">
        <div id="profileStatus" className="profile-status" data-kind="info">No profile changes</div>
        <AppButton id="saveProfileBtn" type="button"><Save />Save profile</AppButton>
        <AppButton id="saveProfileAsBtn" type="button" variant="secondary">Save as</AppButton>
      </div>
    </AppPanel>
  );
}
