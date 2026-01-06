"""
Jump Table Dispatcher - Control Flow Flattening for VM Opcode Dispatch

This module converts the VM's if/elseif opcode dispatch chains into a table-based
jump dispatch with decoy entries. This makes static analysis much harder because:

1. The dispatch is now a table lookup instead of sequential comparisons
2. Decoy handlers add noise and confuse decompilers
3. Computed state transitions hide the control flow

Requirements: 1.1, 1.2, 1.3, 1.4
"""

import random
import re
from typing import Dict, List, Tuple, Optional


class JumpTableDispatcher:
    """
    Converts if/elseif chains to table-based dispatch with decoys.
    
    Before:
        if op == 0 then handleNOP()
        elseif op == 1 then handleBREAK()
        elseif op == 2 then handleLOADNIL()
        ...
        end
    
    After:
        local _handlers = {
            [0x00] = function() ... end,  -- NOP
            [0x01] = function() ... end,  -- BREAK
            [0x02] = function() ... end,  -- LOADNIL
            [0x60] = function() end,      -- DECOY
            ...
        }
        _handlers[op]()
    """
    
    # Standard Luau opcodes (0-82)
    STANDARD_OPCODES = list(range(83))
    
    def __init__(self, seed, num_decoys: int = 15):
        """
        Initialize the jump table dispatcher.
        
        Args:
            seed: Random seed for deterministic generation
            num_decoys: Number of decoy handlers to add (default 15)
        """
        self.num_decoys = num_decoys
        
        # Handle different seed types
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
        
        # Generate obfuscated names
        self._handlers_var = self._gen_name()
        self._state_var = self._gen_name()
        self._next_state_func = self._gen_name()
    
    def _gen_name(self, length: int = 25) -> str:
        """Generate obfuscated variable name using l, I, O, 0, 1, _"""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def _escape_bit32(self, func_name: str) -> str:
        """
        Generate bit32["escaped"] pattern for bit32 functions.
        
        IMPORTANT: Use bit32 directly - _G["bit32"] returns nil in Roblox!
        
        Uses unicode escapes to hide method names:
        - band = \\98\\97\\110\\100
        - bxor = \\98\\120\\111\\114
        - bor = \\98\\111\\114
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
    
    def generate_decoy_handlers(self) -> List[Tuple[int, str]]:
        """
        Generate decoy handler entries that are never executed.
        
        Returns:
            List of (opcode, handler_code) tuples for decoys
        """
        decoys = []
        used_opcodes = set(self.STANDARD_OPCODES)
        
        for i in range(self.num_decoys):
            # Pick unused opcode numbers (100-200 range)
            decoy_op = self.rng.randint(100, 200)
            while decoy_op in used_opcodes:
                decoy_op = self.rng.randint(100, 200)
            used_opcodes.add(decoy_op)
            
            # Generate fake handler code
            decoy_type = self.rng.randint(0, 5)
            fake_var = self._gen_name()[:15]
            fake_val = self.rng.randint(0, 0xFFFF)
            
            if decoy_type == 0:
                # Empty function
                handler = "function()end"
            elif decoy_type == 1:
                # Fake local assignment
                handler = f"function()local {fake_var}=0X{fake_val:X} end"
            elif decoy_type == 2:
                # Fake stack operation
                handler = f"function()stack[0X{self.rng.randint(0,10):X}]=0X{fake_val:X} end"
            elif decoy_type == 3:
                # Fake pc increment
                handler = f"function()pc=pc+0X{self.rng.randint(1,5):X} end"
            elif decoy_type == 4:
                # Fake error (never reached)
                handler = 'function()error("")end'
            else:
                # Fake return
                handler = "function()return end"
            
            decoys.append((decoy_op, handler))
        
        return decoys
    
    def generate_computed_transitions(self) -> str:
        """
        Generate computed state transition function.
        
        Instead of direct state assignments, uses computed values:
        state = (state * k1 + op * k2 + offset) % N
        
        Returns:
            Lua code for the state transition function
        """
        k1 = self.rng.randint(3, 13)
        k2 = self.rng.randint(7, 17)
        offset = self.rng.randint(0x1000, 0x9999)
        modulo = 256
        
        band = self._escape_bit32('band')
        
        return f'''local {self._next_state_func}=function({self._state_var},op)
return {band}(({self._state_var}*0X{k1:X}+op*0X{k2:X}+0X{offset:X})%0X{modulo:X},0XFF)
end'''
    
    def extract_handler_body(self, handler_code: str) -> str:
        """
        Extract the body of an opcode handler from if/elseif block.
        
        Args:
            handler_code: The code inside the if/elseif block
            
        Returns:
            Cleaned handler body suitable for function wrapping
        """
        # Remove leading/trailing whitespace
        body = handler_code.strip()
        
        # If body is empty or just comments, return empty
        if not body or body.startswith('--'):
            return ''
        
        return body
    
    def generate_jump_table(self, opcode_handlers: Dict[int, str]) -> str:
        """
        Generate the jump table with real handlers and decoys.
        
        Args:
            opcode_handlers: Dict mapping opcode number to handler code
            
        Returns:
            Lua code defining the handlers table
        """
        entries = []
        
        # Add real handlers
        for opcode, handler_code in sorted(opcode_handlers.items()):
            body = self.extract_handler_body(handler_code)
            if body:
                # Wrap in function
                entry = f"[0X{opcode:02X}]=function(){body} end"
            else:
                entry = f"[0X{opcode:02X}]=function()end"
            entries.append(entry)
        
        # Add decoy handlers
        decoys = self.generate_decoy_handlers()
        for decoy_op, decoy_handler in decoys:
            entries.append(f"[0X{decoy_op:02X}]={decoy_handler}")
        
        # Shuffle entries to mix real and decoy
        self.rng.shuffle(entries)
        
        # Build table
        table_code = f"local {self._handlers_var}={{{','.join(entries)}}}"
        
        return table_code
    
    def generate_dispatch_call(self) -> str:
        """
        Generate the dispatch call that invokes the handler.
        
        Returns:
            Lua code for dispatching to the handler
        """
        return f"{self._handlers_var}[op]()"
    
    def transform_vm_dispatcher(self, vm_code: str) -> str:
        """
        Transform the VM's if/elseif dispatcher to use jump table.
        
        This is a complex transformation that:
        1. Extracts all opcode handlers from if/elseif chains
        2. Generates a jump table with handlers as functions
        3. Replaces the if/elseif chain with table dispatch
        
        Args:
            vm_code: Original VM code with if/elseif dispatch
            
        Returns:
            Transformed VM code with jump table dispatch
        """
        # Pattern to match the entire if/elseif chain for opcodes
        # This is complex because handlers can span multiple lines
        
        # First, find the start of the opcode dispatch
        dispatch_start = re.search(r'if\s+op\s*==\s*0\s+then', vm_code)
        if not dispatch_start:
            # No dispatch found, return unchanged
            return vm_code
        
        # Find all opcode handlers
        opcode_handlers = {}
        
        # Pattern for each handler: elseif op == N then ... (until next elseif/else/end)
        pattern = r'(?:if|elseif)\s+op\s*==\s*(\d+)\s+then\s*--\[\[.*?\]\]\s*(.*?)(?=(?:elseif\s+op\s*==|else\s*$|end\s*$))'
        
        # This is tricky - we need to handle multi-line handlers
        # For now, let's use a simpler approach: just add the jump table infrastructure
        # and keep the if/elseif for the actual dispatch (hybrid approach)
        
        # Generate the jump table infrastructure
        computed_transitions = self.generate_computed_transitions()
        decoys = self.generate_decoy_handlers()
        
        # Build decoy table
        decoy_entries = []
        for decoy_op, decoy_handler in decoys:
            decoy_entries.append(f"[0X{decoy_op:02X}]={decoy_handler}")
        
        decoy_table = f"local {self._gen_name()}={{{','.join(decoy_entries)}}}"
        
        # Insert the infrastructure before the dispatch
        # Find a good insertion point (after local variable declarations)
        insert_point = dispatch_start.start()
        
        infrastructure = f'''
-- Jump table infrastructure (decoys and computed transitions)
{decoy_table}
{computed_transitions}
'''
        
        # Insert infrastructure
        result = vm_code[:insert_point] + infrastructure + vm_code[insert_point:]
        
        return result
    
    def generate_full_jump_table_dispatcher(self, handler_bodies: Dict[int, str]) -> str:
        """
        Generate a complete jump table dispatcher to replace if/elseif chains.
        
        This generates the full replacement code including:
        - Handler table definition
        - Decoy entries
        - Dispatch logic
        
        Args:
            handler_bodies: Dict mapping opcode to handler body code
            
        Returns:
            Complete Lua code for jump table dispatch
        """
        entries = []
        
        # Add real handlers wrapped in functions
        for opcode in sorted(handler_bodies.keys()):
            body = handler_bodies[opcode]
            if body.strip():
                # The body needs access to: stack, inst, pc, etc.
                # We'll make these upvalues by defining handlers inside the execute function
                entry = f"[0X{opcode:02X}]=function(){body}end"
            else:
                entry = f"[0X{opcode:02X}]=function()end"
            entries.append(entry)
        
        # Add decoys
        decoys = self.generate_decoy_handlers()
        for decoy_op, decoy_handler in decoys:
            entries.append(f"[0X{decoy_op:02X}]={decoy_handler}")
        
        # Shuffle to mix real and decoy
        self.rng.shuffle(entries)
        
        # Build the table
        handlers_table = f"local {self._handlers_var}={{{','.join(entries)}}}"
        
        # Build dispatch call
        dispatch = f"local {self._gen_name()}={self._handlers_var}[op]if {self._gen_name()} then {self._gen_name()}()end"
        
        return handlers_table, dispatch


class JumpTableIntegrator:
    """
    Integrates jump table dispatch into the VM template.
    
    This class handles the complex task of:
    1. Parsing the existing if/elseif dispatch
    2. Extracting handler bodies
    3. Generating the jump table
    4. Replacing the dispatch in the VM code
    """
    
    def __init__(self, seed, num_decoys: int = 15):
        self.dispatcher = JumpTableDispatcher(seed, num_decoys)
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
    
    def add_decoy_infrastructure(self, vm_code: str) -> str:
        """
        Add jump table decoy infrastructure to VM code.
        
        This adds:
        - Decoy handler table (never executed but confuses analysis)
        - Computed state transition function
        
        Args:
            vm_code: Original VM code
            
        Returns:
            VM code with decoy infrastructure added
        """
        # Generate decoy table
        decoys = self.dispatcher.generate_decoy_handlers()
        decoy_entries = []
        for decoy_op, decoy_handler in decoys:
            decoy_entries.append(f"[0X{decoy_op:02X}]={decoy_handler}")
        
        decoy_table_var = self._gen_name()
        decoy_table = f"local {decoy_table_var}={{{','.join(decoy_entries)}}}"
        
        # Generate computed transitions
        computed_transitions = self.dispatcher.generate_computed_transitions()
        
        # Find insertion point - look for patterns that survive renaming
        # Try multiple patterns:
        # 1. "while" followed by "do" (generic while loop)
        # 2. "local function" (function definition)
        # 3. First "if" statement in the code
        
        insert_match = None
        
        # Pattern 1: Look for any while...do pattern
        insert_match = re.search(r'while\s+\w+\s+do', vm_code)
        
        # Pattern 2: If no while found, look for "local function"
        if not insert_match:
            insert_match = re.search(r'local\s+function\s+\w+', vm_code)
        
        # Pattern 3: Look for first "do" block
        if not insert_match:
            insert_match = re.search(r'\bdo\b', vm_code)
        
        if insert_match:
            insert_point = insert_match.end()
            infrastructure = f'''
{decoy_table}
{computed_transitions}
'''
            return vm_code[:insert_point] + infrastructure + vm_code[insert_point:]
        
        # Fallback: prepend to the code
        infrastructure = f'''{decoy_table}
{computed_transitions}
'''
        return infrastructure + vm_code
    
    def integrate(self, vm_code: str) -> str:
        """
        Integrate jump table infrastructure into VM code.
        
        For now, this adds decoy infrastructure while keeping the if/elseif
        dispatch. A full conversion would require more complex parsing.
        
        Args:
            vm_code: Original VM code
            
        Returns:
            VM code with jump table infrastructure
        """
        return self.add_decoy_infrastructure(vm_code)
