/**
 * MLX Fold Studio — API Client
 * Communicates with the Python FastAPI backend.
 */

const API_BASE = '/api';

// ─── Types ──────────────────────────────────────────

export interface SystemInfo {
  platform: string;
  platform_version: string | null;
  architecture: string;
  processor: string;
  python_version: string;
  memory_gb: number;
  memory_available_gb: number;
  is_apple_silicon: boolean;
  has_python3: boolean;
  has_git: boolean;
  has_pip: boolean;
}

export interface CompatibilityInfo {
  compatible: boolean;
  issues: string[];
  system: SystemInfo;
}

export interface OpenFoldStatus {
  repo_cloned: boolean;
  installed: boolean;
  weights_downloaded: boolean;
  repo_path: string;
  ready: boolean;
}

export interface StatusResponse {
  system: SystemInfo;
  compatibility: CompatibilityInfo;
  openfold: OpenFoldStatus;
}

export interface SetupResponse {
  success: boolean;
  error?: string;
  step?: string;
  status?: OpenFoldStatus;
  logs: string[];
}

export interface JobInfo {
  id: string;
  status: 'running' | 'complete' | 'error' | 'paused' | 'stopped';
  progress: number;
  created_at: string;
  error: string | null;
  results: ResultFile[] | null;
}

export interface ResultFile {
  filename: string;
  path: string;
  format: 'pdb' | 'mmcif';
  size_bytes: number;
}

export interface PredictResponse {
  success: boolean;
  job_id?: string;
  job?: JobInfo;
  error?: string;
  logs: string[];
}

export interface Entity {
  id: string;
  type: 'Protein' | 'DNA' | 'RNA' | 'Ligand' | 'Ion';
  name: string;
  sequence: string;
  count: number;
}

// ─── API Functions ──────────────────────────────────

/** Check system + model status */
export async function checkStatus(): Promise<StatusResponse> {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error(`Status check failed: ${res.statusText}`);
  return res.json();
}

/** Run full setup: clone, install, download weights */
export async function setupModel(): Promise<SetupResponse> {
  const res = await fetch(`${API_BASE}/setup`, { method: 'POST' });
  if (!res.ok) throw new Error(`Setup failed: ${res.statusText}`);
  return res.json();
}

/** Start a structure prediction */
export async function runPrediction(entities: Entity[]): Promise<PredictResponse> {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entities }),
  });
  if (!res.ok) throw new Error(`Prediction failed: ${res.statusText}`);
  return res.json();
}

/** Poll job status */
export async function getJobStatus(jobId: string): Promise<JobInfo> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Job status failed: ${res.statusText}`);
  return res.json();
}

/** Get download URL for a result file */
export function getResultDownloadUrl(jobId: string, filename: string): string {
  return `${API_BASE}/results/${jobId}/${filename}`;
}

/** Pause a running prediction job */
export async function pauseJob(jobId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/pause`, { method: 'POST' });
  if (!res.ok) throw new Error(`Pause failed: ${res.statusText}`);
  return res.json();
}

/** Resume a paused prediction job */
export async function resumeJob(jobId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/resume`, { method: 'POST' });
  if (!res.ok) throw new Error(`Resume failed: ${res.statusText}`);
  return res.json();
}

/** Stop a running or paused prediction job */
export async function stopJob(jobId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/stop`, { method: 'POST' });
  if (!res.ok) throw new Error(`Stop failed: ${res.statusText}`);
  return res.json();
}

/** Health check */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── WebSocket Log Streaming ────────────────────────

export type LogCallback = (message: string) => void;

export function connectLogStream(onLog: LogCallback): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}${API_BASE}/logs`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'log') {
        onLog(data.message);
      }
    } catch {
      onLog(event.data);
    }
  };

  ws.onerror = () => {
    onLog('[WS] Connection error — logs may not stream in real-time.');
  };

  // Ping to keep alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send('ping');
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);

  return ws;
}
