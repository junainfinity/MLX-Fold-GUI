import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dna, 
  TestTubeDiagonal, 
  Atom, 
  Hexagon, 
  Play, 
  Download, 
  Settings, 
  Cpu, 
  CheckCircle2, 
  Trash2, 
  Info,
  AlertTriangle,
  Wifi,
  WifiOff,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronUp,
  Terminal
} from 'lucide-react';
import {
  checkStatus,
  setupModel,
  runPrediction,
  getJobStatus,
  getResultDownloadUrl,
  healthCheck,
  connectLogStream,
  type StatusResponse,
  type JobInfo,
} from './api';

// Types
type EntityType = 'Protein' | 'DNA' | 'RNA' | 'Ligand' | 'Ion';

interface Entity {
  id: string;
  type: EntityType;
  name: string;
  sequence: string;
  count: number;
}

// ─── Responsive Hook ─────────────────────────────────
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => 
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

const SAMPLE_PROTEIN = 'MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK';
const SAMPLE_DNA = 'ATGCGTACGTAGCTAG';
const SAMPLE_RNA = 'AUGCGUACGUAGCUAG';
const SAMPLE_LIGAND = 'NC1=NC=NC2=C1N=CN2[C@@H]3O[C@H](COP(=O)(O)OP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]3O';
const SAMPLE_ION = 'MG';

const INITIAL_ENTITIES: Entity[] = [
  { id: '1', type: 'Protein', name: 'aqGFP (Sample)', sequence: SAMPLE_PROTEIN, count: 1 },
  { id: '2', type: 'DNA', name: 'DNA Strand (Sample)', sequence: SAMPLE_DNA, count: 1 },
  { id: '3', type: 'RNA', name: 'RNA Strand (Sample)', sequence: SAMPLE_RNA, count: 1 },
  { id: '4', type: 'Ligand', name: 'ATP (Sample)', sequence: SAMPLE_LIGAND, count: 1 },
  { id: '5', type: 'Ion', name: 'Magnesium (Sample)', sequence: SAMPLE_ION, count: 1 },
];

function EntityIcon({ type, size = 14 }: { type: EntityType; size?: number }) {
  const cls = "text-emerald-400 shrink-0";
  switch (type) {
    case 'Protein': return <TestTubeDiagonal size={size} className={cls} />;
    case 'DNA': case 'RNA': return <Dna size={size} className={cls} />;
    case 'Ligand': return <Hexagon size={size} className={cls} />;
    case 'Ion': return <Atom size={size} className={cls} />;
  }
}

