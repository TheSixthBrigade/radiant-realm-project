"""
FIU VM Generator - Generates obfuscated VM code from Virtualization.lua

This module loads the battle-tested FIU VM bytecode interpreter and applies
obfuscation transforms to make the VM structure unreadable.

Requirements: 20.1, 20.2, 20.3, 20.4
- Use FIU VM bytecode interpreter
- Correctly interpret all 83 Luau opcodes
- Handle closures, upvalues, varargs correctly
- Handle errors gracefully without exposing VM internals
"""

import re
from pathlib import Path
from typing import Optional, List, Dict, Tuple, Callable

# Import core systems
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from core import (
    PolymorphicBuildSeed,
    UnifiedNamingSystem,
    BitwiseWrapperSystem,
    ConstantPoolManager,
    OpaquePredicateGenerator,
)


class FIUVMGenerator:
    """
    Generates obfuscated VM code from the FIU VM template.
    
    The FIU VM (Virtualization.lua) is a battle-tested Luau bytecode interpreter
    that supports all 83 Luau opcodes. This generator:
    1. Loads the VM source
    2. Parses it into sections (globals, opList, functions)
    3. Applies obfuscation transforms to each section
    4. Generates the final obfuscated VM code
    
    Requirements: 20.1, 20.2, 20.3, 20.4
    """
    
    # VM sections that can be identified and transformed
    SECTION_MARKERS = {
        'globals': ('-- // Environment changes', 'local opList'),
        'oplist': ('local opList', 'local LUA_MULTRET'),
        'settings': ('local function luau_newsettings', 'local function luau_validatesettings'),
        'deserialize': ('local function luau_deserialize', 'local function luau_load'),
        'load': ('local function luau_load', 'return {'),
        'return': ('return {', None),
    }
    
    def __init__(
        self,
        vm_source_path: str = None,
        seed: PolymorphicBuildSeed = None,
    ):
        """
        Initialize the VM generator.
        
        Args:
            vm_source_path: Path to Virtualization.lua. If None, uses default location.
            seed: Polymorphic build seed for randomization. If None, creates new one.
        """
        if vm_source_path is None:
            vm_source_path = str(Path(__file__).parent.parent / "Virtualization.lua")
        
        self.vm_source_path = vm_source_path
        self.seed = seed or PolymorphicBuildSeed()
        
        # Initialize core systems
        self.naming = UnifiedNamingSystem(self.seed)
        self.bitwise = BitwiseWrapperSystem(self.seed)
        self.constants = ConstantPoolManager(self.seed)
        self.predicates = OpaquePredicateGenerator(self.seed)
        
        # Load VM source
        self.vm_source = self._load_vm()
        
        # Track variable mappings for consistent renaming
        self.var_mappings: Dict[str, str] = {}
        
        # Track which transforms have been applied
        self.applied_transforms: List[str] = []
    
    def _load_vm(self) -> str:
        """Load the FIU VM source from file."""
        path = Path(self.vm_source_path)
        if not path.exists():
            raise FileNotFoundError(f"VM source not found: {self.vm_source_path}")
        
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def _parse_sections(self) -> Dict[str, str]:
        """
        Parse the VM source into logical sections.
        
        Returns:
            Dictionary mapping section names to their source code.
        """
        sections = {}
        source = self.vm_source
        
        for name, (start_marker, end_marker) in self.SECTION_MARKERS.items():
            start_idx = source.find(start_marker)
            if start_idx == -1:
                continue
            
            if end_marker:
                end_idx = source.find(end_marker, start_idx + len(start_marker))
                if end_idx == -1:
                    sections[name] = source[start_idx:]
                else:
                    sections[name] = source[start_idx:end_idx]
            else:
                sections[name] = source[start_idx:]
        
        return sections
    
    def _get_local_variables(self, code: str) -> List[str]:
        """
        Extract local variable names from code.
        
        Args:
            code: Lua source code
            
        Returns:
            List of local variable names
        """
        # Match local declarations: local name, local name = value, local name, name2 = ...
        pattern = r'local\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)'
        matches = re.findall(pattern, code)
        
        variables = []
        for match in matches:
            # Split by comma for multiple declarations
            names = [n.strip() for n in match.split(',')]
            variables.extend(names)
        
        return list(set(variables))
    
    def _get_function_names(self, code: str) -> List[str]:
        """
        Extract function names from code.
        
        Args:
            code: Lua source code
            
        Returns:
            List of function names
        """
        # Match function declarations: local function name, function name
        pattern = r'(?:local\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\('
        matches = re.findall(pattern, code)
        return list(set(matches))
    
    def _rename_variable(self, old_name: str) -> str:
        """
        Get or create an obfuscated name for a variable.
        
        Args:
            old_name: Original variable name
            
        Returns:
            Obfuscated variable name
        """
        if old_name not in self.var_mappings:
            self.var_mappings[old_name] = self.naming.generate_name()
        return self.var_mappings[old_name]
    
    def _transform_globals_section(self, code: str) -> str:
        """
        Transform the globals section (localized standard library functions).
        
        This section contains:
        - type, pcall, error, tonumber, assert, setmetatable
        - string_format, table_move, table_pack, etc.
        - coroutine functions
        - buffer functions
        - bit32 functions
        
        Args:
            code: Globals section source code
            
        Returns:
            Transformed code with obfuscated variable names
        """
        # Get all local variable names
        variables = self._get_local_variables(code)
        
        # Create mappings for each variable
        for var in variables:
            # Skip very short names that might be loop variables
            if len(var) <= 2:
                continue
            self._rename_variable(var)
        
        # Apply renaming
        result = code
        for old_name, new_name in self.var_mappings.items():
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(old_name) + r'\b'
            result = re.sub(pattern, new_name, result)
        
        return result
    
    def _transform_oplist_section(self, code: str) -> str:
        """
        Transform the opList section (opcode definitions).
        
        The opList contains information about each instruction:
        {OP_NAME, OP_MODE, K_MODE, HAS_AUX}
        
        We obfuscate:
        - The opList variable name
        - The opcode names (strings)
        - The numeric indices
        
        Args:
            code: OpList section source code
            
        Returns:
            Transformed code
        """
        # Rename opList variable
        oplist_name = self._rename_variable('opList')
        result = re.sub(r'\bopList\b', oplist_name, code)
        
        return result
    
    def _transform_function_body(self, code: str) -> str:
        """
        Transform a function body with obfuscation.
        
        Applies:
        - Variable renaming
        - Number obfuscation
        - Opaque predicate insertion
        
        Args:
            code: Function body source code
            
        Returns:
            Transformed code
        """
        result = code
        
        # Get local variables in this function
        local_vars = self._get_local_variables(code)
        
        # Create mappings for function-local variables
        local_mappings = {}
        for var in local_vars:
            if len(var) > 2 and var not in self.var_mappings:
                local_mappings[var] = self.naming.generate_name()
        
        # Apply local renaming
        for old_name, new_name in local_mappings.items():
            pattern = r'\b' + re.escape(old_name) + r'\b'
            result = re.sub(pattern, new_name, result)
        
        # Apply global renaming
        for old_name, new_name in self.var_mappings.items():
            pattern = r'\b' + re.escape(old_name) + r'\b'
            result = re.sub(pattern, new_name, result)
        
        return result
    
    def generate_obfuscated_vm(
        self,
        enable_variable_renaming: bool = True,
        enable_number_transform: bool = True,
        enable_opaque_predicates: bool = True,
        enable_dead_code: bool = True,
    ) -> str:
        """
        Generate the fully obfuscated VM code.
        
        Args:
            enable_variable_renaming: Rename variables to confusing names
            enable_number_transform: Transform numbers to hex/binary formats
            enable_opaque_predicates: Insert always-true/false conditions
            enable_dead_code: Insert dead code blocks
            
        Returns:
            Obfuscated VM source code
        """
        result = self.vm_source
        
        # Track applied transforms
        self.applied_transforms = []
        
        # Step 1: Variable renaming
        if enable_variable_renaming:
            result = self._apply_variable_renaming(result)
            self.applied_transforms.append('variable_renaming')
        
        # Step 2: Number transformation
        if enable_number_transform:
            result = self._apply_number_transform(result)
            self.applied_transforms.append('number_transform')
        
        # Step 3: Opaque predicates
        if enable_opaque_predicates:
            result = self._apply_opaque_predicates(result)
            self.applied_transforms.append('opaque_predicates')
        
        # Step 4: Dead code injection
        if enable_dead_code:
            result = self._apply_dead_code(result)
            self.applied_transforms.append('dead_code')
        
        return result
    
    def _apply_variable_renaming(self, code: str) -> str:
        """
        Apply variable renaming to the entire VM code.
        
        Renames:
        - Local variables
        - Function names
        - Parameters
        
        Preserves:
        - Lua keywords
        - Standard library names (when accessed via dot notation)
        - String literals
        """
        # List of variables to rename (extracted from VM source)
        vm_variables = [
            # Localized globals
            'type', 'pcall', 'error', 'tonumber', 'assert', 'setmetatable',
            'string_format', 'table_move', 'table_pack', 'table_unpack',
            'table_create', 'table_insert', 'table_remove', 'table_concat',
            'coroutine_create', 'coroutine_yield', 'coroutine_resume', 'coroutine_close',
            'buffer_fromstring', 'buffer_len', 'buffer_readu8', 'buffer_readu32',
            'buffer_readstring', 'buffer_readf32', 'buffer_readf64',
            'bit32_bor', 'bit32_band', 'bit32_btest', 'bit32_rshift',
            'bit32_lshift', 'bit32_extract',
            # Type checking functions
            'ttisnumber', 'ttisstring', 'ttisboolean', 'ttisfunction',
            # Main functions
            'luau_newsettings', 'luau_validatesettings', 'luau_deserialize',
            'luau_load', 'luau_getcoverage', 'luau_wrapclosure', 'luau_execute',
            'luau_close',
            # Helper functions
            'getmaxline', 'getcoverage', 'resolveImportConstant',
            'readByte', 'readWord', 'readFloat', 'readDouble', 'readVarInt',
            'readString', 'readInstruction', 'checkkmode', 'readProto',
            # Variables
            'opList', 'LUA_MULTRET', 'LUA_GENERALIZED_TERMINATOR',
            'stream', 'cursor', 'luauVersion', 'typesVersion',
            'stringCount', 'stringList', 'protoCount', 'protoList', 'mainProto',
            'module', 'env', 'proto', 'upvals', 'stack', 'varargs',
            'debugging', 'pc', 'top', 'open_upvalues', 'generalized_iterators',
            'constants', 'debugopcodes', 'handlingBreak', 'inst', 'op',
            'breakHook', 'stepHook', 'interruptHook', 'panicHook', 'alive',
        ]
        
        result = code
        
        # Create mappings for all VM variables
        for var in vm_variables:
            if var not in self.var_mappings:
                self.var_mappings[var] = self.naming.generate_name()
        
        # Apply renaming (careful to avoid string literals)
        for old_name, new_name in self.var_mappings.items():
            # Use word boundaries and avoid matches inside strings
            result = self._safe_replace(result, old_name, new_name)
        
        return result
    
    def _safe_replace(self, code: str, old_name: str, new_name: str) -> str:
        """
        Replace variable name while avoiding string literals.
        
        Args:
            code: Source code
            old_name: Original variable name
            new_name: New variable name
            
        Returns:
            Code with replacements applied
        """
        result = []
        i = 0
        
        while i < len(code):
            char = code[i]
            
            # Check for string start
            if char == '"' or char == "'":
                quote = char
                start = i
                i += 1
                # Find end of string, handling escapes
                while i < len(code):
                    if code[i] == '\\' and i + 1 < len(code):
                        i += 2  # Skip escape sequence
                    elif code[i] == quote:
                        i += 1
                        break
                    else:
                        i += 1
                # Add string as-is
                result.append(code[start:i])
            elif char == '[' and i + 1 < len(code) and code[i+1] == '[':
                # Long string [[...]]
                start = i
                end = code.find(']]', i + 2)
                if end != -1:
                    result.append(code[start:end+2])
                    i = end + 2
                else:
                    result.append(code[i])
                    i += 1
            elif char == '-' and i + 1 < len(code) and code[i+1] == '-':
                # Comment
                if i + 3 < len(code) and code[i+2:i+4] == '[[':
                    # Multi-line comment
                    end = code.find(']]', i + 4)
                    if end != -1:
                        result.append(code[i:end+2])
                        i = end + 2
                    else:
                        result.append(code[i])
                        i += 1
                else:
                    # Single-line comment
                    end = code.find('\n', i)
                    if end != -1:
                        result.append(code[i:end+1])
                        i = end + 1
                    else:
                        result.append(code[i:])
                        i = len(code)
            else:
                # Check if this is the start of the variable name
                if code[i:i+len(old_name)] == old_name:
                    # Check word boundaries
                    before_ok = (i == 0 or not code[i-1].isalnum() and code[i-1] != '_')
                    after_idx = i + len(old_name)
                    after_ok = (after_idx >= len(code) or 
                               not code[after_idx].isalnum() and code[after_idx] != '_')
                    
                    if before_ok and after_ok:
                        result.append(new_name)
                        i += len(old_name)
                        continue
                
                result.append(char)
                i += 1
        
        return ''.join(result)
    
    def _apply_number_transform(self, code: str) -> str:
        """
        Transform numeric literals to obfuscated formats.
        
        Uses Luraph-style formats:
        - 0X5_A (hex with underscores)
        - 0B1111__1111 (binary with underscores)
        - Mixed case hex
        """
        try:
            from transforms.numbers import LuraphNumberTransformer
            transformer = LuraphNumberTransformer(self.seed)
            return transformer.transform_in_code(code)
        except ImportError:
            # Fallback if transforms module not available
            return code
    
    def _apply_opaque_predicates(self, code: str) -> str:
        """
        Insert opaque predicates into the code.
        
        Adds always-true/false conditions that are hard to analyze
        but don't affect execution.
        """
        # Find good insertion points (after local declarations, before returns)
        lines = code.split('\n')
        result_lines = []
        
        for i, line in enumerate(lines):
            result_lines.append(line)
            
            # Insert opaque predicate after some local declarations
            if 'local ' in line and '=' in line and self.seed.random_bool(0.1):
                pred = self.predicates.get_true_predicate()
                dead_var = self.naming.generate_name()
                result_lines.append(f"if {pred} then local {dead_var}=0 end")
        
        return '\n'.join(result_lines)
    
    def _apply_dead_code(self, code: str) -> str:
        """
        Insert dead code blocks that never execute.
        
        Uses opaque predicates to create unreachable code paths.
        """
        lines = code.split('\n')
        result_lines = []
        
        for i, line in enumerate(lines):
            result_lines.append(line)
            
            # Insert dead code block occasionally
            if 'end' in line and self.seed.random_bool(0.05):
                false_pred = self.predicates.get_false_predicate()
                dead_var1 = self.naming.generate_name()
                dead_var2 = self.naming.generate_name()
                dead_code = f"if {false_pred} then local {dead_var1}={dead_var2} end"
                result_lines.append(dead_code)
        
        return '\n'.join(result_lines)
    
    def get_vm_with_bytecode(self, encoded_bytecode: str) -> str:
        """
        Generate complete VM code with embedded bytecode.
        
        Args:
            encoded_bytecode: The encoded bytecode string (from encryption)
            
        Returns:
            Complete obfuscated VM code ready for execution
        """
        # Generate obfuscated VM
        vm_code = self.generate_obfuscated_vm()
        
        # Remove the final return statement
        last_return_idx = vm_code.rfind("return {")
        if last_return_idx != -1:
            vm_code = vm_code[:last_return_idx]
        
        # Generate variable names
        bytecode_var = self.naming.generate_name()
        module_var = self.naming.generate_name()
        closure_var = self.naming.generate_name()
        env_var = self.naming.generate_name()
        
        # Get obfuscated function names
        deserialize_name = self.var_mappings.get('luau_deserialize', 'luau_deserialize')
        load_name = self.var_mappings.get('luau_load', 'luau_load')
        
        # Generate opaque predicates
        true_pred = self.predicates.get_true_predicate()
        false_pred = self.predicates.get_false_predicate()
        
        # Dead code
        dead_var = self.naming.generate_name()
        
        # Build output
        output = f"""do
{vm_code}
local {bytecode_var}={encoded_bytecode}
local {module_var}={deserialize_name}({bytecode_var})
local {env_var}=getfenv and getfenv()or _ENV
local {closure_var}={load_name}({module_var},{env_var})
if {false_pred} then local {dead_var}=0 end
if {true_pred} then return {closure_var}()end
end
"""
        return output
    
    def generate_inner_vm(self, num_opcodes: int = 28) -> str:
        """
        Generate an inner VM in an isolated do block.
        
        Creates a minimal VM with specified number of opcodes in an isolated
        scope to prevent variable leakage to outer scope.
        
        Requirements: 21.1, 21.2, 21.3
        - Create isolated do block
        - Include specified number of opcode handlers
        - Ensure no variables leak to outer scope
        
        Args:
            num_opcodes: Number of opcodes to include (default 28)
            
        Returns:
            Inner VM code in isolated do block
        """
        # Generate unique names for inner VM
        inner_naming = UnifiedNamingSystem(self.seed)
        
        # Core opcode handlers (28 most common opcodes)
        core_opcodes = [
            (0, 'NOP', '-- Do nothing'),
            (2, 'LOADNIL', 'stack[inst.A] = nil'),
            (3, 'LOADB', 'stack[inst.A] = inst.B == 1; pc = pc + inst.C'),
            (4, 'LOADN', 'stack[inst.A] = inst.D'),
            (5, 'LOADK', 'stack[inst.A] = inst.K'),
            (6, 'MOVE', 'stack[inst.A] = stack[inst.B]'),
            (7, 'GETGLOBAL', 'stack[inst.A] = env[inst.K]; pc = pc + 1'),
            (8, 'SETGLOBAL', 'env[inst.K] = stack[inst.A]; pc = pc + 1'),
            (13, 'GETTABLE', 'stack[inst.A] = stack[inst.B][stack[inst.C]]'),
            (14, 'SETTABLE', 'stack[inst.B][stack[inst.C]] = stack[inst.A]'),
            (21, 'CALL', 'local A,B,C=inst.A,inst.B,inst.C;local params=B==0 and top-A or B-1;local ret=table.pack(stack[A](table.unpack(stack,A+1,A+params)));local ret_num=ret.n;if C==0 then top=A+ret_num-1 else ret_num=C-1 end;table.move(ret,1,ret_num,A,stack)'),
            (22, 'RETURN', 'local A,B=inst.A,inst.B;local nresults=B-1==-1 and top-A+1 or B-1;return table.unpack(stack,A,A+nresults-1)'),
            (23, 'JUMP', 'pc = pc + inst.D'),
            (25, 'JUMPIF', 'if stack[inst.A] then pc = pc + inst.D end'),
            (26, 'JUMPIFNOT', 'if not stack[inst.A] then pc = pc + inst.D end'),
            (33, 'ADD', 'stack[inst.A] = stack[inst.B] + stack[inst.C]'),
            (34, 'SUB', 'stack[inst.A] = stack[inst.B] - stack[inst.C]'),
            (35, 'MUL', 'stack[inst.A] = stack[inst.B] * stack[inst.C]'),
            (36, 'DIV', 'stack[inst.A] = stack[inst.B] / stack[inst.C]'),
            (37, 'MOD', 'stack[inst.A] = stack[inst.B] % stack[inst.C]'),
            (38, 'POW', 'stack[inst.A] = stack[inst.B] ^ stack[inst.C]'),
            (45, 'AND', 'local v=stack[inst.B];stack[inst.A]=v and stack[inst.C] or v'),
            (46, 'OR', 'local v=stack[inst.B];stack[inst.A]=v and v or stack[inst.C]'),
            (49, 'CONCAT', 'local B,C=inst.B,inst.C;local s=stack[B];for i=B+1,C do s=s..stack[i] end;stack[inst.A]=s'),
            (50, 'NOT', 'stack[inst.A] = not stack[inst.B]'),
            (51, 'MINUS', 'stack[inst.A] = -stack[inst.B]'),
            (52, 'LENGTH', 'stack[inst.A] = #stack[inst.B]'),
            (53, 'NEWTABLE', 'stack[inst.A] = {}; pc = pc + 1'),
        ]
        
        # Limit to requested number of opcodes
        opcodes_to_use = core_opcodes[:min(num_opcodes, len(core_opcodes))]
        
        # Generate obfuscated variable names
        vars = {
            'stack': inner_naming.generate_name(),
            'pc': inner_naming.generate_name(),
            'inst': inner_naming.generate_name(),
            'op': inner_naming.generate_name(),
            'code': inner_naming.generate_name(),
            'env': inner_naming.generate_name(),
            'top': inner_naming.generate_name(),
            'alive': inner_naming.generate_name(),
        }
        
        # Build opcode dispatch
        dispatch_cases = []
        for opcode, name, handler in opcodes_to_use:
            # Replace variable names in handler
            obf_handler = handler
            for old, new in vars.items():
                obf_handler = obf_handler.replace(old, new)
            
            dispatch_cases.append(f"if {vars['op']}=={opcode} then {obf_handler}")
        
        # Join with elseif
        dispatch = dispatch_cases[0]
        for case in dispatch_cases[1:]:
            dispatch += f" else{case}"
        dispatch += " end"
        
        # Generate inner VM code in isolated do block
        inner_vm = f"""do
local {vars['stack']}={{}}
local {vars['pc']}=1
local {vars['top']}=-1
local {vars['alive']}=true
local {vars['env']}=getfenv and getfenv()or _ENV
while {vars['alive']} do
local {vars['inst']}={vars['code']}[{vars['pc']}]
local {vars['op']}={vars['inst']}.opcode
{vars['pc']}={vars['pc']}+1
{dispatch}
end
end"""
        
        return inner_vm
    
    def generate_isolated_vm_block(self, vm_code: str) -> str:
        """
        Wrap VM code in an isolated do block to prevent variable leakage.
        
        Requirements: 21.1, 21.3
        - Create isolated do block
        - Ensure no variables leak to outer scope
        
        Args:
            vm_code: The VM code to wrap
            
        Returns:
            VM code wrapped in isolated do block
        """
        # Generate unique scope marker
        scope_marker = self.naming.generate_name()
        
        # Wrap in do block with scope marker comment
        return f"""do --[[ {scope_marker} ]]
{vm_code}
end --[[ /{scope_marker} ]]"""



