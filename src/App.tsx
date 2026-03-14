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

export default function App() {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultReady, setResultReady] = useState(false);

  const handleLoadModel = () => {
    setLoadingModel(true);
    // Simulate loading model
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
    const sampleEntity: Entity = {
      id: Math.random().toString(36).substring(7),
      type: 'Protein',
      name: 'aqGFP (Sample)',
      sequence: SAMPLE_PROTEIN,
      count: 1,
    };
    setEntities([sampleEntity]);
    setSelectedEntityId(sampleEntity.id);
  };

  const handleRunPrediction = () => {
    if (!modelLoaded || entities.length === 0) return;
    setRunning(true);
    setProgress(0);
    setResultReady(false);
    
    // Simulate prediction
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
    <div className="flex h-screen w-full bg-[#f5f5f5] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        {/* App Header */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
            <Hexagon size={18} />
          </div>
          <div>
            <h1 className="font-semibold text-sm">OpenFold 3 MLX</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Apple Silicon Native</p>
          </div>
        </div>

        {/* Model Status */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Model Status</span>
            {modelLoaded ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 size={12} /> Loaded
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <Cpu size={12} /> Not Loaded
              </span>
            )}
          </div>
          {!modelLoaded && (
            <button
              onClick={handleLoadModel}
              disabled={loadingModel}
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loadingModel ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
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
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Entities</span>
            <div className="flex gap-1">
              <button 
                onClick={handleLoadSample}
                className="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 font-medium transition-colors"
              >
                Load Sample
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
                  className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                    selectedEntityId === entity.id 
                      ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {entity.type === 'Protein' && <TestTubeDiagonal size={14} className="text-indigo-500" />}
                      {entity.type === 'DNA' && <Dna size={14} className="text-blue-500" />}
                      {entity.type === 'RNA' && <Dna size={14} className="text-emerald-500" />}
                      {entity.type === 'Ligand' && <Hexagon size={14} className="text-amber-500" />}
                      {entity.type === 'Ion' && <Atom size={14} className="text-rose-500" />}
                      <span className="text-sm font-medium truncate max-w-[120px]">{entity.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">x{entity.count}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeEntity(entity.id); }}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {entities.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500">No entities added yet.</p>
                <p className="text-[10px] text-slate-400 mt-1">Add a protein, DNA, or ligand to begin.</p>
              </div>
            )}
          </div>

          {/* Add Entity Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleAddEntity('Protein')} className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors">
              <TestTubeDiagonal size={12} /> Protein
            </button>
            <button onClick={() => handleAddEntity('DNA')} className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors">
              <Dna size={12} /> DNA
            </button>
            <button onClick={() => handleAddEntity('RNA')} className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors">
              <Dna size={12} /> RNA
            </button>
            <button onClick={() => handleAddEntity('Ligand')} className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors">
              <Hexagon size={12} /> Ligand
            </button>
            <button onClick={() => handleAddEntity('Ion')} className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors">
              <Atom size={12} /> Ion
            </button>
          </div>
        </div>

        {/* Run Button */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <button
            onClick={handleRunPrediction}
            disabled={!modelLoaded || entities.length === 0 || running}
            className={`w-full py-3 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
              !modelLoaded || entities.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : running
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
            }`}
          >
            {running ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
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
            <p className="text-[10px] text-center text-slate-500 mt-2">
              {!modelLoaded ? 'Load model weights first' : 'Add at least one entity'}
            </p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor / Viewer Split */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Entity Editor Pane */}
          {selectedEntity ? (
            <div className="w-80 border-r border-slate-200 bg-white flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-0">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Settings size={14} className="text-slate-500" />
                  Edit {selectedEntity.type}
                </h2>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
                  <input 
                    type="text" 
                    value={selectedEntity.name}
                    onChange={(e) => updateEntity(selectedEntity.id, { name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Copies</label>
                  <input 
                    type="number" 
                    min="1"
                    value={selectedEntity.count}
                    onChange={(e) => updateEntity(selectedEntity.id, { count: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      {selectedEntity.type === 'Ligand' ? 'SMILES String' : 'Sequence'}
                    </label>
                    <span className="text-[10px] text-slate-400">{selectedEntity.sequence.length} chars</span>
                  </div>
                  <textarea 
                    value={selectedEntity.sequence}
                    onChange={(e) => updateEntity(selectedEntity.id, { sequence: e.target.value.toUpperCase() })}
                    placeholder={selectedEntity.type === 'Ligand' ? 'e.g. CC(=O)OC1=CC=CC=C1C(=O)O' : 'e.g. MSKGEELFT...'}
                    className="w-full h-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  />
                </div>

                <div className="bg-blue-50 text-blue-800 p-3 rounded-md flex items-start gap-2">
                  <Info size={14} className="mt-0.5 shrink-0" />
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
            <div className="w-80 border-r border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-6 text-center z-0">
              <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-300 mb-3">
                <Settings size={20} />
              </div>
              <p className="text-sm font-medium text-slate-600">No entity selected</p>
              <p className="text-xs text-slate-400 mt-1">Select an entity from the sidebar to edit its properties.</p>
            </div>
          )}

          {/* 3D Viewer / Results Area */}
          <div className="flex-1 bg-[#1a1a1a] relative overflow-hidden flex flex-col">
            {/* Top Bar of Viewer */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-3 pointer-events-auto">
                <h3 className="text-white text-sm font-medium flex items-center gap-2">
                  <Hexagon size={14} className="text-indigo-400" />
                  Structure Viewer
                </h3>
                <p className="text-white/50 text-xs mt-1">
                  {resultReady ? 'Prediction complete. Showing predicted structure.' : 'Awaiting prediction...'}
                </p>
              </div>
              
              {resultReady && (
                <div className="flex gap-2 pointer-events-auto">
                  <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5">
                    <Download size={12} /> PDB
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5">
                    <Download size={12} /> mmCIF
                  </button>
                </div>
              )}
            </div>

            {/* Viewer Canvas Placeholder */}
            <div className="flex-1 flex items-center justify-center relative">
              {/* Grid Background */}
              <div className="absolute inset-0" style={{ 
                backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px)',
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
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                      <path d="M20,50 Q40,10 60,50 T100,50" fill="none" stroke="url(#grad1)" strokeWidth="4" strokeLinecap="round" />
                      <path d="M10,40 Q30,80 70,40 T90,60" fill="none" stroke="url(#grad2)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
                      <path d="M30,30 Q50,90 80,30 T100,70" fill="none" stroke="url(#grad3)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                      <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#c084fc" />
                        </linearGradient>
                        <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                        <linearGradient id="grad3" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#fbbf24" />
                          <stop offset="100%" stopColor="#f43f5e" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </motion.div>
              ) : running ? (
                <div className="flex flex-col items-center z-10">
                  <div className="w-16 h-16 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin mb-4" />
                  <p className="text-white/70 text-sm font-medium font-mono">Running MLX Kernels...</p>
                  <p className="text-white/40 text-xs mt-2 font-mono">Step {Math.floor(progress / 10)} of 10</p>
                </div>
              ) : (
                <div className="text-center z-10">
                  <Hexagon size={48} className="text-white/10 mx-auto mb-4" />
                  <p className="text-white/40 text-sm">3D Structure Viewer</p>
                </div>
              )}
            </div>

            {/* Bottom Logs Panel */}
            <div className="h-48 bg-black/80 border-t border-white/10 p-4 font-mono text-xs overflow-y-auto flex flex-col dark-scroll">
              <div className="flex items-center justify-between mb-2 text-white/50 sticky top-0 bg-black/80 pb-2">
                <span>System Logs</span>
                <span className="flex items-center gap-1"><Cpu size={12} /> Apple M-Series</span>
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-emerald-400">[{new Date().toLocaleTimeString()}] System initialized. MLX framework detected.</p>
                {modelLoaded && <p className="text-emerald-400">[{new Date().toLocaleTimeString()}] OpenFold3 weights loaded into unified memory.</p>}
                {running && (
                  <>
                    <p className="text-blue-400">[{new Date().toLocaleTimeString()}] Starting prediction pipeline...</p>
                    <p className="text-slate-300">[{new Date().toLocaleTimeString()}] Processing input sequences...</p>
                    {progress > 20 && <p className="text-slate-300">[{new Date().toLocaleTimeString()}] Running MSA search (JackHMMER)...</p>}
                    {progress > 40 && <p className="text-slate-300">[{new Date().toLocaleTimeString()}] Executing MLX Attention Mechanisms...</p>}
                    {progress > 60 && <p className="text-slate-300">[{new Date().toLocaleTimeString()}] Applying MLX Triangle Kernels...</p>}
                    {progress > 80 && <p className="text-slate-300">[{new Date().toLocaleTimeString()}] Structure generation in progress...</p>}
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
