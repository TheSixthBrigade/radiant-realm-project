"""
Dead Code and Decoys for the Luraph-style obfuscator.

This module provides dead code injection and decoy generation features:
- Dead Code Injection (3 polymorphic blocks)
- Fake Branches (dead code blocks)
- Fake Control Flow Blocks (unreachable control structures)
- Decoy Functions (2 fake VM handlers)
- Decoy Constants (5 fake constants in pool)

Requirements: 30.1, 30.2, 30.3, 30.4, 30.5
"""

from typing import List, Dict, Tuple, Optional
import re

try:
    from ..core.seed import PolymorphicBuildSeed
    from ..core.naming import UnifiedNamingSystem
    from ..core.predicates import OpaquePredicateGenerator
except ImportError:
    from core.seed import PolymorphicBuildSeed
    from core.naming import UnifiedNamingSystem
    from core.predicates import OpaquePredicateGenerator


class DeadCodeInjector:
    """
    Dead Code Injector for inserting polymorphic dead code blocks.
    
    Inserts 3 polymorphic blocks of dead code that are never executed
    but appear functional to confuse static analysis.
    
    Requirements: 30.1
    
    Example:
        >>> dci = DeadCodeInjector(PolymorphicBuildSeed(seed=42))
        >>> code = dci.inject_dead_code('print("hello")')
        >>> 'if (bit32.bxor(0x5A,0x5A)~=0)' in code  # False predicate
        True
    """
    
    # Number of polymorphic blocks to inject
    POLYMORPHIC_BLOCK_COUNT = 3
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Dead Code Injector.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        self.opg = OpaquePredicateGenerator(self.seed)
    
    def inject_dead_code(self, code: str) -> str:
        """
        Inject 3 polymorphic dead code blocks into the code.
        
        Args:
            code: Lua code to inject dead code into
            
        Returns:
            Code with dead code blocks injected
        """
        # Generate polymorphic blocks
        blocks = self.generate_polymorphic_blocks()
        
        # Inject blocks at strategic positions
        result = self._inject_blocks_into_code(code, blocks)
        
        return result
    
    def generate_polymorphic_blocks(self) -> List[str]:
        """
        Generate 3 polymorphic dead code blocks.
        
        Each block is wrapped in an always-false predicate so it
        never executes, but appears functional to analysis tools.
        
        Returns:
            List of 3 polymorphic dead code block strings
        """
        blocks = []
        
        for i in range(self.POLYMORPHIC_BLOCK_COUNT):
            block_type = self.seed.get_random_int(0, 4)
            
            if block_type == 0:
                block = self._generate_fake_computation_block()
            elif block_type == 1:
                block = self._generate_fake_loop_block()
            elif block_type == 2:
                block = self._generate_fake_function_block()
            elif block_type == 3:
                block = self._generate_fake_table_block()
            else:
                block = self._generate_fake_conditional_block()
            
            # Wrap in always-false predicate
            false_pred = self.opg.get_false_predicate()
            wrapped = f'if {false_pred} then {block} end'
            blocks.append(wrapped)
        
        return blocks
    
    def _generate_fake_computation_block(self) -> str:
        """Generate a fake computation block."""
        var1 = self.naming.generate_name()
        var2 = self.naming.generate_name()
        var3 = self.naming.generate_name()
        
        val1 = self.seed.get_random_int(0, 0xFFFF)
        val2 = self.seed.get_random_int(0, 0xFFFF)
        
        return f'''local {var1}=0x{val1:X}
local {var2}=0x{val2:X}
local {var3}=bit32.bxor({var1},{var2})
{var3}=bit32.band({var3},0xFF)'''
    
    def _generate_fake_loop_block(self) -> str:
        """Generate a fake loop block."""
        var = self.naming.generate_name()
        counter = self.naming.generate_name()
        limit = self.seed.get_random_int(5, 20)
        
        return f'''local {counter}=0
while {counter}<0x{limit:X} do
local {var}={counter}*2
{counter}={counter}+1
end'''
    
    def _generate_fake_function_block(self) -> str:
        """Generate a fake function block."""
        func_name = self.naming.generate_name()
        param = self.naming.generate_name()
        local_var = self.naming.generate_name()
        
        return f'''local {func_name}=function({param})
local {local_var}={param}+1
return {local_var}
end
{func_name}(0)'''
    
    def _generate_fake_table_block(self) -> str:
        """Generate a fake table manipulation block."""
        table_var = self.naming.generate_name()
        key_var = self.naming.generate_name()
        val_var = self.naming.generate_name()
        
        val1 = self.seed.get_random_int(0, 0xFF)
        val2 = self.seed.get_random_int(0, 0xFF)
        
        return f'''local {table_var}={{}}
{table_var}[0x{val1:X}]=0x{val2:X}
local {key_var}=0x{val1:X}
local {val_var}={table_var}[{key_var}]'''
    
    def _generate_fake_conditional_block(self) -> str:
        """Generate a fake conditional block."""
        var1 = self.naming.generate_name()
        var2 = self.naming.generate_name()
        val = self.seed.get_random_int(0, 0xFFFF)
        
        return f'''local {var1}=0x{val:X}
local {var2}
if {var1}>0 then
{var2}={var1}*2
else
{var2}={var1}+1
end'''
    
    def _inject_blocks_into_code(self, code: str, blocks: List[str]) -> str:
        """
        Inject dead code blocks at strategic positions in the code.
        
        Args:
            code: Original code
            blocks: List of dead code blocks to inject
            
        Returns:
            Code with blocks injected
        """
        lines = code.split('\n')
        
        if len(lines) < len(blocks):
            # If code is too short, prepend all blocks
            return '\n'.join(blocks) + '\n' + code
        
        # Calculate injection positions (spread throughout code)
        positions = []
        chunk_size = len(lines) // (len(blocks) + 1)
        
        for i in range(len(blocks)):
            pos = (i + 1) * chunk_size
            pos = min(pos, len(lines) - 1)
            positions.append(pos)
        
        # Sort positions in reverse to avoid index shifting
        positions.sort(reverse=True)
        
        # Inject blocks
        for i, pos in enumerate(positions):
            block_idx = len(blocks) - 1 - i
            if block_idx < len(blocks):
                lines.insert(pos, blocks[block_idx])
        
        return '\n'.join(lines)