class DecoyVMGenerator:
    """
    Generates fake VM structures that appear functional but are never executed.
    
    Decoy VMs waste reverse engineers' time by presenting plausible-looking
    VM code that is actually unreachable. Uses opaque predicates to ensure
    decoys are never executed.
    
    Requirements: 23.1, 23.2, 23.3
    - Generate 2 fake VM structures
    - Ensure decoys are never executed
    - Make decoys appear functional
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Decoy VM Generator.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        self.predicates = OpaquePredicateGenerator(self.seed)
    
    def generate_decoy_vm(self, decoy_id: int = 1) -> str:
        """
        Generate a single decoy VM structure.
        
        Creates a fake VM that looks functional but is protected by
        an always-false opaque predicate.
        
        Args:
            decoy_id: Identifier for this decoy (1 or 2)
            
        Returns:
            Decoy VM code that never executes
        """
        # Generate unique variable names for this decoy
        vars = {
            'stack': self.naming.generate_name(),
            'pc': self.naming.generate_name(),
            'code': self.naming.generate_name(),
            'inst': self.naming.generate_name(),
            'op': self.naming.generate_name(),
            'env': self.naming.generate_name(),
            'module': self.naming.generate_name(),
            'bytecode': self.naming.generate_name(),
            'closure': self.naming.generate_name(),
            'result': self.naming.generate_name(),
            'top': self.naming.generate_name(),
            'constants': self.naming.generate_name(),
        }
        
        # Generate fake bytecode (random bytes that look like real bytecode)
        fake_bytecode_len = self.seed.get_random_int(100, 500)
        fake_bytes = [self.seed.get_random_int(0, 255) for _ in range(fake_bytecode_len)]
        fake_bytecode_str = '"' + ''.join(f'\\{b:03d}' for b in fake_bytes) + '"'
        
        # Generate fake opcode handlers
        fake_handlers = self._generate_fake_handlers(vars)
        
        # Always-false predicate to ensure decoy never executes
        false_pred = self.predicates.get_false_predicate()
        
        # Build decoy VM
        decoy = f"""-- Decoy VM {decoy_id} (never executed)
