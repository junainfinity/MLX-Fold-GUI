import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dna, 
  TestTube, 
  TestTubeDiagonal, 
  Atom, 
  Hexagon, 
  Play, 
  Download, 
  Settings, 
  Cpu, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ChevronRight,
  Info
} from 'lucide-react';

// Types
type EntityType = 'Protein' | 'DNA' | 'RNA' | 'Ligand' | 'Ion';

interface Entity {
  id: string;
  type: EntityType;
  name: string;
  sequence: string;
  count: number;
}

const SAMPLE_PROTEIN = 'MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK';
const SAMPLE_DNA = 'ATGCGTACGTAGCTAG';
const SAMPLE_RNA = 'AUGCGUACGUAGCUAG';
const SAMPLE_LIGAND = 'NC1=NC=NC2=C1N=CN2[C@@H]3O[C@H](COP(=O)(O)OP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]3O'; // ATP
const SAMPLE_ION = 'MG';

const INITIAL_ENTITIES: Entity[] = [
  { id: '1', type: 'Protein', name: 'aqGFP (Sample)', sequence: SAMPLE_PROTEIN, count: 1 },
  { id: '2', type: 'DNA', name: 'DNA Strand (Sample)', sequence: SAMPLE_DNA, count: 1 },
  { id: '3', type: 'RNA', name: 'RNA Strand (Sample)', sequence: SAMPLE_RNA, count: 1 },
  { id: '4', type: 'Ligand', name: 'ATP (Sample)', sequence: SAMPLE_LIGAND, count: 1 },
  { id: '5', type: 'Ion', name: 'Magnesium (Sample)', sequence: SAMPLE_ION, count: 1 },
];

