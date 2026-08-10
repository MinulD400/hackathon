"use client";

import { useState } from "react";
import { useAccordionState } from "@/components/features/workspace/useAccordionState";
import { useKeyboardShortcuts } from "@/components/features/workspace/useKeyboardShortcuts";
import { useSnapConfig } from "@/components/features/workspace/useSnapConfig";
import { useViewerSettings } from "@/components/features/workspace/useViewerSettings";
import { useWorkspaceEditor } from "@/components/features/workspace/useWorkspaceEditor";
import { AccordionSection } from "@/components/molecules/AccordionSection";
import { WorkspaceHistoryControls } from "@/components/molecules/WorkspaceHistoryControls";
import { WorkspaceLightListItem } from "@/components/molecules/WorkspaceLightListItem";
import { WorkspaceGlobalToolPanel } from "@/components/organisms/WorkspaceGlobalToolPanel";
import { WorkspaceObjectList } from "@/components/organisms/WorkspaceObjectList";
import { WorkspaceSelectionToolPanel } from "@/components/organisms/WorkspaceSelectionToolPanel";
import { WorkspaceViewer } from "@/components/organisms/WorkspaceViewer";
import { ConversationModal } from "@/components/organisms/ConversationModal";
import { WorkspaceTemplate } from "@/components/templates/WorkspaceTemplate";

/**
 * Page-level composition for `/workspace` (FR-1). Calls `useWorkspaceEditor()`
 * once here so its state (objects, lights, selection, import errors,
 * undo/redo) is a single source of truth shared across the import panels,
 * viewer, object list, lighting panel, snapping panel, transform inputs, and
 * export controls, mirroring `src/app/page.tsx`'s page-owns-hooks pattern.
 * `useSnapConfig`, `useViewerSettings`, and `useAccordionState` are separate,
 * deliberately non-history tool/UI settings (`04-lld.md` T-5/T-6/T-7). The
 * sidebar's Objects/Lights/Shapes/Materials/Snapping/Export sections (FR-3)
 * are each wrapped in an `AccordionSection`, owned by `useAccordionState`
 * (A-3). Distinct from the existing `/` generation/history flow — no shared
 * state between the two beyond the navigation itself.
 */
