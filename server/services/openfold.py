"""
Core service for managing OpenFold3-MLX installation, setup, and prediction jobs.
"""

import asyncio
import json
import os
import uuid
import shutil
import sys
from pathlib import Path
from typing import Optional
from datetime import datetime


# Base directory for all MLX Fold Studio data
BASE_DIR = Path.home() / ".mlx-fold-studio"
REPO_DIR = BASE_DIR / "openfold-3-mlx"
JOBS_DIR = BASE_DIR / "jobs"
REPO_URL = "https://github.com/latent-spacecraft/openfold-3-mlx.git"

# In-memory job tracking
_jobs: dict[str, dict] = {}


def ensure_dirs():
    """Ensure all required directories exist."""
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    JOBS_DIR.mkdir(parents=True, exist_ok=True)


def get_install_status() -> dict:
    """Check the current installation status of OpenFold3-MLX."""
    repo_cloned = REPO_DIR.exists() and (REPO_DIR / ".git").exists()
    installed = repo_cloned and (REPO_DIR / "openfold3").exists()

    # Check for weights — they could be in the repo dir OR ~/.openfold3
    weights_exist = False
    if installed:
        # Check the standard OpenFold cache location
        openfold_cache = Path.home() / ".openfold3"
        for search_dir in [openfold_cache, REPO_DIR / "data", REPO_DIR / "weights", REPO_DIR / "openfold3" / "data"]:
            if search_dir.exists():
                for f in search_dir.rglob("*.pt"):
                    if f.stat().st_size > 1_000_000:  # Weight files are large
                        weights_exist = True
                        break
            if weights_exist:
                break

    return {
        "repo_cloned": repo_cloned,
        "installed": installed,
        "weights_downloaded": weights_exist,
        "repo_path": str(REPO_DIR),
        "ready": installed and weights_exist,
    }


