"""
Variable Renaming Transforms for the Luraph-style obfuscator.

This module implements ultra-aggressive variable renaming with 7 passes,
Luraph-style parameter transformation, function name aliasing, global
aliases generation, and metamethod string aliasing.

Requirements: 27.1, 27.2, 27.3, 27.4, 27.5
"""

import re
from typing import Dict, Set, List, Optional, Tuple
from dataclasses import dataclass, field

try:
    from ..core.seed import PolymorphicBuildSeed
    from ..core.naming import UnifiedNamingSystem, ROBLOX_GLOBALS
except ImportError:
    # Fallback for direct execution
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from core.seed import PolymorphicBuildSeed
    from core.naming import UnifiedNamingSystem, ROBLOX_GLOBALS


# Lua keywords that cannot be used as identifiers
LUA_KEYWORDS = frozenset({
    'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
    'function', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat',
    'return', 'then', 'true', 'until', 'while', 'continue',
})

# Metamethod names that need special handling
METAMETHODS = frozenset({
    '__index', '__newindex', '__call', '__concat', '__unm', '__add',
    '__sub', '__mul', '__div', '__mod', '__pow', '__tostring', '__metatable',
    '__eq', '__lt', '__le', '__mode', '__gc', '__len', '__pairs', '__ipairs',
    '__iter', '__type', '__namecall',
})


@dataclass
class VariableScope:
    """Represents a variable scope for tracking declarations and references."""
    name: str
    parent: Optional['VariableScope'] = None
    variables: Dict[str, str] = field(default_factory=dict)  # original -> renamed
    children: List['VariableScope'] = field(default_factory=list)
    
    def lookup(self, name: str) -> Optional[str]:
        """Look up a variable name in this scope or parent scopes."""
        if name in self.variables:
            return self.variables[name]
        if self.parent:
            return self.parent.lookup(name)
        return None
    
    def declare(self, original: str, renamed: str) -> None:
        """Declare a variable in this scope."""
        self.variables[original] = renamed