class FakeBranchGenerator:
    """
    Fake Branch Generator for creating dead code blocks.
    
    Creates branches that are never taken but appear to be
    valid code paths to confuse control flow analysis.
    
    Requirements: 30.2
    
    Example:
        >>> fbg = FakeBranchGenerator(PolymorphicBuildSeed(seed=42))
        >>> branch = fbg.generate_fake_branch()
        >>> 'if (bit32' in branch
        True
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Fake Branch Generator.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        self.opg = OpaquePredicateGenerator(self.seed)
    
    def generate_fake_branch(self) -> str:
        """
        Generate a fake branch that is never taken.
        
        Returns:
            Fake branch code string
        """
        false_pred = self.opg.get_false_predicate()
        dead_code = self._generate_dead_code_body()
        
        return f'if {false_pred} then {dead_code} end'
    
    def generate_fake_else_branch(self, real_code: str) -> str:
        """
        Generate an if-else where the else branch is dead code.
        
        Args:
            real_code: The real code to execute
            
        Returns:
            If-else with dead else branch
        """
        true_pred = self.opg.get_true_predicate()
        dead_code = self._generate_dead_code_body()
        
        return f'if {true_pred} then {real_code} else {dead_code} end'
    
    def generate_fake_elseif_chain(self, real_code: str, chain_length: int = 3) -> str:
        """
        Generate an if-elseif chain where only the first branch executes.
        
        Args:
            real_code: The real code to execute
            chain_length: Number of fake elseif branches
            
        Returns:
            If-elseif chain with dead branches
        """
        true_pred = self.opg.get_true_predicate()
        
        parts = [f'if {true_pred} then {real_code}']
        
        for _ in range(chain_length):
            false_pred = self.opg.get_false_predicate()
            dead_code = self._generate_dead_code_body()
            parts.append(f'elseif {false_pred} then {dead_code}')
        
        # Final else with dead code
        dead_code = self._generate_dead_code_body()
        parts.append(f'else {dead_code} end')
        
        return ' '.join(parts)
    
    def _generate_dead_code_body(self) -> str:
        """Generate a dead code body."""
        body_type = self.seed.get_random_int(0, 4)
        
        if body_type == 0:
            var = self.naming.generate_name()
            return f'local {var}=nil'
        elif body_type == 1:
            var = self.naming.generate_name()
            val = self.seed.get_random_int(0, 0xFFFF)
            return f'local {var}=0x{val:X}'
        elif body_type == 2:
            return 'do end'
        elif body_type == 3:
            var = self.naming.generate_name()
            return f'local {var}=false'
        else:
            var = self.naming.generate_name()
            return f'local {var}={{}}'
    
    def insert_fake_branches(self, code: str, count: int = 3) -> str:
        """
        Insert multiple fake branches into code.
        
        Args:
            code: Original code
            count: Number of fake branches to insert
            
        Returns:
            Code with fake branches inserted
        """
        lines = code.split('\n')
        
        if len(lines) < count:
            count = max(1, len(lines) // 2)
        
        # Select random positions
        positions = sorted(
            self.seed.sample(range(len(lines)), min(count, len(lines))),
            reverse=True
        )
        
        for pos in positions:
            fake_branch = self.generate_fake_branch()
            lines.insert(pos, fake_branch)
        
        return '\n'.join(lines)


class FakeControlFlowGenerator:
    """
    Fake Control Flow Generator for inserting unreachable control structures.
    
    Inserts control flow structures (loops, conditionals) that are
    never reached but appear to be valid code paths.
    
    Requirements: 30.3
    
    Example:
        >>> fcfg = FakeControlFlowGenerator(PolymorphicBuildSeed(seed=42))
        >>> block = fcfg.generate_fake_while_loop()
        >>> 'while' in block
        True
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Fake Control Flow Generator.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        self.opg = OpaquePredicateGenerator(self.seed)
    
    def generate_fake_while_loop(self) -> str:
        """
        Generate a fake while loop that never executes.
        
        Returns:
            Fake while loop code
        """
        false_pred = self.opg.get_false_predicate()
        var = self.naming.generate_name()
        counter = self.naming.generate_name()
        
        return f'''if {false_pred} then
local {counter}=0
while {counter}<10 do
local {var}={counter}
{counter}={counter}+1
end
end'''
    
    def generate_fake_for_loop(self) -> str:
        """
        Generate a fake for loop that never executes.
        
        Returns:
            Fake for loop code
        """
        false_pred = self.opg.get_false_predicate()
        var = self.naming.generate_name()
        inner_var = self.naming.generate_name()
        limit = self.seed.get_random_int(5, 20)
        
        return f'''if {false_pred} then
for {var}=1,0x{limit:X} do
local {inner_var}={var}*2
end
end'''
    
    def generate_fake_repeat_until(self) -> str:
        """
        Generate a fake repeat-until loop that never executes.
        
        Returns:
            Fake repeat-until loop code
        """
        false_pred = self.opg.get_false_predicate()
        var = self.naming.generate_name()
        counter = self.naming.generate_name()
        
        return f'''if {false_pred} then
local {counter}=0
repeat
local {var}={counter}
{counter}={counter}+1
until {counter}>=5
end'''
    
    def generate_fake_nested_conditionals(self, depth: int = 3) -> str:
        """
        Generate fake nested conditionals that never execute.
        
        Args:
            depth: Nesting depth
            
        Returns:
            Fake nested conditional code
        """
        false_pred = self.opg.get_false_predicate()
        
        inner = self._generate_inner_conditional(depth)
        
        return f'if {false_pred} then {inner} end'
    
    def _generate_inner_conditional(self, depth: int) -> str:
        """Generate inner conditional structure."""
        if depth <= 0:
            var = self.naming.generate_name()
            return f'local {var}=nil'
        
        var = self.naming.generate_name()
        val = self.seed.get_random_int(0, 0xFF)
        inner = self._generate_inner_conditional(depth - 1)
        
        return f'local {var}=0x{val:X};if {var}>0 then {inner} end'
    
    def generate_fake_state_machine(self) -> str:
        """
        Generate a fake state machine that never executes.
        
        Returns:
            Fake state machine code
        """
        false_pred = self.opg.get_false_predicate()
        state_var = self.naming.generate_name()
        result_var = self.naming.generate_name()
        
        states = [self.seed.get_random_int(0x10, 0xFF) for _ in range(3)]
        
        return f'''if {false_pred} then
local {state_var}=0x{states[0]:X}
local {result_var}=0
while {state_var}~=0 do
if {state_var}==0x{states[0]:X} then
{result_var}={result_var}+1
{state_var}=0x{states[1]:X}
elseif {state_var}==0x{states[1]:X} then
{result_var}={result_var}*2
{state_var}=0x{states[2]:X}
else
{state_var}=0
end
end
end'''
    
    def insert_fake_control_flow(self, code: str, count: int = 2) -> str:
        """
        Insert fake control flow structures into code.
        
        Args:
            code: Original code
            count: Number of fake structures to insert
            
        Returns:
            Code with fake control flow inserted
        """
        generators = [
            self.generate_fake_while_loop,
            self.generate_fake_for_loop,
            self.generate_fake_repeat_until,
            self.generate_fake_nested_conditionals,
            self.generate_fake_state_machine,
        ]
        
        lines = code.split('\n')
        
        for _ in range(count):
            generator = self.seed.choice(generators)
            fake_block = generator()
            
            # Insert at random position
            pos = self.seed.get_random_int(0, len(lines))
            lines.insert(pos, fake_block)
        
        return '\n'.join(lines)



