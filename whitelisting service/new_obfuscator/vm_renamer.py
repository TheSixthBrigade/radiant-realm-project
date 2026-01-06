#!/usr/bin/env python3
"""
Simple VM Variable Renamer

Renames all local variables, function parameters, and for loop variables
in the VM template. Uses a global rename map - each unique variable name
gets one obfuscated name.

Key rules:
1. Only rename identifiers that are DECLARED (local, function param, for var)
2. Never rename after . or : (field access)
3. Never rename keywords, builtins, API fields, or Roblox globals
"""

import re
import sys
from pathlib import Path
from typing import Dict, Set, Tuple

sys.path.insert(0, str(Path(__file__).parent))

from core.seed import PolymorphicBuildSeed
from core.naming import UnifiedNamingSystem, ROBLOX_GLOBALS


# Keywords - never rename
KEYWORDS = frozenset({
    'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
    'function', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or',
    'repeat', 'return', 'then', 'true', 'until', 'while', 'continue',
})

# API fields - never rename (external interfaces only)
# ONLY include fields that are accessed by EXTERNAL code
API_FIELDS = frozenset({
    # Table pack field (Lua standard)
    'n',
    # Metatable fields (Lua standard)
    '__mode', '__index', '__newindex', '__call', '__tostring',
    # Single-letter instruction fields (too risky to rename)
    'A', 'B', 'C', 'D', 'E', 'K', 'K0', 'K1', 'K2', 'KC', 'KN', 'k',
})

