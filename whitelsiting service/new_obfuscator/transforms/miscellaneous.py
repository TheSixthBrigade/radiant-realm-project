"""
Miscellaneous obfuscation features for the Luraph-style obfuscator.

This module provides additional obfuscation transformations:
- Polymorphic Constants: Vary constant encoding (Requirement 33.1)
- Execution Randomization: State-based reordering (Requirement 33.2)
- Metatable Traps: Fake __index, __newindex, __len handlers (Requirement 33.3)
- Variable Shadowing: Deep nesting 5+ levels (Requirement 33.4)
- Nested Ternary Expressions: Depth 3 ternaries (Requirement 33.5)
- Dot-to-Bracket Notation Conversion: Convert all dot access (Requirement 33.6)
- Boolean Literal Obfuscation: Obfuscate true/false (Requirement 33.7)

Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6, 33.7
"""

import re
from typing import List, Optional, Dict, Tuple, Any

try:
    from ..core.seed import PolymorphicBuildSeed
    from ..core.predicates import OpaquePredicateGenerator
except ImportError:
    from core.seed import PolymorphicBuildSeed
    from core.predicates import OpaquePredicateGenerator


class PolymorphicConstants:
    """
    Polymorphic Constants for varying constant encoding.
    
    Each time a constant is used, it can be encoded differently:
    - Different numeric formats (hex, binary, computed)
    - Different string encodings (escape sequences, string.char)
    - Different boolean representations
    
    Requirement: 33.1
    
    Example:
        >>> pc = PolymorphicConstants(PolymorphicBuildSeed(seed=42))
        >>> pc.encode_number(255)  # First call
        '0xFF'
        >>> pc.encode_number(255)  # Second call - different encoding
        '0B11111111'
    """
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize Polymorphic Constants.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
        self._encoding_history: Dict[Any, List[str]] = {}
    
    def encode_number(self, num: int) -> str:
        """
        Encode a number with varying format each time.
        
        Args:
            num: The number to encode
        
        Returns:
            Encoded number string in a random format
        """
        encodings = [
            self._to_hex,
            self._to_hex_underscore,
            self._to_binary,
            self._to_binary_underscore,
            self._to_computed_add,
            self._to_computed_sub,
            self._to_mixed_case_hex,
            self._to_decimal_underscore,
        ]
        
        encoder = self.seed.choice(encodings)
        result = encoder(num)
        
        # Track encoding history
        if num not in self._encoding_history:
            self._encoding_history[num] = []
        self._encoding_history[num].append(result)
        
        return result
    
    def _to_hex(self, num: int) -> str:
        """Convert to simple hex format."""
        if num < 0:
            return f'-0x{abs(num):X}'
        prefix = self.seed.choice(['0x', '0X'])
        return f'{prefix}{num:X}'
    
    def _to_hex_underscore(self, num: int) -> str:
        """Convert to hex with underscores."""
        if num < 0:
            return f'-{self._to_hex_underscore(abs(num))}'
        if num == 0:
            return '0x0'
        
        hex_str = format(num, 'X')
        prefix = self.seed.choice(['0x', '0X'])
        
        # Insert underscores
        if len(hex_str) > 2:
            parts = []
            for i, c in enumerate(hex_str):
                parts.append(c)
                if i < len(hex_str) - 1 and self.seed.random_bool(0.4):
                    # CRITICAL: Luau only supports SINGLE underscores in numeric literals!
                    parts.append('_')
            hex_str = ''.join(parts)
        
        return f'{prefix}{hex_str}'
    
    def _to_binary(self, num: int) -> str:
        """Convert to binary format."""
        if num < 0:
            return f'-0b{abs(num):b}'
        prefix = self.seed.choice(['0b', '0B'])
        return f'{prefix}{num:b}'
    
    def _to_binary_underscore(self, num: int) -> str:
        """Convert to binary with underscores."""
        if num < 0:
            return f'-{self._to_binary_underscore(abs(num))}'
        if num == 0:
            return '0b0'
        
        bin_str = format(num, 'b')
        prefix = self.seed.choice(['0b', '0B'])
        
        # Insert underscores every 4 bits
        if len(bin_str) > 4:
            parts = []
            for i, c in enumerate(bin_str):
                parts.append(c)
                if (len(bin_str) - i - 1) % 4 == 0 and i < len(bin_str) - 1:
                    # CRITICAL: Luau only supports SINGLE underscores in numeric literals!
                    parts.append('_')
            bin_str = ''.join(parts)
        
        return f'{prefix}{bin_str}'
    
    def _to_computed_add(self, num: int) -> str:
        """Convert to computed addition expression."""
        if num == 0:
            return '(0x0+0x0)'
        
        a = self.seed.get_random_int(0, abs(num))
        b = abs(num) - a
        
        a_str = self._to_hex(a)
        b_str = self._to_hex(b)
        
        if num < 0:
            return f'-({a_str}+{b_str})'
        return f'({a_str}+{b_str})'
    
    def _to_computed_sub(self, num: int) -> str:
        """Convert to computed subtraction expression."""
        b = self.seed.get_random_int(1, 1000)
        a = num + b
        
        a_str = self._to_hex(a)
        b_str = self._to_hex(b)
        
        return f'({a_str}-{b_str})'
    
    def _to_mixed_case_hex(self, num: int) -> str:
        """Convert to hex with mixed case letters."""
        if num < 0:
            return f'-{self._to_mixed_case_hex(abs(num))}'
        if num == 0:
            return '0x0'
        
        hex_str = format(num, 'x')
        mixed = []
        for c in hex_str:
            if c.isalpha():
                mixed.append(c.upper() if self.seed.random_bool(0.5) else c.lower())
            else:
                mixed.append(c)
        
        prefix = self.seed.choice(['0x', '0X'])
        return f'{prefix}{"".join(mixed)}'
    
    def _to_decimal_underscore(self, num: int) -> str:
        """Convert to decimal with underscores."""
        s = str(abs(num))
        if len(s) <= 3:
            return str(num)
        
        # Insert underscores every 3 digits from right
        parts = []
        for i, c in enumerate(reversed(s)):
            if i > 0 and i % 3 == 0:
                parts.append('_')
            parts.append(c)
        
        result = ''.join(reversed(parts))
        if num < 0:
            return f'-{result}'
        return result
    
    def encode_string(self, s: str) -> str:
        """
        Encode a string with varying format.
        
        Args:
            s: The string to encode
        
        Returns:
            Encoded string in a random format
        """
        encodings = [
            self._to_escape_sequence,
            self._to_string_char,
            self._to_hex_escape,
            self._to_unicode_escape,
        ]
        
        encoder = self.seed.choice(encodings)
        return encoder(s)
    
    def _to_escape_sequence(self, s: str) -> str:
        """Convert to decimal escape sequences."""
        parts = []
        for c in s:
            if self.seed.random_bool(0.7):
                parts.append(f'\\{ord(c):03d}')
            else:
                parts.append(c)
        return '"' + ''.join(parts) + '"'
    
    def _to_string_char(self, s: str) -> str:
        """Convert to string using decimal escape sequences.
        
        NOTE: We use escape sequences instead of _SC() because _SC may not
        be defined when this code runs. This is safer and still obfuscates
        the string content.
        """
        # Use decimal escape sequences instead of _SC to avoid dependency issues
        escaped = ''.join(f'\\{ord(c):03d}' for c in s)
        return f'"{escaped}"'
    
    def _to_hex_escape(self, s: str) -> str:
        """Convert to hex escape sequences."""
        parts = []
        for c in s:
            if self.seed.random_bool(0.6):
                parts.append(f'\\x{ord(c):02X}')
            else:
                parts.append(c)
        return f'"{"".join(parts)}"'
    
    def _to_unicode_escape(self, s: str) -> str:
        """Convert to unicode escape sequences."""
        parts = []
        for c in s:
            if self.seed.random_bool(0.5):
                parts.append(f'\\u{{{ord(c):04X}}}')
            else:
                parts.append(c)
        return f'"{"".join(parts)}"'
    
    def get_encoding_history(self) -> Dict[Any, List[str]]:
        """Get the history of encodings used."""
        return self._encoding_history.copy()