class UltraAggressiveVariableRenamer:
    """
    Implements ultra-aggressive variable renaming with 7 passes.
    
    The 7 passes are:
    1. Local variable declarations
    2. Function parameters
    3. For loop variables
    4. Table field names (non-string)
    5. Upvalue references
    6. Nested function names
    7. Final cleanup pass
    
    Requirements: 27.1
    """
    
    def __init__(self, seed: PolymorphicBuildSeed, naming: UnifiedNamingSystem):
        """
        Initialize the variable renamer.
        
        Args:
            seed: PolymorphicBuildSeed for deterministic generation
            naming: UnifiedNamingSystem for name generation
        """
        self.seed = seed
        self.naming = naming
        self.rename_map: Dict[str, str] = {}
        self.pass_count = 0
    
    def rename(self, code: str) -> str:
        """
        Apply 7 renaming passes to the code.
        
        Args:
            code: The Lua code to transform
            
        Returns:
            Code with all variables renamed
        """
        # Pass 1: Local variable declarations
        code = self._pass_local_declarations(code)
        self.pass_count += 1
        
        # Pass 2: Function parameters
        code = self._pass_function_parameters(code)
        self.pass_count += 1
        
        # Pass 3: For loop variables
        code = self._pass_for_loop_variables(code)
        self.pass_count += 1
        
        # Pass 4: Table field names (non-string keys)
        code = self._pass_table_fields(code)
        self.pass_count += 1
        
        # Pass 5: Upvalue references
        code = self._pass_upvalue_references(code)
        self.pass_count += 1
        
        # Pass 6: Nested function names
        code = self._pass_nested_function_names(code)
        self.pass_count += 1
        
        # Pass 7: Final cleanup - apply all renames
        code = self._pass_final_cleanup(code)
        self.pass_count += 1
        
        return code
    
    # VM internal function names that must NOT be renamed
    # These are called by name in the wrapper code
    VM_INTERNAL_NAMES = frozenset({
        # Core VM functions
        'luau_deserialize', 'luau_load', 'luau_wrapclosure', 'luau_execute',
        'luau_close', 'luau_newsettings', 'luau_validatesettings', 'luau_getcoverage',
        'getmaxline', 'getcoverage', 'resolveImportConstant',
        # Reader functions
        'readByte', 'readWord', 'readFloat', 'readDouble', 'readVarInt', 'readString',
        'readInstruction', 'readProto', 'checkkmode',
        # Type checking
        '_T', 'ttisnumber', 'ttisstring', 'ttisboolean', 'ttisfunction',
        # Constants
        'opList', 'LUA_MULTRET', 'LUA_GENERALIZED_TERMINATOR',
        # Critical VM state variables
        'cursor', 'stream', 'bytecode', 'luau_settings', 'stringList', 'protoList',
        'mainProto', 'module', 'env', 'upvals', 'proto', 'protolist',
        'stack', 'varargs', 'debugging', 'protos', 'code', 'top', 'pc',
        'open_upvalues', 'generalized_iterators', 'constants', 'debugopcodes',
        'handlingBreak', 'inst', 'op', 'alive',
        # Deserializer variables
        'luauVersion', 'typesVersion', 'stringCount', 'protoCount',
        'bytecodeid', 'maxstacksize', 'numparams', 'nups', 'isvararg',
        'sizecode', 'codelist', 'debugcodelist', 'sizek', 'klist', 'sizep',
        'linedefined', 'debugnameindex', 'debugname', 'lineinfoenabled',
        'instructionlineinfo', 'skipnext', 'value', 'opcode', 'opinfo', 'opname',
        'opmode', 'kmode', 'usesAux', 'aux', 'kt', 'k', 'result', 'size', 'str',
        'byte', 'word', 'float', 'double',
        # Buffer API aliases (local buffer_xxx = buffer.xxx)
        'buffer_fromstring', 'buffer_len', 'buffer_readu8', 'buffer_readu32',
        'buffer_readstring', 'buffer_readf32', 'buffer_readf64',
        'buffer_writeu8', 'buffer_create',
        # bit32 API aliases
        'bit32_bor', 'bit32_band', 'bit32_bxor', 'bit32_bnot',
        'bit32_lshift', 'bit32_rshift', 'bit32_arshift',
        'bit32_lrotate', 'bit32_rrotate', 'bit32_extract', 'bit32_replace', 'bit32_btest',
        # Table API aliases
        'table_move', 'table_pack', 'table_unpack', 'table_create',
        'table_insert', 'table_remove', 'table_concat',
        # String API aliases
        'string_format', 'string_char', 'string_byte', 'string_sub',
        # Coroutine API aliases
        'coroutine_create', 'coroutine_yield', 'coroutine_resume', 'coroutine_close',
        # Other preserved names
        'type', 'pcall', 'error', 'tonumber', 'assert', 'setmetatable', 'getfenv', '_ENV',
    })
    
    def _should_rename(self, name: str) -> bool:
        """Check if a name should be renamed."""
        if name in LUA_KEYWORDS:
            return False
        if name in ROBLOX_GLOBALS:
            return False
        if name in self.VM_INTERNAL_NAMES:
            return False
        if name.startswith('_') and name.isupper():
            # Skip _G, _VERSION, etc.
            return False
        return True
    
    def _get_or_create_rename(self, name: str) -> str:
        """Get existing rename or create new one."""
        if not self._should_rename(name):
            return name
        if name not in self.rename_map:
            self.rename_map[name] = self.naming.generate_name()
        return self.rename_map[name]
    
    def _pass_local_declarations(self, code: str) -> str:
        """Pass 1: Rename local variable declarations."""
        # Match: local varname or local var1, var2, var3
        pattern = r'\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)'
        
        def replace_locals(match):
            vars_str = match.group(1)
            var_names = [v.strip() for v in vars_str.split(',')]
            renamed = []
            for var in var_names:
                if self._should_rename(var):
                    renamed.append(self._get_or_create_rename(var))
                else:
                    renamed.append(var)
            return 'local ' + ', '.join(renamed)
        
        return re.sub(pattern, replace_locals, code)
    
    def _pass_function_parameters(self, code: str) -> str:
        """Pass 2: Rename function parameters."""
        # Match: function name(params) or function(params)
        pattern = r'\bfunction\s*(?:[a-zA-Z_][a-zA-Z0-9_.:]*\s*)?\(([^)]*)\)'
        
        def replace_params(match):
            params_str = match.group(1)
            if not params_str.strip():
                return match.group(0)
            
            params = [p.strip() for p in params_str.split(',')]
            renamed = []
            for param in params:
                if param == '...':
                    renamed.append(param)
                elif self._should_rename(param):
                    renamed.append(self._get_or_create_rename(param))
                else:
                    renamed.append(param)
            
            # Reconstruct the function declaration
            full_match = match.group(0)
            return full_match[:full_match.rfind('(')+1] + ', '.join(renamed) + ')'
        
        return re.sub(pattern, replace_params, code)
    
    def _pass_for_loop_variables(self, code: str) -> str:
        """Pass 3: Rename for loop variables."""
        # Match: for var = start, end or for var1, var2 in
        numeric_pattern = r'\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*='
        generic_pattern = r'\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s+in\b'
        
        def replace_numeric_for(match):
            var = match.group(1)
            if self._should_rename(var):
                renamed = self._get_or_create_rename(var)
                return f'for {renamed} ='
            return match.group(0)
        
        def replace_generic_for(match):
            vars_str = match.group(1)
            var_names = [v.strip() for v in vars_str.split(',')]
            renamed = []
            for var in var_names:
                if self._should_rename(var):
                    renamed.append(self._get_or_create_rename(var))
                else:
                    renamed.append(var)
            return 'for ' + ', '.join(renamed) + ' in'
        
        code = re.sub(numeric_pattern, replace_numeric_for, code)
        code = re.sub(generic_pattern, replace_generic_for, code)
        return code
    
    def _pass_table_fields(self, code: str) -> str:
        """Pass 4: Rename table field names (identifier keys only)."""
        # Match: .fieldname or [fieldname] where fieldname is an identifier
        # Skip string keys like ["fieldname"] or ['fieldname']
        dot_pattern = r'\.([a-zA-Z_][a-zA-Z0-9_]*)\b'
        
        def replace_dot_access(match):
            field = match.group(1)
            # Don't rename Roblox method names or common Lua methods
            if field in ROBLOX_GLOBALS or field in METAMETHODS:
                return match.group(0)
            # Don't rename common method names
            common_methods = {'find', 'sub', 'gsub', 'match', 'format', 'char', 'byte',
                            'len', 'lower', 'upper', 'rep', 'reverse', 'pack', 'unpack',
                            'insert', 'remove', 'sort', 'concat', 'create', 'move',
                            'abs', 'ceil', 'floor', 'max', 'min', 'random', 'sqrt',
                            'sin', 'cos', 'tan', 'exp', 'log', 'pow', 'huge', 'pi',
                            'band', 'bor', 'bxor', 'bnot', 'lshift', 'rshift', 'arshift',
                            'lrotate', 'rrotate', 'extract', 'replace', 'btest',
                            'fromstring', 'tostring', 'readu8', 'readu16', 'readu32',
                            'readi8', 'readi16', 'readi32', 'readf32', 'readf64',
                            'writeu8', 'writeu16', 'writeu32', 'writei8', 'writei16',
                            'writei32', 'writef32', 'writef64', 'readstring', 'writestring',
                            'copy', 'fill'}
            if field in common_methods:
                return match.group(0)
            return match.group(0)  # Keep field names for now - they're often API calls
        
        return re.sub(dot_pattern, replace_dot_access, code)
    
    def _pass_upvalue_references(self, code: str) -> str:
        """Pass 5: Ensure upvalue references use renamed names."""
        # This pass applies the rename map to all identifier references
        # that have been collected in previous passes
        # CRITICAL: Do NOT rename identifiers that come after a dot (field accesses)
        for original, renamed in self.rename_map.items():
            # Use negative lookbehind to avoid matching after dots
            # (?<!\.) means "not preceded by a dot"
            pattern = r'(?<!\.)' + r'\b' + re.escape(original) + r'\b'
            code = re.sub(pattern, renamed, code)
        return code
    
    def _pass_nested_function_names(self, code: str) -> str:
        """Pass 6: Rename nested function names."""
        # Match: local function name or function name (not method definitions)
        pattern = r'\b(local\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\('
        
        def replace_func_name(match):
            local_prefix = match.group(1) or ''
            func_name = match.group(2)
            if self._should_rename(func_name):
                renamed = self._get_or_create_rename(func_name)
                return f'{local_prefix}function {renamed}('
            return match.group(0)
        
        return re.sub(pattern, replace_func_name, code)
    
    def _pass_final_cleanup(self, code: str) -> str:
        """Pass 7: Final cleanup - ensure all references are renamed."""
        # Apply rename map one more time to catch any missed references
        # CRITICAL: Do NOT rename identifiers that come after a dot (field accesses)
        for original, renamed in self.rename_map.items():
            # Use negative lookbehind to avoid matching after dots
            # (?<!\.) means "not preceded by a dot"
            pattern = r'(?<!\.)' + r'\b' + re.escape(original) + r'\b'
            code = re.sub(pattern, renamed, code)
        return code
    
    def get_rename_count(self) -> int:
        """Get the number of variables renamed."""
        return len(self.rename_map)
    
    def get_pass_count(self) -> int:
        """Get the number of passes completed."""
        return self.pass_count



