"""
Script Type Detection for ModuleScript Support

Detects whether Lua source code is a ModuleScript (returns a value) or
a regular Script (no return). Handles edge cases like returns inside
strings, comments, and nested functions.

Requirements: 3.3 - Auto-detection of script type
"""

import re
from enum import Enum
from typing import Tuple


class ScriptType(Enum):
    """Script type enumeration for obfuscator output mode."""
    SCRIPT = "script"   # Regular Script/LocalScript - no return
    MODULE = "module"   # ModuleScript - returns a value
    AUTO = "auto"       # Auto-detect from source


class ScriptTypeDetector:
    """
    Detects whether Lua source code is a ModuleScript based on return statement analysis.
    
    A ModuleScript must have a top-level return statement (not inside a function).
    This detector handles:
    - Returns inside string literals (ignored)
    - Returns inside comments (ignored)
    - Returns inside nested functions (ignored - not top-level)
    - Multiple return values (detected for warning)
    """
    
    def __init__(self):
        # Pattern to match string literals (single, double, long strings)
        self._string_pattern = re.compile(
            r'\"(?:[^\"\\]|\\.)*\"|'  # Double-quoted strings
            r"\'(?:[^\'\\]|\\.)*\'|"  # Single-quoted strings
            r'\[\[.*?\]\]|'           # Long strings [[...]]
            r'\[=+\[.*?\]=+\]',       # Long strings [=[...]=]
            re.DOTALL
        )
        # Pattern to match comments
        self._comment_pattern = re.compile(
            r'--\[\[.*?\]\]|'         # Block comments --[[...]]
            r'--\[=+\[.*?\]=+\]|'     # Block comments --[=[...]=]
            r'--[^\n]*',              # Line comments
            re.DOTALL
        )

    def _strip_strings_and_comments(self, source: str) -> str:
        """
        Remove string literals and comments from source to avoid false positives.
        Replaces them with spaces to preserve character positions.
        """
        # First remove comments (they might contain string-like patterns)
        result = self._comment_pattern.sub(lambda m: ' ' * len(m.group()), source)
        # Then remove strings
        result = self._string_pattern.sub(lambda m: ' ' * len(m.group()), result)
        return result
    
    def _get_nesting_depth(self, source: str, position: int) -> int:
        """
        Calculate function nesting depth at a given position.
        Returns 0 if at top level, >0 if inside function(s).
        
        Only counts 'function' blocks - if/for/while/do don't affect
        whether a return is "top-level" for ModuleScript purposes.
        """
        # Get source up to position
        prefix = source[:position]
        
        # Count function/end pairs
        # We need to track function starts and their matching ends
        # This is simplified but handles most cases
        depth = 0
        
        # Track all block openers and function specifically
        # We need to match 'end' with the right opener
        block_stack = []  # Stack of block types
        
        # Pattern for block keywords
        block_pattern = re.compile(
            r'\b(function|do|if|for|while|repeat)\b|\b(end|until)\b', 
            re.IGNORECASE
        )
        
        for match in block_pattern.finditer(prefix):
            opener = match.group(1)
            closer = match.group(2)
            
            if opener:
                opener = opener.lower()
                block_stack.append(opener)
            elif closer:
                closer = closer.lower()
                if block_stack:
                    # 'until' closes 'repeat', 'end' closes everything else
                    if closer == 'until':
                        # Find and remove the last 'repeat'
                        for i in range(len(block_stack) - 1, -1, -1):
                            if block_stack[i] == 'repeat':
                                block_stack.pop(i)
                                break
                    else:  # 'end'
                        # Remove the last non-repeat block
                        for i in range(len(block_stack) - 1, -1, -1):
                            if block_stack[i] != 'repeat':
                                block_stack.pop(i)
                                break
        
        # Count only 'function' entries in the stack
        depth = sum(1 for b in block_stack if b == 'function')
        
        return depth
    
    def has_return_statement(self, source: str) -> bool:
        """
        Check if source has a top-level return statement.
        
        A top-level return is one that's not inside a function definition.
        This is what makes a script a ModuleScript.
        """
        # Strip strings and comments first
        clean_source = self._strip_strings_and_comments(source)
        
        # Find all return statements
        return_pattern = re.compile(r'\breturn\b', re.IGNORECASE)
        
        for match in return_pattern.finditer(clean_source):
            pos = match.start()
            # Check if this return is at top level (not inside a function)
            if self._get_nesting_depth(clean_source, pos) == 0:
                return True
        
        return False
    
    def get_return_count(self, source: str) -> int:
        """
        Count number of values in the final top-level return statement.
        
        Returns:
            0 if no return or just 'return' with no value
            1+ for number of comma-separated values
        """
        clean_source = self._strip_strings_and_comments(source)
        
        # Find the last top-level return
        return_pattern = re.compile(r'\breturn\b\s*([^\n;]*)', re.IGNORECASE)
        
        last_return_values = None
        for match in return_pattern.finditer(clean_source):
            pos = match.start()
            if self._get_nesting_depth(clean_source, pos) == 0:
                last_return_values = match.group(1).strip()
        
        if last_return_values is None or last_return_values == '':
            return 0
        
        # Count commas (simplified - doesn't handle nested tables/calls perfectly)
        # But good enough for warning purposes
        return last_return_values.count(',') + 1
    
    def detect(self, source: str) -> ScriptType:
        """
        Analyze source to determine script type.
        
        Returns:
            ScriptType.MODULE if source has top-level return statement
            ScriptType.SCRIPT otherwise
        """
        if self.has_return_statement(source):
            return ScriptType.MODULE
        return ScriptType.SCRIPT
