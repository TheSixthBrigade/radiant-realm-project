#!/usr/bin/env python3
"""
AST-Based VM Variable Renamer

This module uses luaparser to properly rename variables in the VM template
while preserving:
1. Scope boundaries (each function has its own scope)
2. Field accesses (obj.field - field is NOT renamed)
3. API return fields (table keys in return statements)
4. Roblox globals and Lua keywords

The key insight is that we need to track:
- Variable DECLARATIONS (local x, function params, for loop vars)
- Variable REFERENCES (uses of declared variables)
- Field ACCESSES (after . or : - these are NOT variables)
"""

import re
import sys
from pathlib import Path
from typing import Dict, Set, List, Optional, Tuple
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from luaparser import ast
    from luaparser.astnodes import *
    LUAPARSER_AVAILABLE = True
except ImportError:
    LUAPARSER_AVAILABLE = False
    print("Warning: luaparser not available, AST renaming disabled")

from core.seed import PolymorphicBuildSeed
from core.naming import UnifiedNamingSystem, ROBLOX_GLOBALS


# Lua keywords that cannot be renamed
LUA_KEYWORDS = frozenset({
    'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
    'function', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat',
    'return', 'then', 'true', 'until', 'while', 'continue',
})

# API field names that MUST be preserved (external interfaces)
# These are accessed by external code and cannot be renamed
EXTERNAL_API_FIELDS = frozenset({
    # Table pack fields (Lua standard)
    'n',
    # Standard library fields that must be preserved
    'len', 'list',
})

# Internal VM field names that SHOULD be renamed for obfuscation
# These are only used internally within the VM and can be safely renamed
# ALL names are 31 characters using ONLY: l, I, O, 0, 1, _
# NO READABLE FRAGMENTS ALLOWED - pure confusing patterns only!
INTERNAL_FIELD_RENAMES = {
    # Proto/function fields - 31 char patterns (PURE CONFUSING)
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
    
    # Instruction fields - 31 char patterns (PURE CONFUSING)
    'opcode': 'O01OI0__OlO1Ol101_0l1I_Il1lI1',
    'opname': 'Il1lI1lOO0O1_Il1l_0l1I_O01OI',
    'opmode': 'O01OI0__OlO1Ol101_0l1I_Il1lI0',
    'kmode': 'Il1lI1lOO0O1_Il1lI_0l1_O01OI',
    'usesAux': 'lI0O1_Il1lI1lOO0O1_Il_0l1I0_1',
    'aux': 'O01OI0__OlO1Ol101_1_0l_Il1lI1',
    'value': 'Il1lI1lOO0O1_Il1lI_0l1_O01O0',
    
    # Upvalue fields - 31 char patterns (PURE CONFUSING)
    'store': 'O01OI0__OlO1Ol10_Il1lI1_0l1_1',
    'index': 'lI0O1_Il1lI1lOO0_O01OI_0l1_01',
    
    # Deserialize return fields - 31 char patterns (CRITICAL - PURE CONFUSING!)
    'stringList': 'O01OI0_OlO1O_Il1lI1l_0l1I01_1',
    'protoList': 'Il1lI1lOO0O1_I1lOO0_0l1I01_1',
    'mainProto': 'lI0O1_Il1lI1lO_O01OI_0l1I0_01',
    'typesVersion': 'I1lOO0O1_Il1lI_O0O1__0l1I0_1',
    
    # Settings fields - 31 char patterns (PURE CONFUSING)
    'decodeOp': 'Il1lI1lOO0O1_Il1l_0l1I_O01OI',
    'callHooks': 'O01OI0__OlO1Ol1_0l1I0_Il1lI1',
    'errorHandling': 'Il1lI1lOO0O1_I_0l1I01_O01OI0',
    'allowProxyErrors': 'O01OI0__Ol_0l1I01lI0_Il1lI1l',
    'useImportConstants': 'Il1lI1lOO0_0l1I01lI0_O01OI01',
    'staticEnvironment': 'O01OI0__OlO1O_0l1I0_Il1lI1l0',
    'useNativeNamecall': 'Il1lI1lOO0_0l1I01lI01_O01OI01',
    'namecallHandler': 'O01OI0__OlO_0l1I01lI0_Il1lI1l',
    'generalizedIteration': 'Il1lI1lOO0O_0l1I01lI_O01OI0_1',
    
    # Hook fields - 31 char patterns (CRITICAL - PURE CONFUSING!)
    'breakHook': 'Il1lI1lOO0O1_Il_0l1I0_O01OI0',
    'stepHook': 'O01OI0__OlO1Ol1_0l1I0_Il1lI1',
    'interruptHook': '_1ll_O01Oll0lI_0l_Il1_O0O1_01',
    'panicHook': 'O01OI0__OlO1Ol1_0l1I0_Il1lI0',
    
    # Debugging/state fields - 31 char patterns (PURE CONFUSING)
    'pc': 'lI0O1_0l_Il1lI1lOO0O1_O01O_01',
    'top': 'I1lOO0O1_0l_Il1lI1lO_1ll_O_01',
    'name': 'Il1lI1lOO0O1_Il1lI1_0l_O01OI',
    
    # Additional VM internal fields - 31 char patterns (PURE CONFUSING)
    'openupvals': 'Il1lI1lOO0O1_O01OI0_0l1I01_1',
    'varargs': 'O01OI0_OlO1Ol1_Il1lI1_0l1I0_1',
    'stack': 'O01OI0_0l1_Ol101_1ll_Il1lI_01',
    'base': 'Il1lI1lOO0O1_0l_1l_O01OI0__01',
    'env': 'O0O1_0l1_Il1lI1lOO0O_I1lOO_01',
    
    # More instruction/constant fields (single letters need special handling)
    # These are handled separately to avoid breaking single-letter variables
}

