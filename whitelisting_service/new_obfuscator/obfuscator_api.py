#!/usr/bin/env python3
"""
Vectabase Obfuscator API Server

A simple Flask API that wraps obfuscate.py for the web interface.
Run this on your VPS alongside the website.

Usage:
    python obfuscator_api.py
    
The server runs on port 5050 by default.
"""

import os
import sys
import tempfile
import subprocess
import time
import hashlib
from pathlib import Path
from functools import wraps
from collections import defaultdict
from flask import Flask, request, jsonify, abort
from flask_cors import CORS

app = Flask(__name__)

# SECURITY: Only allow requests from your domains
ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:5173",
    "https://vectabase.com",
    "https://www.vectabase.com",
    # Add your production domain here
]

CORS(app, origins=ALLOWED_ORIGINS, supports_credentials=True)

# Path to obfuscate.py (same directory)
OBFUSCATOR_PATH = Path(__file__).parent / "obfuscate.py"

# Rate limiting storage
rate_limit_storage = defaultdict(list)
RATE_LIMIT_REQUESTS = 10  # Max requests
RATE_LIMIT_WINDOW = 60  # Per 60 seconds

# API Key for additional security (set in environment)
API_KEY = os.environ.get('OBFUSCATOR_API_KEY', None)

def get_client_ip():
    """Get client IP address"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr

def rate_limit(f):
    """Rate limiting decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_ip = get_client_ip()
        current_time = time.time()
        
        # Clean old entries
        rate_limit_storage[client_ip] = [
            t for t in rate_limit_storage[client_ip] 
            if current_time - t < RATE_LIMIT_WINDOW
        ]
        
        # Check rate limit
        if len(rate_limit_storage[client_ip]) >= RATE_LIMIT_REQUESTS:
            return jsonify({
                "success": False,
                "error": "Rate limit exceeded. Please wait before trying again."
            }), 429
        
        # Add current request
        rate_limit_storage[client_ip].append(current_time)
        
        return f(*args, **kwargs)
    return decorated_function

def validate_api_key():
    """Validate API key if configured"""
    if API_KEY:
        provided_key = request.headers.get('X-API-Key')
        if not provided_key or provided_key != API_KEY:
            abort(401, description="Invalid or missing API key")

def validate_origin():
    """Validate request origin"""
    origin = request.headers.get('Origin', '')
    referer = request.headers.get('Referer', '')
    
    # Allow requests without origin (direct API calls from server)
    if not origin and not referer:
        return
    
    # Check if origin is allowed
    if origin and origin not in ALLOWED_ORIGINS:
        # Check if it's a subdomain or path variant
        allowed = False
        for allowed_origin in ALLOWED_ORIGINS:
            if origin.startswith(allowed_origin.replace('https://', 'https://').replace('http://', 'http://')):
                allowed = True
                break
        if not allowed:
            abort(403, description="Origin not allowed")

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "vectabase-obfuscator"})

@app.route('/obfuscate', methods=['POST'])
@rate_limit
def obfuscate():
    """
    Obfuscate Lua code using obfuscate.py
    
    Request body:
        {
            "code": "-- Lua code here",
            "level": "L1" | "L2" | "L3"  (optional, defaults to L2)
        }
    
    Response:
        {
            "success": true,
            "obfuscated": "-- obfuscated code",
            "inputSize": 123,
            "outputSize": 456,
            "level": "L2"
        }
    """
    # Security checks
    validate_origin()
    
    try:
        data = request.get_json()
        
        if not data or 'code' not in data:
            return jsonify({"error": "Code is required"}), 400
        
        code = data['code']
        level = data.get('level', 'L2')
        
        # Validate level
        if level not in ['L1', 'L2', 'L3']:
            return jsonify({"error": "Invalid level. Use L1, L2, or L3"}), 400
        
        if not code.strip():
            return jsonify({"error": "Code cannot be empty"}), 400
        
        # SECURITY: Limit code size to prevent DoS
        MAX_CODE_SIZE = 500000  # 500KB max
        if len(code) > MAX_CODE_SIZE:
            return jsonify({"error": f"Code too large. Maximum size is {MAX_CODE_SIZE} bytes"}), 400
        
        # SECURITY: Basic input sanitization - reject obviously malicious patterns
        dangerous_patterns = [
            'os.execute', 'io.popen', 'loadstring', 'dofile', 'loadfile',
            '__index', '__newindex', 'debug.', 'package.loadlib'
        ]
        code_lower = code.lower()
        for pattern in dangerous_patterns:
            if pattern in code_lower:
                # Log suspicious activity
                print(f"[SECURITY] Blocked suspicious pattern '{pattern}' from IP: {get_client_ip()}")
                return jsonify({"error": "Code contains potentially dangerous patterns"}), 400
        
        # Create temp files for input/output
        with tempfile.NamedTemporaryFile(mode='w', suffix='.lua', delete=False, encoding='utf-8') as input_file:
            input_file.write(code)
            input_path = input_file.name
        
        output_path = input_path.replace('.lua', '_obfuscated.lua')
        
        try:
            # Run obfuscate.py - level is positional arg AFTER input but BEFORE -o
            # Usage: python obfuscate.py input.lua L2 -o output.lua
            cmd = [sys.executable, str(OBFUSCATOR_PATH), input_path, level, '-o', output_path]
            print(f"Running command: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,  # 2 minute timeout
                cwd=str(OBFUSCATOR_PATH.parent)
            )
            
            print(f"Return code: {result.returncode}")
            if result.stdout:
                print(f"Stdout: {result.stdout[:500]}")
            if result.stderr:
                print(f"Stderr: {result.stderr[:500]}")
            
            if result.returncode != 0:
                error_msg = result.stderr.strip() if result.stderr else result.stdout.strip()
                return jsonify({
                    "success": False,
                    "error": f"Obfuscation failed: {error_msg}"
                }), 500
            
            # Read obfuscated output
            if not os.path.exists(output_path):
                return jsonify({
                    "success": False,
                    "error": "Obfuscation produced no output"
                }), 500
            
            with open(output_path, 'r', encoding='utf-8') as f:
                obfuscated = f.read()
            
            return jsonify({
                "success": True,
                "obfuscated": obfuscated,
                "inputSize": len(code),
                "outputSize": len(obfuscated),
                "level": level
            })
            
        finally:
            # Cleanup temp files
            try:
                os.unlink(input_path)
            except:
                pass
            try:
                os.unlink(output_path)
            except:
                pass
                
    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False,
            "error": "Obfuscation timed out (max 2 minutes)"
        }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        }), 500

if __name__ == '__main__':
    print("=" * 50)
    print("Vectabase Obfuscator API Server")
    print("=" * 50)
    print(f"Obfuscator path: {OBFUSCATOR_PATH}")
    print(f"Obfuscator exists: {OBFUSCATOR_PATH.exists()}")
    print()
    print("Starting server on http://0.0.0.0:5050")
    print("Endpoints:")
    print("  GET  /health    - Health check")
    print("  POST /obfuscate - Obfuscate Lua code")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5050, debug=False)