export default function App() {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [entities, setEntities] = useState<Entity[]>(INITIAL_ENTITIES);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(INITIAL_ENTITIES[0].id);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultReady, setResultReady] = useState(false);

  const handleLoadModel = () => {
    setLoadingModel(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      if (p >= 100) {
        clearInterval(interval);
        setLoadingModel(false);
        setModelLoaded(true);
      }
    }, 200);
  };

  const handleAddEntity = (type: EntityType) => {
    const newEntity: Entity = {
      id: Math.random().toString(36).substring(7),
      type,
      name: `New ${type}`,
      sequence: type === 'Protein' ? '' : '',
      count: 1,
    };
    setEntities([...entities, newEntity]);
    setSelectedEntityId(newEntity.id);
  };

  const handleLoadSample = () => {
    setEntities(INITIAL_ENTITIES);
    setSelectedEntityId(INITIAL_ENTITIES[0].id);
  };

  const handleRunPrediction = () => {
    if (!modelLoaded || entities.length === 0) return;
    setRunning(true);
    setProgress(0);
    setResultReady(false);
    
    let p = 0;
    const interval = setInterval(() => {
      p += 2;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setRunning(false);
        setResultReady(true);
      }
    }, 100);
  };

  const updateEntity = (id: string, updates: Partial<Entity>) => {
    setEntities(entities.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const removeEntity = (id: string) => {
    setEntities(entities.filter(e => e.id !== id));
    if (selectedEntityId === id) setSelectedEntityId(null);
  };

  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  return (
    <div className="relative flex h-screen w-full bg-black text-white font-sans overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 mix-blend-screen filter blur-[100px] animate-blob" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-green-700/20 mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] rounded-full bg-teal-600/10 mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 mix-blend-overlay pointer-events-none" />

      {/* Sidebar */}
      <div className="relative w-80 bg-white/10 backdrop-blur-2xl border-r border-white/10 flex flex-col shadow-2xl z-30">
        {/* App Header */}
        <div className="h-16 px-4 border-b border-white/10 flex items-center gap-3 bg-white/5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Hexagon size={18} />
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-wide leading-tight">MLX Fold Studio</h1>
            <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium mt-0.5">Apple Silicon Native</p>
          </div>
        </div>

        {/* Model Status */}
        <div className="p-4 border-b border-white/10 bg-black/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Model Status</span>
            {modelLoaded ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <CheckCircle2 size={12} /> Loaded
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                <Cpu size={12} /> Not Loaded
              </span>
            )}
          </div>
          {!modelLoaded && (
            <button
              onClick={handleLoadModel}
              disabled={loadingModel}
              className="w-full py-2 px-3 bg-white/10 border border-white/20 rounded-md text-sm font-medium text-white hover:bg-white/20 hover:border-white/30 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loadingModel ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {loadingModel ? 'Loading Weights...' : 'Load MLX Weights (~10GB)'}
            </button>
          )}
        </div>

        {/* Entities List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Entities</span>
            <div className="flex gap-1">
              <button 
                onClick={handleLoadSample}
                className="text-[10px] px-2 py-1 bg-white/10 text-white rounded hover:bg-white/20 font-medium transition-colors border border-white/10"
              >
                Reset Examples
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <AnimatePresence>
              {entities.map(entity => (
                <motion.div
                  key={entity.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedEntityId(entity.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all group backdrop-blur-md ${
                    selectedEntityId === entity.id 
                      ? 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {entity.type === 'Protein' && <TestTubeDiagonal size={14} className="text-emerald-400" />}
                      {entity.type === 'DNA' && <Dna size={14} className="text-emerald-400" />}
                      {entity.type === 'RNA' && <Dna size={14} className="text-emerald-400" />}
                      {entity.type === 'Ligand' && <Hexagon size={14} className="text-emerald-400" />}
                      {entity.type === 'Ion' && <Atom size={14} className="text-emerald-400" />}
                      <span className="text-sm font-medium truncate max-w-[120px] text-white/90">{entity.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/60 bg-black/30 px-1.5 py-0.5 rounded border border-white/5">x{entity.count}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeEntity(entity.id); }}
                        className="text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {entities.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-lg bg-black/10">
                <p className="text-xs text-white/50">No entities added yet.</p>
                <p className="text-[10px] text-white/40 mt-1">Add a protein, DNA, or ligand to begin.</p>
              </div>
            )}
          </div>

          {/* Add Entity Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleAddEntity('Protein')} className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white/5 border border-white/10 rounded-md text-xs font-medium text-white/80 hover:bg-white/10 hover:border-white/20 transition-colors">
              <TestTubeDiagonal size={12} /> Protein
            </button>
            <button onClick={() => handleAddEntity('DNA')} className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white/5 border border-white/10 rounded-md text-xs font-medium text-white/80 hover:bg-white/10 hover:border-white/20 transition-colors">
              <Dna size={12} /> DNA
            </button>
            <button onClick={() => handleAddEntity('RNA')} className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white/5 border border-white/10 rounded-md text-xs font-medium text-white/80 hover:bg-white/10 hover:border-white/20 transition-colors">
              <Dna size={12} /> RNA
            </button>
            <button onClick={() => handleAddEntity('Ligand')} className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white/5 border border-white/10 rounded-md text-xs font-medium text-white/80 hover:bg-white/10 hover:border-white/20 transition-colors">
              <Hexagon size={12} /> Ligand
            </button>
            <button onClick={() => handleAddEntity('Ion')} className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-2 bg-white/5 border border-white/10 rounded-md text-xs font-medium text-white/80 hover:bg-white/10 hover:border-white/20 transition-colors">
              <Atom size={12} /> Ion
            </button>
          </div>
        </div>

        {/* Run Button */}
        <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-xl">
          <button
            onClick={handleRunPrediction}
            disabled={!modelLoaded || entities.length === 0 || running}
            className={`w-full py-3 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${
              !modelLoaded || entities.length === 0
                ? 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                : running
                ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-emerald-500/25'
            }`}
          >
            {running ? (
              <>
                <div className="w-4 h-4 border-2 border-emerald-200/30 border-t-white rounded-full animate-spin" />
                Predicting... {progress}%
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                Run Prediction
              </>
            )}
          </button>
          {(!modelLoaded || entities.length === 0) && !running && (
            <p className="text-[10px] text-center text-white/40 mt-2">
              {!modelLoaded ? 'Load model weights first' : 'Add at least one entity'}
            </p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Editor / Viewer Split */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Entity Editor Pane */}
          {selectedEntity ? (
            <div className="relative w-80 bg-white/5 backdrop-blur-xl border-r border-white/10 flex flex-col shadow-2xl z-20">
              <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
                <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                  <Settings size={14} className="text-white/50" />
                  Edit {selectedEntity.type}
                </h2>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-5">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">Name</label>
                  <input 
                    type="text" 
                    value={selectedEntity.name}
                    onChange={(e) => updateEntity(selectedEntity.id, { name: e.target.value })}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder-white/30"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">Copies</label>
                  <input 
                    type="number" 
                    min="1"
                    value={selectedEntity.count}
                    onChange={(e) => updateEntity(selectedEntity.id, { count: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder-white/30"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-white/70">
                      {selectedEntity.type === 'Ligand' ? 'SMILES String' : 'Sequence'}
                    </label>
                    <span className="text-[10px] text-white/40 bg-black/30 px-1.5 py-0.5 rounded border border-white/5">{selectedEntity.sequence.length} chars</span>
                  </div>
                  <textarea 
                    value={selectedEntity.sequence}
                    onChange={(e) => updateEntity(selectedEntity.id, { sequence: e.target.value.toUpperCase() })}
                    placeholder={selectedEntity.type === 'Ligand' ? 'e.g. CC(=O)OC1=CC=CC=C1C(=O)O' : 'e.g. MSKGEELFT...'}
                    className="w-full h-64 px-3 py-2 bg-black/20 border border-white/10 rounded-md text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all resize-none placeholder-white/20"
                  />
                </div>

                <div className="bg-emerald-500/10 text-emerald-100 border border-emerald-500/20 p-3 rounded-md flex items-start gap-2 backdrop-blur-sm">
                  <Info size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                  <p className="text-xs leading-relaxed">
                    {selectedEntity.type === 'Protein' && 'Enter standard amino acid single-letter codes. Non-canonical amino acids are supported via specific modifications.'}
                    {selectedEntity.type === 'DNA' && 'Enter DNA sequence using A, C, G, T.'}
                    {selectedEntity.type === 'RNA' && 'Enter RNA sequence using A, C, G, U.'}
                    {selectedEntity.type === 'Ligand' && 'Enter a valid SMILES string or CCD code.'}
                    {selectedEntity.type === 'Ion' && 'Enter the ion identifier (e.g., NA, MG, ZN).'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-80 bg-white/5 backdrop-blur-xl border-r border-white/10 flex flex-col z-20">
              <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
                <h2 className="text-sm font-semibold text-white/50 flex items-center gap-2">
                  <Settings size={14} className="text-white/30" />
                  Editor
                </h2>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full shadow-inner flex items-center justify-center text-white/30 mb-3">
                  <Settings size={20} />
                </div>
                <p className="text-sm font-medium text-white/60">No entity selected</p>
                <p className="text-xs text-white/40 mt-1">Select an entity from the sidebar to edit its properties.</p>
              </div>
            </div>
          )}

          {/* 3D Viewer / Results Area */}
          <div className="flex-1 relative overflow-hidden flex flex-col z-10">
            {/* Top Bar of Viewer */}
            <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between bg-black/20 backdrop-blur-xl z-20 shrink-0">
              <div>
                <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                  <Hexagon size={14} className="text-emerald-400" />
                  Structure Viewer
                </h3>
                <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium mt-0.5">
                  {resultReady ? 'Prediction complete. Showing predicted structure.' : 'Awaiting prediction...'}
                </p>
              </div>
              
              {resultReady && (
                <div className="flex gap-2">
                  <button className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shadow-lg">
                    <Download size={12} /> PDB
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shadow-lg">
                    <Download size={12} /> mmCIF
                  </button>
                </div>
              )}
            </div>

            {/* Viewer Canvas Placeholder */}
            <div className="flex-1 flex items-center justify-center relative">
              {/* Grid Background */}
              <div className="absolute inset-0" style={{ 
                backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }} />
              
              {resultReady ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative z-10"
                >
                  {/* Abstract representation of a protein structure */}
                  <div className="w-64 h-64 relative animate-[spin_20s_linear_infinite]">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                      <path d="M20,50 Q40,10 60,50 T100,50" fill="none" stroke="url(#grad1)" strokeWidth="4" strokeLinecap="round" />
                      <path d="M10,40 Q30,80 70,40 T90,60" fill="none" stroke="url(#grad2)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
                      <path d="M30,30 Q50,90 80,30 T100,70" fill="none" stroke="url(#grad3)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                      <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#059669" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                        <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#047857" />
                          <stop offset="100%" stopColor="#6ee7b7" />
                        </linearGradient>
                        <linearGradient id="grad3" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#064e3b" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </motion.div>
              ) : running ? (
                <div className="flex flex-col items-center z-10">
                  <div className="w-16 h-16 border-4 border-white/10 border-t-emerald-400 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                  <p className="text-white/80 text-sm font-medium font-mono drop-shadow-md">Running MLX Kernels...</p>
                  <p className="text-white/50 text-xs mt-2 font-mono">Step {Math.floor(progress / 10)} of 10</p>
                </div>
              ) : (
                <div className="text-center z-10">
                  <Hexagon size={48} className="text-white/10 mx-auto mb-4 drop-shadow-lg" />
                  <p className="text-white/40 text-sm">3D Structure Viewer</p>
                </div>
              )}
            </div>

            {/* Bottom Logs Panel */}
            <div className="h-48 bg-black/40 backdrop-blur-xl border-t border-white/10 p-4 font-mono text-xs overflow-y-auto flex flex-col z-20">
              <div className="flex items-center justify-between mb-2 text-white/50 sticky top-0 bg-transparent pb-2 border-b border-white/5">
                <span>System Logs</span>
                <span className="flex items-center gap-1"><Cpu size={12} /> Apple M-Series</span>
              </div>
              <div className="space-y-1 flex-1 pt-2">
                <p className="text-emerald-400">[{new Date().toLocaleTimeString()}] System initialized. MLX framework detected.</p>
                {modelLoaded && <p className="text-emerald-400">[{new Date().toLocaleTimeString()}] OpenFold3 weights loaded into unified memory.</p>}
                {running && (
                  <>
                    <p className="text-emerald-300">[{new Date().toLocaleTimeString()}] Starting prediction pipeline...</p>
                    <p className="text-white/70">[{new Date().toLocaleTimeString()}] Processing input sequences...</p>
                    {progress > 20 && <p className="text-white/70">[{new Date().toLocaleTimeString()}] Running MSA search (JackHMMER)...</p>}
                    {progress > 40 && <p className="text-white/70">[{new Date().toLocaleTimeString()}] Executing MLX Attention Mechanisms...</p>}
                    {progress > 60 && <p className="text-white/70">[{new Date().toLocaleTimeString()}] Applying MLX Triangle Kernels...</p>}
                    {progress > 80 && <p className="text-white/70">[{new Date().toLocaleTimeString()}] Structure generation in progress...</p>}
                  </>
                )}
                {resultReady && (
                  <p className="text-emerald-400">[{new Date().toLocaleTimeString()}] Prediction completed successfully. pLDDT: 87.4</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