# Legacy API_FIELDS for backward compatibility (now mostly empty)
API_FIELDS = EXTERNAL_API_FIELDS

# Standard library methods that should not be renamed when accessed via dot
STDLIB_METHODS = frozenset({
    # string
    'char', 'byte', 'sub', 'gsub', 'find', 'match', 'format', 'len',
    'lower', 'upper', 'rep', 'reverse', 'pack', 'unpack', 'split',
    # table
    'insert', 'remove', 'sort', 'concat', 'create', 'move', 'freeze', 'clone',
    # math
    'abs', 'ceil', 'floor', 'max', 'min', 'random', 'sqrt', 'sin', 'cos',
    'tan', 'exp', 'log', 'pow', 'huge', 'pi', 'randomseed', 'noise',
    # bit32
    'band', 'bor', 'bxor', 'bnot', 'lshift', 'rshift', 'arshift',
    'lrotate', 'rrotate', 'extract', 'replace', 'btest', 'countlz', 'countrz',
    # buffer
    'fromstring', 'tostring', 'create', 'readu8', 'readu16', 'readu32',
    'readi8', 'readi16', 'readi32', 'readf32', 'readf64', 'writeu8',
    'writeu16', 'writeu32', 'writei8', 'writei16', 'writei32', 'writef32',
    'writef64', 'readstring', 'writestring', 'copy', 'fill',
    # coroutine
    'create', 'resume', 'yield', 'status', 'wrap', 'running', 'close',
    # os
    'time', 'date', 'clock', 'difftime',
    # debug
    'traceback', 'info', 'profilebegin', 'profileend', 'setmemorycategory',
    'resetmemorycategory',
})


@dataclass
class Scope:
    """Represents a variable scope."""
    name: str
    parent: Optional['Scope'] = None
    variables: Dict[str, str] = field(default_factory=dict)  # original -> renamed
    
    def declare(self, name: str, renamed: str):
        """Declare a variable in this scope."""
        self.variables[name] = renamed
    
    def lookup(self, name: str) -> Optional[str]:
        """Look up a variable, checking parent scopes."""
        if name in self.variables:
            return self.variables[name]
        if self.parent:
            return self.parent.lookup(name)
        return None