class LuraphParameterTransformer:
    """
    Transforms function parameters to use 10-character Luraph-style names.
    
    Luraph uses shorter parameter names (10 chars) compared to regular
    variable names (31 chars) for a more compact output.
    
    Requirements: 27.2
    """
    
    PARAM_LENGTH = 10
    
    def __init__(self, seed: PolymorphicBuildSeed, naming: UnifiedNamingSystem):
        """
        Initialize the parameter transformer.
        
        Args:
            seed: PolymorphicBuildSeed for deterministic generation
            naming: UnifiedNamingSystem for name generation
        """
        self.seed = seed
        self.naming = naming
        self.param_map: Dict[str, str] = {}
    
    def transform(self, code: str) -> str:
        """
        Transform all function parameters to 10-character names.
        
        Args:
            code: The Lua code to transform
            
        Returns:
            Code with transformed parameters
        """
        # Find all function definitions and transform their parameters
        pattern = r'\bfunction\s*([a-zA-Z_][a-zA-Z0-9_.:]*\s*)?\(([^)]*)\)'
        
        def transform_params(match):
            func_name = match.group(1) or ''
            params_str = match.group(2)
            
            if not params_str.strip():
                return match.group(0)
            
            params = [p.strip() for p in params_str.split(',')]
            transformed = []
            
            for param in params:
                if param == '...':
                    transformed.append(param)
                elif param in LUA_KEYWORDS or param in ROBLOX_GLOBALS:
                    transformed.append(param)
                else:
                    # Generate 10-character parameter name
                    if param not in self.param_map:
                        self.param_map[param] = self.naming.generate_short_name(self.PARAM_LENGTH)
                    transformed.append(self.param_map[param])
            
            return f'function {func_name}({", ".join(transformed)})'
        
        # First pass: transform parameter declarations
        code = re.sub(pattern, transform_params, code)
        
        # Second pass: update all references to transformed parameters
        for original, renamed in self.param_map.items():
            pattern = r'\b' + re.escape(original) + r'\b'
            code = re.sub(pattern, renamed, code)
        
        return code
    
    def get_param_count(self) -> int:
        """Get the number of parameters transformed."""
        return len(self.param_map)


