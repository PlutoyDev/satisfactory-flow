import { Fragment, ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Background, ConnectionMode, Edge, Node, Panel, ReactFlow, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import debounce from 'debounce';
import { useAtom } from 'jotai';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowRightFromLine,
  Check,
  Clipboard,
  Copy,
  FilePen,
  Fullscreen,
  Home,
  Info,
  OctagonAlert,
  OctagonX,
  Redo,
  ScanEye,
  Scissors,
  Undo,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { customEdges, customNodeEditors, customNodes } from '../components/rf';
import { FACTORY_NODE_DEFAULT_COLORS, FACTORY_NODE_TYPES, FactoryEditorContextProvider, FactoryNodeType } from '../components/rf/BaseNode';
import ConnectionLine from '../components/rf/ConnectionLine';
import { MainEdgeProp, MainNodeProp, stringifyFlowData } from '../lib/data';
import {
  addEdge,
  alignSelectedNodes,
  excuteCustomCutOrCopy,
  excuteCustomPaste,
  isDraggingNodeAtom,
  isValidConnection,
  onCutOrCopy,
  onDrop,
  onPaste,
  onSelectionChange,
  reactflowInstanceAtom,
  selectedIdsAtom,
} from '../lib/rfListeners';
import {
  alignmentAtom,
  appendStatusMessage,
  createFlow,
  edgesAtom,
  edgesMapAtom,
  historyActionAtom,
  isDebouncePendingAtom,
  isSavedAtom,
  nodesAtom,
  nodesMapAtom,
  selectedFlowAtom,
  selectedFlowDataAtom,
  statusMessagesAtom,
  viewportAtom,
} from '../lib/store';

function FlowPage() {
  const [isDraggingNode] = useAtom(isDraggingNodeAtom);
  const [rfInstance, setReactFlowInstance] = useAtom(reactflowInstanceAtom);
  const [selectedFlow, setSelectedFlow] = useAtom(selectedFlowAtom);
  const [selFlowData, setSelFlowData] = useAtom(selectedFlowDataAtom);
  const [isRenaming, setRenaming] = useState(false);
  const [nodes, applyNodeChanges] = useAtom(nodesAtom);
  const [edges, applyEdgeChanges] = useAtom(edgesAtom);
  const [{ undoable, redoable }, applyHistoryAction] = useAtom(historyActionAtom);
  const [isExporting, setExporting] = useState<boolean>(false);
  const isReadOnly = selectedFlow?.source !== 'db';
  const [isDebounceActionPending] = useAtom(isDebouncePendingAtom);
  const [isSaved] = useAtom(isSavedAtom);
  const rfParentRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useAtom(viewportAtom);
  const [selectedIds] = useAtom(selectedIdsAtom);
  const copyableOrCutable = selectedIds.length > 0;

  const toggleFullscreen = useCallback(() => {
    const isExiting = document.fullscreenElement === rfParentRef.current;
    try {
      if (isExiting) document.exitFullscreen();
      else rfParentRef.current?.requestFullscreen({ navigationUI: 'hide' });
      appendStatusMessage({
        type: 'info',
        message: isExiting ? 'Exited fullscreen' : 'Entered fullscreen',
        key: 'fullscreen',
        hideAfter: 2000,
      });
    } catch (e) {
      appendStatusMessage({
        type: 'warning',
        message: `Failed to ${isExiting ? 'exit' : 'enter'} fullscreen`,
        key: 'fullscreen',
        hideAfter: 2000,
      });
      console.error(e);
    }
  }, [rfParentRef]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const lcKey = e.key.toLowerCase();

      if (e.ctrlKey) {
        if (lcKey === 'z') {
          applyHistoryAction('undo');
          appendStatusMessage({ type: 'info', message: 'Undo', key: 'undo', hideAfter: 1000 });
        } else if (lcKey === 'y') {
          applyHistoryAction('redo');
          appendStatusMessage({ type: 'info', message: 'Redo', key: 'redo', hideAfter: 1000 });
        } else if (lcKey === '=' || lcKey === '+') {
          e.preventDefault();
          rfInstance?.zoomIn({ duration: 100 });
        } else if (lcKey === '-' || lcKey === '_') {
          e.preventDefault();
          rfInstance?.zoomOut({ duration: 100 });
        } else if (lcKey === '0') {
          rfInstance?.fitView({ padding: 0.4, duration: 100 });
          appendStatusMessage({ type: 'info', message: 'Fitted view', key: 'fit-view', hideAfter: 1000 });
        } else if (lcKey === 'a') {
          e.preventDefault();
          applyNodeChanges(nodes.map(node => ({ type: 'select', id: node.id, selected: true })));
          applyEdgeChanges(edges.map(edge => ({ type: 'select', id: edge.id, selected: true })));
          appendStatusMessage({ type: 'info', message: 'Selected all', key: 'select-all', hideAfter: 1000 });
        } else if (lcKey === 's') {
          e.preventDefault();
          appendStatusMessage({
            type: 'info',
            message: 'Automatically saved, no need to save manually',
            key: 'auto-save',
            hideAfter: 2000,
          });
        }
      } else if (lcKey === 'f11') {
        e.preventDefault();
        toggleFullscreen();
      } else if (lcKey === 'w' || lcKey === 'a' || lcKey === 's' || lcKey === 'd') {
        setViewport(viewport => {
          if (!viewport) return;
          const step = 36 * (lcKey === 'w' || lcKey === 'a' ? 1 : -1) * (e.shiftKey ? 6 : 1);
          const isVertical = lcKey === 'w' || lcKey === 's';
          return { ...viewport, [isVertical ? 'y' : 'x']: viewport[isVertical ? 'y' : 'x'] + step };
        });
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [rfInstance, setViewport]);

  if (!selectedFlow) {
    return <div>404 Not Found</div>;
  }

  return (
    <div>
      <div className='navbar w-full'>
        <div className='navbar-start'>
          <a href='/' className='btn btn-ghost' onClick={e => (e.preventDefault(), setSelectedFlow(null))}>
            <Home />
            Back
          </a>
          <p className='ml-2 text-xs text-gray-500'>Flow ID: {selectedFlow.flowId}</p>
          <p className='ml-2 text-xs text-gray-500'>{isDebounceActionPending ? 'Saving...' : isSaved ? 'Saved' : 'Unsaved'}</p>
        </div>
        <div className='navbar-center'>
          <h2 className='text-xl font-semibold'>{selFlowData?.name}</h2>
          {isReadOnly ? (
            <span className='text-error ml-2 text-xl'>(Read-only)</span>
          ) : (
            <button className='btn btn-ghost btn-xs ml-2' onClick={() => setRenaming(true)}>
              <FilePen size={24} />
            </button>
          )}
        </div>
        <div className='navbar-end'>
          <button role='button' className='btn btn-ghost' onClick={() => setExporting(true)}>
            <ArrowRightFromLine />
            Export
          </button>
          <button role='button' className='btn btn-ghost' onClick={() => createFlow('Duplicate: ' + selFlowData?.name, { edges, nodes })}>
            <Copy />
            Duplicate
          </button>
        </div>
      </div>
      <div className='fixed bottom-0 left-0 right-0 top-16' ref={rfParentRef}>
        <Suspense fallback={<div>Loading...</div>}>
          <ReactFlow
            // Viewport
            minZoom={0.05}
            maxZoom={1.5}
            snapToGrid={true}
            snapGrid={[6, 6]}
            attributionPosition='bottom-left'
            // Node
            nodes={nodes}
            nodeTypes={customNodes}
            nodeOrigin={[0.5, 0.5]}
            onNodesChange={applyNodeChanges}
            elevateNodesOnSelect={true}
            // Edge
            edges={edges}
            edgeTypes={customEdges}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            onEdgesChange={applyEdgeChanges}
            elevateEdgesOnSelect={true}
            // Connection
            connectionRadius={36}
            connectionMode={ConnectionMode.Loose}
            connectionLineComponent={ConnectionLine}
            isValidConnection={isValidConnection}
            onConnect={addEdge}
            // Misc
            colorMode='dark'
            onInit={setReactFlowInstance}
            onSelectionChange={onSelectionChange}
            // Viewport
            viewport={viewport}
            onViewportChange={setViewport}
            // Drag and Drop
            onDrop={onDrop}
            onDragOver={e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            // Keyboard
            deleteKeyCode={['Delete', 'Backspace']}
            selectionKeyCode={['Shift', 'Control']}
            // Clipboard
            onCut={onCutOrCopy}
            onCopy={onCutOrCopy}
            onPaste={onPaste}
          >
            <Background gap={18} bgColor='#202030' />
            {isDraggingNode && <DraggingOverlay />}
            {!isReadOnly && <NodeSelectionPanel />}
            <PropertyEditorPanel isReadOnly={isReadOnly} />
            <StatusMessagePanel />
            <ToolbarPanel
              undoable={undoable}
              redoable={redoable}
              onUndo={() => applyHistoryAction('undo')}
              onRedo={() => applyHistoryAction('redo')}
              cutable={copyableOrCutable}
              copyable={copyableOrCutable}
              isReadOnly={isReadOnly}
              // onCopy={() => excuteClipboardAction('copy')}
              // onPaste={() => excuteClipboardAction('paste')}
              onFullscreen={toggleFullscreen}
            />
            <AlignmentLineOverlay />
            {isRenaming && (
              <RenameDialog
                name={selFlowData?.name ?? ''}
                onRename={newName => {
                  setSelFlowData({ ...selFlowData, name: newName });
                  setRenaming(false);
                }}
                onCancel={() => setRenaming(false)}
              />
            )}
            {isExporting && <ExportDialog nodes={nodes} edges={edges} close={() => setExporting(false)} />}
          </ReactFlow>
        </Suspense>
      </div>
    </div>
  );
}

function DraggingOverlay() {
  return (
    <div className='fixed bottom-0 left-0 right-0 top-16 bg-gray-400 bg-opacity-10'>
      <div className='rounded-box absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform px-3 py-1'>
        <p className='text-lg font-semibold'>Drop here to add node</p>
      </div>
    </div>
  );
}

function AlignmentLineOverlay() {
  const rfInstance = useReactFlow();
  const [{ x: alignLineX, y: alignLineY }] = useAtom(alignmentAtom);

  return (
    <>
      {rfInstance && alignLineX && (
        <div
          className='border-success pointer-events-none fixed border-l border-dashed'
          style={{ left: rfInstance.flowToScreenPosition({ x: alignLineX, y: rfInstance.getViewport().y }).x, top: 0, bottom: 0 }}
        />
      )}
      {rfInstance && alignLineY && (
        <div
          className='border-success pointer-events-none fixed border-t border-dashed'
          style={{ top: rfInstance.flowToScreenPosition({ x: rfInstance.getViewport().x, y: alignLineY }).y, left: 0, right: 0 }}
        />
      )}
    </>
  );
}

const NODE_NAMES = {
  item: 'Item',
  recipe: 'Recipe',
  logistic: 'Logistic',
  sink: 'Sink',
} as const satisfies Record<FactoryNodeType, string>;

function NodeSelectionPanel() {
  const [isDraggingNode, setDraggingNode] = useAtom(isDraggingNodeAtom);
  return (
    <Panel position='top-right'>
      <div
        className='bg-base-300 rounded-box w-40 select-none px-3 py-1'
        onDrop={e => {
          e.preventDefault();
          e.stopPropagation();
          setDraggingNode(false);
        }}
        onDragOver={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <h2 className='text-lg font-semibold'>Node Selection</h2>
        <p className='text-sm text-gray-500'>Drag from here</p>
        <div className='divider m-0 mb-2 h-1' />
        <div className='flex flex-col gap-y-2'>
          {FACTORY_NODE_TYPES.map(type => (
            <div
              key={type}
              style={{ backgroundColor: FACTORY_NODE_DEFAULT_COLORS[type] }}
              className='text-base-300 w-full cursor-pointer rounded-md px-2 py-1 text-center'
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('application/reactflow', type);
                e.dataTransfer.effectAllowed = 'move';
                setDraggingNode(true);
              }}
            >
              {NODE_NAMES[type]}
            </div>
          ))}
          {isDraggingNode && (
            <div className='border-base-300 h-20 w-full rounded-md border-2 border-dashed bg-gray-600 bg-opacity-10 px-2 pt-4'>
              <X size={24} className='text-error mx-auto' />
              <p className='text-error w-full text-center'>Cancel</p>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function PropertyEditorPanel({ isReadOnly }: { isReadOnly: boolean }) {
  const [nodesMap] = useAtom(nodesMapAtom);
  const [edgesMap] = useAtom(edgesMapAtom);
  const [, applyNodeChanges] = useAtom(nodesAtom);
  const [, applyEdgeChanges] = useAtom(edgesAtom);

  const [selectedIds] = useAtom(selectedIdsAtom);

  let selNodeOrEdge: Node | Edge | undefined = undefined;
  let selectedType: 'node' | 'edge' | undefined = undefined;
  if (nodesMap.has(selectedIds[0])) {
    selNodeOrEdge = nodesMap.get(selectedIds[0])!;
    selectedType = 'node';
  } else if (edgesMap.has(selectedIds[0])) {
    selNodeOrEdge = edgesMap.get(selectedIds[0])!;
    selectedType = 'edge';
  }

  const getValue = useCallback(
    (key?: string) => {
      if (!selNodeOrEdge) {
        return undefined;
      }
      selNodeOrEdge.data ??= {};
      if (key) {
        return selNodeOrEdge.data && key in selNodeOrEdge.data ? selNodeOrEdge.data[key] : undefined;
      } else {
        return selNodeOrEdge.data;
      }
    },
    [selNodeOrEdge],
  );

  const createSetValue = useCallback(
    (name?: string, debounceMs: number = 0) => {
      const setValue = (updateOrUpdater: any | ((prev: any) => any)) => {
        const prevValue = selNodeOrEdge;
        if (!prevValue) {
          return;
        }
        // Can only update data, other properties cannot be changed
        let newData: Record<string, any>;
        prevValue.data ??= {};
        if (typeof updateOrUpdater === 'function') {
          newData = name ? { ...prevValue.data, [name]: updateOrUpdater(prevValue.data) } : updateOrUpdater(prevValue.data);
        } else {
          newData = name ? { ...prevValue.data, [name]: updateOrUpdater } : updateOrUpdater;
        }

        const newValue = { ...prevValue, data: newData };
        // const newValue = typeof update === 'function' ? update(name ? prevValue.data[name] : prevValue.data) : { ...prevValue, data: name ? { ...prevValue.data, [name]: update } : { ...prevValue.data, ...update } };
        if (selectedType === 'node') {
          applyNodeChanges([{ type: 'replace', id: selectedIds[0], item: newValue as Node }]);
        } else if (selectedType === 'edge') {
          applyEdgeChanges([{ type: 'replace', id: selectedIds[0], item: newValue as Edge }]);
        }
      };

      if (debounceMs > 0) {
        return debounce(setValue, debounceMs);
      } else {
        return setValue;
      }
    },
    [selNodeOrEdge, selectedType, selectedIds, applyNodeChanges, applyEdgeChanges],
  );

  if (selectedIds.length !== 1 || !selNodeOrEdge || !selectedType) {
    // For now, only support editing one node or edge at a time
    // TODO: Provide ways to deselect all nodes or edges in the future
    // TODO: Support editing multiple nodes or edges at a time
    return null;
  }

  const Editor =
    selectedType === 'node' ? (
      selNodeOrEdge.type && selNodeOrEdge.type in customNodeEditors ? (
        customNodeEditors[selNodeOrEdge.type as FactoryNodeType]
      ) : (
        <p>Node type not supported</p>
      )
    ) : selectedType === 'edge' ? (
      <p>Edge editing not supported</p>
    ) : (
      <p>Unknown type</p>
    );

  return (
    <Panel position='bottom-right'>
      <FactoryEditorContextProvider
        key={selectedIds[0]}
        getValue={getValue}
        createSetValue={createSetValue}
        nodeOrEdge={selNodeOrEdge}
        selectedType={selectedType}
      >
        <div className='bg-base-300 rounded-box min-w-64 px-3 py-1'>
          <h2 className='inline text-lg font-semibold'>Properties</h2>
          <p className='float-right mt-2 text-xs text-gray-500'>
            {isReadOnly && <span className='text-error mr-2'>Read-only</span>}
            {selectedIds[0]}
          </p>
          <div className='divider m-0 mb-2 h-1' />
          <div className='flex flex-col gap-y-2'>{typeof Editor === 'function' ? <Editor /> : Editor}</div>
          {isReadOnly && (
            <div className='bg-base-300 rounded-box absolute left-0 top-0 z-40 h-full w-full min-w-64 bg-opacity-50 px-3 py-1' />
          )}
        </div>
      </FactoryEditorContextProvider>
    </Panel>
  );
}

type ToolbarPanelProps<Events extends string[], Actions extends string[]> = {
  // Event handlers
  [K in Events[number] as `on${Capitalize<K>}`]: () => void;
} & {
  // Enable/disable props for events
  [K in Events[number] as `${K}able`]?: boolean;
} & {
  // Enable/disable props for actions
  [K in Actions[number] as `${K}able`]?: boolean;
} & {
  // Any other props
  isReadOnly?: boolean;
};

type ButtonProps = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function ToolbarPanel(props: ToolbarPanelProps<['undo', 'redo', 'fullscreen'], ['cut', 'copy']>) {
  const reactFlowInstance = useReactFlow();

  return (
    <Panel position='top-center'>
      <div className='rounded-box bg-base-100 flex flex-row gap-x-2 px-2 shadow-2xl'>
        {(
          [
            [
              { icon: <Undo />, label: 'Undo', onClick: props.onUndo, disabled: !props.undoable },
              { icon: <Redo />, label: 'Redo', onClick: props.onRedo, disabled: !props.redoable },
            ],
            [
              { icon: <Scissors />, label: 'Cut', onClick: () => excuteCustomCutOrCopy(/* isCut: */ true), disabled: !props.cutable },
              { icon: <Copy />, label: 'Copy', onClick: () => excuteCustomCutOrCopy(/* isCut: */ false), disabled: !props.copyable },
              { icon: <Clipboard />, label: 'Paste', onClick: () => excuteCustomPaste(), disabled: props.isReadOnly },
            ],
            [
              { icon: <ZoomIn />, label: 'Zoom In', onClick: () => reactFlowInstance?.zoomIn({ duration: 100 }) },
              { icon: <ZoomOut />, label: 'Zoom Out', onClick: () => reactFlowInstance?.zoomOut({ duration: 100 }) },
              { icon: <ScanEye />, label: 'Fit View', onClick: () => reactFlowInstance?.fitView({ padding: 0.4, duration: 100 }) },
              { icon: <Fullscreen />, label: 'Fullscreen', onClick: props.onFullscreen },
            ],
            [
              {
                icon: <AlignStartVertical />,
                label: 'Align Left',
                onClick: () => alignSelectedNodes({ axis: 'y', to: 'start' }),
                disabled: props.isReadOnly,
              },
              {
                icon: <AlignCenterVertical />,
                label: 'Align Middle',
                onClick: () => alignSelectedNodes({ axis: 'y', to: 'center' }),
                disabled: props.isReadOnly,
              },
              {
                icon: <AlignEndVertical />,
                label: 'Align Right',
                onClick: () => alignSelectedNodes({ axis: 'y', to: 'end' }),
                disabled: props.isReadOnly,
              },
              {
                icon: <AlignStartHorizontal />,
                label: 'Align Top',
                onClick: () => alignSelectedNodes({ axis: 'x', to: 'start' }),
                disabled: props.isReadOnly,
              },
              {
                icon: <AlignCenterHorizontal />,
                label: 'Align Center',
                onClick: () => alignSelectedNodes({ axis: 'x', to: 'center' }),
                disabled: props.isReadOnly,
              },
              {
                icon: <AlignEndHorizontal />,
                label: 'Align Bottom',
                onClick: () => alignSelectedNodes({ axis: 'x', to: 'end' }),
                disabled: props.isReadOnly,
              },
            ],
          ] as ButtonProps[][]
        ).map((btnPropGroup, i, { length }) => (
          <Fragment key={i}>
            {btnPropGroup.map((btnProps, i) => (
              <button
                key={i}
                role='button'
                className='btn btn-ghost btn-sm btn-square tooltip tooltip-bottom'
                aria-label={btnProps.label}
                onClick={btnProps.onClick}
                disabled={btnProps.disabled}
              >
                {btnProps.icon}
              </button>
            ))}
            {i < length - 1 && <div className='divider divider-horizontal mx-0' />}
          </Fragment>
        ))}
      </div>
    </Panel>
  );
}

const StatusMessageTypeMap = {
  success: { textClassName: 'text-success', icon: <Check /> },
  info: { textClassName: 'text-info', icon: <Info /> },
  warning: { textClassName: 'text-warning', icon: <OctagonAlert /> },
  error: { textClassName: 'text-error', icon: <OctagonX /> },
} satisfies Record<'success' | 'info' | 'warning' | 'error', { textClassName: string; icon: JSX.Element }>;

function StatusMessagePanel() {
  const [statusMsgs] = useAtom(statusMessagesAtom);

  return (
    <Panel position='bottom-center'>
      <div className='flex w-full flex-col gap-y-2'>
        {Array.from(statusMsgs).map(([key, { message, type }]) => {
          const { textClassName, icon } = StatusMessageTypeMap[type];
          return (
            <div
              key={key}
              style={{ textShadow: '0 2px 4px oklch(var(--b1))' }}
              className={'flex flex-row flex-nowrap items-center justify-center gap-x-1 text-center ' + textClassName}
            >
              <p>{icon}</p>
              <p>{message}</p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function RenameDialog({ name, onRename, onCancel }: { name: string; onRename: (name: string) => void; onCancel: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Overlay */}
      <div className='bg-base-300 fixed left-0 top-0 z-40 h-full w-full bg-opacity-80' onClick={() => onCancel()} />
      {/* Dialog */}
      <div className='bg-base-300 rounded-box fixed left-1/2 top-1/2 z-50 w-96 -translate-x-1/2 -translate-y-1/2 transform bg-opacity-90 p-4'>
        <h2 className='text-lg font-semibold'>Rename Flow</h2>
        <input
          ref={inputRef}
          type='text'
          className='input input-sm mt-2 w-full'
          defaultValue={name}
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const newName = (inputRef.current as HTMLInputElement).value;
              if (newName) onRename(newName);
            }
          }}
        />
        <div className='mt-2 flex justify-end'>
          <button className='btn btn-sm btn-error' onClick={() => onCancel()}>
            Cancel
          </button>
          <button
            className='btn btn-sm btn-accent ml-2'
            onClick={() => {
              const newName = (inputRef.current as HTMLInputElement).value;
              if (newName) onRename(newName);
            }}
          >
            Rename
          </button>
        </div>
      </div>
    </>
  );
}

function ExportDialog({ nodes, edges, close }: { nodes: Node[]; edges: Edge[]; close: () => void }) {
  const rfInstance = useReactFlow();
  const viewport = rfInstance?.getViewport();
  const [selFlowData] = useAtom(selectedFlowDataAtom);
  const [prettify, setPrettify] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const stringifiedFlowData = useMemo(
    () =>
      selFlowData &&
      stringifyFlowData(
        {
          info: selFlowData,
          nodes: nodes as MainNodeProp[],
          edges: edges as MainEdgeProp[],
          properties: {
            viewportX: viewport?.x,
            viewportY: viewport?.y,
            viewportZoom: viewport?.zoom,
          },
        },
        { spaced: prettify },
      ),
    [nodes, edges, selFlowData, viewport],
  );

  if (!stringifiedFlowData) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div className='bg-base-300 fixed left-0 top-0 z-40 h-full w-full bg-opacity-80' onClick={() => close()} />
      {/* Dialog */}
      <div className='bg-base-300 rounded-box fixed left-1/2 top-1/2 z-50 w-[40rem] -translate-x-1/2 -translate-y-1/2 transform bg-opacity-90 p-4'>
        <h2 className='text-lg font-semibold'>Export Flow</h2>

        <div className='form-control'>
          <label className='label cursor-pointer'>
            <span className='label-text'>Prettify JSON</span>
            <input
              type='checkbox'
              className='toggle checked:toggle-accent'
              checked={prettify}
              onChange={e => setPrettify(e.target.checked)}
            />
          </label>
        </div>
        <textarea readOnly className='textarea mt-2 h-80 w-full' value={stringifiedFlowData} onFocus={e => e.currentTarget.select()} />
        {statusText && (
          <div role='alert' className='alert'>
            <span ref={() => setTimeout(() => setStatusText(''), 5000)} className='text-accent text-sm'>
              {statusText}
            </span>
          </div>
        )}
        <div className='mt-2 flex justify-end gap-x-4'>
          <button
            className='btn btn-sm btn-accent'
            onClick={() => navigator.clipboard.writeText(stringifiedFlowData).then(() => setStatusText('Copied!'))}
          >
            Copy
          </button>
          <button
            className='btn btn-sm btn-accent'
            onClick={() => {
              const blob = new Blob([stringifiedFlowData], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${selFlowData?.name}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Save
          </button>
          <button className='btn btn-sm btn-error' onClick={() => close()}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

export default FlowPage;