class ExecutionRandomization:
    """
    Execution Randomization using state-based reordering.
    
    Reorders code execution using state machines to make
    the execution flow harder to follow.
    
    Requirement: 33.2
    
    Example:
        >>> er = ExecutionRandomization(PolymorphicBuildSeed(seed=42))
        >>> er.randomize_statements(['a = 1', 'b = 2', 'c = 3'])
        'local _ST=0x1;while _ST~=0 do if _ST==0x1 then a=1;_ST=0x3;...'
    """
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize Execution Randomization.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
        self.pc = PolymorphicConstants(seed)
    
    def randomize_statements(self, statements: List[str]) -> str:
        """
        Randomize execution order of statements using state machine.
        
        Args:
            statements: List of statements to randomize
        
        Returns:
            State machine code that executes statements in original order
        """
        if not statements:
            return ''
        
        if len(statements) == 1:
            return statements[0]
        
        # Generate random state values
        num_states = len(statements)
        state_values = self.seed.sample(
            list(range(1, num_states * 10 + 1)), 
            num_states
        )
        
        # Shuffle the order for the state machine
        execution_order = list(range(num_states))
        shuffled_order = self.seed.shuffle(execution_order)
        
        # Build state machine
        state_var = self.seed.choice(['_ST', '_S', '_F', '_X', '_W'])
        initial_state = self.pc.encode_number(state_values[shuffled_order.index(0)])
        
        code_parts = [f'local {state_var}={initial_state};while {state_var}~=0 do ']
        
        for i, shuffled_idx in enumerate(shuffled_order):
            state_val = self.pc.encode_number(state_values[i])
            stmt = statements[shuffled_idx]
            
            # Determine next state
            original_idx = shuffled_idx
            if original_idx < num_states - 1:
                next_original_idx = original_idx + 1
                next_shuffled_idx = shuffled_order.index(next_original_idx)
                next_state = self.pc.encode_number(state_values[next_shuffled_idx])
            else:
                next_state = '0'
            
            if i == 0:
                code_parts.append(f'if {state_var}=={state_val} then {stmt};{state_var}={next_state};')
            else:
                code_parts.append(f'elseif {state_var}=={state_val} then {stmt};{state_var}={next_state};')
        
        code_parts.append('end;end')
        
        return ''.join(code_parts)
    
    def wrap_in_state_machine(self, code: str, num_states: int = 3) -> str:
        """
        Wrap code in a state machine with random transitions.
        
        Args:
            code: Code to wrap
            num_states: Number of intermediate states
        
        Returns:
            Code wrapped in state machine
        """
        state_var = self.seed.choice(['_ST', '_S', '_F', '_X'])
        states = [self.seed.get_random_int(1, 1000) for _ in range(num_states)]
        
        initial = self.pc.encode_number(states[0])
        
        parts = [f'local {state_var}={initial};while {state_var}~=0 do ']
        
        for i, state in enumerate(states):
            state_str = self.pc.encode_number(state)
            next_state = self.pc.encode_number(states[i + 1]) if i < len(states) - 1 else '0'
            
            if i == 0:
                parts.append(f'if {state_var}=={state_str} then {code};{state_var}={next_state};')
            elif i == len(states) - 1:
                parts.append(f'elseif {state_var}=={state_str} then {state_var}={next_state};')
            else:
                parts.append(f'elseif {state_var}=={state_str} then {state_var}={next_state};')
        
        parts.append('end;end')
        
        return ''.join(parts)