class FunctionNameAliaser:
    """
    Creates single-letter aliases for function names.
    
    Luraph uses single-letter function names (like I4, D, W, z4, j)
    to minimize code size and obscure function purposes.
    
    Requirements: 27.3
    """
    
    # Single letters used for function aliases (avoiding reserved)
    ALIAS_CHARS = list('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
    
    def __init__(self, seed: PolymorphicBuildSeed, naming: UnifiedNamingSystem):
        """
        Initialize the function name aliaser.
        
        Args:
            seed: PolymorphicBuildSeed for deterministic generation
            naming: UnifiedNamingSystem for name generation
        """
        self.seed = seed
        self.naming = naming
        self.alias_map: Dict[str, str] = {}
        self.used_aliases: Set[str] = set()
        self.alias_index = 0
    
    def _generate_alias(self) -> str:
        """Generate a unique single/double letter alias."""
        if self.alias_index < len(self.ALIAS_CHARS):
            alias = self.ALIAS_CHARS[self.alias_index]
            self.alias_index += 1
            return alias
        else:
            # Use two-letter combinations like I4, z4, W2
            base_idx = (self.alias_index - len(self.ALIAS_CHARS)) // 10
            num = (self.alias_index - len(self.ALIAS_CHARS)) % 10
            self.alias_index += 1
            if base_idx < len(self.ALIAS_CHARS):
                return f'{self.ALIAS_CHARS[base_idx]}{num}'
            else:
                # Fall back to naming system
                return self.naming.generate_short_name(3)
    
    def transform(self, code: str) -> str:
        """
        Create single-letter aliases for function names.
        
        Args:
            code: The Lua code to transform
            
        Returns:
            Code with aliased function names
        """
        # Find local function declarations
        pattern = r'\blocal\s+function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\('
        
        def alias_function(match):
            func_name = match.group(1)
            if func_name in LUA_KEYWORDS or func_name in ROBLOX_GLOBALS:
                return match.group(0)
            
            if func_name not in self.alias_map:
                self.alias_map[func_name] = self._generate_alias()
            
            alias = self.alias_map[func_name]
            return f'local function {alias}('
        
        # First pass: alias function declarations
        code = re.sub(pattern, alias_function, code)
        
        # Also handle: local name = function(...)
        assign_pattern = r'\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*function\s*\('
        
        def alias_assign_function(match):
            func_name = match.group(1)
            if func_name in LUA_KEYWORDS or func_name in ROBLOX_GLOBALS:
                return match.group(0)
            
            if func_name not in self.alias_map:
                self.alias_map[func_name] = self._generate_alias()
            
            alias = self.alias_map[func_name]
            return f'local {alias} = function('
        
        code = re.sub(assign_pattern, alias_assign_function, code)
        
        # Second pass: update all references
        for original, alias in self.alias_map.items():
            pattern = r'\b' + re.escape(original) + r'\b'
            code = re.sub(pattern, alias, code)
        
        return code
    
    def get_alias_count(self) -> int:
        """Get the number of functions aliased."""
        return len(self.alias_map)


class GlobalAliasesGenerator:
    """
    Creates aliases for all global references.
    
    Instead of directly accessing globals like `string.char`, creates
    local aliases like `local _O0O = string.char` to obscure the code.
    
    Requirements: 27.4
    """
    
    # Globals that should be aliased
    ALIASABLE_GLOBALS = {
        'string': ['char', 'byte', 'sub', 'gsub', 'find', 'match', 'format',
                   'len', 'lower', 'upper', 'rep', 'reverse', 'pack', 'unpack'],
        'table': ['insert', 'remove', 'sort', 'concat', 'create', 'move', 'unpack'],
        'math': ['abs', 'ceil', 'floor', 'max', 'min', 'random', 'sqrt',
                 'sin', 'cos', 'tan', 'exp', 'log', 'pow', 'huge', 'pi'],
        'bit32': ['band', 'bor', 'bxor', 'bnot', 'lshift', 'rshift', 'arshift',
                  'lrotate', 'rrotate', 'extract', 'replace', 'btest'],
        'buffer': ['fromstring', 'tostring', 'create', 'len', 'readu8', 'readu16',
                   'readu32', 'readi8', 'readi16', 'readi32', 'readf32', 'readf64',
                   'writeu8', 'writeu16', 'writeu32', 'writei8', 'writei16',
                   'writei32', 'writef32', 'writef64', 'readstring', 'writestring',
                   'copy', 'fill'],
        'coroutine': ['create', 'resume', 'yield', 'status', 'wrap', 'running'],
        'os': ['time', 'date', 'clock', 'difftime'],
    }
    
    # Standalone globals to alias
    STANDALONE_GLOBALS = [
        'print', 'warn', 'error', 'assert', 'type', 'typeof', 'tostring',
        'tonumber', 'pairs', 'ipairs', 'next', 'select', 'unpack',
        'pcall', 'xpcall', 'rawget', 'rawset', 'rawequal', 'rawlen',
        'setmetatable', 'getmetatable', 'newproxy', 'getfenv', 'setfenv',
    ]
    
    def __init__(self, seed: PolymorphicBuildSeed, naming: UnifiedNamingSystem):
        """
        Initialize the global aliases generator.
        
        Args:
            seed: PolymorphicBuildSeed for deterministic generation
            naming: UnifiedNamingSystem for name generation
        """
        self.seed = seed
        self.naming = naming
        self.alias_map: Dict[str, str] = {}  # "string.char" -> "_O0O1l..."
    
    def generate_aliases(self) -> str:
        """
        Generate alias declarations for all globals.
        
        Returns:
            Lua code declaring all aliases
        """
        declarations = []
        
        # Alias library tables first
        for lib_name in self.ALIASABLE_GLOBALS:
            lib_alias = self.naming.generate_name()
            self.alias_map[lib_name] = lib_alias
            declarations.append(f'local {lib_alias}={lib_name}')
            
            # Alias library methods
            for method in self.ALIASABLE_GLOBALS[lib_name]:
                full_name = f'{lib_name}.{method}'
                method_alias = self.naming.generate_name()
                self.alias_map[full_name] = method_alias
                declarations.append(f'local {method_alias}={lib_alias}.{method}')
        
        # Alias standalone globals
        for global_name in self.STANDALONE_GLOBALS:
            alias = self.naming.generate_name()
            self.alias_map[global_name] = alias
            declarations.append(f'local {alias}={global_name}')
        
        return '\n'.join(declarations)
    
    def transform(self, code: str) -> str:
        """
        Replace global references with their aliases.
        
        Args:
            code: The Lua code to transform
            
        Returns:
            Code with aliased global references
        """
        # Replace library.method patterns first (longer matches first)
        for full_name, alias in sorted(self.alias_map.items(), key=lambda x: -len(x[0])):
            if '.' in full_name:
                # Escape the dot for regex
                pattern = r'\b' + re.escape(full_name) + r'\b'
                code = re.sub(pattern, alias, code)
        
        # Then replace standalone globals
        for name, alias in self.alias_map.items():
            if '.' not in name:
                pattern = r'\b' + re.escape(name) + r'\b'
                code = re.sub(pattern, alias, code)
        
        return code
    
    def get_alias_count(self) -> int:
        """Get the number of aliases generated."""
        return len(self.alias_map)


class MetamethodStringAliaser:
    """
    Creates aliases for metamethod string names.
    
    Instead of using "__index" directly, creates obfuscated string
    representations using string.char or escape sequences.
    
    Requirements: 27.5
    """
    
    def __init__(self, seed: PolymorphicBuildSeed, naming: UnifiedNamingSystem):
        """
        Initialize the metamethod string aliaser.
        
        Args:
            seed: PolymorphicBuildSeed for deterministic generation
            naming: UnifiedNamingSystem for name generation
        """
        self.seed = seed
        self.naming = naming
        self.alias_map: Dict[str, str] = {}
    
    def _string_to_char_call(self, s: str) -> str:
        """Convert a string to string.char(...) call."""
        bytes_list = [str(ord(c)) for c in s]
        return f'string.char({",".join(bytes_list)})'
    
    def _string_to_escape_sequence(self, s: str) -> str:
        """Convert a string to escape sequence format."""
        escaped = ''.join(f'\\{ord(c):03d}' for c in s)
        return f'"{escaped}"'
    
    def _string_to_hex_escape(self, s: str) -> str:
        """Convert a string to hex escape format."""
        escaped = ''.join(f'\\x{ord(c):02X}' for c in s)
        return f'"{escaped}"'
    
    def generate_aliases(self) -> str:
        """
        Generate alias declarations for metamethod strings.
        
        Returns:
            Lua code declaring metamethod aliases
        """
        declarations = []
        
        for metamethod in METAMETHODS:
            alias = self.naming.generate_name()
            self.alias_map[metamethod] = alias
            
            # Randomly choose encoding method
            method = self.seed.get_random_int(0, 2)
            if method == 0:
                encoded = self._string_to_char_call(metamethod)
            elif method == 1:
                encoded = self._string_to_escape_sequence(metamethod)
            else:
                encoded = self._string_to_hex_escape(metamethod)
            
            declarations.append(f'local {alias}={encoded}')
        
        return '\n'.join(declarations)
    
    def transform(self, code: str) -> str:
        """
        Replace metamethod string literals with aliases.
        
        Args:
            code: The Lua code to transform
            
        Returns:
            Code with aliased metamethod strings
        """
        for metamethod, alias in self.alias_map.items():
            # Replace string literals like "__index" or '__index'
            patterns = [
                f'"{metamethod}"',
                f"'{metamethod}'",
            ]
            for pattern in patterns:
                code = code.replace(pattern, alias)
        
        return code
    
    def get_alias_count(self) -> int:
        """Get the number of metamethods aliased."""
        return len(self.alias_map)


class VariableRenamingTransformer:
    """
    Main interface for all variable renaming transformations.
    
    Combines all renaming passes into a single transformer that can be
    applied to code in the obfuscation pipeline.
    
    Requirements: 27.1, 27.2, 27.3, 27.4, 27.5
    """
    
    def __init__(self, seed: PolymorphicBuildSeed, naming: UnifiedNamingSystem = None):
        """
        Initialize the variable renaming transformer.
        
        Args:
            seed: PolymorphicBuildSeed for deterministic generation
            naming: UnifiedNamingSystem for name generation (created if None)
        """
        self.seed = seed
        self.naming = naming or UnifiedNamingSystem(seed)
        
        # Initialize all sub-transformers
        self.variable_renamer = UltraAggressiveVariableRenamer(seed, self.naming)
        self.param_transformer = LuraphParameterTransformer(seed, self.naming)
        self.function_aliaser = FunctionNameAliaser(seed, self.naming)
        self.global_aliaser = GlobalAliasesGenerator(seed, self.naming)
        self.metamethod_aliaser = MetamethodStringAliaser(seed, self.naming)
    
    def transform(self, code: str, 
                  enable_variable_renaming: bool = True,
                  enable_param_transform: bool = True,
                  enable_function_aliasing: bool = True,
                  enable_global_aliases: bool = True,
                  enable_metamethod_aliases: bool = True) -> str:
        """
        Apply all enabled variable renaming transformations.
        
        Args:
            code: The Lua code to transform
            enable_variable_renaming: Enable 7-pass variable renaming
            enable_param_transform: Enable 10-char parameter names
            enable_function_aliasing: Enable single-letter function names
            enable_global_aliases: Enable global reference aliases
            enable_metamethod_aliases: Enable metamethod string aliases
            
        Returns:
            Transformed code with all enabled renaming applied
        """
        # Generate alias declarations (prepended to code)
        alias_declarations = []
        
        if enable_global_aliases:
            alias_declarations.append(self.global_aliaser.generate_aliases())
        
        if enable_metamethod_aliases:
            alias_declarations.append(self.metamethod_aliaser.generate_aliases())
        
        # Apply transformations in order
        if enable_variable_renaming:
            code = self.variable_renamer.rename(code)
        
        if enable_param_transform:
            code = self.param_transformer.transform(code)
        
        if enable_function_aliasing:
            code = self.function_aliaser.transform(code)
        
        if enable_global_aliases:
            code = self.global_aliaser.transform(code)
        
        if enable_metamethod_aliases:
            code = self.metamethod_aliaser.transform(code)
        
        # Prepend alias declarations
        if alias_declarations:
            declarations = '\n'.join(alias_declarations)
            code = f'{declarations}\n{code}'
        
        return code
    
    def get_stats(self) -> Dict[str, int]:
        """Get statistics about the transformations applied."""
        return {
            'variables_renamed': self.variable_renamer.get_rename_count(),
            'passes_completed': self.variable_renamer.get_pass_count(),
            'parameters_transformed': self.param_transformer.get_param_count(),
            'functions_aliased': self.function_aliaser.get_alias_count(),
            'globals_aliased': self.global_aliaser.get_alias_count(),
            'metamethods_aliased': self.metamethod_aliaser.get_alias_count(),
        }