export default function App() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(true);
  const [logsExpanded, setLogsExpanded] = useState(true);

  const [backendConnected, setBackendConnected] = useState(false);
  const [systemStatus, setSystemStatus] = useState<StatusResponse | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>(INITIAL_ENTITIES);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(INITIAL_ENTITIES[0].id);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultReady, setResultReady] = useState(false);
  const [currentJob, setCurrentJob] = useState<JobInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number | null>(null);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  }, []);

  useEffect(() => { if (isDesktop) setSidebarOpen(false); }, [isDesktop]);

  // ─── On Mount ───────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      addLog('Checking backend connection...');
      const healthy = await healthCheck();
      setBackendConnected(healthy);
      if (healthy) {
        addLog('Backend connected. Fetching system status...');
        try {
          const status = await checkStatus();
          setSystemStatus(status);
          setModelReady(status.openfold.ready);
          addLog(`System: ${status.system.processor} · ${status.system.memory_gb}GB RAM`);
          if (status.compatibility.compatible) addLog('System compatibility: ✓ All checks passed');
          else status.compatibility.issues.forEach(i => addLog(`⚠ ${i}`));
          if (status.openfold.ready) addLog('OpenFold3-MLX: Loaded and ready');
          else if (status.openfold.repo_cloned) addLog('OpenFold3-MLX: Installed but weights not found');
          else addLog('OpenFold3-MLX: Not installed');
        } catch (err) { addLog(`Error fetching status: ${err}`); }
      } else {
        addLog('Backend not available. Start: python3 -m uvicorn server.main:app --port 8000');
      }
    };
    init();
    try {
      const ws = connectLogStream((msg) => addLog(msg));
      return () => ws.close();
    } catch { /* WS failed */ }
  }, []);

  // Auto-scroll logs — use scrollTop on the container directly.
  // IMPORTANT: Do NOT use scrollIntoView here — it scrolls ALL ancestors
  // including the fixed root, causing the entire page to shift upward.
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // ─── Model Setup ───────────────────────────────────
  const handleLoadModel = async () => {
    if (!backendConnected) { addLog('Cannot setup: backend not connected'); return; }
    setLoadingModel(true);
    setSetupError(null);
    addLog('Starting OpenFold3-MLX setup...');
    try {
      const result = await setupModel();
      result.logs.forEach(l => addLog(l));
      if (result.success) { setModelReady(true); addLog('Model setup complete!'); }
      else { setSetupError(result.error || 'Unknown error'); addLog(`Setup failed: ${result.error}`); }
    } catch (err: any) { setSetupError(err.message); addLog(`Setup error: ${err.message}`); }
    finally { setLoadingModel(false); }
  };

  // ─── Entity Handlers ──────────────────────────────
  const handleAddEntity = (type: EntityType) => {
    const newEntity: Entity = { id: Math.random().toString(36).substring(7), type, name: `New ${type}`, sequence: '', count: 1 };
    setEntities([...entities, newEntity]);
    setSelectedEntityId(newEntity.id);
    if (isMobile) { setSidebarOpen(false); setEditorOpen(true); }
  };
  const handleLoadSample = () => { setEntities(INITIAL_ENTITIES); setSelectedEntityId(INITIAL_ENTITIES[0].id); };
  const updateEntity = (id: string, updates: Partial<Entity>) => { setEntities(entities.map(e => e.id === id ? { ...e, ...updates } : e)); };
  const removeEntity = (id: string) => { setEntities(entities.filter(e => e.id !== id)); if (selectedEntityId === id) setSelectedEntityId(null); };
  const selectEntity = (id: string) => { setSelectedEntityId(id); if (isMobile) { setSidebarOpen(false); setEditorOpen(true); } };

  // ─── Prediction ────────────────────────────────────
  const handleRunPrediction = async () => {
    if (!modelReady || entities.length === 0) return;
    setRunning(true); setProgress(0); setResultReady(false); setCurrentJob(null);
    if (isMobile) { setEditorOpen(false); setLogsExpanded(true); }
    addLog('Submitting prediction job...');
    try {
      const result = await runPrediction(entities);
      result.logs.forEach(l => addLog(l));
      if (result.success && result.job_id) {
        addLog(`Job started: ${result.job_id.slice(0, 8)}...`);
        pollRef.current = window.setInterval(async () => {
          try {
            const jobStatus = await getJobStatus(result.job_id!);
            setProgress(jobStatus.progress);
            if (jobStatus.status === 'complete') {
              clearInterval(pollRef.current!); pollRef.current = null;
              setRunning(false); setResultReady(true); setCurrentJob(jobStatus);
              addLog(`Prediction complete! ${jobStatus.results?.length || 0} output file(s).`);
              jobStatus.results?.forEach(r => addLog(`  → ${r.filename} (${(r.size_bytes / 1024).toFixed(1)}KB)`));
            } else if (jobStatus.status === 'error') {
              clearInterval(pollRef.current!); pollRef.current = null;
              setRunning(false); addLog(`Prediction failed: ${jobStatus.error}`);
            }
          } catch { /* poll retry */ }
        }, 2000);
      } else { setRunning(false); addLog(`Submission failed: ${result.error}`); }
    } catch (err: any) { setRunning(false); addLog(`Prediction error: ${err.message}`); }
  };

  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  // ═══════════════════════════════════════════════════
  // SHARED SUB-COMPONENTS
  // ═══════════════════════════════════════════════════

  // ─── App header bar (used in sidebar on desktop, top bar on mobile) ───
  const appHeader = (
    <div className="h-14 px-3 lg:px-4 border-b border-white/10 flex items-center gap-3 bg-white/5 shrink-0">
      <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
        <Hexagon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="font-semibold text-sm tracking-wide leading-tight truncate">MLX Fold Studio</h1>
        <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium mt-0.5">Apple Silicon Native</p>
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-medium shrink-0 ${backendConnected ? 'text-emerald-400' : 'text-red-400'}`}>
        {backendConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
        <span className="hidden lg:inline">{backendConnected ? 'API' : 'Offline'}</span>
      </div>
    </div>
  );

  // ─── Model status + entities + run button ───
  const sidebarBody = (
    <>
      {/* Model Status */}
      <div className="p-3 sm:p-4 border-b border-white/10 bg-black/20 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Model Status</span>
          {modelReady ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium"><CheckCircle2 size={12} /> Ready</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-amber-400 font-medium"><Cpu size={12} /> Not Loaded</span>
          )}
        </div>
        {systemStatus && (
          <div className="text-[10px] text-white/40 mb-2 space-y-0.5">
            <p>{systemStatus.system.processor} · {systemStatus.system.memory_gb}GB</p>
            <p>Python {systemStatus.system.python_version} · macOS {systemStatus.system.platform_version}</p>
          </div>
        )}
        {!modelReady && (
          <button onClick={handleLoadModel} disabled={loadingModel || !backendConnected}
            className="w-full py-2 px-3 bg-white/10 border border-white/20 rounded-md text-xs sm:text-sm font-medium text-white hover:bg-white/20 hover:border-white/30 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
            {loadingModel ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={14} />}
            {loadingModel ? 'Setting up...' : 'Install & Load OpenFold3-MLX'}
          </button>
        )}
        {setupError && (
          <div className="mt-2 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 flex items-start gap-1">
            <AlertTriangle size={10} className="mt-0.5 shrink-0" /><span className="break-all">{setupError}</span>
          </div>
        )}
      </div>

      {/* Entities */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Entities</span>
          <button onClick={handleLoadSample} className="text-[10px] px-2 py-1 bg-white/10 text-white rounded hover:bg-white/20 font-medium transition-colors border border-white/10">Reset</button>
        </div>
        <div className="space-y-2 mb-4">
          <AnimatePresence>
            {entities.map(entity => (
              <motion.div key={entity.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => selectEntity(entity.id)}
                className={`p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all group backdrop-blur-md ${
                  selectedEntityId === entity.id ? 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <EntityIcon type={entity.type} />
                    <span className="text-sm font-medium truncate text-white/90">{entity.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-white/60 bg-black/30 px-1.5 py-0.5 rounded border border-white/5">x{entity.count}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeEntity(entity.id); }} className="text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {entities.length === 0 && (
            <div className="text-center py-6 border-2 border-dashed border-white/10 rounded-lg bg-black/10">
              <p className="text-xs text-white/50">No entities added yet.</p>
              <p className="text-[10px] text-white/40 mt-1">Add a protein, DNA, or ligand to begin.</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {(['Protein', 'DNA', 'RNA', 'Ligand'] as EntityType[]).map(type => (
            <button key={type} onClick={() => handleAddEntity(type)}
              className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white/5 border border-white/10 rounded-md text-xs font-medium text-white/80 hover:bg-white/10 hover:border-white/20 transition-colors">
              <EntityIcon type={type} size={12} /> {type}
            </button>
          ))}
          <button onClick={() => handleAddEntity('Ion')}
            className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-2 bg-white/5 border border-white/10 rounded-md text-xs font-medium text-white/80 hover:bg-white/10 hover:border-white/20 transition-colors">
            <EntityIcon type="Ion" size={12} /> Ion
          </button>
        </div>
      </div>

      {/* Run Button */}
      <div className="p-3 sm:p-4 border-t border-white/10 bg-white/5 backdrop-blur-xl shrink-0">
        <button onClick={handleRunPrediction} disabled={!modelReady || entities.length === 0 || running}
          className={`w-full py-2.5 sm:py-3 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${
            !modelReady || entities.length === 0 ? 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
            : running ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-emerald-500/25'
          }`}>
          {running ? (<><div className="w-4 h-4 border-2 border-emerald-200/30 border-t-white rounded-full animate-spin" />Predicting... {progress}%</>) : (<><Play size={16} fill="currentColor" />Run Prediction</>)}
        </button>
        {(!modelReady || entities.length === 0) && !running && (
          <p className="text-[10px] text-center text-white/40 mt-2">{!backendConnected ? 'Start the backend server first' : !modelReady ? 'Install model first' : 'Add at least one entity'}</p>
        )}
      </div>
    </>
  );

  // ─── Editor content ───
  const editorContent = selectedEntity ? (
    <>
      <div className="h-14 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2"><Settings size={14} className="text-white/50" />Edit {selectedEntity.type}</h2>
        {!isDesktop && <button onClick={() => setEditorOpen(false)} className="text-white/50 hover:text-white p-1"><X size={16} /></button>}
      </div>
      <div className="p-3 sm:p-4 flex-1 overflow-y-auto space-y-4 min-h-0">
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">Name</label>
          <input type="text" value={selectedEntity.name} onChange={(e) => updateEntity(selectedEntity.id, { name: e.target.value })}
            className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder-white/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">Copies</label>
          <input type="number" min="1" value={selectedEntity.count} onChange={(e) => updateEntity(selectedEntity.id, { count: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder-white/30" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-white/70">{selectedEntity.type === 'Ligand' ? 'SMILES String' : 'Sequence'}</label>
            <span className="text-[10px] text-white/40 bg-black/30 px-1.5 py-0.5 rounded border border-white/5">{selectedEntity.sequence.length} chars</span>
          </div>
          <textarea value={selectedEntity.sequence} onChange={(e) => updateEntity(selectedEntity.id, { sequence: e.target.value.toUpperCase() })}
            placeholder={selectedEntity.type === 'Ligand' ? 'e.g. CC(=O)OC1=CC=CC=C1C(=O)O' : 'e.g. MSKGEELFT...'}
            className="w-full h-36 sm:h-48 lg:h-64 px-3 py-2 bg-black/20 border border-white/10 rounded-md text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all resize-none placeholder-white/20" />
        </div>
        <div className="bg-emerald-500/10 text-emerald-100 border border-emerald-500/20 p-2.5 sm:p-3 rounded-md flex items-start gap-2 backdrop-blur-sm">
          <Info size={14} className="mt-0.5 shrink-0 text-emerald-400" />
          <p className="text-xs leading-relaxed">
            {selectedEntity.type === 'Protein' && 'Enter standard amino acid single-letter codes.'}
            {selectedEntity.type === 'DNA' && 'Enter DNA sequence using A, C, G, T.'}
            {selectedEntity.type === 'RNA' && 'Enter RNA sequence using A, C, G, U.'}
            {selectedEntity.type === 'Ligand' && 'Enter a valid SMILES string or CCD code.'}
            {selectedEntity.type === 'Ion' && 'Enter the ion identifier (e.g., NA, MG, ZN).'}
          </p>
        </div>
      </div>
    </>
  ) : (
    <>
      <div className="h-14 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
        <h2 className="text-sm font-semibold text-white/50 flex items-center gap-2"><Settings size={14} className="text-white/30" />Editor</h2>
        {!isDesktop && <button onClick={() => setEditorOpen(false)} className="text-white/50 hover:text-white p-1"><X size={16} /></button>}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full shadow-inner flex items-center justify-center text-white/30 mb-3"><Settings size={20} /></div>
        <p className="text-sm font-medium text-white/60">No entity selected</p>
        <p className="text-xs text-white/40 mt-1">Select an entity from the sidebar to edit.</p>
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 flex flex-col md:flex-row bg-black text-white font-sans overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 mix-blend-screen filter blur-[100px] animate-blob pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-green-700/20 mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000 pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] rounded-full bg-teal-600/10 mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 mix-blend-overlay pointer-events-none" />

      {/* ═══ MOBILE TOP BAR ═══ */}
      <div className="md:hidden relative z-50 h-14 px-3 border-b border-white/10 flex items-center justify-between bg-black/80 backdrop-blur-2xl shrink-0">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -ml-1 text-white/70 hover:text-white">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20"><Hexagon size={14} /></div>
          <h1 className="font-semibold text-sm tracking-wide">MLX Fold Studio</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-[10px] font-medium ${backendConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            {backendConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
          </div>
          {selectedEntity && <button onClick={() => setEditorOpen(!editorOpen)} className="p-2 text-white/70 hover:text-white"><Settings size={18} /></button>}
        </div>
      </div>

      {/* ═══ MOBILE SIDEBAR DRAWER ═══ */}
      {isMobile && sidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />}
      {isMobile && (
        <div className={`fixed top-14 left-0 bottom-0 w-[min(85vw,320px)] bg-black/95 backdrop-blur-2xl border-r border-white/10 flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarBody}
        </div>
      )}

      {/* ═══ MOBILE EDITOR DRAWER ═══ */}
      {isMobile && editorOpen && selectedEntity && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setEditorOpen(false)} />
          <div className="fixed top-14 right-0 bottom-0 w-[min(90vw,360px)] bg-black/95 backdrop-blur-2xl border-l border-white/10 flex flex-col z-50">
            {editorContent}
          </div>
        </>
      )}

      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <div className="hidden md:flex relative w-64 lg:w-72 xl:w-80 bg-white/10 backdrop-blur-2xl border-r border-white/10 flex-col shadow-2xl z-30 shrink-0">
        {appHeader}
        {sidebarBody}
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex flex-col md:flex-row min-w-0 min-h-0 z-10 overflow-hidden">

        {/* Editor pane — tablet: toggleable, desktop: always visible */}
        {isTablet && editorOpen && (
          <div className="relative w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 flex flex-col shadow-2xl z-20 shrink-0 overflow-hidden">
            {editorContent}
          </div>
        )}
        {isDesktop && (
          <div className="relative w-72 xl:w-80 bg-white/5 backdrop-blur-xl border-r border-white/10 flex flex-col shadow-2xl z-20 shrink-0 overflow-hidden">
            {editorContent}
          </div>
        )}

        {/* ═══ VIEWER + LOGS ═══ */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 z-10 overflow-hidden">
          {/* Viewer top bar */}
          <div className="h-14 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between bg-black/20 backdrop-blur-xl z-20 shrink-0 gap-2">
            <div className="min-w-0">
              <h3 className="text-white text-sm font-semibold flex items-center gap-2 truncate">
                <Hexagon size={14} className="text-emerald-400 shrink-0" /><span className="truncate">Structure Viewer</span>
              </h3>
              <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium mt-0.5 truncate">
                {resultReady ? 'Prediction complete' : 'Awaiting prediction...'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isTablet && (
                <button onClick={() => setEditorOpen(!editorOpen)} className="p-1.5 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-md border border-white/10 transition-colors" title={editorOpen ? 'Hide editor' : 'Show editor'}>
                  {editorOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
                </button>
              )}
              {resultReady && currentJob?.results && (
                <div className="flex gap-1.5">
                  {currentJob.results.map(result => (
                    <a key={result.filename} href={getResultDownloadUrl(currentJob.id, result.filename)} download={result.filename}
                      className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors flex items-center gap-1 shadow-lg">
                      <Download size={10} /> {result.filename.endsWith('.pdb') ? 'PDB' : 'mmCIF'}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Viewer canvas — takes all remaining space */}
          <div className="flex-1 flex items-center justify-center relative min-h-0">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            {resultReady ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10">
                <div className="w-40 h-40 sm:w-56 sm:h-56 lg:w-64 lg:h-64 relative animate-[spin_20s_linear_infinite]">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    <path d="M20,50 Q40,10 60,50 T100,50" fill="none" stroke="url(#grad1)" strokeWidth="4" strokeLinecap="round" />
                    <path d="M10,40 Q30,80 70,40 T90,60" fill="none" stroke="url(#grad2)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
                    <path d="M30,30 Q50,90 80,30 T100,70" fill="none" stroke="url(#grad3)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                    <defs>
                      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#059669" /><stop offset="100%" stopColor="#34d399" /></linearGradient>
                      <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#047857" /><stop offset="100%" stopColor="#6ee7b7" /></linearGradient>
                      <linearGradient id="grad3" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#064e3b" /><stop offset="100%" stopColor="#10b981" /></linearGradient>
                    </defs>
                  </svg>
                </div>
                {currentJob?.results && currentJob.results.length > 0 && (
                  <p className="text-center text-emerald-400 text-xs mt-3 font-medium">{currentJob.results.length} output file(s) ready</p>
                )}
              </motion.div>
            ) : running ? (
              <div className="flex flex-col items-center z-10">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white/10 border-t-emerald-400 rounded-full animate-spin mb-3 sm:mb-4 shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                <p className="text-white/80 text-xs sm:text-sm font-medium font-mono">Running MLX Kernels...</p>
                <p className="text-white/50 text-xs mt-1 font-mono">Progress: {progress}%</p>
              </div>
            ) : (
              <div className="text-center z-10 px-4">
                <Hexagon size={isMobile ? 36 : 48} className="text-white/10 mx-auto mb-3 sm:mb-4 drop-shadow-lg" />
                <p className="text-white/40 text-xs sm:text-sm">3D Structure Viewer</p>
                <p className="text-white/25 text-[10px] sm:text-xs mt-1">Run a prediction to see results</p>
              </div>
            )}
          </div>

          {/* Logs panel — pinned to bottom */}
          <div className={`bg-black/60 backdrop-blur-xl border-t border-white/10 font-mono text-xs flex flex-col z-20 shrink-0 transition-all ${logsExpanded ? 'h-36 sm:h-40 lg:h-48' : 'h-10'}`}>
            <button onClick={() => setLogsExpanded(!logsExpanded)}
              className="flex items-center justify-between px-3 sm:px-4 h-10 text-white/50 hover:text-white/70 transition-colors shrink-0 border-b border-white/5">
              <span className="flex items-center gap-1.5">
                <Terminal size={12} />System Logs
                {logs.length > 0 && <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full">{logs.length}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-1 text-[10px]"><Cpu size={10} />{systemStatus ? systemStatus.system.processor : 'Apple M-Series'}</span>
                {logsExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              </span>
            </button>
            {logsExpanded && (
              <div ref={logsContainerRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 space-y-1 min-h-0">
                {logs.map((log, i) => (
                  <p key={i} className={`break-all ${log.includes('[ERROR]') ? 'text-red-400' : log.includes('[WARN]') ? 'text-amber-400' : log.includes('✓') || log.includes('complete') || log.includes('Ready') ? 'text-emerald-400' : 'text-white/70'}`}>{log}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