class MetatableTraps:
    """
    Metatable Traps for creating fake metamethod handlers.
    
    Creates fake __index, __newindex, __len handlers that appear
    functional but are never actually triggered.
    
    Requirement: 33.3
    
    Example:
        >>> mt = MetatableTraps(PolymorphicBuildSeed(seed=42))
        >>> mt.generate_fake_metatable('_MT')
        'local _MT=setmetatable({},{__index=function(t,k)return nil end,...})'
    """
    
    # Metamethods to create traps for
    METAMETHODS = ['__index', '__newindex', '__len', '__call', '__tostring', '__eq']
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize Metatable Traps.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
        self.pc = PolymorphicConstants(seed)
    
    def generate_fake_metatable(self, name: Optional[str] = None) -> str:
        """
        Generate a fake metatable with trap handlers.
        
        Args:
            name: Optional name for the metatable variable
        
        Returns:
            Lua code defining the fake metatable
        """
        if name is None:
            name = self.seed.choice(['_MT', '_M', '_T', '_X', '_W'])
        
        handlers = []
        
        # __index trap
        if self.seed.random_bool(0.8):
            handlers.append(self._generate_index_trap())
        
        # __newindex trap
        if self.seed.random_bool(0.8):
            handlers.append(self._generate_newindex_trap())
        
        # __len trap
        if self.seed.random_bool(0.7):
            handlers.append(self._generate_len_trap())
        
        # __call trap
        if self.seed.random_bool(0.5):
            handlers.append(self._generate_call_trap())
        
        # __tostring trap
        if self.seed.random_bool(0.5):
            handlers.append(self._generate_tostring_trap())
        
        if not handlers:
            handlers.append(self._generate_index_trap())
        
        handlers_str = ','.join(handlers)
        return f'local {name}=setmetatable({{}},{{{handlers_str}}})'
    
    def _generate_index_trap(self) -> str:
        """Generate fake __index handler."""
        patterns = [
            '__index=function(t,k)return nil end',
            '__index=function(t,k)local v=rawget(t,k);return v end',
            '__index=function(t,k)return t[k]or nil end',
            f'__index=function(t,k)return {self.pc.encode_number(0)} end',
        ]
        return self.seed.choice(patterns)
    
    def _generate_newindex_trap(self) -> str:
        """Generate fake __newindex handler."""
        patterns = [
            '__newindex=function(t,k,v)rawset(t,k,v)end',
            '__newindex=function(t,k,v)t[k]=v end',
            '__newindex=function(t,k,v)end',
        ]
        return self.seed.choice(patterns)
    
    def _generate_len_trap(self) -> str:
        """Generate fake __len handler."""
        fake_len = self.pc.encode_number(self.seed.get_random_int(0, 100))
        patterns = [
            f'__len=function(t)return {fake_len} end',
            '__len=function(t)return #t end',
            '__len=function(t)return rawlen(t)end',
        ]
        return self.seed.choice(patterns)
    
    def _generate_call_trap(self) -> str:
        """Generate fake __call handler."""
        patterns = [
            '__call=function(t,...)return(...)end',
            '__call=function(t,...)end',
            '__call=function(t,a)return a end',
        ]
        return self.seed.choice(patterns)
    
    def _generate_tostring_trap(self) -> str:
        """Generate fake __tostring handler.
        Uses escape sequences to avoid readable strings.
        CRITICAL: Use tostring directly, NOT _G["tostring"] which returns nil in Roblox!"""
        # Escape sequences for fake strings
        table_esc = ''.join(f'\\{ord(c)}' for c in 'table')
        object_esc = ''.join(f'\\{ord(c)}' for c in 'object')
        bracket_obj_esc = ''.join(f'\\{ord(c)}' for c in '[object]')
        tostring_key_esc = ''.join(f'\\{ord(c)}' for c in '__tostring')
        
        fake_str = self.seed.choice([f'"{table_esc}"', f'"{object_esc}"', f'"{bracket_obj_esc}"', '""'])
        patterns = [
            f'["{tostring_key_esc}"]=function(t)return {fake_str} end',
            # Use tostring directly - _G["tostring"] returns nil in Roblox!
            f'["{tostring_key_esc}"]=function(t)return tostring(t)end',
        ]
        return self.seed.choice(patterns)
    
    def inject_metatable_traps(self, code: str, count: int = 3) -> str:
        """
        Inject fake metatable traps into code.
        
        Args:
            code: Code to inject traps into
            count: Number of traps to inject
        
        Returns:
            Code with injected metatable traps
        """
        traps = []
        used_names = set()
        
        for _ in range(count):
            name = self._generate_unique_name(used_names)
            used_names.add(name)
            traps.append(self.generate_fake_metatable(name))
        
        # Inject at the beginning
        trap_code = ';'.join(traps) + ';'
        return trap_code + code
    
    def _generate_unique_name(self, used: set) -> str:
        """Generate a unique metatable name."""
        prefixes = ['_MT', '_M', '_T', '_X', '_W', '_H', '_P']
        for _ in range(100):
            name = self.seed.choice(prefixes) + str(self.seed.get_random_int(1, 99))
            if name not in used:
                return name
        return f'_MT{len(used)}'



