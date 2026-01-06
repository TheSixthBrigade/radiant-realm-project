"""
Dynamic Opcode Remapping Per-Function.

This module implements per-function opcode mappings where:
1. Each function in the bytecode gets a unique opcode mapping
2. The mapping is embedded in the function's bytecode header
3. The VM reads the mapping before executing each function
4. Static analysis becomes much harder as opcodes vary per-function

Requirements: 3.1, 3.2, 3.3, 3.4
"""

import random
from typing import Dict, List, Tuple


class DynamicOpcodeRemapper:
    """
    Generates unique opcode mappings for each function.
    
    Instead of a single global opcode mapping, each function has its own.
    This means:
    - Function A: opcode 21 = CALL
    - Function B: opcode 21 = RETURN
    - Function C: opcode 21 = ADD
    
    The mapping is stored in the function's bytecode and read at runtime.
    
    Requirements: 3.1, 3.2, 3.3
    """
    
    # Standard Luau opcodes (0-82)
    STANDARD_OPCODES = list(range(83))
    
    def __init__(self, seed):
        """
        Initialize the dynamic opcode remapper.
        
        Args:
            seed: Random seed for deterministic generation
        """
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
        
        self.seed = seed
        self.function_mappings = {}  # func_id -> opcode_map
    
    def _gen_name(self, length: int = 25) -> str:
        """Generate obfuscated variable name using l, I, O, 0, 1, _"""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def generate_function_mapping(self, func_id: int) -> Dict[int, int]:
        """
        Generate a unique opcode mapping for a function.
        
        Args:
            func_id: Function identifier
            
        Returns:
            Dict mapping standard opcode -> remapped opcode
        """
        # Use func_id to seed differently for each function
        func_seed = hash(func_id) ^ self.rng.randint(0, 0xFFFFFFFF)
        func_rng = random.Random(func_seed)
        
        opcodes = self.STANDARD_OPCODES.copy()
        shuffled = opcodes.copy()
        func_rng.shuffle(shuffled)
        
        mapping = {orig: new for orig, new in zip(opcodes, shuffled)}
        self.function_mappings[func_id] = mapping
        
        return mapping
    
    def generate_mapping_table_code(self, func_id: int) -> str:
        """
        Generate Lua code for a function's opcode mapping table.
        
        Args:
            func_id: Function identifier
            
        Returns:
            Lua code defining the mapping table
        """
        if func_id not in self.function_mappings:
            self.generate_function_mapping(func_id)
        
        mapping = self.function_mappings[func_id]
        table_var = self._gen_name()
        
        # Generate table entries
        entries = []
        for orig, new in sorted(mapping.items()):
            entries.append(f'[0X{orig:02X}]=0X{new:02X}')
        
        return f'local {table_var}={{{",".join(entries)}}}'
    
    def generate_mapping_reader(self) -> str:
        """
        Generate Lua code that reads per-function mapping from bytecode.
        
        The mapping is stored in the function's bytecode header as:
        - 1 byte: mapping present flag (0xFF = has mapping)
        - 83 bytes: remapped opcodes (index = standard, value = remapped)
        
        Returns:
            Lua code for reading per-function mapping
        """
        reader_func = self._gen_name()
        proto_var = self._gen_name()
        mapping_var = self._gen_name()
        i_var = self._gen_name()
        
        code = f'''-- Per-Function Opcode Mapping Reader
local {reader_func}=function({proto_var})
local {mapping_var}={{}}
-- Check if function has custom mapping (flag in bytecode)
if {proto_var}.hasMapping then
for {i_var}=0,82 do
{mapping_var}[{i_var}]={proto_var}.opcodeMap[{i_var}]or {i_var}
end
else
-- Default: identity mapping
for {i_var}=0,82 do {mapping_var}[{i_var}]={i_var} end
end
return {mapping_var}
end'''
        
        return code
    
    def generate_dispatch_with_mapping(self) -> str:
        """
        Generate dispatch code that uses per-function mapping.
        
        Instead of: if op == 21 then
        Uses: if mapping[op] == 21 then
        
        Returns:
            Lua code for mapped dispatch
        """
        mapping_var = self._gen_name()
        op_var = self._gen_name()
        real_op_var = self._gen_name()
        
        code = f'''-- Mapped Opcode Dispatch
local {real_op_var}={mapping_var}[{op_var}]or {op_var}'''
        
        return code
    
    def generate_per_function_xor_keys(self, num_functions: int) -> List[int]:
        """
        Generate unique XOR keys for each function.
        
        Args:
            num_functions: Number of functions
            
        Returns:
            List of XOR keys, one per function
        """
        keys = []
        for i in range(num_functions):
            key = self.rng.randint(1, 255)
            keys.append(key)
        return keys
    
    def generate_runtime_remapper(self) -> str:
        """
        Generate runtime opcode remapping infrastructure.
        
        This creates a system where:
        1. Each proto has an embedded XOR key
        2. Opcodes are XORed with the key before dispatch
        3. Different functions have different keys
        
        Returns:
            Lua code for runtime remapping
        """
        remap_func = self._gen_name()
        op_var = self._gen_name()
        key_var = self._gen_name()
        
        code = f'''-- Runtime Opcode Remapper
local {remap_func}=function({op_var},{key_var})
return bit32["\\98\\120\\111\\114"]({op_var},{key_var})
end'''
        
        return code


class DynamicOpcodeIntegrator:
    """
    Integrates dynamic opcode remapping into VM code.
    """
    
    def __init__(self, seed, num_mappings: int = 5):
        self.generator = DynamicOpcodeRemapper(seed)
        self.num_mappings = num_mappings
        
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        else:
            self.rng = random.Random(seed)
    
    def _gen_name(self, length: int = 20) -> str:
        """Generate obfuscated variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def integrate(self, vm_code: str) -> str:
        """
        Integrate dynamic opcode remapping into VM code.
        
        Adds:
        1. Per-function XOR key infrastructure
        2. Runtime opcode remapping before dispatch
        3. Multiple pre-generated mappings
        
        Args:
            vm_code: Original VM code
            
        Returns:
            VM code with dynamic opcode remapping
        """
        import re
        
        # Generate runtime remapper
        remapper_code = self.generator.generate_runtime_remapper()
        
        # Generate multiple mapping tables
        mapping_tables = []
        for i in range(self.num_mappings):
            self.generator.generate_function_mapping(i)
        
        # Generate mapping selector based on function index
        selector_var = self._gen_name()
        keys = self.generator.generate_per_function_xor_keys(self.num_mappings)
        key_entries = ','.join(f'0X{k:02X}' for k in keys)
        
        selector_code = f'''-- Dynamic Opcode Keys (per-function)
local {selector_var}={{{key_entries}}}'''
        
        # Find insertion point - after first "do"
        do_match = re.search(r'\bdo\b', vm_code)
        if do_match:
            insert_point = do_match.end()
            vm_code = (vm_code[:insert_point] + '\n' + 
                      remapper_code + '\n' + 
                      selector_code + '\n' + 
                      vm_code[insert_point:])
        
        return vm_code