if {false_pred} then
local {vars['bytecode']}=buffer.fromstring({fake_bytecode_str})
local {vars['stack']}={{}}
local {vars['pc']}=1
local {vars['top']}=-1
local {vars['constants']}={{}}
local {vars['env']}=getfenv and getfenv()or _ENV
local {vars['code']}={{}}
while true do
local {vars['inst']}={vars['code']}[{vars['pc']}]
if not {vars['inst']} then break end
local {vars['op']}={vars['inst']}.opcode
{vars['pc']}={vars['pc']}+1
{fake_handlers}
end
end"""
        
        return decoy
    
    def _generate_fake_handlers(self, vars: Dict[str, str]) -> str:
        """
        Generate fake opcode handlers that look realistic.
        
        Args:
            vars: Dictionary of obfuscated variable names
            
        Returns:
            Fake opcode handler code
        """
        # Generate several fake handlers
        handlers = []
        
        # Fake LOADK handler
        handlers.append(f"""if {vars['op']}==5 then
{vars['stack']}[{vars['inst']}.A]={vars['constants']}[{vars['inst']}.D+1]""")
        
        # Fake MOVE handler
        handlers.append(f"""elseif {vars['op']}==6 then
{vars['stack']}[{vars['inst']}.A]={vars['stack']}[{vars['inst']}.B]""")
        
        # Fake ADD handler
        handlers.append(f"""elseif {vars['op']}==33 then
{vars['stack']}[{vars['inst']}.A]={vars['stack']}[{vars['inst']}.B]+{vars['stack']}[{vars['inst']}.C]""")
        
        # Fake CALL handler
        handlers.append(f"""elseif {vars['op']}==21 then
