"""
System detection utilities for MLX Fold Studio.
Detects Apple Silicon chip, memory, macOS version, Python version, etc.
"""

import platform
import subprocess
import shutil
import psutil


def get_system_info() -> dict:
    """Gather system information relevant to OpenFold3-MLX compatibility."""
    info = {
        "platform": platform.system(),
        "platform_version": platform.mac_ver()[0] if platform.system() == "Darwin" else None,
        "architecture": platform.machine(),
        "processor": _get_chip_name(),
        "python_version": platform.python_version(),
        "memory_gb": round(psutil.virtual_memory().total / (1024 ** 3), 1),
        "memory_available_gb": round(psutil.virtual_memory().available / (1024 ** 3), 1),
        "is_apple_silicon": _is_apple_silicon(),
        "has_python3": shutil.which("python3") is not None,
        "has_git": shutil.which("git") is not None,
        "has_pip": shutil.which("pip3") is not None or shutil.which("pip") is not None,
    }
    return info


def _get_chip_name() -> str:
    """Get the Apple Silicon chip name (e.g. 'Apple M4')."""
    if platform.system() != "Darwin":
        return platform.processor()
    try:
        result = subprocess.run(
            ["sysctl", "-n", "machdep.cpu.brand_string"],
            capture_output=True, text=True, timeout=5
        )
        return result.stdout.strip() if result.returncode == 0 else platform.processor()
    except Exception:
        return platform.processor()


def _is_apple_silicon() -> bool:
    """Check if running on Apple Silicon."""
    return platform.system() == "Darwin" and platform.machine() == "arm64"


def check_compatibility() -> dict:
    """Check if the system meets OpenFold3-MLX requirements."""
    info = get_system_info()
    issues = []

    if not info["is_apple_silicon"]:
        issues.append("OpenFold3-MLX requires Apple Silicon (M1 or later)")

    if info["platform"] != "Darwin":
        issues.append("OpenFold3-MLX requires macOS")

    if info["memory_gb"] < 8:
        issues.append(f"Minimum 8GB RAM required (found {info['memory_gb']}GB)")
    elif info["memory_gb"] < 16:
        issues.append(f"16GB+ RAM recommended for larger proteins (found {info['memory_gb']}GB)")

    if not info["has_git"]:
        issues.append("Git is required but not found")

    if not info["has_python3"]:
        issues.append("Python 3 is required but not found")

    python_parts = info["python_version"].split(".")
    if int(python_parts[0]) < 3 or (int(python_parts[0]) == 3 and int(python_parts[1]) < 10):
        issues.append(f"Python 3.10+ required (found {info['python_version']})")

    return {
        "compatible": len([i for i in issues if "recommended" not in i.lower()]) == 0,
        "issues": issues,
        "system": info,
    }