class VMVariableRenamer:
    """
    AST-based variable renamer for the VM template.
    
    Uses luaparser to build an AST, then walks it to:
    1. Identify all variable declarations and their scopes
    2. Generate obfuscated names for each variable
    3. Apply renames while preserving field accesses and API fields
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None, naming: UnifiedNamingSystem = None):
        """Initialize the renamer."""
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = naming or UnifiedNamingSystem(self.seed)
        self.global_scope = Scope("global")
        self.current_scope = self.global_scope
        self.all_renames: Dict[str, str] = {}  # For debugging
        
    def _should_rename(self, name: str) -> bool:
        """Check if a name should be renamed."""
        if name in LUA_KEYWORDS:
            return False
        if name in ROBLOX_GLOBALS:
            return False
        if name in API_FIELDS:
            return False
        if name.startswith('_') and len(name) > 1 and name[1].isupper():
            # Skip _G, _VERSION, _ENV, etc.
            return False
        return True
    
    def _enter_scope(self, name: str) -> Scope:
        """Enter a new scope."""
        new_scope = Scope(name, parent=self.current_scope)
        self.current_scope = new_scope
        return new_scope
    
    def _exit_scope(self):
        """Exit the current scope."""
        if self.current_scope.parent:
            self.current_scope = self.current_scope.parent
    
    def _declare_variable(self, name: str) -> str:
        """Declare a variable in the current scope and return its new name."""
        if not self._should_rename(name):
            return name
        
        # Generate new name
        new_name = self.naming.generate_name()
        self.current_scope.declare(name, new_name)
        self.all_renames[name] = new_name
        return new_name
    
    def _lookup_variable(self, name: str) -> str:
        """Look up a variable and return its renamed version."""
        renamed = self.current_scope.lookup(name)
        if renamed:
            return renamed
        return name  # Not found, keep original
    
    def rename(self, code: str) -> str:
        """
        Rename variables in the code using AST analysis.
        
        Falls back to regex-based renaming if AST parsing fails.
        """
        if not LUAPARSER_AVAILABLE:
            print("Warning: luaparser not available, using fallback")
            return self._fallback_rename(code)
        
        try:
            # Parse the code
            tree = ast.parse(code)
            
            # First pass: collect all declarations
            self._collect_declarations(tree)
            
            # Reset scopes for second pass
            self.global_scope = Scope("global")
            self.current_scope = self.global_scope
            
            # Second pass: apply renames using regex (safer than AST modification)
            return self._apply_renames_regex(code)
            
        except Exception as e:
            print(f"Warning: AST parsing failed ({e}), using fallback")
            return self._fallback_rename(code)
    
    def _collect_declarations(self, node, in_function=False):
        """Recursively collect all variable declarations."""
        if node is None:
            return
        
        # Handle different node types
        if isinstance(node, Chunk):
            for stmt in node.body.body:
                self._collect_declarations(stmt)
                
        elif isinstance(node, Block):
            for stmt in node.body:
                self._collect_declarations(stmt)
                
        elif isinstance(node, LocalAssign):
            # local x, y, z = ...
            for target in node.targets:
                if isinstance(target, Name):
                    self._declare_variable(target.id)
            # Process values
            for value in node.values:
                self._collect_declarations(value)
                
        elif isinstance(node, LocalFunction):
            # local function name(...)
            self._declare_variable(node.name.id)
            # Enter function scope
            self._enter_scope(f"func_{node.name.id}")
            # Declare parameters
            for param in node.args:
                if isinstance(param, Name):
                    self._declare_variable(param.id)
            # Process body
            for stmt in node.body.body:
                self._collect_declarations(stmt)
            self._exit_scope()
            
        elif isinstance(node, Function):
            # function name(...) or function(...)
            func_name = "anonymous"
            if isinstance(node.name, Name):
                func_name = node.name.id
                # Don't rename top-level function names that are API
                if func_name not in API_FIELDS:
                    self._declare_variable(func_name)
            # Enter function scope
            self._enter_scope(f"func_{func_name}")
            # Declare parameters
            for param in node.args:
                if isinstance(param, Name):
                    self._declare_variable(param.id)
            # Process body
            for stmt in node.body.body:
                self._collect_declarations(stmt)
            self._exit_scope()
            
        elif isinstance(node, Fornum):
            # for i = start, end, step do
            self._enter_scope("fornum")
            self._declare_variable(node.target.id)
            self._collect_declarations(node.start)
            self._collect_declarations(node.stop)
            if node.step:
                self._collect_declarations(node.step)
            for stmt in node.body.body:
                self._collect_declarations(stmt)
            self._exit_scope()
            
        elif isinstance(node, Forin):
            # for k, v in pairs(t) do
            self._enter_scope("forin")
            for target in node.targets:
                if isinstance(target, Name):
                    self._declare_variable(target.id)
            for iter_expr in node.iter:
                self._collect_declarations(iter_expr)
            for stmt in node.body.body:
                self._collect_declarations(stmt)
            self._exit_scope()
            
        elif isinstance(node, While):
            self._collect_declarations(node.test)
            self._enter_scope("while")
            for stmt in node.body.body:
                self._collect_declarations(stmt)
            self._exit_scope()
            
        elif isinstance(node, Repeat):
            self._enter_scope("repeat")
            for stmt in node.body.body:
                self._collect_declarations(stmt)
            self._collect_declarations(node.test)
            self._exit_scope()
            
        elif isinstance(node, If):
            self._collect_declarations(node.test)
            self._enter_scope("if")
            for stmt in node.body.body:
                self._collect_declarations(stmt)
            self._exit_scope()
            if node.orelse:
                if isinstance(node.orelse, ElseIf):
                    self._collect_declarations(node.orelse)
                else:
                    self._enter_scope("else")
                    for stmt in node.orelse.body:
                        self._collect_declarations(stmt)
                    self._exit_scope()
                    
        elif isinstance(node, ElseIf):
            self._collect_declarations(node.test)
            self._enter_scope("elseif")
            for stmt in node.body.body:
                self._collect_declarations(stmt)
            self._exit_scope()
            if node.orelse:
                self._collect_declarations(node.orelse)
                
        elif isinstance(node, Do):
            self._enter_scope("do")
            for stmt in node.body.body:
                self._collect_declarations(stmt)
            self._exit_scope()
            
        elif isinstance(node, AnonymousFunction):
            self._enter_scope("anon_func")
            for param in node.args:
                if isinstance(param, Name):
                    self._declare_variable(param.id)
            for stmt in node.body.body:
                self._collect_declarations(stmt)
            self._exit_scope()
            
        # Recurse into expressions
        elif isinstance(node, (Call, Invoke)):
            if hasattr(node, 'func'):
                self._collect_declarations(node.func)
            if hasattr(node, 'source'):
                self._collect_declarations(node.source)
            for arg in node.args:
                self._collect_declarations(arg)
                
        elif isinstance(node, (BinaryOp, Concat)):
            self._collect_declarations(node.left)
            self._collect_declarations(node.right)
            
        elif isinstance(node, UnaryOp):
            self._collect_declarations(node.operand)
            
        elif isinstance(node, Table):
            for field in node.fields:
                self._collect_declarations(field)
                
        elif isinstance(node, Field):
            if node.key:
                self._collect_declarations(node.key)
            self._collect_declarations(node.value)
            
        elif isinstance(node, Index):
            self._collect_declarations(node.value)
            self._collect_declarations(node.idx)
            
        elif isinstance(node, Assign):
            for target in node.targets:
                self._collect_declarations(target)
            for value in node.values:
                self._collect_declarations(value)
                
        elif isinstance(node, Return):
            for value in node.values:
                self._collect_declarations(value)
    
    def _apply_renames_regex(self, code: str) -> str:
        """Apply collected renames using regex (safer than AST modification)."""
        # First, extract all strings to protect them from renaming
        strings = []
        
        def extract_string(match):
            strings.append(match.group(0))
            return f'\x00STRING_{len(strings)-1}\x00'
        
        # Extract double-quoted strings (handling escapes)
        code = re.sub(r'"(?:[^"\\]|\\.)*"', extract_string, code)
        # Extract single-quoted strings (handling escapes)
        code = re.sub(r"'(?:[^'\\]|\\.)*'", extract_string, code)
        # Extract long strings [[...]]
        code = re.sub(r'\[\[.*?\]\]', extract_string, code, flags=re.DOTALL)
        
        # Also extract comments to protect them
        comments = []
        
        def extract_comment(match):
            comments.append(match.group(0))
            return f'\x00COMMENT_{len(comments)-1}\x00'
        
        # Extract multi-line comments --[[...]]
        code = re.sub(r'--\[\[.*?\]\]', extract_comment, code, flags=re.DOTALL)
        # Extract single-line comments
        code = re.sub(r'--[^\n]*', extract_comment, code)
        
        # AGGRESSIVE FIELD RENAMING - rename internal VM field names
        # This renames .proto to .lI0O1_Il1lI1lOO0O1_Il etc.
        code = self._apply_field_renames(code)
        
        # Sort by length (longest first) to avoid partial replacements
        sorted_renames = sorted(self.all_renames.items(), key=lambda x: -len(x[0]))
        
        for original, renamed in sorted_renames:
            # Only rename when it's a standalone identifier, not after a dot
            # (?<!\.) = not preceded by dot
            # (?<![a-zA-Z0-9_]) = not preceded by identifier char
            # (?![a-zA-Z0-9_]) = not followed by identifier char
            pattern = r'(?<![.\w])' + re.escape(original) + r'(?!\w)'
            code = re.sub(pattern, renamed, code)
        
        # Restore comments
        for i, comment in enumerate(comments):
            code = code.replace(f'\x00COMMENT_{i}\x00', comment)
        
        # Restore strings
        for i, string in enumerate(strings):
            code = code.replace(f'\x00STRING_{i}\x00', string)
        
        return code
    
    def _apply_field_renames(self, code: str) -> str:
        """
        Apply aggressive field name renaming.
        
        Renames internal VM field accesses like:
        - .proto -> .lI0O1_Il1lI1lOO0O1_Il
        - .code -> .O01OI0__OlO1Ol101_1ll
        - .instructionlineinfo -> ._OI11II_I11l0O1_Il1lI
        
        Also renames table key definitions like:
        - {proto = ...} -> {lI0O1_Il1lI1lOO0O1_Il = ...}
        - ["proto"] = ... -> ["lI0O1_Il1lI1lOO0O1_Il"] = ...
        """
        # Sort by length (longest first) to avoid partial replacements
        sorted_fields = sorted(INTERNAL_FIELD_RENAMES.items(), key=lambda x: -len(x[0]))
        
        for original, renamed in sorted_fields:
            # Rename dot access: .fieldname
            # Match .fieldname but not when followed by more identifier chars
            dot_pattern = r'\.' + re.escape(original) + r'(?![a-zA-Z0-9_])'
            code = re.sub(dot_pattern, '.' + renamed, code)
            
            # Rename colon access: :fieldname (for method calls)
            colon_pattern = r':' + re.escape(original) + r'(?![a-zA-Z0-9_])'
            code = re.sub(colon_pattern, ':' + renamed, code)
            
            # Rename table key definitions: {fieldname = ...}
            # Match fieldname followed by optional whitespace and =
            key_pattern = r'(?<=[{,\s])' + re.escape(original) + r'(?=\s*=)'
            code = re.sub(key_pattern, renamed, code)
            
            # Rename bracket string access: ["fieldname"]
            bracket_pattern = r'\["' + re.escape(original) + r'"\]'
            code = re.sub(bracket_pattern, '["' + renamed + '"]', code)
            
            # Rename bracket string access with single quotes: ['fieldname']
            bracket_single_pattern = r"\['" + re.escape(original) + r"'\]"
            code = re.sub(bracket_single_pattern, "['" + renamed + "']", code)
            
            # Also rename standalone field names that appear as string literals
            # This catches cases like: local x = "instructionlineinfo"
            string_literal_pattern = r'"' + re.escape(original) + r'"'
            code = re.sub(string_literal_pattern, '"' + renamed + '"', code)
            
            # Single quote version
            string_literal_single = r"'" + re.escape(original) + r"'"
            code = re.sub(string_literal_single, "'" + renamed + "'", code)
        
        return code
    
    def _fallback_rename(self, code: str) -> str:
        """Fallback regex-based renaming when AST parsing fails."""
        # This is a simplified version that may not handle all edge cases
        # Find all local declarations
        local_pattern = r'\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)'
        
        for match in re.finditer(local_pattern, code):
            var_name = match.group(1)
            if self._should_rename(var_name) and var_name not in self.all_renames:
                self.all_renames[var_name] = self.naming.generate_name()
        
        # Find function parameters
        func_pattern = r'\bfunction\s*[^(]*\(([^)]*)\)'
        for match in re.finditer(func_pattern, code):
            params = match.group(1)
            for param in params.split(','):
                param = param.strip()
                if param and param != '...' and self._should_rename(param):
                    if param not in self.all_renames:
                        self.all_renames[param] = self.naming.generate_name()
        
        # Find for loop variables
        for_pattern = r'\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[=,]'
        for match in re.finditer(for_pattern, code):
            var_name = match.group(1)
            if self._should_rename(var_name) and var_name not in self.all_renames:
                self.all_renames[var_name] = self.naming.generate_name()
        
        # Apply field renames first (for .proto, .code, etc.)
        code = self._apply_field_renames(code)
        
        return self._apply_renames_regex(code)
    
    def get_rename_map(self) -> Dict[str, str]:
        """Get the mapping of original -> renamed variables."""
        return self.all_renames.copy()


def rename_vm_template(vm_code: str, seed: int = None) -> Tuple[str, Dict[str, str]]:
    """
    Rename variables in the VM template.
    
    Args:
        vm_code: The VM template code
        seed: Optional seed for deterministic renaming
        
    Returns:
        Tuple of (renamed_code, rename_map)
    """
    pbs = PolymorphicBuildSeed(seed) if seed else PolymorphicBuildSeed()
    naming = UnifiedNamingSystem(pbs)
    renamer = VMVariableRenamer(pbs, naming)
    
    renamed = renamer.rename(vm_code)
    return renamed, renamer.get_rename_map()


if __name__ == "__main__":
    # Test the renamer
    vm_path = Path(__file__).parent / "Virtualization.lua"
    
    if not vm_path.exists():
        print(f"Error: {vm_path} not found")
        sys.exit(1)
    
    with open(vm_path, 'r', encoding='utf-8') as f:
        vm_code = f.read()
    
    print(f"Original VM size: {len(vm_code)} bytes")
    
    renamed, rename_map = rename_vm_template(vm_code, seed=12345)
    
    print(f"Renamed VM size: {len(renamed)} bytes")
    print(f"Variables renamed: {len(rename_map)}")
    print("\nSample renames:")
    for i, (orig, new) in enumerate(list(rename_map.items())[:20]):
        print(f"  {orig} -> {new}")
    
    # Save the renamed VM
    output_path = Path(__file__).parent / "Virtualization_renamed.lua"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(renamed)
    print(f"\nSaved to: {output_path}")
