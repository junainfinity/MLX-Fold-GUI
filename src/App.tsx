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
  Terminal,
  Pause,
  CircleStop,
  RotateCw,
  MessageSquare,
  Send,
  Upload,
  FlaskConical,
  User,
  Pill,
  Sparkles,
  FileUp,
  Loader2,
  Plus
} from 'lucide-react';
import {
  checkStatus,
  setupModel,
  runPrediction,
  getJobStatus,
  getResultDownloadUrl,
  healthCheck,
  connectLogStream,
  pauseJob,
  resumeJob,
  stopJob,
  sendChatPrompt,
  fetchSamplePersons,
  fetchSampleMedicines,
  type StatusResponse,
  type JobInfo,
  type SamplePerson,
  type Medicine,
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
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultReady, setResultReady] = useState(false);
  const [currentJob, setCurrentJob] = useState<JobInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<any>(null);

  // NLI State
  const [nlPrompt, setNlPrompt] = useState('');
  const [nlProcessing, setNlProcessing] = useState(false);
  const [nlSummary, setNlSummary] = useState<string | null>(null);
  
  // Bifurcation State
  const [appWorkflow, setAppWorkflow] = useState<'viewer' | 'simulator'>('simulator');

  // ─── Tooltip Helper ───
  const Tooltip = ({ text, children, className = "inline-block" }: { text: string, children: React.ReactNode, className?: string }) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className={`relative ${className}`} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
        {children}
        <AnimatePresence>
          {visible && (
            <motion.div 
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-[10px] text-white/80 backdrop-blur-xl shadow-2xl pointer-events-none"
            >
              <div className="relative z-10">{text}</div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-black/90 border-r border-b border-white/10 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };
  
  const [samplePersons, setSamplePersons] = useState<SamplePerson[]>([]);
  const [sampleMedicines, setSampleMedicines] = useState<Medicine[]>([]);
  const [sampleTab, setSampleTab] = useState<'persons' | 'medicines'>('persons');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redesign: Hub State
  const [hubOpen, setHubOpen] = useState(false);
  const [hubTab, setHubTab] = useState<'persons' | 'medicines' | 'targets' | 'upload'>('persons');
  const [selectedHubItems, setSelectedHubItems] = useState<any[]>([]);

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

  // ─── Load sample data ──────────────────────────────
  useEffect(() => {
    const loadSamples = async () => {
      try {
        const [persons, medicines] = await Promise.all([
          fetchSamplePersons(),
          fetchSampleMedicines(),
        ]);
        setSamplePersons(persons);
        setSampleMedicines(medicines);
      } catch { /* Samples load failed — non-critical */ }
    };
    if (backendConnected) loadSamples();
  }, [backendConnected]);

  // Auto-scroll logs
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

  // ─── NLI Handlers ──────────────────────────────────
  const handleNlSubmit = async () => {
    if (!nlPrompt.trim() || nlProcessing) return;
    setNlProcessing(true);
    setNlSummary(null);
    addLog(`[NLI] Processing: "${nlPrompt}"`);
    try {
      const response = await sendChatPrompt(nlPrompt);
      if (response.success && response.data.entities) {
        const newEntities: Entity[] = response.data.entities.map((e, i) => ({
          id: Math.random().toString(36).substring(7),
          type: (e.type.charAt(0).toUpperCase() + e.type.slice(1).toLowerCase()) as EntityType,
          name: e.name,
          sequence: e.sequence || '',
          count: e.count || 1,
        }));
        setEntities(prev => [...prev, ...newEntities]);
        setNlSummary(response.data.summary);
        addLog(`[NLI] ✓ Added ${newEntities.length} entities: ${response.data.summary}`);
        if (newEntities.length > 0) setSelectedEntityId(newEntities[0].id);
      }
      setNlPrompt('');
    } catch (err: any) {
      addLog(`[NLI] Error: ${err.message}`);
    } finally {
      setNlProcessing(false);
    }
  };

  const handleAddSamplePerson = (person: SamplePerson) => {
    const newEntities: Entity[] = person.targets.map(t => ({
      id: Math.random().toString(36).substring(7),
      type: t.type as EntityType,
      name: `${person.name} — ${t.name}`,
      sequence: t.sequence,
      count: 1,
    }));
    setEntities(prev => [...prev, ...newEntities]);
    if (newEntities.length > 0) setSelectedEntityId(newEntities[0].id);
    addLog(`[SAMPLE] Added ${person.name}'s ${newEntities.length} targets`);
  };

  const handleAddMedicine = (med: Medicine) => {
    const newEntity: Entity = {
      id: Math.random().toString(36).substring(7),
      type: 'Ligand',
      name: med.name,
      sequence: med.smiles,
      count: 1,
    };
    setEntities(prev => [...prev, newEntity]);
    setSelectedEntityId(newEntity.id);
    addLog(`[SAMPLE] Added medicine: ${med.name}`);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (file.name.endsWith('.fasta') || file.name.endsWith('.fa') || file.name.endsWith('.fna')) {
        // Parse FASTA
        const lines = content.split('\n');
        let name = file.name;
        let sequence = '';
        let entityType: EntityType = 'Protein';
        for (const line of lines) {
          if (line.startsWith('>')) {
            name = line.substring(1).trim().split(' ')[0] || file.name;
          } else {
            sequence += line.trim();
          }
        }
        // Detect type from sequence
        const upper = sequence.toUpperCase();
        if (upper.match(/^[ACGT]+$/)) entityType = 'DNA';
        else if (upper.match(/^[ACGU]+$/)) entityType = 'RNA';
        else entityType = 'Protein';
        const newEntity: Entity = { id: Math.random().toString(36).substring(7), type: entityType, name, sequence: upper, count: 1 };
        setEntities(prev => [...prev, newEntity]);
        setSelectedEntityId(newEntity.id);
        addLog(`[UPLOAD] Parsed ${entityType} from ${file.name} (${upper.length} residues)`);
      } else if (file.name.endsWith('.sdf') || file.name.endsWith('.mol')) {
        // Treat SDF as ligand — extract first molecule name
        const name = content.split('\n')[0]?.trim() || file.name;
        addLog(`[UPLOAD] SDF file loaded: ${name}. Enter SMILES manually for now.`);
        const newEntity: Entity = { id: Math.random().toString(36).substring(7), type: 'Ligand', name, sequence: '', count: 1 };
        setEntities(prev => [...prev, newEntity]);
        setSelectedEntityId(newEntity.id);
      } else {
        // Treat as raw sequence
        const newEntity: Entity = { id: Math.random().toString(36).substring(7), type: 'Protein', name: file.name, sequence: content.trim().toUpperCase(), count: 1 };
        setEntities(prev => [...prev, newEntity]);
        setSelectedEntityId(newEntity.id);
        addLog(`[UPLOAD] Loaded raw sequence from ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  // ─── Hub Handlers ──────────────────────────────────
  const toggleHubSelection = (item: any, type: 'person' | 'medicine' | 'target') => {
    const itemId = item.id || (item.name + item.sequence);
    setSelectedHubItems(prev => {
      const exists = prev.find(i => (i.id || (i.name + i.sequence)) === itemId);
      if (exists) return prev.filter(i => (i.id || (i.name + i.sequence)) !== itemId);
      return [...prev, { ...item, _hubType: type }];
    });
  };

  const handleImportFromHub = () => {
    const newEntities: Entity[] = [];
    selectedHubItems.forEach(item => {
      if (item._hubType === 'person') {
        const person = item as SamplePerson;
        person.targets.forEach(t => {
          newEntities.push({
            id: Math.random().toString(36).substring(7),
            type: t.type as EntityType,
            name: `${person.name} — ${t.name}`,
            sequence: t.sequence,
            count: 1,
          });
        });
      } else if (item._hubType === 'medicine') {
        const med = item as Medicine;
        newEntities.push({
          id: Math.random().toString(36).substring(7),
          type: 'Ligand',
          name: med.name,
          sequence: med.smiles,
          count: 1,
        });
      } else if (item._hubType === 'target') {
        newEntities.push({
          id: Math.random().toString(36).substring(7),
          type: item.type as EntityType,
          name: item.name,
          sequence: item.sequence,
          count: 1,
        });
      }
    });
    
    if (appWorkflow === 'viewer') {
      // In viewer mode, we replace the workspace with the first logical target
      if (newEntities.length > 0) {
        setEntities([newEntities[0]]);
        setSelectedEntityId(newEntities[0].id);
        addLog(`[VIEWER] Loaded structure: ${newEntities[0].name}`);
      }
    } else {
      // In simulator mode, we append tokens
      setEntities(prev => [...prev, ...newEntities]);
      addLog(`[HUB] Imported ${newEntities.length} entities into simulator`);
    }
    
    setSelectedHubItems([]);
    setHubOpen(false);
  };

  // ─── Prediction ────────────────────────────────────
  const handleRunPrediction = async () => {
    if (!modelReady || entities.length === 0) return;
    setRunning(true); setPaused(false); setProgress(0); setResultReady(false); setCurrentJob(null);
    if (isMobile) { setEditorOpen(false); setLogsExpanded(true); }
    addLog('Submitting prediction job...');
    try {
      const result = await runPrediction(entities);
      result.logs.forEach(l => addLog(l));
      if (result.success && result.job_id) {
        addLog(`Job started: ${result.job_id.slice(0, 8)}...`);
        // Set initial job state so Pause/Stop buttons can find the ID
        setCurrentJob({
          id: result.job_id,
          status: 'running',
          progress: 0,
          created_at: new Date().toISOString(),
          error: null,
          results: null
        });
        
        pollRef.current = window.setInterval(async () => {
          try {
            const jobStatus = await getJobStatus(result.job_id!);
            setProgress(jobStatus.progress);
            if (jobStatus.status === 'complete') {
              clearInterval(pollRef.current!); pollRef.current = null;
              setRunning(false); setPaused(false); setResultReady(true); setCurrentJob(jobStatus);
              addLog(`Prediction complete! ${jobStatus.results?.length || 0} output file(s).`);
              jobStatus.results?.forEach(r => addLog(`  → ${r.filename} (${(r.size_bytes / 1024).toFixed(1)}KB)`));
            } else if (jobStatus.status === 'error' || jobStatus.status === 'stopped') {
              clearInterval(pollRef.current!); pollRef.current = null;
              setRunning(false); setPaused(false); addLog(`Prediction ${jobStatus.status}: ${jobStatus.error || 'Stopped by user'}`);
            } else if (jobStatus.status === 'paused') {
              setPaused(true);
            } else {
              setPaused(false);
            }
          } catch { /* poll retry */ }
        }, 2000);
      } else { setRunning(false); addLog(`Submission failed: ${result.error}`); }
    } catch (err: any) { setRunning(false); addLog(`Prediction error: ${err.message}`); }
  };

  const handlePause = async () => {
    if (!currentJob?.id && !running) return;
    try {
      // Find the last job ID if multiple starts happened
      const jobId = currentJob?.id || logs.find(l => l.includes('Job started:'))?.split(': ')[1]?.split('...')[0];
      // Note: Backend stores job_id mapping. If we don't have currentJob, we need to store it better.
      // Let's assume setCurrentJob is updated on start or we keep the ID.
      // Actually runPrediction returns job_id. Let's fix handleRunPrediction to set currentJob immediately.
    } catch (err) {}
  };

  // Fixed handleRunPrediction to set currentJob immediately for control
  const handlePauseJob = async () => {
    if (!currentJob?.id) return;
    try {
      await pauseJob(currentJob.id);
      setPaused(true);
      addLog('Prediction paused.');
    } catch (err: any) { addLog(`Pause failed: ${err.message}`); }
  };

  const handleResumeJob = async () => {
    if (!currentJob?.id) return;
    try {
      await resumeJob(currentJob.id);
      setPaused(false);
      addLog('Prediction resumed.');
    } catch (err: any) { addLog(`Resume failed: ${err.message}`); }
  };

  const handleStopJob = async () => {
    if (!currentJob?.id) return;
    try {
      await stopJob(currentJob.id);
      setRunning(false);
      setPaused(false);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      addLog('Prediction stopped.');
    } catch (err: any) { addLog(`Stop failed: ${err.message}`); }
  };

  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  // ─── 3D Viewer Logic ────────────────────────────────
  useEffect(() => {
    if (resultReady && currentJob?.results && viewerRef.current) {
      const cifFile = currentJob.results.find(r => r.filename.endsWith('.cif'));
      if (cifFile) {
        // Initialize 3Dmol.js viewer
        const viewerElement = viewerRef.current;
        if (!glRef.current && (window as any).$3Dmol) {
          glRef.current = (window as any).$3Dmol.createViewer(viewerElement, {
            backgroundColor: 'transparent'
          });
        }

        if (glRef.current) {
          glRef.current.clear();
          const url = getResultDownloadUrl(currentJob.id, cifFile.filename);
          
          fetch(url).then(res => res.text()).then(data => {
            glRef.current.addModel(data, "cif");
            glRef.current.setStyle({}, { cartoon: { color: 'spectrum' } });
            glRef.current.zoomTo();
            glRef.current.render();
            // Enable mouse interactions for rotation/dragging
            glRef.current.setClickable({}, true, (atom: any) => {
               console.log("Atom clicked", atom);
            });
          });
        }
      }
    }
  }, [resultReady, currentJob, resultReady]);

  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  // ═══════════════════════════════════════════════════
  // SHARED SUB-COMPONENTS
  // ═══════════════════════════════════════════════════

  // ─── App header bar with Workflow Switcher ───
  const appHeader = (
    <div className="flex flex-col border-b border-white/10 bg-white/5 shrink-0">
      <div className="h-14 px-3 lg:px-4 flex items-center gap-3">
        <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
          <Sparkles size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm tracking-wide leading-tight truncate">OHM Fold Studio</h1>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mt-0.5">OpenFold 3-MLX</p>
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-medium shrink-0 ${backendConnected ? 'text-emerald-400' : 'text-red-400'}`}>
          {backendConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
          <span className="hidden lg:inline">{backendConnected ? 'API' : 'Offline'}</span>
        </div>
      </div>
      
      {/* Mode Switcher - Spanning full width */}
      <div className="pb-3 px-0">
        <div className="bg-black/60 p-1 flex border-y border-white/5 shadow-inner relative overflow-hidden">
            <Tooltip text="Switch between single molecule viewing and complex interaction simulations" className="flex-1">
              <button 
                onClick={() => setAppWorkflow('viewer')}
                className={`w-full py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors relative z-10 flex items-center justify-center gap-1.5 ${appWorkflow === 'viewer' ? 'text-emerald-300' : 'text-white/20 hover:text-white/50'}`}
              >
                {appWorkflow === 'viewer' && (
                  <motion.div 
                    layoutId="activeMode"
                    className="absolute inset-0 bg-emerald-500/10 border-x border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                  />
                )}
                <Hexagon size={12} strokeWidth={3} className="relative z-20" /> 
                <span className="relative z-20">Structure</span>
              </button>
            </Tooltip>
            <Tooltip text="Build systems with multiple proteins, DNA, and medicines to simulate their interactions" className="flex-1">
              <button 
                onClick={() => setAppWorkflow('simulator')}
                className={`w-full py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors relative z-10 flex items-center justify-center gap-1.5 ${appWorkflow === 'simulator' ? 'text-emerald-300' : 'text-white/20 hover:text-white/50'}`}
              >
                {appWorkflow === 'simulator' && (
                  <motion.div 
                    layoutId="activeMode"
                    className="absolute inset-0 bg-emerald-500/10 border-x border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                  />
                )}
                <RotateCw size={12} strokeWidth={3} className="relative z-20" /> 
                <span className="relative z-20">Simulator</span>
              </button>
            </Tooltip>
        </div>
      </div>
    </div>
  );

  const sidebarBody = (
    <>
      <div className="p-3 sm:p-4 border-b border-white/10 bg-black/20 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Compute Core</span>
          {modelReady ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-wider"><Cpu size={12} /> Standby</span>
          )}
        </div>
        {systemStatus && (
          <div className="text-[10px] text-white/40 mb-2 space-y-0.5">
            <p className="font-medium">{systemStatus.system.processor} · {systemStatus.system.memory_gb}GB RAM</p>
          </div>
        )}
        {!modelReady && (
          <Tooltip text="Downloads and initializes the OpenFold3-MLX weights (approx. 2GB). Optimized for Apple Silicon GPU acceleration.">
            <button onClick={handleLoadModel} disabled={loadingModel || !backendConnected}
              className="w-full py-2 px-3 bg-white/10 border border-white/20 rounded-md text-xs font-semibold text-white hover:bg-white/20 transition-all flex items-center justify-center gap-2">
              {loadingModel ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {loadingModel ? 'Load Kernels' : 'Load OpenFold3-MLX'}
            </button>
          </Tooltip>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0 relative scrollbar-hide">
        <AnimatePresence mode="wait">
          {appWorkflow === 'viewer' ? (
            /* SINGLE STRUCTURE VIEWER SIDEBAR */
            <motion.div 
              key="viewer"
              initial={{ opacity: 0, x: -15, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 15, filter: 'blur(4px)' }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Active Structure</span>
                  <Tooltip text="The primary biological molecule currently under analysis. Prediction will run on this single entity.">
                    <Info size={10} className="text-white/20 hover:text-emerald-400 transition-colors cursor-help" />
                  </Tooltip>
                </div>
                <button onClick={() => setEntities([])} className="text-[10px] text-white/30 hover:text-white/60 font-bold uppercase tracking-widest transition-all">Clear</button>
              </div>
              
              {entities.length > 0 ? (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3 shadow-lg shadow-emerald-500/5 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                      <EntityIcon type={entities[0].type} size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{entities[0].name}</h3>
                      <p className="text-[10px] text-white/40 font-mono tracking-tighter truncate">{entities[0].type} Data Loaded</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setHubOpen(true)} 
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-white/60 uppercase tracking-widest transition-all"
                  >
                    Change Structure
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setHubOpen(true)}
                  className="w-full h-40 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3 text-white/20 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
                >
                  <div className="p-3 rounded-full bg-white/5 group-hover:bg-emerald-500/10 transition-colors">
                    <Sparkles size={24} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-center px-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-inherit block">Select Structure</span>
                    <span className="text-[9px] font-medium text-white/20 mt-1 block font-mono">BROWSING KNOWLEDGE HUB...</span>
                  </div>
                </button>
              )}
            </motion.div>
          ) : (
            /* MULTI-ENTITY SIMULATOR SIDEBAR */
            <motion.div 
              key="simulator"
              initial={{ opacity: 0, x: 15, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -15, filter: 'blur(4px)' }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Entities ({entities.length})</span>
                  <Tooltip text="List of proteins, DNA, and molecules to be simulated together in a shared coordinate system.">
                    <Info size={10} className="text-white/20 hover:text-emerald-400 transition-colors cursor-help" />
                  </Tooltip>
                </div>
                <button onClick={() => setEntities(INITIAL_ENTITIES)} className="text-[10px] text-white/30 hover:text-white/60 font-bold uppercase tracking-widest transition-all">Reset</button>
              </div>

              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {entities.map(entity => (
                    <motion.div 
                      key={entity.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedEntityId(entity.id)}
                      className={`p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all group flex items-center justify-between ${
                        selectedEntityId === entity.id 
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg ${selectedEntityId === entity.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                          <EntityIcon type={entity.type} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white/90 truncate">{entity.name}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                            {entity.type} {entity.count > 1 ? `x${entity.count}` : ''}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEntities(prev => prev.filter(ent => ent.id !== entity.id)); }}
                        className="p-1 px-1.5 opacity-0 group-hover:opacity-100 hover:text-red-400 text-white/20 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Tooltip text="Import a molecule from the Knowledge Hub to include it in the current interaction simulation.">
                  <button 
                    onClick={() => setHubOpen(true)}
                    className="w-full flex items-center justify-center py-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-all gap-2 group"
                  >
                    <Plus size={14} className="group-hover:rotate-90 transition-transform" /> Add Interaction Member
                  </button>
                </Tooltip>
                
                <button 
                  onClick={() => setHubOpen(true)}
                  className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/5 rounded-2xl text-white/20 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group gap-2"
                >
                  <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Open Knowledge Hub</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Run Button / Progress Control - Spanning full width */}
      <div className="p-0 border-t border-white/10 bg-white/5 backdrop-blur-3xl shrink-0 overflow-hidden">
        {running ? (
          <div className="p-4 space-y-3">
             <div className="flex items-center justify-between gap-2">
                <button 
                  onClick={paused ? handleResumeJob : handlePauseJob}
                  className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-xs font-medium text-white transition-all flex items-center justify-center gap-2"
                >
                  {paused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button 
                  onClick={handleStopJob}
                  className="flex-1 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-md text-xs font-medium text-red-400 transition-all flex items-center justify-center gap-2"
                >
                  <CircleStop size={14} /> Stop
                </button>
             </div>
             <div className="w-full h-10 px-4 rounded-lg bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2">
                <div className="w-3 h-3 border-2 border-emerald-200/30 border-t-white rounded-full animate-spin" />
                {paused ? 'Paused' : 'Predicting...'} {progress}%
             </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <Tooltip text="Initiate the OpenFold3-MLX prediction engine. This will consume local GPU resources to compute the 3D atomic coordinates.">
              <button onClick={handleRunPrediction} disabled={!modelReady || entities.length === 0}
                className={`w-full py-5 px-6 text-sm font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all relative overflow-hidden group ${
                  !modelReady || entities.length === 0 ? 'bg-white/5 text-white/10 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                }`}>
                <Play size={18} fill="currentColor" className="group-hover:scale-110 transition-transform" /> 
                <span className="relative z-10 transition-transform group-hover:translate-x-1">Run Prediction</span>
                
                {modelReady && entities.length > 0 && (
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"
                    style={{ backgroundSize: '200% 100%' }}
                  />
                )}
              </button>
            </Tooltip>
            {(!modelReady || entities.length === 0) && !running && (
              <div className="bg-black/20 py-2 border-t border-white/5">
                <p className="text-[9px] text-center text-white/30 font-bold uppercase tracking-widest leading-none">
                  {!backendConnected ? 'Initialize API connection' : !modelReady ? 'Download biological model' : 'Ready for simulation'}
                </p>
              </div>
            )}
          </div>
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
            {/* Viewer top bar / Workflow Context */}
            <div className="h-14 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between bg-black/20 backdrop-blur-xl z-20 shrink-0 gap-2">
              <div className="min-w-0 flex items-center gap-3">
                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${appWorkflow === 'viewer' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                  {appWorkflow}
                </div>
                <div>
                  <h3 className="text-white text-sm font-semibold flex items-center gap-2 truncate">
                    <Hexagon size={14} className={appWorkflow === 'viewer' ? 'text-blue-400' : 'text-emerald-400'} /><span className="truncate">{appWorkflow === 'viewer' ? 'Structure Viewer' : 'Interaction Simulation Area'}</span>
                  </h3>
                  <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium mt-0.5 truncate">
                    {running ? `MLX Kernels Processing...` : resultReady ? 'Analysis complete' : 'Awaiting data input...'}
                  </p>
                </div>
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

          {/* ═══ NLI PROMPT BOX ═══ */}
          <div className="px-3 sm:px-4 py-3 border-b border-white/10 bg-black/30 backdrop-blur-xl shrink-0">
            <div className="flex items-start gap-2">
              <div className="flex-1 relative">
                <div className="absolute -inset-[1px] rounded-lg bg-gradient-to-r from-emerald-500/20 via-green-500/10 to-teal-500/20 blur-sm pointer-events-none nli-glow" />
                <textarea
                  value={nlPrompt}
                  onChange={(e) => setNlPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNlSubmit(); } }}
                  placeholder="Describe your simulation in plain English... (e.g., 'Simulate Paracetamol interacting with Sample Person A's protein')"
                  rows={2}
                  className="relative w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-sm text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none backdrop-blur-md"
                  disabled={nlProcessing}
                />
              </div>
              <button
                onClick={handleNlSubmit}
                disabled={!nlPrompt.trim() || nlProcessing}
                className="mt-1 p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/5 disabled:text-white/20 text-white rounded-lg transition-all shadow-lg shadow-emerald-500/20 disabled:shadow-none shrink-0"
              >
                {nlProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            {nlProcessing && (
              <div className="flex items-center gap-2 mt-2 text-xs text-emerald-300/70">
                <Sparkles size={12} className="animate-pulse" />
                <span>Qwen is analyzing your request...</span>
              </div>
            )}
            {nlSummary && !nlProcessing && (
              <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400/80 bg-emerald-500/10 px-2.5 py-1.5 rounded-md border border-emerald-500/20">
                <CheckCircle2 size={12} className="shrink-0" />
                <span className="truncate">{nlSummary}</span>
              </div>
            )}
          </div>

          {/* Viewer canvas — takes all remaining space */}
          <div className="flex-1 relative min-h-0 bg-black/40">
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            {resultReady ? (
              <div key={currentJob?.id} className="w-full h-full relative">
                <div ref={viewerRef} className="w-full h-full" />
                <div className="absolute bottom-4 left-4 flex gap-2 z-30">
                  <button onClick={() => glRef.current?.zoomTo()} className="p-2 bg-black/60 border border-white/10 rounded-md text-white/70 hover:text-white transition-all shadow-xl backdrop-blur-md" title="Reset View">
                    <RotateCw size={14} />
                  </button>
                </div>
                {currentJob?.results && currentJob.results.length > 0 && (
                  <div className="absolute top-4 right-4 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 rounded-full backdrop-blur-md pointer-events-none">
                     <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">{currentJob.results.length} Structure Components Ready</p>
                  </div>
                )}
              </div>
            ) : running ? (
              <div className="flex flex-col items-center justify-center w-full h-full z-10">
                <div className="w-16 h-16 border-4 border-white/10 border-t-emerald-400 rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                <p className="text-white/80 text-sm font-semibold font-mono tracking-wider">{paused ? 'GENERATION PAUSED' : 'RUNNING MLX KERNELS...'}</p>
                <div className="mt-4 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }} 
                     animate={{ width: `${progress}%` }} 
                     className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]"
                   />
                </div>
                <p className="text-white/40 text-[10px] mt-2 font-mono uppercase tracking-widest px-4 text-center leading-relaxed">
                   Generating atomic coordinates and bond probabilities... {progress}%
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full z-10 px-4">
                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/10 mb-6 drop-shadow-2xl">
                   <Hexagon size={48} strokeWidth={1} />
                </div>
                <h3 className="text-white/60 text-lg font-light tracking-tight">Interactive 3D Viewer</h3>
                <p className="text-white/30 text-xs mt-2 max-w-[240px] text-center leading-relaxed">Configure your entities and run a prediction to visualize the 3D molecular structure.</p>
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

      {/* ─── KNOWLEDGE HUB OVERLAY ─── */}
      <AnimatePresence>
        {hubOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hub-overlay backdrop-blur-3xl z-[100] p-4 sm:p-8"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="hub-content border-emerald-500/20"
            >
              {/* Hub Sidebar */}
              <div className="hub-sidebar shrink-0 p-4 space-y-2 border-r border-white/5 bg-black/40">
                <div className="flex items-center gap-2 mb-6 px-2">
                  <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <FlaskConical size={14} />
                  </div>
                  <span className="text-xs font-bold text-white tracking-widest uppercase">Hub</span>
                </div>
                
                {[
                  { id: 'persons', label: 'Patients', icon: User },
                  { id: 'medicines', label: 'Medicines', icon: Pill },
                  { id: 'targets', label: 'Targets', icon: Dna },
                  { id: 'upload', label: 'Direct Upload', icon: Upload }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setHubTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      hubTab === tab.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Hub Main Area */}
              <div className="flex-1 flex flex-col min-w-0 bg-black/20">
                <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between shrink-0">
                  <h2 className="text-lg font-semibold text-white tracking-tight">
                    {hubTab === 'persons' && 'Patient Profiles'}
                    {hubTab === 'medicines' && 'Pharmacopeia / Library'}
                    {hubTab === 'targets' && 'Biological Targets'}
                    {hubTab === 'upload' && 'Raw Data Import'}
                  </h2>
                  <button 
                    onClick={() => setHubOpen(false)}
                    className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                  {hubTab === 'persons' && (
                    <div className="hub-grid">
                      {samplePersons.map(person => (
                        <div 
                          key={person.id}
                          onClick={() => toggleHubSelection(person, 'person')}
                          className={`hub-item-card p-4 cursor-pointer group ${selectedHubItems.some(i => i.id === person.id) ? 'selected' : ''}`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl drop-shadow-lg">{person.avatar}</span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-white/90 truncate">{person.name}</h4>
                              <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{person.targets.length} Targets</p>
                            </div>
                          </div>
                          <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2 mb-4">{person.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {person.targets.slice(0, 2).map((t, idx) => (
                              <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 border border-white/5 font-mono">{t.type}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {hubTab === 'medicines' && (
                    <div className="hub-grid">
                      {sampleMedicines.map(med => (
                        <div 
                          key={med.id}
                          onClick={() => toggleHubSelection(med, 'medicine')}
                          className={`hub-item-card p-4 cursor-pointer group ${selectedHubItems.some(i => i.id === med.id) ? 'selected' : ''}`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl drop-shadow-lg">{med.icon}</span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-white/90 truncate">{med.name}</h4>
                              <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{med.category}</p>
                            </div>
                          </div>
                          <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2 mb-3">{med.description}</p>
                          <div className="font-mono text-[9px] text-emerald-400/50 truncate bg-black/40 p-1 rounded border border-white/5">{med.smiles}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {hubTab === 'targets' && (
                    <div className="hub-grid">
                      {/* Generic Targets flattened from persons for easy selection */}
                      {samplePersons.flatMap(p => p.targets).distinctBy(t => t.name).map(target => (
                        <div 
                          key={target.name}
                          onClick={() => toggleHubSelection(target, 'target')}
                          className={`hub-item-card p-4 cursor-pointer group ${selectedHubItems.some(i => i.name === target.name && i.sequence === target.sequence) ? 'selected' : ''}`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-white/5 text-emerald-400"><EntityIcon type={target.type as any} /></div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-white/90 truncate">{target.name}</h4>
                              <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{target.type}</p>
                            </div>
                          </div>
                          <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">{target.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {hubTab === 'upload' && (
                    <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto py-12">
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                          dragOver ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-white/10 hover:border-white/20 bg-black/20 hover:bg-black/30'
                        }`}
                      >
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Upload size={32} />
                        </div>
                        <h4 className="text-white font-medium mb-1">Upload Biological Data</h4>
                        <p className="text-sm text-white/40 mb-6">Drag and drop .fasta, .sdf, or .mol files</p>
                        <div className="inline-flex gap-2">
                          {['.FASTA', '.SDF', '.MOL'].map(ext => (
                            <span key={ext} className="px-2 py-1 rounded bg-white/5 text-[10px] text-white/30 border border-white/5 font-bold uppercase tracking-widest">{ext}</span>
                          ))}
                        </div>
                      </div>
                      <input ref={fileInputRef} type="file" accept=".fasta,.fa,.fna,.sdf,.mol" className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) { handleFileUpload(e.target.files[0]); setHubOpen(false); } e.target.value=''; }} />
                    </div>
                  )}
                </div>

                {/* Hub Footer */}
                <div className="h-20 px-8 border-t border-white/5 bg-black/40 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-white/40 font-medium">
                      {selectedHubItems.length === 0 ? 'No items selected' : `${selectedHubItems.length} items queued`}
                    </span>
                    {selectedHubItems.length > 0 && (
                      <button 
                        onClick={() => setSelectedHubItems([])}
                        className="text-[10px] text-white/30 hover:text-white/60 uppercase font-bold tracking-widest transition-all"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setHubOpen(false)}
                      className="px-6 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleImportFromHub}
                      disabled={selectedHubItems.length === 0}
                      className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/5 disabled:text-white/20 text-white rounded-lg transition-all shadow-lg shadow-emerald-500/20 disabled:shadow-none text-sm font-bold flex items-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      Import Selection
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Helper for targets tab ───
declare global {
  interface Array<T> {
    distinctBy(selector: (item: T) => any): T[];
  }
}
Array.prototype.distinctBy = function(selector) {
  const seen = new Set();
  return this.filter(item => {
    const key = selector(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