class DecoyFunctionGenerator:
    """
    Decoy Function Generator for adding fake VM handlers.
    
    Generates 2 fake VM handler functions that appear functional
    but are never called, confusing VM analysis.
    
    Requirements: 30.4
    
    Example:
        >>> dfg = DecoyFunctionGenerator(PolymorphicBuildSeed(seed=42))
        >>> handlers = dfg.generate_decoy_handlers()
        >>> len(handlers) == 2
        True
    """
    
    # Number of decoy handlers to generate
    DECOY_HANDLER_COUNT = 2
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Decoy Function Generator.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        self.opg = OpaquePredicateGenerator(self.seed)
    
    def generate_decoy_handlers(self) -> List[Tuple[str, str]]:
        """
        Generate 2 fake VM handler functions.
        
        Returns:
            List of tuples (handler_name, handler_code)
        """
        handlers = []
        
        for i in range(self.DECOY_HANDLER_COUNT):
            handler_type = self.seed.get_random_int(0, 4)
            
            if handler_type == 0:
                handler = self._generate_arithmetic_handler()
            elif handler_type == 1:
                handler = self._generate_load_handler()
            elif handler_type == 2:
                handler = self._generate_store_handler()
            elif handler_type == 3:
                handler = self._generate_jump_handler()
            else:
                handler = self._generate_call_handler()
            
            handlers.append(handler)
        
        return handlers
    
    def _generate_arithmetic_handler(self) -> Tuple[str, str]:
        """Generate a fake arithmetic opcode handler."""
        name = self.naming.generate_name()
        param1 = self.seed.choice(['O', 'e', 'C', 'F'])
        param2 = self.seed.choice(['_', '__', 'x', 'y'])
        param3 = self.seed.choice(['a', 'b', 'c', 'd'])
        
        local_var = self.naming.generate_name()
        result_var = self.naming.generate_name()
        
        code = f'''function({param1},{param2},{param3})
local {local_var}={param1}[0x1]
local {result_var}=bit32.bxor({local_var},{param2})
{param1}[0x2]={result_var}
return {result_var}
end'''
        
        return (name, code)
    
    def _generate_load_handler(self) -> Tuple[str, str]:
        """Generate a fake load opcode handler."""
        name = self.naming.generate_name()
        param1 = self.seed.choice(['O', 'e', 'C', 'F'])
        param2 = self.seed.choice(['_', '__', 'x', 'y'])
        
        local_var = self.naming.generate_name()
        idx = self.seed.get_random_int(0, 0xFF)
        
        code = f'''function({param1},{param2})
local {local_var}={param1}[0x{idx:X}]
return {local_var}
end'''
        
        return (name, code)
    
    def _generate_store_handler(self) -> Tuple[str, str]:
        """Generate a fake store opcode handler."""
        name = self.naming.generate_name()
        param1 = self.seed.choice(['O', 'e', 'C', 'F'])
        param2 = self.seed.choice(['_', '__', 'x', 'y'])
        param3 = self.seed.choice(['a', 'b', 'c', 'd'])
        
        idx = self.seed.get_random_int(0, 0xFF)
        
        code = f'''function({param1},{param2},{param3})
{param1}[0x{idx:X}]={param2}
return {param3}
end'''
        
        return (name, code)
    
    def _generate_jump_handler(self) -> Tuple[str, str]:
        """Generate a fake jump opcode handler."""
        name = self.naming.generate_name()
        param1 = self.seed.choice(['O', 'e', 'C', 'F'])
        param2 = self.seed.choice(['_', '__', 'x', 'y'])
        
        local_var = self.naming.generate_name()
        offset = self.seed.get_random_int(1, 10)
        
        code = f'''function({param1},{param2})
local {local_var}={param2}+0x{offset:X}
return {local_var}
end'''
        
        return (name, code)
    
    def _generate_call_handler(self) -> Tuple[str, str]:
        """Generate a fake call opcode handler."""
        name = self.naming.generate_name()
        param1 = self.seed.choice(['O', 'e', 'C', 'F'])
        param2 = self.seed.choice(['_', '__', 'x', 'y'])
        param3 = self.seed.choice(['a', 'b', 'c', 'd'])
        
        local_var = self.naming.generate_name()
        result_var = self.naming.generate_name()
        g_var = self.naming.generate_name()
        type_var = self.naming.generate_name()
        fn_var = self.naming.generate_name()
        
        # Use escape sequence for "function" string
        fn_esc = ''.join(f'\\{ord(c)}' for c in 'function')
        
        code = f'''function({param1},{param2},{param3})
local {g_var}=_G
local {type_var}={g_var}["\\116\\121\\112\\101"]
local {fn_var}="{fn_esc}"
local {local_var}={param1}[{param2}]
local {result_var}
if {type_var}({local_var})=={fn_var} then
{result_var}={local_var}({param3})
end
return {result_var}
end'''
        
        return (name, code)
    
    def generate_decoy_handler_table(self) -> str:
        """
        Generate a table containing decoy handlers.
        
        Returns:
            Lua code for decoy handler table
        """
        handlers = self.generate_decoy_handlers()
        table_var = self.naming.generate_name()
        
        entries = []
        for name, code in handlers:
            # Use fake opcode numbers (high values)
            fake_opcode = self.seed.get_random_int(200, 999)
            entries.append(f'[{fake_opcode}]={code}')
        
        return f'local {table_var}={{{",".join(entries)}}}'
    
    def insert_decoy_handlers(self, code: str) -> str:
        """
        Insert decoy handlers into code.
        
        Args:
            code: Original code
            
        Returns:
            Code with decoy handlers inserted
        """
        handlers = self.generate_decoy_handlers()
        
        handler_defs = []
        for name, handler_code in handlers:
            handler_defs.append(f'local {name}={handler_code}')
        
        return '\n'.join(handler_defs) + '\n' + code