# Internal VM field names that SHOULD be renamed for obfuscation
# ALL names are 31 characters using ONLY: l, I, O, 0, 1, _
# NO READABLE FRAGMENTS - pure confusing patterns only!
INTERNAL_FIELD_RENAMES = {
    # Proto/function fields
    'proto': 'lI0O1_Il1lI1lOO0O1_Il1lI1l0O1',
    'protos': 'l1O0I_I1llI1lOO0O1_1_0Il1lI01',
    'code': 'O01OI0__OlO1Ol101_1ll_O01Ol1I',
    'debugcode': 'O01OI0__OlO1Ol1_1ll_O01Ol1I0',
    'sizecode': 'O01OI0__OlO1Ol101_1l_Il1lI1l0',
    'instructionlineinfo': '_OI11II_I11l0O1_Il1lI1lOO0O1',
    'lineinfoenabled': 'lI0O1_Il1lI1lOO0O1_Il1lI1l01',
    'constants': 'Il1lI1lOO0O1_Il1lI1l_O01OI0_',
    'sizek': 'Il1lI1lOO0O1_Il1l_O01OI0__Ol',
    'upvalues': 'I1lOO0O1_Il1lI1lOO0O1_0l1I_01',
    'nups': 'I1lOO0O1_1l0_Il1lI1l_O0O1_Il',
    'numparams': 'O0O1_Il1lI1lOO0O1_Il_1l0I1_01',
    'maxstacksize': '_1ll_O01Oll0lI_Il1lI_0I1l0_01',
    'isvararg': 'lI0O1_Il1lI1lOO0O1_I_0l1I_011',
    'linedefined': 'O0O1_1l0I1_Il1lI1lO_I1lOO0_01',
    'debugname': 'lI0O1_Il1lI1lOO0O1_Il_O01O_01',
    'sizep': 'Il1lI1lOO0O1_Il1l_O01OI0__01',
    'bytecodeid': 'lI0O1_Il1lI1lOO0O1_0I1l0_0101',
    'flags': 'O01OI0_OlO1Ol101_1ll_O_1l0I_1',
    'typeinfo': 'lI0O1_Il1lI1lOO0O1_Il_I1lO_01',
    
    # Instruction fields
    'opcode': 'O01OI0__OlO1Ol101_0l1I_Il1lI1',
    'opname': 'Il1lI1lOO0O1_Il1l_0l1I_O01OI',
    'opmode': 'O01OI0__OlO1Ol101_0l1I_Il1lI0',
    'kmode': 'Il1lI1lOO0O1_Il1lI_0l1_O01OI',
    'usesAux': 'lI0O1_Il1lI1lOO0O1_Il_0l1I0_1',
    'aux': 'O01OI0__OlO1Ol101_1_0l_Il1lI1',
    'value': 'Il1lI1lOO0O1_Il1lI_0l1_O01O0',
    
    # Upvalue fields
    'store': 'O01OI0__OlO1Ol10_Il1lI1_0l1_1',
    'index': 'lI0O1_Il1lI1lOO0_O01OI_0l1_01',
    'len': 'I1lOO0O1_0l1_Il1lI1lO_1ll_O01',
    'list': 'O01OI0_0l1I_Ol101_1ll_Il1lI01',
    
    # Deserialize return fields - these are BOTH local variables AND table keys
    # The _apply_field_renames method will sync the variable rename to match
    'stringList': 'O01OI0_OlO1O_Il1lI1l_0l1I01_1',
    'protoList': 'Il1lI1lOO0O1_I1lOO0_0l1I01_1',
    'mainProto': 'lI0O1_Il1lI1lO_O01OI_0l1I0_01',
    'typesVersion': 'I1lOO0O1_Il1lI_O0O1__0l1I0_1',
    
    # Settings fields
    'decodeOp': 'Il1lI1lOO0O1_Il1l_0l1I_O01OI',
    'callHooks': 'O01OI0__OlO1Ol1_0l1I0_Il1lI1',
    'errorHandling': 'Il1lI1lOO0O1_I_0l1I01_O01OI0',
    'allowProxyErrors': 'O01OI0__Ol_0l1I01lI0_Il1lI1l',
    'useImportConstants': 'Il1lI1lOO0_0l1I01lI0_O01OI01',
    'staticEnvironment': 'O01OI0__OlO1O_0l1I0_Il1lI1l0',
    'useNativeNamecall': 'Il1lI1lOO0_0l1I01lI01_O01OI01',
    'namecallHandler': 'O01OI0__OlO_0l1I01lI0_Il1lI1l',
    'generalizedIteration': 'Il1lI1lOO0O_0l1I01lI_O01OI0_1',
    
    # Hook fields - these are BOTH local variables AND field accesses
    # The _apply_field_renames method will sync the variable rename to match
    'breakHook': 'Il1lI1lOO0O1_Il_0l1I0_O01OI0',
    'stepHook': 'O01OI0__OlO1Ol1_0l1I0_Il1lI1',
    'interruptHook': '_1ll_O01Oll0lI_0l_Il1_O0O1_01',
    'panicHook': 'O01OI0__OlO1Ol1_0l1I0_Il1lI0',
    
    # State fields
    'pc': 'lI0O1_0l_Il1lI1lOO0O1_O01O_01',
    'top': 'I1lOO0O1_0l_Il1lI1lO_1ll_O_01',
    'name': 'Il1lI1lOO0O1_Il1lI1_0l_O01OI',
    'openupvals': 'Il1lI1lOO0O1_O01OI0_0l1I01_1',
    'varargs': 'O01OI0_OlO1Ol1_Il1lI1_0l1I0_1',
    'stack': 'O01OI0_0l1_Ol101_1ll_Il1lI_01',
    'base': 'Il1lI1lOO0O1_0l_1l_O01OI0__01',
    'env': 'O0O1_0l1_Il1lI1lOO0O_I1lOO_01',
    
    # Opcode mode fields
    'oo_0': 'lI0O1_Il1lI1lOO0O1_0l1I0_0101',
    'Io_1': 'O01OI0__OlO1Ol101_0l1I0_Il1l',
    'lo_1': 'Il1lI1lOO0O1_Il1l_0l1I0_O01O',
    'Oo_1': 'O01OI0__OlO1Ol1_0l1I0_Il1lI0',
    'I0IO1O': 'lI0O1_Il1lI1lOO0O1_0l1I0_011',
    'oo_1': 'I1lOO0O1_Il1lI_0l1I0_O0O1_Il',
    'II_0': 'O0O1_Il1lI1lOO0O1_0l1I0_I1lO',
    'lI_0': 'lI0O1_Il1lI1lOO0O1_0l1I0_O01',
    'OI_0': 'Il1lI1lOO0O1_Il1l_0l1I0_O0I',
    'oI_0': 'O01OI0__OlO1Ol101_0l1I0_Il0',
    'II_1': 'lI0O1_Il1lI1lOO0O1_0l1I0_II1',
    'lI_1': 'I1lOO0O1_Il1lI_0l1I0_O0O1_l1',
}

