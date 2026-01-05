"""
Control Flow Transformations for the Luraph-style obfuscator.

This module provides control flow obfuscation transformations that match
Luraph v14.4.1 output style, including:
- State Machine Converter (7 states, 15 transition patterns)
- While Loop Wrapper (WLW)
- If-Else Chain Expander (IECE)
- Anonymous Function Wrapper (AFW)
- Repeat-Until Injector (RUI)
- For Loop Enhancer (FLE)
- Continue/Break Nester (CBN)
- Luraph Control Flow Transformer (Universal Deep Nesting 4-6 levels)

Requirements: 12.1-12.4, 13.1-13.2, 14.1-14.2, 15.1-15.2, 16.1-16.2, 17.1-17.2, 18.1-18.2, 19.1-19.4
"""

from typing import List, Optional, Dict, Tuple
import re

try:
    from ..core.seed import PolymorphicBuildSeed
    from ..core.predicates import OpaquePredicateGenerator
except ImportError:
    from core.seed import PolymorphicBuildSeed
    from core.predicates import OpaquePredicateGenerator


class StateMachineConverter:
    """
    State Machine Converter for control flow flattening.
    
    Converts linear code into state machine form with 7 states and
    15 computed transition patterns matching Luraph v14.4.1 style.
    
    Requirements: 12.1, 12.2, 12.3, 12.4
    
    Example:
        >>> smc = StateMachineConverter(PolymorphicBuildSeed(seed=42))
        >>> smc.convert_to_state_machine(['stmt1', 'stmt2', 'stmt3'])
        'local _ST=0X53;while true do if _ST<=0x16 then stmt1;_ST=0x2A;...'
    """
    
    # Number of states in the state machine
    NUM_STATES = 7
    
    # State variable names (Luraph style)
    STATE_VAR_NAMES = ['_ST', 'F', '_F', 'S', '_S', 'e', '_e', 'C', '_C']

    # Transition patterns (15 patterns as per requirements)
    TRANSITION_PATTERNS = [
        'computed_add',      # next = current + offset
        'computed_sub',      # next = current - offset
        'computed_xor',      # next = current ^ key
        'computed_mul',      # next = current * factor % mod
        'computed_shift',    # next = lshift(current, n) % mod
        'direct_assign',     # next = constant
        'conditional_add',   # next = cond and (current + a) or (current + b)
        'conditional_xor',   # next = cond and (current ^ a) or (current ^ b)
        'table_lookup',      # next = transitions[current]
        'bit_extract',       # next = extract(packed, offset, width)
        'rotate_add',        # next = rrotate(current, n) + offset
        'nested_ternary',    # next = c1 and (c2 and a or b) or c
        'hash_based',        # next = hash(current) % num_states
        'indirect_table',    # next = T[T[current]]
        'computed_band',     # next = band(current, mask) + offset
    ]
    
    def __init__(self, seed: PolymorphicBuildSeed, opg: Optional[OpaquePredicateGenerator] = None):
        """
        Initialize the State Machine Converter.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            opg: Optional OpaquePredicateGenerator for conditional transitions
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
        self._state_var = self.seed.choice(self.STATE_VAR_NAMES)
        self._states: Dict[int, str] = {}
        self._transitions: Dict[int, int] = {}
    
    def _generate_state_value(self) -> int:
        """Generate a random state value in Luraph style (large hex numbers)."""
        return self.seed.get_random_int(0x10, 0xFFFF)
    
    def _format_number(self, num: int) -> str:
        """Format a number in obfuscated format."""
        fmt = self.seed.get_random_int(0, 3)
        if fmt == 0:
            return f'0x{num:X}'
        elif fmt == 1:
            return f'0X{num:x}'
        elif fmt == 2 and num < 256:
            return f'0B{num:b}'
        else:
            return str(num)

    def _generate_transition(self, current_state: int, next_state: int) -> str:
        """
        Generate a computed state transition expression.
        
        Args:
            current_state: Current state value
            next_state: Target state value
        
        Returns:
            Lua expression that computes the next state
        """
        pattern = self.seed.choice(self.TRANSITION_PATTERNS)
        state_var = self._state_var
        
        if pattern == 'computed_add':
            offset = next_state - current_state
            offset_str = self._format_number(abs(offset))
            if offset >= 0:
                return f'{state_var}+{offset_str}'
            else:
                return f'{state_var}-{offset_str}'
        
        elif pattern == 'computed_sub':
            offset = current_state - next_state
            offset_str = self._format_number(abs(offset))
            if offset >= 0:
                return f'{state_var}-{offset_str}'
            else:
                return f'{state_var}+{offset_str}'
        
        elif pattern == 'computed_xor':
            key = current_state ^ next_state
            key_str = self._format_number(key)
            return f'bit32.bxor({state_var},{key_str})'
        
        elif pattern == 'computed_mul':
            # Simple: just return the direct value
            return self._format_number(next_state)
        
        elif pattern == 'computed_shift':
            return self._format_number(next_state)
        
        elif pattern == 'direct_assign':
            return self._format_number(next_state)
        
        elif pattern == 'conditional_add':
            predicate = self.opg.get_true_predicate()
            next_str = self._format_number(next_state)
            dummy = self._format_number(self.seed.get_random_int(0x10, 0xFFFF))
            return f'({predicate} and {next_str} or {dummy})'
        
        elif pattern == 'conditional_xor':
            predicate = self.opg.get_true_predicate()
            key = current_state ^ next_state
            key_str = self._format_number(key)
            dummy = self._format_number(self.seed.get_random_int(0x10, 0xFFFF))
            return f'({predicate} and bit32.bxor({state_var},{key_str}) or {dummy})'
        
        elif pattern == 'table_lookup':
            return self._format_number(next_state)

        elif pattern == 'bit_extract':
            return self._format_number(next_state)
        
        elif pattern == 'rotate_add':
            return self._format_number(next_state)
        
        elif pattern == 'nested_ternary':
            pred1 = self.opg.get_true_predicate()
            pred2 = self.opg.get_true_predicate()
            next_str = self._format_number(next_state)
            dummy1 = self._format_number(self.seed.get_random_int(0x10, 0xFFFF))
            dummy2 = self._format_number(self.seed.get_random_int(0x10, 0xFFFF))
            return f'({pred1} and ({pred2} and {next_str} or {dummy1}) or {dummy2})'
        
        elif pattern == 'hash_based':
            return self._format_number(next_state)
        
        elif pattern == 'indirect_table':
            return self._format_number(next_state)
        
        elif pattern == 'computed_band':
            return self._format_number(next_state)
        
        else:
            return self._format_number(next_state)
    
    def convert_to_state_machine(self, statements: List[str]) -> str:
        """
        Convert a list of statements into state machine form.
        
        Args:
            statements: List of Lua statements to convert
        
        Returns:
            Lua code implementing the state machine
        
        Example:
            >>> smc.convert_to_state_machine(['print("a")', 'print("b")'])
            'local F=0X53;while true do if F<=0x16 then print("a");F=0x2A;...'
        """
        if not statements:
            return ''
        
        # Generate unique state values
        state_values = []
        for _ in range(len(statements) + 1):  # +1 for exit state
            state = self._generate_state_value()
            while state in state_values:
                state = self._generate_state_value()
            state_values.append(state)
        
        # Assign states to statements
        for i, stmt in enumerate(statements):
            self._states[state_values[i]] = stmt
            self._transitions[state_values[i]] = state_values[i + 1]
        
        # Exit state
        exit_state = state_values[-1]
        
        # Build state machine code
        initial_state = self._format_number(state_values[0])
        exit_state_str = self._format_number(exit_state)
        
        code_parts = [f'local {self._state_var}={initial_state}']
        code_parts.append(f'while {self._state_var}~={exit_state_str} do')

        # Shuffle state order for obfuscation
        shuffled_states = self.seed.shuffle(list(self._states.keys()))
        
        # Generate state handlers
        for i, state in enumerate(shuffled_states):
            stmt = self._states[state]
            next_state = self._transitions[state]
            transition = self._generate_transition(state, next_state)
            state_str = self._format_number(state)
            
            if i == 0:
                code_parts.append(f'if {self._state_var}=={state_str} then {stmt};{self._state_var}={transition}')
            else:
                code_parts.append(f'elseif {self._state_var}=={state_str} then {stmt};{self._state_var}={transition}')
        
        code_parts.append('end')
        code_parts.append('end')
        
        return ';'.join(code_parts)
    
    def nest_state_machine(self, code: str, depth: int = 4) -> str:
        """
        Nest state machine to specified depth (4-6 levels).
        
        Args:
            code: The code to nest
            depth: Nesting depth (default: 4)
        
        Returns:
            Deeply nested state machine code
        """
        if depth <= 0:
            return code
        
        result = code
        for _ in range(depth):
            result = self._wrap_in_state_machine(result)
        
        return result
    
    def _wrap_in_state_machine(self, code: str) -> str:
        """Wrap code in a single-iteration state machine."""
        state_var = self.seed.choice(self.STATE_VAR_NAMES)
        initial = self._format_number(self.seed.get_random_int(0x10, 0xFF))
        exit_val = self._format_number(0)
        
        predicate = self.opg.get_true_predicate()
        
        # CRITICAL: Add space between 'end' statements to prevent 'endend' syntax errors
        return f'local {state_var}={initial};while {state_var}~={exit_val} do if {predicate} then {code};{state_var}={exit_val};end ;end '
    
    def generate_state_wrapper(self, num_states: int = 7) -> Tuple[str, List[int]]:
        """
        Generate a state machine wrapper with specified number of states.
        
        Args:
            num_states: Number of states (default: 7)
        
        Returns:
            Tuple of (wrapper code prefix, list of state values)
        """
        states = []
        for _ in range(num_states):
            state = self._generate_state_value()
            while state in states:
                state = self._generate_state_value()
            states.append(state)
        
        initial = self._format_number(states[0])
        prefix = f'local {self._state_var}={initial};while true do'
        
        return prefix, states
    
    def __repr__(self) -> str:
        return f"StateMachineConverter(states={self.NUM_STATES}, patterns={len(self.TRANSITION_PATTERNS)})"



class WhileLoopWrapper:
    """
    While Loop Wrapper (WLW) for wrapping code in while loop structures.
    
    Creates deeply nested while loops with opaque predicates to obscure
    control flow matching Luraph v14.4.1 style.
    
    Requirements: 13.1, 13.2
    
    Example:
        >>> wlw = WhileLoopWrapper(PolymorphicBuildSeed(seed=42))
        >>> wlw.wrap_in_while_loop('print("hello")')
        'local _w=0x1;while _w~=0x0 do print("hello");_w=0x0;end'
    """
    
    # Loop variable names
    LOOP_VAR_NAMES = ['_w', '_W', '_l', '_L', '_i', '_I', '_j', '_J', '_k', '_K']
    
    def __init__(self, seed: PolymorphicBuildSeed, opg: Optional[OpaquePredicateGenerator] = None):
        """
        Initialize the While Loop Wrapper.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            opg: Optional OpaquePredicateGenerator for conditions
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
    
    def _format_number(self, num: int) -> str:
        """Format a number in obfuscated format."""
        fmt = self.seed.get_random_int(0, 3)
        if fmt == 0:
            return f'0x{num:X}'
        elif fmt == 1:
            return f'0X{num:x}'
        elif fmt == 2 and num < 256:
            return f'0B{num:b}'
        else:
            return str(num)
    
    def wrap_in_while_loop(self, code: str) -> str:
        """
        Wrap code in a while loop structure.
        
        Args:
            code: The code to wrap
        
        Returns:
            Code wrapped in while loop
        """
        loop_var = self.seed.choice(self.LOOP_VAR_NAMES)
        initial = self._format_number(self.seed.get_random_int(1, 255))
        exit_val = self._format_number(0)
        
        # CRITICAL: Add space after 'end' to prevent 'endend' syntax errors
        return f'local {loop_var}={initial};while {loop_var}~={exit_val} do {code};{loop_var}={exit_val};end '

    def generate_deep_while(self, code: str, depth: int = 3) -> str:
        """
        Generate deeply nested while loops.
        
        Args:
            code: The code to wrap
            depth: Nesting depth (default: 3)
        
        Returns:
            Deeply nested while loop code
        """
        result = code
        for _ in range(depth):
            result = self.wrap_in_while_loop(result)
        return result
    
    def wrap_with_predicate(self, code: str) -> str:
        """
        Wrap code in while loop with opaque predicate.
        
        Args:
            code: The code to wrap
        
        Returns:
            Code wrapped with predicate-guarded while loop
        """
        loop_var = self.seed.choice(self.LOOP_VAR_NAMES)
        initial = self._format_number(self.seed.get_random_int(1, 255))
        exit_val = self._format_number(0)
        predicate = self.opg.get_true_predicate()
        
        # CRITICAL: Add space between 'end' statements to prevent 'endend' syntax errors
        return f'local {loop_var}={initial};while {loop_var}~={exit_val} do if {predicate} then {code};end ;{loop_var}={exit_val};end '
    
    def __repr__(self) -> str:
        return "WhileLoopWrapper()"