class VariableShadowing:
    """
    Variable Shadowing for creating deep nesting (5+ levels).
    
    Creates nested scopes with shadowed variables to confuse
    analysis tools and make variable tracking difficult.
    
    Requirement: 33.4
    
    Example:
        >>> vs = VariableShadowing(PolymorphicBuildSeed(seed=42))
        >>> vs.shadow_variable('x', 'value')
        'do local x=value;do local x=x;do local x=x;...'
    """
    
    # Minimum and maximum nesting depth
    MIN_DEPTH = 5
    MAX_DEPTH = 8
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize Variable Shadowing.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
        self.pc = PolymorphicConstants(seed)
    
    def shadow_variable(self, var_name: str, initial_value: str, depth: Optional[int] = None) -> str:
        """
        Create deeply nested shadowed variable declarations.
        
        Args:
            var_name: Variable name to shadow
            initial_value: Initial value expression
            depth: Nesting depth (default: random 5-8)
        
        Returns:
            Nested do blocks with shadowed variable
        """
        if depth is None:
            depth = self.seed.get_random_int(self.MIN_DEPTH, self.MAX_DEPTH)
        
        parts = []
        
        # First level with initial value
        parts.append(f'do local {var_name}={initial_value};')
        
        # Additional levels that shadow the variable
        for i in range(1, depth):
            # Sometimes add a dummy operation
            if self.seed.random_bool(0.3):
                dummy_val = self.pc.encode_number(self.seed.get_random_int(0, 255))
                parts.append(f'do local _{var_name}={dummy_val};local {var_name}={var_name};')
            else:
                parts.append(f'do local {var_name}={var_name};')
        
        return ''.join(parts)
    
    def close_shadow_blocks(self, depth: Optional[int] = None) -> str:
        """
        Generate closing end statements for shadow blocks.
        
        Args:
            depth: Number of blocks to close
        
        Returns:
            String of 'end' statements
        """
        if depth is None:
            depth = self.seed.get_random_int(self.MIN_DEPTH, self.MAX_DEPTH)
        
        return 'end;' * depth
    
    def wrap_code_with_shadows(self, code: str, variables: List[Tuple[str, str]], depth: Optional[int] = None) -> str:
        """
        Wrap code with shadowed variable declarations.
        
        Args:
            code: Code to wrap
            variables: List of (name, value) tuples
            depth: Nesting depth
        
        Returns:
            Code wrapped with shadowed variables
        """
        if depth is None:
            depth = self.seed.get_random_int(self.MIN_DEPTH, self.MAX_DEPTH)
        
        parts = []
        
        # Create nested shadows for each variable
        for var_name, initial_value in variables:
            parts.append(self.shadow_variable(var_name, initial_value, depth))
        
        # Add the actual code
        parts.append(code)
        
        # Close all blocks
        total_blocks = len(variables) * depth
        parts.append('end;' * total_blocks)
        
        return ''.join(parts)
    
    def create_shadow_scope(self, inner_code: str, depth: Optional[int] = None) -> str:
        """
        Create a deeply nested scope around code.
        
        Args:
            inner_code: Code to wrap in nested scope
            depth: Nesting depth
        
        Returns:
            Code wrapped in nested do blocks
        """
        if depth is None:
            depth = self.seed.get_random_int(self.MIN_DEPTH, self.MAX_DEPTH)
        
        # Generate dummy variables for each level
        dummy_vars = []
        for i in range(depth):
            var_name = f'_{self.seed.choice(["x", "y", "z", "w", "v"])}{i}'
            var_value = self.pc.encode_number(self.seed.get_random_int(0, 1000))
            dummy_vars.append((var_name, var_value))
        
        parts = []
        
        # Open nested blocks with dummy variables
        for var_name, var_value in dummy_vars:
            parts.append(f'do local {var_name}={var_value};')
        
        # Add inner code
        parts.append(inner_code)
        
        # Close blocks
        parts.append('end;' * depth)
        
        return ''.join(parts)