# Builtins - never rename
BUILTINS = frozenset({
    'type', 'pcall', 'error', 'tonumber', 'tostring', 'assert',
    'setmetatable', 'getmetatable', 'rawget', 'rawset', 'rawequal',
    'select', 'pairs', 'ipairs', 'next', 'unpack', 'print',
    'string', 'table', 'math', 'bit32', 'buffer', 'coroutine',
    'os', 'debug', 'utf8', '_G', '_VERSION', '_ENV', 'getfenv', 'setfenv',
})


class SimpleVMRenamer:
    """Simple but effective VM variable renamer."""
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        self.rename_map: Dict[str, str] = {}
        self.declared: Set[str] = set()
    
    def _should_rename(self, name: str) -> bool:
        """Check if name should be renamed."""
        if name in KEYWORDS:
            return False
        if name in BUILTINS:
            return False
        if name in ROBLOX_GLOBALS:
            return False
        if name in API_FIELDS:
            return False
        if name.startswith('_') and len(name) > 1 and name[1].isupper():
            return False
        # Skip single-char names that might be loop vars used elsewhere
        if len(name) == 1:
            return True  # Still rename them
        return True
    
    def _get_rename(self, name: str) -> str:
        """Get or create rename for a name."""
        if name not in self.rename_map:
            self.rename_map[name] = self.naming.generate_name()
        return self.rename_map[name]
    
    def rename(self, code: str) -> str:
        """Rename variables in the code."""
        # Step 1: Find all declarations
        self._find_declarations(code)
        
        # Step 2: Apply renames
        return self._apply_renames(code)
    
    def _find_declarations(self, code: str):
        """Find all variable declarations."""
        # Pattern for: local var1, var2, var3
        # Captures the variable list after 'local' until = or newline or keyword
        local_pattern = r'\blocal\s+(?!function\b)([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)'
        for match in re.finditer(local_pattern, code):
            vars_str = match.group(1)
            for var in vars_str.split(','):
                var = var.strip()
                if var and self._should_rename(var):
                    self.declared.add(var)
                    self._get_rename(var)
        
        # Pattern for: local function name(
        local_func_pattern = r'\blocal\s+function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\('
        for match in re.finditer(local_func_pattern, code):
            name = match.group(1)
            if self._should_rename(name):
                self.declared.add(name)
                self._get_rename(name)
        
        # Pattern for function parameters: function name(param1, param2, ...)
        # Also matches: function(param1, param2, ...)
        func_pattern = r'\bfunction\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\(([^)]*)\)'
        for match in re.finditer(func_pattern, code):
            params = match.group(1)
            for param in params.split(','):
                param = param.strip()
                if param and param != '...' and self._should_rename(param):
                    self.declared.add(param)
                    self._get_rename(param)
        
        # Anonymous functions: function(param1, param2, ...)
        anon_func_pattern = r'\bfunction\s*\(([^)]*)\)'
        for match in re.finditer(anon_func_pattern, code):
            params = match.group(1)
            for param in params.split(','):
                param = param.strip()
                if param and param != '...' and self._should_rename(param):
                    self.declared.add(param)
                    self._get_rename(param)
        
        # For loop variables: for i = or for k, v in
        for_pattern = r'\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s*[=,]?\s*(?:in\b)?'
        for match in re.finditer(for_pattern, code):
            vars_str = match.group(1)
            for var in vars_str.split(','):
                var = var.strip()
                if var and self._should_rename(var):
                    self.declared.add(var)
                    self._get_rename(var)
    
    def _apply_renames(self, code: str) -> str:
        """Apply renames to the code."""
        # Protect strings and comments first using unique markers
        protected = []
        
        def protect(match):
            idx = len(protected)
            protected.append(match.group(0))
            # Use a marker that won't appear in code and won't be affected by regex
            return f'<<<PROT{idx}>>>'
        
        # Protect strings (order matters - do long strings first)
        code = re.sub(r'\[\[.*?\]\]', protect, code, flags=re.DOTALL)
        code = re.sub(r'"(?:[^"\\]|\\.)*"', protect, code)
        code = re.sub(r"'(?:[^'\\]|\\.)*'", protect, code)
        
        # Protect comments (multi-line first)
        code = re.sub(r'--\[\[.*?\]\]', protect, code, flags=re.DOTALL)
        code = re.sub(r'--[^\n]*', protect, code)
        
        # AGGRESSIVE FIELD RENAMING - rename internal VM field names
        # This renames .proto, .code, .protoList, .mainProto, etc.
        code = self._apply_field_renames(code)
        
        # Sort renames by length (longest first) to avoid partial matches
        sorted_renames = sorted(self.rename_map.items(), key=lambda x: -len(x[0]))
        
        for original, renamed in sorted_renames:
            if original not in self.declared:
                continue
            
            # Only rename standalone identifiers, not after . or :
            # (?<![.\w:]) = not preceded by dot, colon, or word char
            # (?![\w]) = not followed by word char
            pattern = r'(?<![.\w:])' + re.escape(original) + r'(?![\w])'
            code = re.sub(pattern, renamed, code)
        
        # Restore protected content, but also rename field names inside strings
        # that are used for bracket access like ["fieldname"]
        for i, content in enumerate(protected):
            # Rename field names inside protected strings
            content = self._rename_string_fields(content)
            code = code.replace(f'<<<PROT{i}>>>', content)
        
        return code
    
    def _rename_string_fields(self, string_content: str) -> str:
        """
        Rename field names inside string literals.
        
        This handles cases like ["fieldname"] where the field name is a string.
        We only rename if the string is EXACTLY a field name (no extra content).
        """
        # Check if this is a simple string literal containing just a field name
        # Match "fieldname" or 'fieldname'
        if len(string_content) < 3:
            return string_content
        
        quote = string_content[0]
        if quote not in '"\'':
            return string_content
        
        inner = string_content[1:-1]
        
        # Check if the inner content is exactly a field name
        if inner in INTERNAL_FIELD_RENAMES:
            return quote + INTERNAL_FIELD_RENAMES[inner] + quote
        
        return string_content
    
    def _apply_field_renames(self, code: str) -> str:
        """
        Apply aggressive field name renaming.
        
        Renames internal VM field accesses AND their corresponding local variables
        to the SAME obfuscated name, ensuring consistency.
        
        CRITICAL: Does NOT rename field accesses on standard library objects like
        buffer.len, string.len, table.insert, etc.
        
        For example:
        - local proto = module.proto  ->  local OBFUSCATED = module.OBFUSCATED
        - {proto = proto}  ->  {OBFUSCATED = OBFUSCATED}
        - buffer.len  ->  buffer.len (NOT renamed - standard library!)
        """
        # Standard library names - NEVER rename fields accessed on these
        STDLIB_NAMES = frozenset({
            'buffer', 'string', 'table', 'math', 'bit32', 'coroutine',
            'os', 'debug', 'utf8', 'io', 'package',
        })
        
        # Sort by length (longest first) to avoid partial replacements
        sorted_fields = sorted(INTERNAL_FIELD_RENAMES.items(), key=lambda x: -len(x[0]))
        
        for original, renamed in sorted_fields:
            # Skip if this field name is in declared - we'll handle it specially
            # by forcing the variable renamer to use our obfuscated name
            if original in self.declared:
                # Override the variable rename to use our field rename
                self.rename_map[original] = renamed
            
            # Rename dot access: .fieldname
            # BUT NOT if preceded by a standard library name like buffer.len
            # Use negative lookbehind for stdlib names
            for stdlib in STDLIB_NAMES:
                # Skip this field if it's accessed on a stdlib object
                # We'll handle it by NOT matching stdlib.field patterns
                pass
            
            # Build a pattern that matches .fieldname but NOT stdlib.fieldname
            # We need to use a callback function to check the context
            def replace_dot_access(match):
                # Get the character(s) before the dot
                start = match.start()
                # Look back to find what's before the dot
                prefix_end = start
                prefix_start = max(0, start - 50)  # Look back up to 50 chars
                prefix = code[prefix_start:prefix_end]
                
                # Check if the last word before the dot is a stdlib name
                word_match = re.search(r'([a-zA-Z_][a-zA-Z0-9_]*)\s*$', prefix)
                if word_match:
                    word = word_match.group(1)
                    if word in STDLIB_NAMES:
                        # Don't rename - it's a stdlib access
                        return match.group(0)
                
                # Rename it
                return '.' + renamed
            
            # Match .fieldname (not preceded by word char)
            dot_pattern = r'\.(' + re.escape(original) + r')(?![a-zA-Z0-9_])'
            code = re.sub(dot_pattern, replace_dot_access, code)
            
            # Rename colon access: :fieldname (for method calls)
            # Same logic - don't rename stdlib method calls
            def replace_colon_access(match):
                start = match.start()
                prefix_end = start
                prefix_start = max(0, start - 50)
                prefix = code[prefix_start:prefix_end]
                
                word_match = re.search(r'([a-zA-Z_][a-zA-Z0-9_]*)\s*$', prefix)
                if word_match:
                    word = word_match.group(1)
                    if word in STDLIB_NAMES:
                        return match.group(0)
                
                return ':' + renamed
            
            colon_pattern = r':(' + re.escape(original) + r')(?![a-zA-Z0-9_])'
            code = re.sub(colon_pattern, replace_colon_access, code)
            
            # Rename table key definitions: fieldname = ...
            # Match when NOT preceded by dot/colon/word char, and followed by = (but not ==)
            key_pattern = r'(?<![.\w:])' + re.escape(original) + r'(?=\s*=(?!=))'
            code = re.sub(key_pattern, renamed, code)
            
            # Rename bracket string access: ["fieldname"]
            bracket_pattern = r'\["' + re.escape(original) + r'"\]'
            code = re.sub(bracket_pattern, '["' + renamed + '"]', code)
            
            # Single quote version: ['fieldname']
            bracket_single_pattern = r"\['" + re.escape(original) + r"'\]"
            code = re.sub(bracket_single_pattern, "['" + renamed + "']", code)
        
        return code
    
    def get_rename_map(self) -> Dict[str, str]:
        """Get the rename map."""
        return {k: v for k, v in self.rename_map.items() if k in self.declared}


def rename_vm_code(code: str, seed: int = None) -> Tuple[str, Dict[str, str]]:
    """Rename variables in VM code."""
    pbs = PolymorphicBuildSeed(seed) if seed else PolymorphicBuildSeed()
    renamer = SimpleVMRenamer(pbs)
    renamed = renamer.rename(code)
    return renamed, renamer.get_rename_map()


if __name__ == "__main__":
    vm_path = Path(__file__).parent / "Virtualization.lua"
    
    if not vm_path.exists():
        print(f"Error: {vm_path} not found")
        sys.exit(1)
    
    with open(vm_path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    print(f"Original size: {len(code)} bytes")
    
    renamed, renames = rename_vm_code(code, seed=12345)
    
    print(f"Renamed size: {len(renamed)} bytes")
    print(f"Variables renamed: {len(renames)}")
    
    # Save output
    out_path = Path(__file__).parent / "Virtualization_renamed.lua"
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(renamed)
    print(f"Saved to: {out_path}")
    
    # Show sample renames
    print("\nSample renames:")
    for orig, new in list(renames.items())[:30]:
        print(f"  {orig} -> {new}")