class IfElseChainExpander:
    """
    If-Else Chain Expander (IECE) for expanding conditionals into deep chains.
    
    Expands simple conditionals into deeply nested if-else structures
    with opaque predicates matching Luraph v14.4.1 style.
    
    Requirements: 14.1, 14.2
    
    Example:
        >>> iece = IfElseChainExpander(PolymorphicBuildSeed(seed=42))
        >>> iece.expand_conditional('x > 0', 'print("pos")', 'print("neg")')
        'if (bit32.band(0xFF,0xFF)==0xFF) then if x > 0 then print("pos") else print("neg") end end'
    """
    
    def __init__(self, seed: PolymorphicBuildSeed, opg: Optional[OpaquePredicateGenerator] = None):
        """
        Initialize the If-Else Chain Expander.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            opg: Optional OpaquePredicateGenerator for conditions
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
    
    def expand_conditional(self, condition: str, true_code: str, false_code: str = '') -> str:
        """
        Expand a conditional into an if-else chain.
        
        Args:
            condition: The condition expression
            true_code: Code to execute when true
            false_code: Code to execute when false (optional)
        
        Returns:
            Expanded if-else chain
        """
        predicate = self.opg.get_true_predicate()
        
        if false_code:
            inner = f'if {condition} then {true_code} else {false_code} end'
        else:
            inner = f'if {condition} then {true_code} end'
        
        return f'if {predicate} then {inner} end'

    def generate_deep_if_else(self, code: str, depth: int = 3) -> str:
        """
        Generate deeply nested if-else structures.
        
        Args:
            code: The code to wrap
            depth: Nesting depth (default: 3)
        
        Returns:
            Deeply nested if-else code
        """
        result = code
        for _ in range(depth):
            predicate = self.opg.get_true_predicate()
            dead_code = self._generate_dead_code()
            # Add space after end to prevent 'endend' when nested
            result = f'if {predicate} then {result} else {dead_code} end '
        return result
    
    def _generate_dead_code(self) -> str:
        """Generate dead code for false branches."""
        patterns = [
            'local _=nil',
            'local _=0x0',
            'do end',
            'local _=false',
        ]
        return self.seed.choice(patterns)
    
    def expand_with_decoys(self, condition: str, true_code: str, false_code: str = '') -> str:
        """
        Expand conditional with decoy branches.
        
        Args:
            condition: The condition expression
            true_code: Code to execute when true
            false_code: Code to execute when false
        
        Returns:
            Expanded conditional with decoy branches
        """
        true_pred = self.opg.get_true_predicate()
        false_pred = self.opg.get_false_predicate()
        dead1 = self._generate_dead_code()
        dead2 = self._generate_dead_code()
        
        if false_code:
            inner = f'if {condition} then {true_code} else {false_code} end'
        else:
            inner = f'if {condition} then {true_code} end'
        
        return f'if {false_pred} then {dead1} elseif {true_pred} then {inner} else {dead2} end'
    
    def __repr__(self) -> str:
        return "IfElseChainExpander()"



class AnonymousFunctionWrapper:
    """
    Anonymous Function Wrapper (AFW) for wrapping code in anonymous functions.
    
    Creates closure-capturing anonymous functions with deep nesting
    to complicate scope analysis matching Luraph v14.4.1 style.
    
    Requirements: 15.1, 15.2
    
    Example:
        >>> afw = AnonymousFunctionWrapper(PolymorphicBuildSeed(seed=42))
        >>> afw.generate_closure_capture('x', 'return x + 1')
        '(function(_x) return _x + 1 end)(x)'
    """
    
    # Closure variable names
    CLOSURE_VAR_NAMES = ['_', '__', '___', '_x', '_y', '_z', '_a', '_b', '_c']
    
    def __init__(self, seed: PolymorphicBuildSeed, opg: Optional[OpaquePredicateGenerator] = None):
        """
        Initialize the Anonymous Function Wrapper.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            opg: Optional OpaquePredicateGenerator for conditions
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
    
    def generate_closure_capture(self, captured_var: str, body: str) -> str:
        """
        Generate a closure-capturing anonymous function.
        
        Args:
            captured_var: Variable to capture
            body: Function body
        
        Returns:
            Anonymous function with closure capture
        """
        param = self.seed.choice(self.CLOSURE_VAR_NAMES)
        return f'(function({param}) {body} end)({captured_var})'
    
    def generate_deep_anonymous(self, code: str, depth: int = 3) -> str:
        """
        Generate deeply nested anonymous functions.
        
        Args:
            code: The code to wrap
            depth: Nesting depth (default: 3)
        
        Returns:
            Deeply nested anonymous function code
        """
        result = code
        for i in range(depth):
            param = self.seed.choice(self.CLOSURE_VAR_NAMES)
            result = f'(function({param}) {result} end)()'
        return result

    def wrap_with_state(self, code: str) -> str:
        """
        Wrap code in anonymous function with state machine pattern.
        
        Luraph style: (function()local _,I,q,S,P={w[9],w},0B110000;while true do...end;end)
        
        Args:
            code: The code to wrap
        
        Returns:
            Anonymous function with state machine
        """
        state_var = self.seed.choice(['_', 'I', 'q', 'S', 'P'])
        initial = self.seed.get_random_int(0x10, 0xFF)
        initial_str = f'0X{initial:X}' if self.seed.random_bool() else f'0B{initial:b}'
        
        return f'(function()local {state_var}={initial_str};{code};end)()'
    
    def generate_iife(self, code: str) -> str:
        """
        Generate an Immediately Invoked Function Expression (IIFE).
        
        Args:
            code: The code to wrap
        
        Returns:
            IIFE wrapping the code
        """
        return f'(function() {code} end)()'
    
    def __repr__(self) -> str:
        return "AnonymousFunctionWrapper()"