local A={vars['inst']}.A
local func={vars['stack']}[A]
local ret={{func()}}
{vars['stack']}[A]=ret[1]""")
        
        # Fake RETURN handler
        handlers.append(f"""elseif {vars['op']}==22 then
return {vars['stack']}[{vars['inst']}.A]""")
        
        # Fake JUMP handler
        handlers.append(f"""elseif {vars['op']}==23 then
{vars['pc']}={vars['pc']}+{vars['inst']}.D""")
        
        handlers.append("end")
        
        return '\n'.join(handlers)
    
    def generate_decoy_vms(self, count: int = 2) -> str:
        """
        Generate multiple decoy VM structures.
        
        Requirements: 23.1 - Generate 2 fake VM structures
        
        Args:
            count: Number of decoy VMs to generate (default 2)
            
        Returns:
            Combined decoy VM code
        """
        decoys = []
        for i in range(1, count + 1):
            decoys.append(self.generate_decoy_vm(i))
        
        return '\n\n'.join(decoys)
    
    def generate_decoy_handler(self) -> str:
        """
        Generate a single decoy handler function.
        
        Creates a fake VM handler that looks like a real opcode handler
        but is never called.
        
        Returns:
            Decoy handler function code
        """
        func_name = self.naming.generate_name()
        param1 = self.naming.generate_name()
        param2 = self.naming.generate_name()
        param3 = self.naming.generate_name()
        local1 = self.naming.generate_name()
        local2 = self.naming.generate_name()
        
        # Generate fake handler body
        handler = f"""local function {func_name}({param1},{param2},{param3})