class DecoyConstantGenerator:
    """
    Decoy Constant Generator for inserting fake constants in pool.
    
    Inserts 5 fake constants that appear to be used but are never
    actually accessed, confusing constant pool analysis.
    
    Requirements: 30.5
    
    Example:
        >>> dcg = DecoyConstantGenerator(PolymorphicBuildSeed(seed=42))
        >>> constants = dcg.generate_decoy_constants()
        >>> len(constants) == 5
        True
    """
    
    # Number of decoy constants to generate
    DECOY_CONSTANT_COUNT = 5
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Decoy Constant Generator.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
    
    def generate_decoy_constants(self) -> List[Tuple[int, any]]:
        """
        Generate 5 fake constants.
        
        Returns:
            List of tuples (index, value) for decoy constants
        """
        constants = []
        base_index = 10000 + self.seed.get_random_int(0, 5000)
        
        for i in range(self.DECOY_CONSTANT_COUNT):
            # Generate large non-sequential index
            index = base_index + self.seed.get_random_int(100, 1000)
            base_index = index + 1
            
            # Generate random value
            value = self._generate_random_value()
            
            constants.append((index, value))
        
        return constants
    
    def _generate_random_value(self) -> any:
        """Generate a random constant value."""
        value_type = self.seed.get_random_int(0, 4)
        
        if value_type == 0:
            # Large integer
            return self.seed.get_random_int(-999999999, 999999999)
        elif value_type == 1:
            # Float
            return round(self.seed.get_random_float(-10000, 10000), 4)
        elif value_type == 2:
            # String (looks like a key or identifier)
            chars = 'abcdefghijklmnopqrstuvwxyz_'
            length = self.seed.get_random_int(5, 15)
            return ''.join(self.seed.choices(list(chars), length))
        elif value_type == 3:
            # Hex-like string
            return f'0x{self.seed.get_random_int(0, 0xFFFFFFFF):08X}'
        else:
            # Boolean-like
            return self.seed.choice([True, False, 0, 1])
    
    def generate_decoy_constant_code(self, pool_var: str = 'F') -> str:
        """
        Generate Lua code to initialize decoy constants.
        
        Args:
            pool_var: Variable name for the constant pool
            
        Returns:
            Lua code initializing decoy constants
        """
        constants = self.generate_decoy_constants()
        
        lines = []
        for index, value in constants:
            # Format index with obfuscation
            idx_fmt = self._format_index(index)
            
            # Format value
            if isinstance(value, str):
                escaped = value.replace('\\', '\\\\').replace('"', '\\"')
                val_fmt = f'"{escaped}"'
            elif isinstance(value, bool):
                val_fmt = str(value).lower()
            elif isinstance(value, float):
                val_fmt = str(value)
            else:
                val_fmt = str(value)
            
            lines.append(f'{pool_var}[{idx_fmt}]={val_fmt}')
        
        return ';'.join(lines)
    
    def _format_index(self, index: int) -> str:
        """Format an index with obfuscation."""
        fmt = self.seed.get_random_int(0, 3)
        
        if fmt == 0:
            return f'0x{index:X}'
        elif fmt == 1:
            return f'0X{index:x}'
        elif fmt == 2:
            # With underscore
            hex_str = f'{index:X}'
            if len(hex_str) >= 4:
                pos = len(hex_str) // 2
                hex_str = hex_str[:pos] + '_' + hex_str[pos:]
            return f'0X{hex_str}'
        else:
            return str(index)
    
    def insert_decoy_constants(self, code: str, pool_var: str = 'F') -> str:
        """
        Insert decoy constant initializations into code.
        
        Args:
            code: Original code
            pool_var: Variable name for the constant pool
            
        Returns:
            Code with decoy constants inserted
        """
        decoy_code = self.generate_decoy_constant_code(pool_var)
        
        # Find a good insertion point (after pool initialization)
        pool_init_pattern = rf'local\s+{pool_var}\s*='
        match = re.search(pool_init_pattern, code)
        
        if match:
            # Find end of the initialization statement
            pos = match.end()
            # Find next semicolon or newline
            end_pos = code.find(';', pos)
            if end_pos == -1:
                end_pos = code.find('\n', pos)
            if end_pos == -1:
                end_pos = len(code)
            
            return code[:end_pos+1] + decoy_code + ';' + code[end_pos+1:]
        
        # If no pool found, prepend
        return decoy_code + '\n' + code