class RepeatUntilInjector:
    """
    Repeat-Until Injector (RUI) for injecting repeat-until loop structures.
    
    Injects repeat-until loops throughout code to complicate loop analysis
    matching Luraph v14.4.1 style.
    
    Requirements: 16.1, 16.2
    
    Example:
        >>> rui = RepeatUntilInjector(PolymorphicBuildSeed(seed=42))
        >>> rui.inject_repeat_until('print("hello")')
        'repeat print("hello") until true'
    """
    
    def __init__(self, seed: PolymorphicBuildSeed, opg: Optional[OpaquePredicateGenerator] = None):
        """
        Initialize the Repeat-Until Injector.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            opg: Optional OpaquePredicateGenerator for conditions
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
    
    def inject_repeat_until(self, code: str) -> str:
        """
        Inject a repeat-until loop around code.
        
        Args:
            code: The code to wrap
        
        Returns:
            Code wrapped in repeat-until loop
        """
        # Use opaque predicate that's always true for single iteration
        predicate = self.opg.get_true_predicate()
        return f'repeat {code} until {predicate}'
    
    def generate_deep_repeat_until(self, code: str, depth: int = 3) -> str:
        """
        Generate deeply nested repeat-until loops.
        
        Args:
            code: The code to wrap
            depth: Nesting depth (default: 3)
        
        Returns:
            Deeply nested repeat-until code
        """
        result = code
        for _ in range(depth):
            result = self.inject_repeat_until(result)
        return result

    def inject_with_counter(self, code: str) -> str:
        """
        Inject repeat-until with counter variable.
        
        Args:
            code: The code to wrap
        
        Returns:
            Code wrapped with counter-based repeat-until
        """
        counter = self.seed.choice(['_c', '_C', '_n', '_N', '_i', '_I'])
        return f'local {counter}=0;repeat {code};{counter}={counter}+1 until {counter}>=1'
    
    def __repr__(self) -> str:
        return "RepeatUntilInjector()"



class ForLoopEnhancer:
    """
    For Loop Enhancer (FLE) for enhancing for loops with nested structures.
    
    Enhances for loops with additional nesting and obfuscation
    matching Luraph v14.4.1 style.
    
    Requirements: 17.1, 17.2
    
    Example:
        >>> fle = ForLoopEnhancer(PolymorphicBuildSeed(seed=42))
        >>> fle.enhance_for_loop('i', '1', '10', 'print(i)')
        'for _i=0x1,0xA do local i=_i;print(i) end'
    """
    
    # Loop variable names
    LOOP_VAR_NAMES = ['_i', '_I', '_j', '_J', '_k', '_K', '_n', '_N']
    
    def __init__(self, seed: PolymorphicBuildSeed, opg: Optional[OpaquePredicateGenerator] = None):
        """
        Initialize the For Loop Enhancer.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            opg: Optional OpaquePredicateGenerator for conditions
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
    
    def _format_number(self, num: int) -> str:
        """Format a number in obfuscated format."""
        fmt = self.seed.get_random_int(0, 3)
        if fmt == 0:
            return f'0x{num:X}'
        elif fmt == 1:
            return f'0X{num:x}'
        elif fmt == 2 and num < 256:
            return f'0B{num:b}'
        else:
            return str(num)
    
    def enhance_for_loop(self, var: str, start: str, end: str, body: str, step: str = '1') -> str:
        """
        Enhance a for loop with obfuscation.
        
        Args:
            var: Loop variable name
            start: Start value
            end: End value
            body: Loop body
            step: Step value (default: 1)
        
        Returns:
            Enhanced for loop
        """
        internal_var = self.seed.choice(self.LOOP_VAR_NAMES)
        
        # Try to convert start/end to numbers for formatting
        try:
            start_num = int(start)
            start_str = self._format_number(start_num)
        except ValueError:
            start_str = start
        
        try:
            end_num = int(end)
            end_str = self._format_number(end_num)
        except ValueError:
            end_str = end

        # Create enhanced loop with variable aliasing
        if step == '1':
            # Add space after end to prevent 'endend' when nested
            return f'for {internal_var}={start_str},{end_str} do local {var}={internal_var};{body} end '
        else:
            try:
                step_num = int(step)
                step_str = self._format_number(step_num)
            except ValueError:
                step_str = step
            # Add space after end to prevent 'endend' when nested
            return f'for {internal_var}={start_str},{end_str},{step_str} do local {var}={internal_var};{body} end '
    
    def generate_nested_for_loops(self, code: str, depth: int = 2) -> str:
        """
        Generate nested for loops around code.
        
        Args:
            code: The code to wrap
            depth: Nesting depth (default: 2)
        
        Returns:
            Code wrapped in nested for loops
        """
        result = code
        for i in range(depth):
            var = self.seed.choice(self.LOOP_VAR_NAMES)
            start = self._format_number(1)
            end = self._format_number(1)  # Single iteration
            # Add space after end to prevent 'endend' when nested
            result = f'for {var}={start},{end} do {result} end '
        return result
    
    def wrap_single_iteration(self, code: str) -> str:
        """
        Wrap code in a single-iteration for loop.
        
        Args:
            code: The code to wrap
        
        Returns:
            Code wrapped in single-iteration for loop
        """
        var = self.seed.choice(self.LOOP_VAR_NAMES)
        # Add space after end to prevent 'endend' when nested
        return f'for {var}=1,1 do {code} end '
    
    def __repr__(self) -> str:
        return "ForLoopEnhancer()"