class NestedTernaryExpressions:
    """
    Nested Ternary Expressions for creating depth 3 ternaries.
    
    Creates deeply nested ternary (and/or) expressions that
    evaluate to the original value but are harder to analyze.
    
    Requirement: 33.5
    
    Example:
        >>> nte = NestedTernaryExpressions(PolymorphicBuildSeed(seed=42))
        >>> nte.wrap_value('x')
        '(true and (true and (true and x or nil) or nil) or nil)'
    """
    
    # Default nesting depth
    DEFAULT_DEPTH = 3
    
    def __init__(self, seed: PolymorphicBuildSeed, opg: Optional[OpaquePredicateGenerator] = None):
        """
        Initialize Nested Ternary Expressions.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            opg: Optional OpaquePredicateGenerator for predicates
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
        self.pc = PolymorphicConstants(seed)
    
    def wrap_value(self, value: str, depth: int = 3) -> str:
        """
        Wrap a value in nested ternary expressions.
        
        Args:
            value: Value expression to wrap
            depth: Nesting depth (default: 3)
        
        Returns:
            Nested ternary expression that evaluates to value
        """
        if depth <= 0:
            return value
        
        # Get an always-true predicate
        predicate = self.opg.get_true_predicate()
        
        # Generate a dummy false value
        dummy = self._generate_dummy_value()
        
        # Recursively wrap
        inner = self.wrap_value(value, depth - 1)
        
        return f'({predicate} and {inner} or {dummy})'
    
    def wrap_with_false_branch(self, value: str, depth: int = 3) -> str:
        """
        Wrap value with false branch that's never taken.
        
        Args:
            value: Value expression to wrap
            depth: Nesting depth
        
        Returns:
            Nested ternary with dead false branches
        """
        if depth <= 0:
            return value
        
        # Get predicates
        true_pred = self.opg.get_true_predicate()
        false_pred = self.opg.get_false_predicate()
        
        # Generate dummy values for false branches
        dummy1 = self._generate_dummy_value()
        dummy2 = self._generate_dummy_value()
        
        inner = self.wrap_with_false_branch(value, depth - 1)
        
        # Pattern: (true_pred and inner or (false_pred and dummy1 or dummy2))
        return f'({true_pred} and {inner} or ({false_pred} and {dummy1} or {dummy2}))'
    
    def create_conditional_chain(self, value: str, depth: int = 3) -> str:
        """
        Create a chain of conditional expressions.
        
        Args:
            value: Value to return
            depth: Chain depth
        
        Returns:
            Chained conditional expression
        """
        if depth <= 0:
            return value
        
        conditions = []
        for _ in range(depth):
            pred = self.opg.get_true_predicate()
            conditions.append(pred)
        
        # Build chain: cond1 and cond2 and cond3 and value or nil
        chain = ' and '.join(conditions)
        return f'({chain} and {value} or nil)'
    
    def wrap_comparison(self, left: str, op: str, right: str, depth: int = 3) -> str:
        """
        Wrap a comparison in nested ternaries.
        
        Luraph style: (a > b) and a or b patterns
        
        Args:
            left: Left operand
            op: Comparison operator
            right: Right operand
            depth: Nesting depth
        
        Returns:
            Nested ternary comparison
        """
        comparison = f'({left}{op}{right})'
        
        if depth <= 1:
            return f'({comparison} and {left} or {right})'
        
        # Wrap the result in additional ternaries
        result = f'({comparison} and {left} or {right})'
        return self.wrap_value(result, depth - 1)
    
    def _generate_dummy_value(self) -> str:
        """Generate a dummy value for false branches."""
        dummy_type = self.seed.get_random_int(0, 4)
        if dummy_type == 0:
            return 'nil'
        elif dummy_type == 1:
            return self.pc.encode_number(0)
        elif dummy_type == 2:
            return 'false'
        elif dummy_type == 3:
            return '""'
        else:
            return '{}'


class DotToBracketConverter:
    """
    Dot-to-Bracket Notation Converter.
    
    Converts all dot notation access (obj.field) to bracket
    notation (obj["field"]) for uniform access patterns.
    
    Requirement: 33.6
    
    Example:
        >>> dtb = DotToBracketConverter(PolymorphicBuildSeed(seed=42))
        >>> dtb.convert('table.field')
        'table["field"]'
        >>> dtb.convert('obj.method()')
        'obj["method"]()'
    """
    
    # Lua keywords and built-ins that should not be converted
    PRESERVE_PATTERNS = [
        'bit32', 'string', 'table', 'math', 'os', 'io', 'debug',
        'coroutine', 'package', 'utf8', 'buffer',
    ]
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize Dot-to-Bracket Converter.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
        self.pc = PolymorphicConstants(seed)
    
    def convert(self, code: str) -> str:
        """
        Convert all dot notation to bracket notation.
        
        Args:
            code: Lua code to convert
        
        Returns:
            Code with bracket notation
        """
        # Pattern to match dot access: identifier.identifier
        # But not inside strings or comments
        
        def replace_dot_access(match):
            full_match = match.group(0)
            obj = match.group(1)
            field = match.group(2)
            
            # Convert field to string with obfuscation
            field_str = self._obfuscate_field_name(field)
            
            return f'{obj}[{field_str}]'
        
        # Match: word.word (not preceded by string quote)
        pattern = r'([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)'
        
        # Simple conversion - a more robust solution would use a parser
        result = re.sub(pattern, replace_dot_access, code)
        
        return result
    
    def _obfuscate_field_name(self, field: str) -> str:
        """
        Obfuscate a field name string.
        
        Args:
            field: Field name to obfuscate
        
        Returns:
            Obfuscated string representation
        """
        method = self.seed.get_random_int(0, 3)
        
        if method == 0:
            # Simple quoted string
            return f'"{field}"'
        elif method == 1:
            # Escape sequence string
            escaped = ''.join(f'\\{ord(c):03d}' for c in field)
            return f'"{escaped}"'
        elif method == 2:
            # Hex escape string
            escaped = ''.join(f'\\x{ord(c):02X}' for c in field)
            return f'"{escaped}"'
        else:
            # Mixed escapes
            parts = []
            for c in field:
                if self.seed.random_bool(0.5):
                    parts.append(f'\\{ord(c):03d}')
                else:
                    parts.append(c)
            return f'"{"".join(parts)}"'
    
    def convert_method_calls(self, code: str) -> str:
        """
        Convert method calls from colon to bracket notation.
        
        obj:method(args) -> obj["method"](obj, args)
        
        Args:
            code: Lua code to convert
        
        Returns:
            Code with converted method calls
        """
        # Pattern for method calls: obj:method(
        pattern = r'([a-zA-Z_][a-zA-Z0-9_]*):([a-zA-Z_][a-zA-Z0-9_]*)\('
        
        def replace_method_call(match):
            obj = match.group(1)
            method = match.group(2)
            field_str = self._obfuscate_field_name(method)
            return f'{obj}[{field_str}]({obj},'
        
        return re.sub(pattern, replace_method_call, code)


class BooleanLiteralObfuscation:
    """
    Boolean Literal Obfuscation for obfuscating true/false.
    
    Replaces boolean literals with equivalent expressions
    that are harder to recognize.
    
    Requirement: 33.7
    
    Example:
        >>> blo = BooleanLiteralObfuscation(PolymorphicBuildSeed(seed=42))
        >>> blo.obfuscate_true()
        '(0x1==0x1)'
        >>> blo.obfuscate_false()
        '(0x1==0x0)'
    """
    
    def __init__(self, seed: PolymorphicBuildSeed, opg: Optional[OpaquePredicateGenerator] = None):
        """
        Initialize Boolean Literal Obfuscation.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            opg: Optional OpaquePredicateGenerator
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
        self.pc = PolymorphicConstants(seed)
    
    def obfuscate_true(self) -> str:
        """
        Generate an obfuscated true value.
        
        Returns:
            Expression that evaluates to true
        """
        patterns = [
            self._equality_true,
            self._comparison_true,
            self._not_false,
            self._and_true,
            self._or_true,
            self._bit32_true,
        ]
        
        return self.seed.choice(patterns)()
    
    def obfuscate_false(self) -> str:
        """
        Generate an obfuscated false value.
        
        Returns:
            Expression that evaluates to false
        """
        patterns = [
            self._equality_false,
            self._comparison_false,
            self._not_true,
            self._and_false,
            self._nil_check,
        ]
        
        return self.seed.choice(patterns)()
    
    def _equality_true(self) -> str:
        """Generate true via equality: (x == x)"""
        val = self.pc.encode_number(self.seed.get_random_int(1, 255))
        return f'({val}=={val})'
    
    def _equality_false(self) -> str:
        """Generate false via inequality: (x == y) where x != y"""
        val1 = self.pc.encode_number(self.seed.get_random_int(1, 100))
        val2 = self.pc.encode_number(self.seed.get_random_int(101, 200))
        return f'({val1}=={val2})'
    
    def _comparison_true(self) -> str:
        """Generate true via comparison: (x > y) where x > y"""
        val1 = self.pc.encode_number(self.seed.get_random_int(100, 200))
        val2 = self.pc.encode_number(self.seed.get_random_int(1, 99))
        return f'({val1}>{val2})'
    
    def _comparison_false(self) -> str:
        """Generate false via comparison: (x > y) where x <= y"""
        val1 = self.pc.encode_number(self.seed.get_random_int(1, 50))
        val2 = self.pc.encode_number(self.seed.get_random_int(100, 200))
        return f'({val1}>{val2})'
    
    def _not_false(self) -> str:
        """Generate true via not false: (not false)"""
        false_expr = self._equality_false()
        return f'(not {false_expr})'
    
    def _not_true(self) -> str:
        """Generate false via not true: (not true)"""
        true_expr = self._equality_true()
        return f'(not {true_expr})'
    
    def _and_true(self) -> str:
        """Generate true via and: (true and true)"""
        t1 = self._equality_true()
        t2 = self._comparison_true()
        return f'({t1} and {t2})'
    
    def _and_false(self) -> str:
        """Generate false via and: (true and false)"""
        t = self._equality_true()
        f = self._equality_false()
        return f'({t} and {f})'
    
    def _or_true(self) -> str:
        """Generate true via or: (false or true)"""
        f = self._equality_false()
        t = self._equality_true()
        return f'({f} or {t})'
    
    def _nil_check(self) -> str:
        """Generate false via nil check: (nil ~= nil)"""
        return '(nil~=nil)'
    
    def _bit32_true(self) -> str:
        """Generate true via bit32 operation."""
        val = self.pc.encode_number(self.seed.get_random_int(1, 255))
        return f'(bit32.band({val},{val})=={val})'
    
    def obfuscate_in_code(self, code: str) -> str:
        """
        Replace boolean literals in code with obfuscated versions.
        
        Args:
            code: Lua code to process
        
        Returns:
            Code with obfuscated boolean literals
        """
        # Replace 'true' (not part of identifier)
        def replace_true(match):
            return self.obfuscate_true()
        
        def replace_false(match):
            return self.obfuscate_false()
        
        # Pattern to match standalone true/false
        code = re.sub(r'\btrue\b', replace_true, code)
        code = re.sub(r'\bfalse\b', replace_false, code)
        
        return code