export default function WorkspacePage() {
  const [isConversationOpen, setIsConversationOpen] = useState(false);

  const editor = useWorkspaceEditor();
  const {
    objects,
    selectedId,
    importErrors,
    importFiles,
    select,
    updateTransform,
    remove,
    duplicate,
    clear,
    dismissImportError,
    addPrimitive,
    updateMaterial,
    setVisible,
    setWireframe,
    resetTransform,
    rename,
    lights,
    addLight,
    updateLight,
    removeLight,
    selectedLightId,
    selectLight,
    duplicateLight,
    resetLight,
    renameLight,
    canUndo,
    canRedo,
    undo,
    redo,
  } = editor;

  const {
    snapConfig,
    setTranslateEnabled,
    setRotateEnabled,
    setScaleEnabled,
    setTranslateStep,
    setRotateStep,
    setScaleStep,
  } = useSnapConfig();

  const viewerSettings = useViewerSettings();
  const { expanded, toggle } = useAccordionState();

  const selectedObject = objects.find((object) => object.id === selectedId) ?? null;

  // Wire keyboard shortcuts (Delete, Ctrl+D, Ctrl+Z, Ctrl+Shift+Z)
  useKeyboardShortcuts(editor);

  return (
    <>
      <WorkspaceTemplate
        import={null}
        viewer={
          <WorkspaceViewer
            objects={objects}
            selectedId={selectedId}
            onSelect={select}
            onTransformChange={updateTransform}
            lights={lights}
            snapConfig={snapConfig}
            selectedLightId={selectedLightId}
            onSelectLight={selectLight}
            onLightTransformChange={(id, patch) => updateLight(id, patch)}
            viewerSettings={viewerSettings}
            historyControls={<WorkspaceHistoryControls canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />}
          />
        }
        objectPanel={
          <>
            {/* Always visible regardless of selection (bugfix: this list
             * previously lived only inside the per-selection panel, so it was
             * unreachable — e.g. right after adding a shape, or whenever
             * nothing happened to be selected — with no way to see, rename,
             * duplicate, or remove existing objects or lights). Lists both
             * objects and lights, each with only their basic actions
             * (select/rename/duplicate/remove) — sizing/transform and
             * material/color/shadow editing stay in their own contextual
             * sections below, not duplicated here. Lights are omitted here
             * while a light is already selected — `WorkspaceLightingPanel`
             * (rendered lower via `WorkspaceSelectionToolPanel`) already
             * lists lights in that state for its own per-light detail
             * controls, and showing both would be a literal duplicate list
             * with two identically-labeled rows. */}
            <AccordionSection title="Layers" expanded={expanded.objects} onToggle={() => toggle("objects")}>
              <WorkspaceObjectList
                objects={objects}
                lights={lights}
                selectedId={selectedId}
                onSelect={select}
                onRemove={remove}
                onDuplicate={duplicate}
                onClear={clear}
                onSetVisible={setVisible}
                onSetWireframe={setWireframe}
                onResetTransform={resetTransform}
                onRename={rename}
                importErrors={importErrors}
                onFilesSelected={(files) => void importFiles(files)}
                onDismissError={dismissImportError}
              />
              {lights.length > 0 && !selectedLightId ? (
                <ul className="flex flex-col gap-2">
                  {lights.map((light) => (
                    <WorkspaceLightListItem
                      key={light.id}
                      light={light}
                      isSelected={light.id === selectedLightId}
                      onUpdate={updateLight}
                      onRemove={removeLight}
                      onSelect={selectLight}
                      onDuplicate={duplicateLight}
                      onReset={resetLight}
                      onRename={renameLight}
                    />
                  ))}
                </ul>
              ) : null}
            </AccordionSection>
            {selectedId ? (
              <WorkspaceSelectionToolPanel
                kind="object"
                expanded={expanded}
                onToggleSection={toggle}
                selectedObject={selectedObject}
                onCommitTransform={updateTransform}
                onUpdateMaterial={updateMaterial}
                lights={lights}
                selectedLightId={selectedLightId}
                onAddLight={addLight}
                onUpdateLight={updateLight}
                onRemoveLight={removeLight}
                onSelectLight={selectLight}
                onDuplicateLight={duplicateLight}
                onResetLight={resetLight}
                onRenameLight={renameLight}
              />
            ) : selectedLightId ? (
              <WorkspaceSelectionToolPanel
                kind="light"
                expanded={expanded}
                onToggleSection={toggle}
                selectedObject={selectedObject}
                onCommitTransform={updateTransform}
                onUpdateMaterial={updateMaterial}
                lights={lights}
                selectedLightId={selectedLightId}
                onAddLight={addLight}
                onUpdateLight={updateLight}
                onRemoveLight={removeLight}
                onSelectLight={selectLight}
                onDuplicateLight={duplicateLight}
                onResetLight={resetLight}
                onRenameLight={renameLight}
              />
            ) : (
              <WorkspaceGlobalToolPanel
                expanded={expanded}
                onToggleSection={toggle}
                onAddPrimitive={addPrimitive}
                onAddLight={addLight}
                snapConfig={snapConfig}
                onSetTranslateEnabled={setTranslateEnabled}
                onSetRotateEnabled={setRotateEnabled}
                onSetScaleEnabled={setScaleEnabled}
                onSetTranslateStep={setTranslateStep}
                onSetRotateStep={setRotateStep}
                onSetScaleStep={setScaleStep}
                viewerSettings={viewerSettings}
                objects={objects}
                selectedObject={selectedObject}
                onOpenAiAssistant={() => setIsConversationOpen(true)}
              />
            )}
          </>
        }
      />
      <ConversationModal
        isOpen={isConversationOpen}
        onClose={() => setIsConversationOpen(false)}
        editor={editor}
      />
    </>
  );
}