async def run_setup(log_callback=None) -> dict:
    """
    Full setup pipeline: clone repo, install deps, download weights.
    
    This bypasses the interactive setup_openfold script entirely.
    That script requires conda and multiple interactive prompts, making it
    unusable from a web backend. Instead, we:
    1. Clone the repo
    2. pip install
    3. Call the download script directly with the right args
    """
    ensure_dirs()

    async def log(msg: str):
        if log_callback:
            await log_callback(msg)

    status = get_install_status()

    # Step 1: Clone
    if not status["repo_cloned"]:
        await log("[SETUP] Cloning OpenFold3-MLX repository...")
        proc = await asyncio.create_subprocess_exec(
            "git", "clone", REPO_URL, str(REPO_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            error = stderr.decode().strip()
            await log(f"[ERROR] Clone failed: {error}")
            return {"success": False, "error": f"Clone failed: {error}", "step": "clone"}
        await log("[SETUP] Repository cloned successfully.")
    else:
        await log("[SETUP] Repository already cloned, skipping.")

    # Step 2: pip install
    if not status["installed"]:
        await log("[SETUP] Installing OpenFold3-MLX dependencies (pip install -e .)...")
        pip_cmd = shutil.which("pip3") or shutil.which("pip") or "pip3"
        proc = await asyncio.create_subprocess_exec(
            pip_cmd, "install", "-e", ".",
            cwd=str(REPO_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            error = stderr.decode().strip()
            await log(f"[ERROR] pip install failed: {error}")
            return {"success": False, "error": f"Install failed: {error}", "step": "install"}
        await log("[SETUP] Dependencies installed successfully.")
    else:
        await log("[SETUP] Dependencies already installed, skipping.")

    # Step 3: Download weights
    # Check if already downloaded
    refreshed = get_install_status()
    if refreshed["weights_downloaded"]:
        await log("[SETUP] Model weights already present, skipping download.")
        await log("[SETUP] Setup complete! Model is ready for predictions.")
        return {"success": True, "status": refreshed}

    await log("[SETUP] Downloading model weights (~2GB). This may take several minutes...")

    # Set up the OpenFold cache directory (what setup_openfold.py does interactively)
    openfold_cache = Path.home() / ".openfold3"
    openfold_cache.mkdir(parents=True, exist_ok=True)
    ckpt_root_file = openfold_cache / "ckpt_root"
    ckpt_root_file.write_text(str(openfold_cache))
    
    # Find and run the download script directly
    download_script = REPO_DIR / "openfold3" / "scripts" / "download_openfold3_params.sh"
    
    if download_script.exists():
        # Check for AWS CLI
        aws_cmd = shutil.which("aws")
        if not aws_cmd:
            await log("[SETUP] AWS CLI not found. Installing via pip...")
            pip_cmd = shutil.which("pip3") or shutil.which("pip") or "pip3"
            install_proc = await asyncio.create_subprocess_exec(
                pip_cmd, "install", "awscli",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await install_proc.communicate()
            aws_cmd = shutil.which("aws")
            if not aws_cmd:
                await log("[WARN] AWS CLI install may need PATH refresh. Trying anyway...")

        env = os.environ.copy()
        env["OPENFOLD_CACHE"] = str(openfold_cache)

        proc = await asyncio.create_subprocess_exec(
            "bash", str(download_script), f"--download_dir={openfold_cache}",
            cwd=str(REPO_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=env,
        )
        # Stream output
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            decoded = line.decode().strip()
            if decoded:
                await log(f"[WEIGHTS] {decoded}")
        await proc.wait()
        if proc.returncode != 0:
            await log(f"[ERROR] Weight download failed (exit code {proc.returncode})")
            return {"success": False, "error": f"Weight download failed (exit {proc.returncode})", "step": "weights"}
        await log("[SETUP] Weights downloaded successfully.")
    else:
        # Fallback: try aws s3 cp directly
        await log("[SETUP] Download script not found, attempting direct S3 download...")
        proc = await asyncio.create_subprocess_exec(
            "aws", "s3", "cp",
            "s3://openfold/openfold3_params/of3_ft3_v1.pt",
            str(openfold_cache) + "/",
            "--no-sign-request",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            decoded = line.decode().strip()
            if decoded:
                await log(f"[WEIGHTS] {decoded}")
        await proc.wait()
        if proc.returncode != 0:
            await log("[ERROR] Direct S3 download failed")
            return {"success": False, "error": "Weight download failed", "step": "weights"}

    await log("[SETUP] Setup complete! Model is ready for predictions.")
    return {"success": True, "status": get_install_status()}


def build_query_json(entities: list[dict], job_dir: Path) -> Path:
    """
    Convert frontend entity format to OpenFold3 query JSON.
    
    OpenFold3-MLX expects:
    {
      "seeds": [42],
      "queries": {
        "job_id": {
          "chains": [
            { "molecule_type": "protein", "chain_ids": ["A"], "sequence": "..." },
            ...
          ]
        }
      }
    }
    """
    chains = []
    chain_id_counter = 65  # 'A', 'B', 'C'...

    for entity in entities:
        etype = entity["type"].lower()
        seq = entity.get("sequence", "")
        count = entity.get("count", 1)
        
        # OpenFold3 expects molecule_type to be 'protein', 'dna', 'rna', or 'ligand'
        mol_type = etype
        if etype == "protein":
            # OK
            pass
        elif etype in ["dna", "rna"]:
            # OK
            pass
        elif etype == "ligand":
            # OK
            pass
        else:
            # Default to protein if unknown
            mol_type = "protein"

        for _ in range(count):
            chain_id = chr(chain_id_counter)
            chains.append({
                "molecule_type": mol_type,
                "chain_ids": [chain_id],
                "sequence": seq if etype != "ligand" else None,
                "smiles": seq if etype == "ligand" else None,
            })
            chain_id_counter += 1
            if chain_id_counter > 90:  # Wrap after 'Z'
                chain_id_counter = 65

    query = {
        "seeds": [42],
        "queries": {
            "mlx-fold-studio-job": {
                "chains": chains
            }
        }
    }

    query_path = job_dir / "query.json"
    with open(query_path, "w") as f:
        json.dump(query, f, indent=2)

    return query_path


async def start_prediction(entities: list[dict], log_callback=None) -> dict:
    """
    Start a prediction job. Returns a job dict with an ID for tracking.
    """
    ensure_dirs()

    async def log(msg: str):
        if log_callback:
            await log_callback(msg)

    status = get_install_status()
    if not status["ready"]:
        return {
            "success": False,
            "error": "OpenFold3-MLX is not fully set up. Run setup first.",
        }

    # Create job
    job_id = str(uuid.uuid4())
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    output_dir = job_dir / "output"
    output_dir.mkdir(exist_ok=True)

    # Build query JSON
    query_path = build_query_json(entities, job_dir)
    await log(f"[JOB {job_id[:8]}] Created query JSON at {query_path}")

    # Store job info
    job = {
        "id": job_id,
        "status": "running",
        "progress": 0,
        "created_at": datetime.now().isoformat(),
        "query_path": str(query_path),
        "output_dir": str(output_dir),
        "error": None,
        "results": None,
    }
    _jobs[job_id] = job

    # Save job metadata
    with open(job_dir / "job.json", "w") as f:
        json.dump(job, f, indent=2, default=str)

    # Launch prediction subprocess
    asyncio.create_task(_run_prediction_subprocess(job_id, query_path, output_dir, log))

    return {"success": True, "job_id": job_id, "job": job}


async def _run_prediction_subprocess(
    job_id: str, query_path: Path, output_dir: Path, log
):
    """Run the actual OpenFold3-MLX prediction as a subprocess."""
    job = _jobs[job_id]

    try:
        await log(f"[JOB {job_id[:8]}] Starting prediction pipeline...")
        job["progress"] = 5

        # Call run_openfold.py directly via python
        run_openfold = REPO_DIR / "openfold3" / "run_openfold.py"
        mlx_runner = REPO_DIR / "examples" / "example_runner_yamls" / "mlx_runner.yml"

        if not run_openfold.exists():
             await log(f"[ERROR] run_openfold.py not found at {run_openfold}")
             job["status"] = "error"
             job["error"] = "run_openfold.py not found"
             return

        cmd = [
            sys.executable, str(run_openfold), "predict",
            "--query_json", str(query_path),
            "--output_dir", str(output_dir),
            "--num_diffusion_samples", "1" # Fast test run
        ]
        
        if mlx_runner.exists():
            cmd.extend(["--runner_yaml", str(mlx_runner)])

        await log(f"[JOB {job_id[:8]}] Executing: {' '.join(cmd[:6])}...")
        job["progress"] = 10

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(REPO_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )

        # Stream output and estimate progress
        line_count = 0
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            decoded = line.decode().strip()
            if decoded:
                await log(f"[PREDICT] {decoded}")
                line_count += 1
                # Estimate progress based on output lines (rough heuristic)
                estimated = min(10 + (line_count * 2), 95)
                job["progress"] = estimated

        await proc.wait()

        if proc.returncode == 0:
            job["status"] = "complete"
            job["progress"] = 100
            # Find output files
            results = _find_result_files(output_dir)
            if not results:
                # Check job_dir root too
                results = _find_result_files(JOBS_DIR / job_id)
            job["results"] = results
            await log(f"[JOB {job_id[:8]}] Prediction complete! Found {len(results)} output files.")
        else:
            job["status"] = "error"
            job["error"] = f"Prediction failed with exit code {proc.returncode}"
            await log(f"[ERROR] Prediction failed with exit code {proc.returncode}")

    except Exception as e:
        job["status"] = "error"
        job["error"] = str(e)
        await log(f"[ERROR] {str(e)}")

    # Save updated job metadata
    job_dir = JOBS_DIR / job_id
    with open(job_dir / "job.json", "w") as f:
        json.dump(job, f, indent=2, default=str)


def _find_result_files(directory: Path) -> list[dict]:
    """Find PDB and mmCIF files in a directory tree."""
    results = []
    if not directory.exists():
        return results

    for ext in ["*.pdb", "*.cif", "*.mmcif"]:
        for f in directory.rglob(ext):
            results.append({
                "filename": f.name,
                "path": str(f),
                "format": "pdb" if f.suffix == ".pdb" else "mmcif",
                "size_bytes": f.stat().st_size,
            })
    return results


def get_job(job_id: str) -> Optional[dict]:
    """Get job info by ID."""
    if job_id in _jobs:
        return _jobs[job_id]

    # Try loading from disk
    job_file = JOBS_DIR / job_id / "job.json"
    if job_file.exists():
        with open(job_file) as f:
            job = json.load(f)
            _jobs[job_id] = job
            return job

    return None


def get_result_file_path(job_id: str, filename: str) -> Optional[Path]:
    """Get the full path to a result file."""
    job = get_job(job_id)
    if not job or not job.get("results"):
        return None

    for result in job["results"]:
        if result["filename"] == filename:
            path = Path(result["path"])
            if path.exists():
                return path
    return None