class MiscellaneousTransformer:
    """
    Main interface for all miscellaneous obfuscation features.
    
    Combines all miscellaneous transformations into a single interface:
    - Polymorphic Constants (33.1)
    - Execution Randomization (33.2)
    - Metatable Traps (33.3)
    - Variable Shadowing (33.4)
    - Nested Ternary Expressions (33.5)
    - Dot-to-Bracket Conversion (33.6)
    - Boolean Literal Obfuscation (33.7)
    
    Example:
        >>> mt = MiscellaneousTransformer(PolymorphicBuildSeed(seed=42))
        >>> mt.apply_all(code)
    """
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize Miscellaneous Transformer.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
        self.polymorphic_constants = PolymorphicConstants(seed)
        self.execution_randomization = ExecutionRandomization(seed)
        self.metatable_traps = MetatableTraps(seed)
        self.variable_shadowing = VariableShadowing(seed)
        self.nested_ternary = NestedTernaryExpressions(seed)
        self.dot_to_bracket = DotToBracketConverter(seed)
        self.boolean_obfuscation = BooleanLiteralObfuscation(seed)
    
    def apply_all(self, code: str) -> str:
        """
        Apply all miscellaneous transformations to code.
        
        Args:
            code: Lua code to transform
        
        Returns:
            Transformed code
        """
        # Apply transformations in order
        
        # 1. Convert dot to bracket notation
        code = self.dot_to_bracket.convert(code)
        
        # 2. Obfuscate boolean literals
        code = self.boolean_obfuscation.obfuscate_in_code(code)
        
        # 3. Inject metatable traps
        code = self.metatable_traps.inject_metatable_traps(code, count=2)
        
        return code
    
    def encode_number(self, num: int) -> str:
        """Encode a number with polymorphic format."""
        return self.polymorphic_constants.encode_number(num)
    
    def encode_string(self, s: str) -> str:
        """Encode a string with polymorphic format."""
        return self.polymorphic_constants.encode_string(s)
    
    def wrap_in_ternary(self, value: str, depth: int = 3) -> str:
        """Wrap a value in nested ternary expressions."""
        return self.nested_ternary.wrap_value(value, depth)
    
    def create_shadow_scope(self, code: str, depth: int = 5) -> str:
        """Create a deeply nested shadow scope around code."""
        return self.variable_shadowing.create_shadow_scope(code, depth)
    
    def randomize_execution(self, statements: List[str]) -> str:
        """Randomize statement execution order."""
        return self.execution_randomization.randomize_statements(statements)
    
    def obfuscate_true(self) -> str:
        """Get an obfuscated true value."""
        return self.boolean_obfuscation.obfuscate_true()
    
    def obfuscate_false(self) -> str:
        """Get an obfuscated false value."""
        return self.boolean_obfuscation.obfuscate_false()
    
    def generate_metatable_trap(self, name: Optional[str] = None) -> str:
        """Generate a fake metatable trap."""
        return self.metatable_traps.generate_fake_metatable(name)
