#!/usr/bin/env python3
"""Analyze diff_obfuscator output to understand how it avoids recursive require."""

import re

with open('diff_obfuscator_demo_L3_obfuscated.lua', 'r', encoding='utf-8', errors='replace') as f:
    diff = f.read()

print("=== DIFF OBFUSCATOR ANALYSIS ===")
print(f"Total length: {len(diff)}")
print()

# Check the structure
print("First 200 chars:")
print(diff[:200])
print()

# Check the end
print("Last 300 chars:")
print(diff[-300:])
print()

# Find all function definitions
func_defs = re.findall(r'function\s*\([^)]*\)', diff)
print(f"Function definitions: {len(func_defs)}")

# Check for coroutine usage (key for avoiding recursive require)
coroutine_count = diff.count('coroutine')
print(f"coroutine mentions: {coroutine_count}")

# Check for pcall/xpcall
pcall_count = diff.count('pcall')
xpcall_count = diff.count('xpcall')
print(f"pcall: {pcall_count}, xpcall: {xpcall_count}")

# Check for the main execution pattern
# Look for how they execute the bytecode
print()
print("Looking for execution pattern...")

# Find 'be()' or similar final call
final_calls = re.findall(r'\b\w+\(\)\s*end\s*\)\s*\(\s*\.\.\.\s*\)', diff[-2000:])
print(f"Final call patterns: {final_calls[:3]}")