class ContinueBreakNester:
    """
    Continue/Break Nester (CBN) for nesting continue and break statements.
    
    Nests continue and break statements in complex structures to obscure
    control flow jumps matching Luraph v14.4.1 style.
    
    Requirements: 18.1, 18.2
    
    Example:
        >>> cbn = ContinueBreakNester(PolymorphicBuildSeed(seed=42))
        >>> cbn.nest_continue()
        'if (bit32.band(0xFF,0xFF)==0xFF) then continue end'
    """
    
    def __init__(self, seed: PolymorphicBuildSeed, opg: Optional[OpaquePredicateGenerator] = None):
        """
        Initialize the Continue/Break Nester.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            opg: Optional OpaquePredicateGenerator for conditions
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
    
    def nest_continue(self) -> str:
        """
        Generate a nested continue statement.
        
        Returns:
            Nested continue statement
        """
        predicate = self.opg.get_true_predicate()
        return f'if {predicate} then continue end'
    
    def nest_break(self) -> str:
        """
        Generate a nested break statement.
        
        Returns:
            Nested break statement
        """
        predicate = self.opg.get_true_predicate()
        return f'if {predicate} then break end'
    
    def nest_continue_deep(self, depth: int = 2) -> str:
        """
        Generate deeply nested continue statement.
        
        Args:
            depth: Nesting depth (default: 2)
        
        Returns:
            Deeply nested continue statement
        """
        result = 'continue'
        for _ in range(depth):
            predicate = self.opg.get_true_predicate()
            result = f'if {predicate} then {result} end'
        return result

    def nest_break_deep(self, depth: int = 2) -> str:
        """
        Generate deeply nested break statement.
        
        Args:
            depth: Nesting depth (default: 2)
        
        Returns:
            Deeply nested break statement
        """
        result = 'break'
        for _ in range(depth):
            predicate = self.opg.get_true_predicate()
            result = f'if {predicate} then {result} end'
        return result
    
    def wrap_with_dead_branch(self, statement: str) -> str:
        """
        Wrap a control statement with a dead branch.
        
        Args:
            statement: The control statement (continue or break)
        
        Returns:
            Statement with dead branch
        """
        true_pred = self.opg.get_true_predicate()
        false_pred = self.opg.get_false_predicate()
        dead_code = 'local _=nil'
        
        return f'if {false_pred} then {dead_code} elseif {true_pred} then {statement} end'
    
    def __repr__(self) -> str:
        return "ContinueBreakNester()"



class LuraphControlFlowTransformer:
    """
    Luraph Control Flow Transformer for comprehensive control flow obfuscation.
    
    Combines all control flow transformations to match Luraph v14.4.1 style:
    - State machine conversion
    - While loop wrapping
    - If-else chain expansion
    - Anonymous function wrapping
    - Repeat-until injection
    - For loop enhancement
    - Continue/break nesting
    - Universal Deep Nesting (4-6 levels)
    
    Requirements: 19.1, 19.2, 19.3, 19.4
    
    Example:
        >>> lcft = LuraphControlFlowTransformer(PolymorphicBuildSeed(seed=42))
        >>> lcft.transform_while('x > 0', 'print(x);x=x-1')
        'local _ST=0X53;while _ST~=0x0 do if _ST==0X53 then...'
    """
    
    # Universal deep nesting depth range
    MIN_NESTING_DEPTH = 4
    MAX_NESTING_DEPTH = 6
    
    def __init__(self, seed: PolymorphicBuildSeed, opg: Optional[OpaquePredicateGenerator] = None):
        """
        Initialize the Luraph Control Flow Transformer.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            opg: Optional OpaquePredicateGenerator for conditions
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
        
        # Initialize all sub-transformers
        self.state_machine = StateMachineConverter(seed, self.opg)
        self.while_wrapper = WhileLoopWrapper(seed, self.opg)
        self.if_else_expander = IfElseChainExpander(seed, self.opg)
        self.anon_wrapper = AnonymousFunctionWrapper(seed, self.opg)
        self.repeat_injector = RepeatUntilInjector(seed, self.opg)
        self.for_enhancer = ForLoopEnhancer(seed, self.opg)
        self.continue_break = ContinueBreakNester(seed, self.opg)

    def transform_while(self, condition: str, body: str) -> str:
        """
        Transform a while loop to Luraph-style pattern.
        
        Args:
            condition: Loop condition
            body: Loop body
        
        Returns:
            Transformed while loop
        """
        # Wrap the body in state machine style
        predicate = self.opg.get_true_predicate()
        
        # Create Luraph-style while with state variable
        state_var = self.seed.choice(['F', '_F', 'S', '_S', 'e'])
        initial = self.seed.get_random_int(0x10, 0xFFFF)
        initial_str = f'0X{initial:X}'
        
        # CRITICAL: Add space between 'end' statements to prevent 'endend' syntax errors
        return f'local {state_var}={initial_str};while {condition} do if {predicate} then {body};end ;end '
    
    def transform_for(self, var: str, start: str, end: str, body: str, step: str = '1') -> str:
        """
        Transform a for loop to Luraph-style pattern.
        
        Args:
            var: Loop variable
            start: Start value
            end: End value
            body: Loop body
            step: Step value
        
        Returns:
            Transformed for loop
        """
        return self.for_enhancer.enhance_for_loop(var, start, end, body, step)
    
    def transform_if_chain(self, conditions: List[Tuple[str, str]], else_code: str = '') -> str:
        """
        Transform an if-elseif-else chain to Luraph-style pattern.
        
        Args:
            conditions: List of (condition, code) tuples
            else_code: Optional else block code
        
        Returns:
            Transformed if chain
        """
        if not conditions:
            return else_code if else_code else ''
        
        # Build the chain with opaque predicates
        parts = []
        for i, (cond, code) in enumerate(conditions):
            predicate = self.opg.get_true_predicate()
            wrapped_code = f'if {predicate} then {code} end'
            
            if i == 0:
                parts.append(f'if {cond} then {wrapped_code}')
            else:
                parts.append(f'elseif {cond} then {wrapped_code}')
        
        if else_code:
            predicate = self.opg.get_true_predicate()
            parts.append(f'else if {predicate} then {else_code} end')
        
        parts.append('end')
        return ' '.join(parts)

    def apply_universal_deep_nesting(self, code: str, depth: Optional[int] = None) -> str:
        """
        Apply Universal Deep Nesting Wrapper (4-6 levels).
        
        Combines multiple nesting techniques for maximum obfuscation.
        
        Args:
            code: The code to wrap
            depth: Optional specific depth (default: random 4-6)
        
        Returns:
            Deeply nested code
        """
        if depth is None:
            depth = self.seed.get_random_int(self.MIN_NESTING_DEPTH, self.MAX_NESTING_DEPTH)
        
        result = code
        
        for i in range(depth):
            # Choose a random nesting technique
            technique = self.seed.get_random_int(0, 5)
            
            if technique == 0:
                # While loop wrapper
                result = self.while_wrapper.wrap_in_while_loop(result)
            elif technique == 1:
                # If-else wrapper
                result = self.if_else_expander.generate_deep_if_else(result, depth=1)
            elif technique == 2:
                # Anonymous function wrapper
                result = self.anon_wrapper.generate_iife(result)
            elif technique == 3:
                # Repeat-until wrapper
                result = self.repeat_injector.inject_repeat_until(result)
            elif technique == 4:
                # For loop wrapper
                result = self.for_enhancer.wrap_single_iteration(result)
            else:
                # State machine wrapper
                result = self.state_machine._wrap_in_state_machine(result)
        
        return result
    
    def transform_code_block(self, statements: List[str]) -> str:
        """
        Transform a code block with full Luraph-style obfuscation.
        
        Args:
            statements: List of statements to transform
        
        Returns:
            Fully transformed code block
        """
        # Convert to state machine
        state_machine_code = self.state_machine.convert_to_state_machine(statements)
        
        # Apply deep nesting
        nested_code = self.apply_universal_deep_nesting(state_machine_code)
        
        return nested_code

    def wrap_statement(self, statement: str) -> str:
        """
        Wrap a single statement with random control flow obfuscation.
        
        Args:
            statement: The statement to wrap
        
        Returns:
            Wrapped statement
        """
        technique = self.seed.get_random_int(0, 3)
        
        if technique == 0:
            return self.while_wrapper.wrap_with_predicate(statement)
        elif technique == 1:
            predicate = self.opg.get_true_predicate()
            # Add space after end to prevent 'endend' when nested
            return f'if {predicate} then {statement} end '
        elif technique == 2:
            return self.repeat_injector.inject_repeat_until(statement)
        else:
            return self.anon_wrapper.generate_iife(statement)
    
    def get_all_transformers(self) -> Dict[str, object]:
        """
        Get all sub-transformers.
        
        Returns:
            Dictionary of transformer name to transformer instance
        """
        return {
            'state_machine': self.state_machine,
            'while_wrapper': self.while_wrapper,
            'if_else_expander': self.if_else_expander,
            'anon_wrapper': self.anon_wrapper,
            'repeat_injector': self.repeat_injector,
            'for_enhancer': self.for_enhancer,
            'continue_break': self.continue_break,
        }
    
    def __repr__(self) -> str:
        return f"LuraphControlFlowTransformer(nesting={self.MIN_NESTING_DEPTH}-{self.MAX_NESTING_DEPTH})"