class DeadCodeTransformer:
    """
    Main Dead Code Transformer that combines all dead code features.
    
    This is the primary interface for dead code injection in the obfuscator pipeline.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Dead Code Transformer.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.dead_code_injector = DeadCodeInjector(self.seed)
        self.fake_branch_generator = FakeBranchGenerator(self.seed)
        self.fake_control_flow = FakeControlFlowGenerator(self.seed)
        self.decoy_function_generator = DecoyFunctionGenerator(self.seed)
        self.decoy_constant_generator = DecoyConstantGenerator(self.seed)
    
    def apply_all_transforms(self, code: str, pool_var: str = 'F') -> str:
        """
        Apply all dead code transforms to code.
        
        Args:
            code: Lua code to transform
            pool_var: Variable name for the constant pool
            
        Returns:
            Transformed code with all dead code features
        """
        result = code
        
        # 1. Inject 3 polymorphic dead code blocks
        result = self.dead_code_injector.inject_dead_code(result)
        
        # 2. Insert fake branches
        result = self.fake_branch_generator.insert_fake_branches(result, count=2)
        
        # 3. Insert fake control flow structures
        result = self.fake_control_flow.insert_fake_control_flow(result, count=2)
        
        # 4. Insert decoy handlers
        result = self.decoy_function_generator.insert_decoy_handlers(result)
        
        # 5. Insert decoy constants
        result = self.decoy_constant_generator.insert_decoy_constants(result, pool_var)
        
        return result
    
    def inject_polymorphic_blocks(self, code: str) -> str:
        """
        Inject only polymorphic dead code blocks.
        
        Args:
            code: Lua code
            
        Returns:
            Code with polymorphic blocks injected
        """
        return self.dead_code_injector.inject_dead_code(code)
    
    def inject_fake_branches(self, code: str, count: int = 3) -> str:
        """
        Inject only fake branches.
        
        Args:
            code: Lua code
            count: Number of fake branches
            
        Returns:
            Code with fake branches injected
        """
        return self.fake_branch_generator.insert_fake_branches(code, count)
    
    def inject_fake_control_flow(self, code: str, count: int = 2) -> str:
        """
        Inject only fake control flow structures.
        
        Args:
            code: Lua code
            count: Number of fake structures
            
        Returns:
            Code with fake control flow injected
        """
        return self.fake_control_flow.insert_fake_control_flow(code, count)
    
    def inject_decoy_handlers(self, code: str) -> str:
        """
        Inject only decoy handlers.
        
        Args:
            code: Lua code
            
        Returns:
            Code with decoy handlers injected
        """
        return self.decoy_function_generator.insert_decoy_handlers(code)
    
    def inject_decoy_constants(self, code: str, pool_var: str = 'F') -> str:
        """
        Inject only decoy constants.
        
        Args:
            code: Lua code
            pool_var: Variable name for the constant pool
            
        Returns:
            Code with decoy constants injected
        """
        return self.decoy_constant_generator.insert_decoy_constants(code, pool_var)


# Export all classes
__all__ = [
    'DeadCodeInjector',
    'FakeBranchGenerator',
    'FakeControlFlowGenerator',
    'DecoyFunctionGenerator',
    'DecoyConstantGenerator',
    'DeadCodeTransformer',
]
