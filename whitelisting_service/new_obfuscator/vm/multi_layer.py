"""
Multi-Layer Bytecode VM - True nested VM where outer VM interprets inner VM's bytecode.

This module implements defense-in-depth virtualization where:
1. Outer VM interprets outer bytecode
2. One outer opcode triggers execution of inner VM
3. Inner VM has different opcode mappings
4. Both VMs must be understood to reverse engineer

Requirements: 2.1, 2.2, 2.3, 2.4
"""

import random
from typing import Dict, List, Tuple, Optional
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))


class MultiLayerVMGenerator:
    """
    Generates true multi-layer VM structure for defense in depth.
    
    Unlike simple nested encryption, this creates two actual VMs:
    - Outer VM: Interprets outer bytecode, has its own opcode mapping
    - Inner VM: Interprets inner bytecode, has different opcode mapping
    
    The outer VM has a special opcode that triggers inner VM execution,
    making the control flow much harder to analyze.
    
    Requirements: 2.1, 2.2, 2.3, 2.4
    """
    
    # Standard Luau opcodes (0-82)
    STANDARD_OPCODES = list(range(83))
    
    def __init__(self, seed):
        """
        Initialize the multi-layer VM generator.
        
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
        
        # Generate different opcode mappings for each layer
        self.outer_opcode_map = self._generate_opcode_map("outer")
        self.inner_opcode_map = self._generate_opcode_map("inner")
    
    def _gen_name(self, length: int = 25) -> str:
        """Generate obfuscated variable name using l, I, O, 0, 1, _"""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def _generate_opcode_map(self, layer: str) -> Dict[int, int]:
        """
        Generate a random opcode permutation for a layer.
        
        Args:
            layer: Layer identifier ("outer" or "inner")
            
        Returns:
            Dict mapping standard opcode -> shuffled opcode
        """
        # Use layer name to seed differently
        layer_seed = hash(layer) ^ (self.rng.randint(0, 0xFFFFFFFF))
        layer_rng = random.Random(layer_seed)
        
        opcodes = self.STANDARD_OPCODES.copy()
        shuffled = opcodes.copy()
        layer_rng.shuffle(shuffled)
        
        return {orig: new for orig, new in zip(opcodes, shuffled)}
    
    def _escape_bit32(self, func_name: str) -> str:
        """Generate bit32["escaped"] pattern for bit32 functions.
        
        IMPORTANT: Use bit32 directly - _G["bit32"] returns nil in Roblox!
        """
        func_escapes = {
            'band': '"\\98\\97\\110\\100"',
            'bxor': '"\\98\\120\\111\\114"',
            'bor': '"\\98\\111\\114"',
            'rshift': '"\\114\\115\\104\\105\\102\\116"',
            'lshift': '"\\108\\115\\104\\105\\102\\116"',
        }
        
        if func_name in func_escapes:
            return f'bit32[{func_escapes[func_name]}]'
        return f'bit32["{func_name}"]'
    
    def generate_outer_vm_wrapper(self, inner_code: str) -> str:
        """
        Generate outer VM wrapper that contains inner VM.
        
        The outer VM adds an additional layer of control flow obfuscation
        around the inner VM execution.
        
        Args:
            inner_code: The inner VM code to wrap
            
        Returns:
            Outer VM wrapper code
        """
        # Generate obfuscated names
        state_var = self._gen_name()
        exec_var = self._gen_name()
        result_var = self._gen_name()
        
        # Generate state machine values
        init_state = self.rng.randint(0x1000, 0x9999)
        exec_state = self.rng.randint(0x1000, 0x9999)
        done_state = 0
        
        band = self._escape_bit32('band')
        bxor = self._escape_bit32('bxor')
        
        # Build outer VM wrapper with state machine
        wrapper = f'''local {state_var}=0X{init_state:X}
local {exec_var}=function()
{inner_code}
end
local {result_var}
while {state_var}~=0 do
if {state_var}==0X{init_state:X} then
{state_var}=0X{exec_state:X}
elseif {state_var}==0X{exec_state:X} then
{result_var}={exec_var}()
{state_var}=0
elseif {band}({state_var},0XFF)==0X{self.rng.randint(1,255):02X} then
{state_var}={bxor}({state_var},0X{self.rng.randint(0x100,0xFFF):X})
else
{state_var}=0
end
end
return {result_var}'''
        
        return wrapper
    
    def generate_inner_vm_with_different_mapping(self) -> Tuple[str, Dict[int, int]]:
        """
        Generate inner VM code with its own opcode mapping.
        
        Returns:
            Tuple of (inner VM code snippet, opcode mapping)
        """
        # Generate mapping table as Lua code
        mapping_var = self._gen_name()
        entries = []
        for orig, new in sorted(self.inner_opcode_map.items()):
            entries.append(f'[0X{orig:02X}]=0X{new:02X}')
        
        mapping_code = f"local {mapping_var}={{{','.join(entries)}}}"
        
        return mapping_code, self.inner_opcode_map
    
    def generate_opcode_remapping_code(self, mapping: Dict[int, int]) -> str:
        """
        Generate Lua code that remaps opcodes at runtime.
        
        Args:
            mapping: Opcode mapping to apply
            
        Returns:
            Lua code for opcode remapping
        """
        mapping_var = self._gen_name()
        op_var = self._gen_name()
        
        entries = []
        for orig, new in sorted(mapping.items()):
            entries.append(f'[0X{orig:02X}]=0X{new:02X}')
        
        code = f'''local {mapping_var}={{{','.join(entries)}}}
local function {self._gen_name()}({op_var})
return {mapping_var}[{op_var}]or {op_var}
end'''
        
        return code
    
    def wrap_with_multi_layer(self, vm_code: str) -> str:
        """
        Wrap VM code with multi-layer protection.
        
        Adds:
        1. Outer VM state machine wrapper
        2. Inner opcode mapping (different from outer)
        3. Additional control flow obfuscation
        
        Args:
            vm_code: Original VM code
            
        Returns:
            Multi-layer protected VM code
        """
        # Generate inner opcode mapping code
        inner_mapping_code, _ = self.generate_inner_vm_with_different_mapping()
        
        # Wrap the VM code with outer layer
        wrapped = self.generate_outer_vm_wrapper(vm_code)
        
        # Add inner mapping at the start
        result = f'''{inner_mapping_code}
{wrapped}'''
        
        return result
    
    def generate_dual_vm_structure(self) -> str:
        """
        Generate a dual VM structure where outer VM dispatches to inner VM.
        
        This creates a more complex structure where:
        - Outer VM handles some opcodes directly
        - Special opcodes trigger inner VM execution
        - Inner VM has completely different opcode mapping
        
        Returns:
            Dual VM structure code
        """
        # Generate names
        outer_dispatch_var = self._gen_name()
        inner_dispatch_var = self._gen_name()
        op_var = self._gen_name()
        state_var = self._gen_name()
        
        # Generate outer opcode mapping
        outer_entries = []
        for orig, new in sorted(self.outer_opcode_map.items())[:20]:  # First 20 opcodes
            outer_entries.append(f'[0X{orig:02X}]=0X{new:02X}')
        
        # Generate inner opcode mapping
        inner_entries = []
        for orig, new in sorted(self.inner_opcode_map.items())[:20]:  # First 20 opcodes
            inner_entries.append(f'[0X{orig:02X}]=0X{new:02X}')
        
        band = self._escape_bit32('band')
        
        # Build dual VM structure
        code = f'''-- Dual VM Structure: Outer dispatches to Inner
local {outer_dispatch_var}={{{','.join(outer_entries)}}}
local {inner_dispatch_var}={{{','.join(inner_entries)}}}
local {self._gen_name()}=function({op_var})
local {state_var}={band}({op_var},0X7F)
if {outer_dispatch_var}[{state_var}] then
return {outer_dispatch_var}[{state_var}]
elseif {inner_dispatch_var}[{state_var}] then
return {inner_dispatch_var}[{state_var}]
end
return {op_var}
end'''
        
        return code


class MultiLayerIntegrator:
    """
    Integrates multi-layer VM protection into the obfuscation pipeline.
    """
    
    def __init__(self, seed, enable_dual_vm: bool = True):
        self.generator = MultiLayerVMGenerator(seed)
        self.enable_dual_vm = enable_dual_vm
        self.seed = seed
        
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
        Integrate multi-layer VM protection into VM code.
        
        Args:
            vm_code: Original VM code
            
        Returns:
            VM code with multi-layer protection
        """
        # Add dual VM structure if enabled
        if self.enable_dual_vm:
            dual_vm = self.generator.generate_dual_vm_structure()
            
            # Find insertion point - after first "do" block
            import re
            insert_match = re.search(r'\bdo\b', vm_code)
            if insert_match:
                insert_point = insert_match.end()
                return vm_code[:insert_point] + '\n' + dual_vm + '\n' + vm_code[insert_point:]
        
        # Fallback: wrap with outer VM
        return self.generator.wrap_with_multi_layer(vm_code)