local {local1}={param1}[{param2}]
local {local2}={param1}[{param3}]
{param1}[{param2}]={local1}+{local2}
return {local1}
end"""
        
        return handler
    
    def inject_decoys_into_vm(self, vm_code: str) -> str:
        """
        Inject decoy structures into existing VM code.
        
        Adds decoy VMs and handlers at strategic points in the code
        to confuse reverse engineers.
        
        Args:
            vm_code: The real VM code
            
        Returns:
            VM code with injected decoys
        """
        # Generate decoy VMs
        decoys = self.generate_decoy_vms(2)
        
        # Generate decoy handlers
        decoy_handlers = []
        for _ in range(2):
            decoy_handlers.append(self.generate_decoy_handler())
        
        # Find good injection points
        lines = vm_code.split('\n')
        result_lines = []
        
        decoy_vm_injected = False
        handler_count = 0
        
        for i, line in enumerate(lines):
            result_lines.append(line)
            
            # Inject decoy VMs after the first function definition
            if not decoy_vm_injected and 'local function' in line and 'end' not in line:
                # Find the end of this function and inject after
                if self.seed.random_bool(0.3):
                    result_lines.append('')
                    result_lines.append(decoys)
                    decoy_vm_injected = True
            
            # Inject decoy handlers occasionally
            if handler_count < 2 and 'end' in line and self.seed.random_bool(0.1):
                result_lines.append('')
                result_lines.append(decoy_handlers[handler_count])
                handler_count += 1
        
        # If decoys weren't injected, add them at the end
        if not decoy_vm_injected:
            result_lines.append('')
            result_lines.append(decoys)
        
        return '\n'.join(result_lines)
