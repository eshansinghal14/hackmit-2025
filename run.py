#!/usr/bin/env python3
"""
AI Whiteboard Tutor - Development Runner
Starts both backend and frontend development servers
"""
import subprocess
import sys
import os
import time
import signal
import threading
from pathlib import Path

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_colored(text, color=Colors.ENDC):
    print(f"{color}{text}{Colors.ENDC}")

def check_requirements():
    """Check if Python and Node.js are available"""
    print_colored("🔍 Checking requirements...", Colors.BLUE)
    
    # Check Python
    try:
        python_version = subprocess.check_output([sys.executable, "--version"], text=True).strip()
        print_colored(f"✓ {python_version}", Colors.GREEN)
    except Exception as e:
        print_colored(f"❌ Python check failed: {e}", Colors.FAIL)
        return False
    
    # Check Node.js
    try:
        node_version = subprocess.check_output(["node", "--version"], text=True).strip()
        print_colored(f"✓ Node.js {node_version}", Colors.GREEN)
    except Exception as e:
        print_colored("❌ Node.js not found. Please install Node.js 18+ and npm", Colors.FAIL)
        return False
    
    return True

def setup_backend():
    """Setup backend dependencies"""
    print_colored("🔧 Setting up backend...", Colors.BLUE)
    
    backend_path = Path(__file__).parent / "backend"
    venv_path = backend_path / "venv"
    
    # Create virtual environment if it doesn't exist
    if not venv_path.exists():
        try:
            subprocess.run([
                "python3", "-m", "venv", "venv"
            ], cwd=backend_path, check=True, capture_output=True)
            print_colored("✓ Virtual environment created", Colors.GREEN)
        except subprocess.CalledProcessError as e:
            print_colored(f"❌ Failed to create virtual environment: {e}", Colors.FAIL)
            return False
    
    # Install dependencies in virtual environment
    venv_pip = venv_path / "bin" / "pip"
    try:
        # Upgrade pip first
        subprocess.run([
            str(venv_pip), "install", "--upgrade", "pip", "setuptools", "wheel"
        ], cwd=backend_path, check=True, capture_output=True)
        
        # Install requirements
        subprocess.run([
            str(venv_pip), "install", "-r", "requirements.txt"
        ], cwd=backend_path, check=True, capture_output=True)
        print_colored("✓ Backend dependencies installed", Colors.GREEN)
        return True
    except subprocess.CalledProcessError as e:
        print_colored(f"❌ Backend setup failed: {e}", Colors.FAIL)
        return False

def setup_frontend():
    """Setup frontend dependencies"""
    print_colored("🔧 Setting up frontend...", Colors.BLUE)
    
    frontend_path = Path(__file__).parent / "frontend"
    
    # Install Node.js dependencies
    try:
        subprocess.run(["npm", "install"], cwd=frontend_path, check=True, capture_output=True)
        print_colored("✓ Frontend dependencies installed", Colors.GREEN)
        return True
    except subprocess.CalledProcessError as e:
        print_colored(f"❌ Frontend setup failed: {e}", Colors.FAIL)
        return False

def start_backend():
    """Start the FastAPI backend server"""
    print_colored("🚀 Starting backend server...", Colors.BLUE)
    
    backend_path = Path(__file__).parent / "backend"
    
    # Check if virtual environment exists and use it
    venv_python = backend_path / "venv" / "bin" / "python"
    if venv_python.exists():
        python_cmd = str(venv_python)
    else:
        python_cmd = "python3"
    
    return subprocess.Popen([
        python_cmd, "main.py"
    ], cwd=backend_path)

def start_frontend():
    """Start the React frontend development server"""
    print_colored("🚀 Starting frontend server...", Colors.BLUE)
    
    frontend_path = Path(__file__).parent / "frontend"
    return subprocess.Popen([
        "npm", "run", "dev"
    ], cwd=frontend_path)

def main():
    """Main runner function"""
    print_colored("🎨 AI Whiteboard Tutor - Development Runner", Colors.HEADER)
    print_colored("=" * 50, Colors.BLUE)
    
    # Check if we have the required tools
    if not check_requirements():
        sys.exit(1)
    
    # Setup dependencies
    setup_needed = not (Path("backend/venv").exists() or Path("frontend/node_modules").exists())
    
    if setup_needed or "--setup" in sys.argv:
        print_colored("\n📦 Setting up dependencies...", Colors.WARNING)
        if not setup_backend() or not setup_frontend():
            sys.exit(1)
        print_colored("✅ Setup completed!", Colors.GREEN)
    
    # Start servers
    print_colored("\n🚀 Starting development servers...", Colors.WARNING)
    
    backend_process = None
    frontend_process = None
    
    try:
        # Start backend
        backend_process = start_backend()
        time.sleep(3)  # Give backend time to start
        
        # Start frontend
        frontend_process = start_frontend()
        
        print_colored("\n" + "=" * 50, Colors.GREEN)
        print_colored("🎉 AI Whiteboard Tutor is starting up!", Colors.GREEN)
        print_colored("📱 Frontend: http://localhost:3000", Colors.BLUE)
        print_colored("🔧 Backend: http://localhost:8000", Colors.BLUE)
        print_colored("📚 API Docs: http://localhost:8000/docs", Colors.BLUE)
        print_colored("=" * 50, Colors.GREEN)
        print_colored("\n💡 Press Ctrl+C to stop all servers", Colors.WARNING)
        
        # Wait for processes
        while True:
            time.sleep(1)
            
            # Check if processes are still running
            if backend_process.poll() is not None:
                print_colored("❌ Backend server stopped unexpectedly", Colors.FAIL)
                break
                
            if frontend_process.poll() is not None:
                print_colored("❌ Frontend server stopped unexpectedly", Colors.FAIL)
                break
    
    except KeyboardInterrupt:
        print_colored("\n\n🛑 Shutting down servers...", Colors.WARNING)
        
        # Terminate processes gracefully
        if backend_process:
            backend_process.terminate()
        if frontend_process:
            frontend_process.terminate()
        
        # Wait a bit for graceful shutdown
        time.sleep(2)
        
        # Force kill if still running
        if backend_process and backend_process.poll() is None:
            backend_process.kill()
        if frontend_process and frontend_process.poll() is None:
            frontend_process.kill()
        
        print_colored("✅ All servers stopped", Colors.GREEN)
    
    except Exception as e:
        print_colored(f"❌ Error: {e}", Colors.FAIL)
        sys.exit(1)

if __name__ == "__main__":
    main()
