"""
Table-Based Opcode Dispatch - Implements table lookup dispatch with metamorphic handlers.

This module provides table-based opcode dispatch instead of if/elseif chains,
making the VM harder to analyze. Includes 15 arithmetic handler functions
and metamorphic variants for common operations.

Requirements: 24.1, 24.2, 24.3, 24.4
- Implement table-based lookup dispatch
- Create 15 arithmetic handler functions
- Implement metamorphic handlers (ADD, SUB, MUL, DIV, LT, LE, EQ variants)
- Implement Handler Scatterer (depth 3)
"""

from typing import Dict, List, Tuple, Optional, Callable
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from core import (
    PolymorphicBuildSeed,
    UnifiedNamingSystem,
    OpaquePredicateGenerator,
)


class TableBasedDispatch:
    """
    Implements table-based opcode dispatch for the VM.
    
    Instead of using if/elseif chains for opcode dispatch, this uses
    a table lookup approach where each opcode maps to a handler function.
    This makes static analysis harder and allows for handler scattering.
    
    Requirements: 24.1, 24.2, 24.3, 24.4
    """
    
    # Arithmetic opcodes and their operations
    ARITHMETIC_OPCODES = {
        33: ('ADD', '+'),
        34: ('SUB', '-'),
        35: ('MUL', '*'),
        36: ('DIV', '/'),
        37: ('MOD', '%'),
        38: ('POW', '^'),
        39: ('ADDK', '+'),  # With constant
        40: ('SUBK', '-'),
        41: ('MULK', '*'),
        42: ('DIVK', '/'),
        43: ('MODK', '%'),
        44: ('POWK', '^'),
        81: ('IDIV', '//'),
        82: ('IDIVK', '//'),
    }
    
    # Comparison opcodes
    COMPARISON_OPCODES = {
        27: ('JUMPIFEQ', '=='),
        28: ('JUMPIFLE', '<='),
        29: ('JUMPIFLT', '<'),
        30: ('JUMPIFNOTEQ', '~='),
        31: ('JUMPIFNOTLE', '>'),
        32: ('JUMPIFNOTLT', '>='),
    }
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Table-Based Dispatch generator.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        self.predicates = OpaquePredicateGenerator(self.seed)
        
        # Track generated handler names
        self.handler_names: Dict[int, str] = {}
        
        # Track metamorphic variants
        self.metamorphic_variants: Dict[str, List[str]] = {}
    
    def generate_dispatch_table(self) -> Tuple[str, str]:
        """
        Generate the opcode dispatch table and handler functions.
        
        Returns:
            Tuple of (dispatch_table_code, handler_functions_code)
        """
        # Generate handler functions
        handlers_code = self._generate_all_handlers()
        
        # Generate dispatch table
        table_var = self.naming.generate_name()
        
        table_entries = []
        for opcode, handler_name in self.handler_names.items():
            # Use various number formats for indices
            idx_format = self.seed.get_random_int(0, 2)
            if idx_format == 0:
                idx_str = str(opcode)
            elif idx_format == 1:
                idx_str = f'0x{opcode:X}'
            else:
                idx_str = f'0B{opcode:b}'
            
            table_entries.append(f'[{idx_str}]={handler_name}')
        
        # Shuffle entries for obfuscation
        self.seed.shuffle(table_entries)
        
        dispatch_table = f"local {table_var}={{{','.join(table_entries)}}}"
        
        return dispatch_table, handlers_code, table_var
    
    def _generate_all_handlers(self) -> str:
        """
        Generate all opcode handler functions.
        
        Returns:
            Combined handler function code
        """
        handlers = []
        
        # Generate arithmetic handlers (15 total)
        handlers.extend(self._generate_arithmetic_handlers())
        
        # Generate comparison handlers
        handlers.extend(self._generate_comparison_handlers())
        
        # Generate other essential handlers
        handlers.extend(self._generate_essential_handlers())
        
        return '\n'.join(handlers)
    
    def _generate_arithmetic_handlers(self) -> List[str]:
        """
        Generate 15 arithmetic handler functions.
        
        Requirements: 24.2 - Create 15 arithmetic handler functions
        
        Returns:
            List of handler function code strings
        """
        handlers = []
        
        for opcode, (name, op) in self.ARITHMETIC_OPCODES.items():
            handler_name = self.naming.generate_name()
            self.handler_names[opcode] = handler_name
            
            # Generate metamorphic variant
            handler_code = self._generate_metamorphic_arithmetic(
                handler_name, opcode, name, op
            )
            handlers.append(handler_code)
        
        # Add one more handler to reach 15
        # CONCAT handler (opcode 49)
        concat_name = self.naming.generate_name()
        self.handler_names[49] = concat_name
        handlers.append(self._generate_concat_handler(concat_name))
        
        return handlers
    
    def _generate_metamorphic_arithmetic(
        self,
        handler_name: str,
        opcode: int,
        op_name: str,
        operator: str
    ) -> str:
        """
        Generate a metamorphic arithmetic handler.
        
        Creates multiple equivalent implementations and randomly selects one.
        
        Requirements: 24.3 - Implement metamorphic handlers
        
        Args:
            handler_name: Name for the handler function
            opcode: The opcode number
            op_name: Name of the operation (ADD, SUB, etc.)
            operator: The Lua operator (+, -, etc.)
            
        Returns:
            Handler function code
        """
        # Generate parameter names
        stack_var = self.naming.generate_name()
        inst_var = self.naming.generate_name()
        
        # Check if this is a constant operation (ADDK, SUBK, etc.)
        is_const = 'K' in op_name
        
        # Generate multiple metamorphic variants
        variants = []
        
        if is_const:
            # Constant operation: stack[A] = stack[B] op K
            # Variant 1: Direct
            variants.append(
                f"{stack_var}[{inst_var}.A]={stack_var}[{inst_var}.B]{operator}{inst_var}.K"
            )
            # Variant 2: With temporary
            temp_var = self.naming.generate_name()
            variants.append(
                f"local {temp_var}={stack_var}[{inst_var}.B];{stack_var}[{inst_var}.A]={temp_var}{operator}{inst_var}.K"
            )
            # Variant 3: With parentheses
            variants.append(
                f"{stack_var}[{inst_var}.A]=({stack_var}[{inst_var}.B]){operator}({inst_var}.K)"
            )
        else:
            # Register operation: stack[A] = stack[B] op stack[C]
            # Variant 1: Direct
            variants.append(
                f"{stack_var}[{inst_var}.A]={stack_var}[{inst_var}.B]{operator}{stack_var}[{inst_var}.C]"
            )
            # Variant 2: With temporaries
            temp_b = self.naming.generate_name()
            temp_c = self.naming.generate_name()
            variants.append(
                f"local {temp_b},{temp_c}={stack_var}[{inst_var}.B],{stack_var}[{inst_var}.C];{stack_var}[{inst_var}.A]={temp_b}{operator}{temp_c}"
            )
            # Variant 3: With parentheses
            variants.append(
                f"{stack_var}[{inst_var}.A]=({stack_var}[{inst_var}.B]){operator}({stack_var}[{inst_var}.C])"
            )
        
        # Store variants for potential reuse
        self.metamorphic_variants[op_name] = variants
        
        # Select a random variant
        selected_variant = self.seed.choice(variants)
        
        # Build handler function
        handler = f"""local function {handler_name}({stack_var},{inst_var})
{selected_variant}
end"""
        
        return handler
    
    def _generate_concat_handler(self, handler_name: str) -> str:
        """
        Generate the CONCAT handler (opcode 49).
        
        Args:
            handler_name: Name for the handler function
            
        Returns:
            Handler function code
        """
        stack_var = self.naming.generate_name()
        inst_var = self.naming.generate_name()
        b_var = self.naming.generate_name()
        c_var = self.naming.generate_name()
        s_var = self.naming.generate_name()
        i_var = self.naming.generate_name()
        
        handler = f"""local function {handler_name}({stack_var},{inst_var})
local {b_var},{c_var}={inst_var}.B,{inst_var}.C
local {s_var}={stack_var}[{b_var}]
for {i_var}={b_var}+1,{c_var} do
{s_var}={s_var}..{stack_var}[{i_var}]
end
{stack_var}[{inst_var}.A]={s_var}
end"""
        
        return handler
    
    def _generate_comparison_handlers(self) -> List[str]:
        """
        Generate comparison handler functions.
        
        Returns:
            List of handler function code strings
        """
        handlers = []
        
        for opcode, (name, op) in self.COMPARISON_OPCODES.items():
            handler_name = self.naming.generate_name()
            self.handler_names[opcode] = handler_name
            
            handler_code = self._generate_comparison_handler(
                handler_name, opcode, name, op
            )
            handlers.append(handler_code)
        
        return handlers
    
    def _generate_comparison_handler(
        self,
        handler_name: str,
        opcode: int,
        op_name: str,
        operator: str
    ) -> str:
        """
        Generate a comparison handler with metamorphic variants.
        
        Args:
            handler_name: Name for the handler function
            opcode: The opcode number
            op_name: Name of the operation
            operator: The comparison operator
            
        Returns:
            Handler function code
        """
        stack_var = self.naming.generate_name()
        inst_var = self.naming.generate_name()
        pc_var = self.naming.generate_name()
        
        # Determine if this is a "not" comparison
        is_not = 'NOT' in op_name
        
        if is_not:
            # JUMPIFNOT variants: jump if condition is false
            condition = f"{stack_var}[{inst_var}.A]{operator}{stack_var}[{inst_var}.aux]"
            handler = f"""local function {handler_name}({stack_var},{inst_var},{pc_var})
if {condition} then
return {pc_var}+1
else
return {pc_var}+{inst_var}.D
end
end"""
        else:
            # JUMPIF variants: jump if condition is true
            condition = f"{stack_var}[{inst_var}.A]{operator}{stack_var}[{inst_var}.aux]"
            handler = f"""local function {handler_name}({stack_var},{inst_var},{pc_var})
if {condition} then
return {pc_var}+{inst_var}.D
else
return {pc_var}+1
end
end"""
        
        return handler
    
    def _generate_essential_handlers(self) -> List[str]:
        """
        Generate essential non-arithmetic handlers.
        
        Returns:
            List of handler function code strings
        """
        handlers = []
        
        # LOADNIL (opcode 2)
        name = self.naming.generate_name()
        self.handler_names[2] = name
        handlers.append(self._generate_loadnil_handler(name))
        
        # LOADB (opcode 3)
        name = self.naming.generate_name()
        self.handler_names[3] = name
        handlers.append(self._generate_loadb_handler(name))
        
        # LOADN (opcode 4)
        name = self.naming.generate_name()
        self.handler_names[4] = name
        handlers.append(self._generate_loadn_handler(name))
        
        # LOADK (opcode 5)
        name = self.naming.generate_name()
        self.handler_names[5] = name
        handlers.append(self._generate_loadk_handler(name))
        
        # MOVE (opcode 6)
        name = self.naming.generate_name()
        self.handler_names[6] = name
        handlers.append(self._generate_move_handler(name))
        
        # RETURN (opcode 22)
        name = self.naming.generate_name()
        self.handler_names[22] = name
        handlers.append(self._generate_return_handler(name))
        
        # CALL (opcode 21)
        name = self.naming.generate_name()
        self.handler_names[21] = name
        handlers.append(self._generate_call_handler(name))
        
        return handlers
    
    def _generate_loadnil_handler(self, name: str) -> str:
        stack = self.naming.generate_name()
        inst = self.naming.generate_name()
        return f"""local function {name}({stack},{inst})
{stack}[{inst}.A]=nil
end"""
    
    def _generate_loadb_handler(self, name: str) -> str:
        stack = self.naming.generate_name()
        inst = self.naming.generate_name()
        pc = self.naming.generate_name()
        return f"""local function {name}({stack},{inst},{pc})
{stack}[{inst}.A]={inst}.B==1
return {pc}+{inst}.C
end"""
    
    def _generate_loadn_handler(self, name: str) -> str:
        stack = self.naming.generate_name()
        inst = self.naming.generate_name()
        return f"""local function {name}({stack},{inst})
{stack}[{inst}.A]={inst}.D
end"""
    
    def _generate_loadk_handler(self, name: str) -> str:
        stack = self.naming.generate_name()
        inst = self.naming.generate_name()
        return f"""local function {name}({stack},{inst})
{stack}[{inst}.A]={inst}.K
end"""
    
    def _generate_move_handler(self, name: str) -> str:
        stack = self.naming.generate_name()
        inst = self.naming.generate_name()
        return f"""local function {name}({stack},{inst})
{stack}[{inst}.A]={stack}[{inst}.B]
end"""
    
    def _generate_return_handler(self, name: str) -> str:
        stack = self.naming.generate_name()
        inst = self.naming.generate_name()
        top = self.naming.generate_name()
        a = self.naming.generate_name()
        b = self.naming.generate_name()
        nresults = self.naming.generate_name()
        return f"""local function {name}({stack},{inst},{top})
local {a}={inst}.A
local {b}={inst}.B-1
local {nresults}
if {b}==-1 then
{nresults}={top}-{a}+1
else
{nresults}={b}
end
return table.unpack({stack},{a},{a}+{nresults}-1)
end"""
    
    def _generate_call_handler(self, name: str) -> str:
        stack = self.naming.generate_name()
        inst = self.naming.generate_name()
        top = self.naming.generate_name()
        a = self.naming.generate_name()
        b = self.naming.generate_name()
        c = self.naming.generate_name()
        params = self.naming.generate_name()
        func = self.naming.generate_name()
        ret = self.naming.generate_name()
        ret_num = self.naming.generate_name()
        return f"""local function {name}({stack},{inst},{top})
local {a},{b},{c}={inst}.A,{inst}.B,{inst}.C
local {params}={b}==0 and {top}-{a} or {b}-1
local {func}={stack}[{a}]
local {ret}=table.pack({func}(table.unpack({stack},{a}+1,{a}+{params})))
local {ret_num}={ret}.n
if {c}==0 then
return {a}+{ret_num}-1,{ret}
else
{ret_num}={c}-1
end
table.move({ret},1,{ret_num},{a},{stack})
return {top},{ret}
end"""
    
    def generate_scattered_handlers(self, depth: int = 3) -> str:
        """
        Generate handlers scattered at specified depth.
        
        Requirements: 24.4 - Implement Handler Scatterer (depth 3)
        
        Scatters handler definitions throughout the code at different
        nesting levels to make analysis harder.
        
        Args:
            depth: Nesting depth for scattering (default 3)
            
        Returns:
            Scattered handler code
        """
        # Generate all handlers
        dispatch_table, handlers_code, table_var = self.generate_dispatch_table()
        
        # Split handlers into groups
        handler_lines = handlers_code.split('\n\n')
        
        # Create nested structure
        result = []
        
        # Add some handlers at top level
        top_level_count = len(handler_lines) // 3
        result.extend(handler_lines[:top_level_count])
        
        # Add some handlers in do blocks (depth 1)
        depth1_count = len(handler_lines) // 3
        result.append("do")
        result.extend(handler_lines[top_level_count:top_level_count + depth1_count])
        
        # Add remaining handlers in nested do blocks (depth 2-3)
        result.append("do")
        result.extend(handler_lines[top_level_count + depth1_count:])
        
        # Add more nesting for depth 3
        if depth >= 3:
            result.append("do")
            # Add some dead code
            dead_var = self.naming.generate_name()
            false_pred = self.predicates.get_false_predicate()
            result.append(f"if {false_pred} then local {dead_var}=0 end")
            result.append("end")
        
        result.append("end")
        result.append("end")
        
        # Add dispatch table at the end
        result.append(dispatch_table)
        
        return '\n'.join(result)
    
    def generate_dispatch_loop(self, table_var: str) -> str:
        """
        Generate the main dispatch loop using table lookup.
        
        Args:
            table_var: Name of the dispatch table variable
            
        Returns:
            Dispatch loop code
        """
        code_var = self.naming.generate_name()
        pc_var = self.naming.generate_name()
        stack_var = self.naming.generate_name()
        top_var = self.naming.generate_name()
        inst_var = self.naming.generate_name()
        op_var = self.naming.generate_name()
        handler_var = self.naming.generate_name()
        alive_var = self.naming.generate_name()
        
        dispatch_loop = f"""local {pc_var}=1
local {top_var}=-1
local {alive_var}=true
while {alive_var} do
local {inst_var}={code_var}[{pc_var}]
if not {inst_var} then break end
local {op_var}={inst_var}.opcode
{pc_var}={pc_var}+1
local {handler_var}={table_var}[{op_var}]
if {handler_var} then
local result={handler_var}({stack_var},{inst_var},{pc_var},{top_var})
if result then
if type(result)=="number" then
{pc_var}=result
else
return result
end
end
end
end"""
        
        return dispatch_loop
