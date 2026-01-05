"""
Source Code Pre-Processing for enhanced obfuscation.

This module modifies Lua source code BEFORE it gets compiled to bytecode.
This adds an extra layer of protection that survives bytecode analysis.

Features:
1. Dead Code Injection - Add fake functions/variables that never execute
2. String Splitting - Break strings into concatenations
3. Control Flow Injection - Add fake branches with opaque predicates
4. Variable Mutation - Add fake assignments that get overwritten
"""

import random
import re
from typing import List, Tuple, Optional
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from core import PolymorphicBuildSeed, UnifiedNamingSystem


class DeadCodeInjector:
    """
    Injects dead code into Lua source that never executes.
    
    This confuses decompilers and static analysis tools because
    they see code paths that are never actually taken.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        self.naming = UnifiedNamingSystem(self.seed)
    
    def _gen_name(self, length: int = 15) -> str:
        """Generate obfuscated variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def generate_dead_function(self) -> str:
        """Generate a fake function that's never called."""
        func_name = self._gen_name()
        param1 = self._gen_name(8)
        param2 = self._gen_name(8)
        local_var = self._gen_name(10)
        
        # Generate random operations
        ops = [
            f'local {local_var} = {param1} + {param2}',
            f'local {local_var} = bit32.bxor({param1}, {param2})',
            f'local {local_var} = #{param1} * {param2}',
            f'local {local_var} = {param1} .. tostring({param2})',
        ]
        
        body = self.rng.choice(ops)
        return f'local function {func_name}({param1}, {param2}) {body} return {local_var} end'
    
    def generate_dead_variable(self) -> str:
        """Generate a fake variable assignment."""
        var_name = self._gen_name()
        value = self.rng.randint(1000, 99999)
        return f'local {var_name} = {value}'
    
    def generate_dead_table(self) -> str:
        """Generate a fake table with random data."""
        table_name = self._gen_name()
        entries = []
        for _ in range(self.rng.randint(3, 7)):
            key = self._gen_name(8)
            value = self.rng.randint(0, 0xFFFF)
            entries.append(f'{key}=0x{value:X}')
        return f'local {table_name} = {{{",".join(entries)}}}'
    
    def generate_opaque_predicate_false(self) -> str:
        """Generate an expression that's always false but looks complex.
        Uses only numeric predicates to avoid readable strings."""
        a = self.rng.randint(100, 999)
        b = self.rng.randint(100, 999)
        
        predicates = [
            f'(bit32.band({a},{b}) > bit32.bor({a},{b}))',  # Always false
            f'({a} * 0 ~= 0)',  # Always false
            f'(#{{{a},{b}}} > 10)',  # Always false (table has 2 elements)
            f'(math.floor({a}) ~= {a})',  # Always false (integers)
            f'({a} * {a} < 0)',  # Always false (square is non-negative)
            f'({a} + {b} < 0)',  # Always false (positive numbers)
        ]
        return self.rng.choice(predicates)
    
    def generate_dead_branch(self) -> str:
        """Generate a dead if-branch that never executes."""
        predicate = self.generate_opaque_predicate_false()
        dead_var = self._gen_name()
        dead_value = self.rng.randint(1, 1000)
        
        return f'if {predicate} then local {dead_var} = {dead_value} end'
    
    def inject_dead_code(self, source: str, num_injections: int = 5) -> str:
        """
        Inject dead code into Lua source.
        
        Args:
            source: Original Lua source code
            num_injections: Number of dead code blocks to inject
            
        Returns:
            Source with dead code injected
        """
        # Find safe injection points (after 'local' declarations, before 'return')
        lines = source.split('\n')
        
        # Generate dead code blocks
        dead_blocks = []
        for _ in range(num_injections):
            block_type = self.rng.randint(0, 4)
            if block_type == 0:
                dead_blocks.append(self.generate_dead_function())
            elif block_type == 1:
                dead_blocks.append(self.generate_dead_variable())
            elif block_type == 2:
                dead_blocks.append(self.generate_dead_table())
            else:
                dead_blocks.append(self.generate_dead_branch())
        
        # Insert at the beginning (after any initial comments)
        insert_idx = 0
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped and not stripped.startswith('--'):
                insert_idx = i
                break
        
        # Insert dead code
        dead_code_str = '\n'.join(dead_blocks)
        lines.insert(insert_idx, dead_code_str)
        
        return '\n'.join(lines)


class StringSplitter:
    """
    Splits string literals into concatenations.
    
    Example: "Hello" becomes "He".."ll".."o"
    
    This makes strings harder to find with simple grep/search.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
    
    def split_string(self, s: str, min_parts: int = 2, max_parts: int = 5) -> str:
        """
        Split a string into concatenated parts.
        
        Args:
            s: The string to split
            min_parts: Minimum number of parts
            max_parts: Maximum number of parts
            
        Returns:
            Lua expression with concatenated string parts
        """
        if len(s) < 2:
            return f'"{s}"'
        
        num_parts = min(self.rng.randint(min_parts, max_parts), len(s))
        
        # Calculate split points
        part_size = len(s) // num_parts
        parts = []
        start = 0
        
        for i in range(num_parts - 1):
            # Add some randomness to split points
            end = start + part_size + self.rng.randint(-1, 1)
            end = max(start + 1, min(end, len(s) - 1))
            parts.append(s[start:end])
            start = end
        
        # Last part gets the rest
        parts.append(s[start:])
        
        # Convert to Lua concatenation
        escaped_parts = []
        for part in parts:
            # Escape special characters
            escaped = part.replace('\\', '\\\\').replace('"', '\\"')
            escaped_parts.append(f'"{escaped}"')
        
        return '..'.join(escaped_parts)
    
    def transform_strings_in_source(self, source: str, min_length: int = 5) -> str:
        """
        Transform string literals in source code.
        
        Args:
            source: Lua source code
            min_length: Minimum string length to split
            
        Returns:
            Source with split strings
        """
        def replace_string(match):
            s = match.group(1)
            if len(s) >= min_length:
                return self.split_string(s)
            return match.group(0)
        
        # Match double-quoted strings (simple pattern, doesn't handle all escapes)
        pattern = r'"([^"\\]*(?:\\.[^"\\]*)*)"'
        return re.sub(pattern, replace_string, source)


class ControlFlowInjector:
    """
    Injects fake control flow into source code.
    
    Adds if-else branches with opaque predicates that always
    take the same path, confusing static analysis.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
    
    def _gen_name(self, length: int = 12) -> str:
        """Generate obfuscated variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def generate_opaque_true(self) -> str:
        """Generate an expression that's always true.
        Uses only numeric predicates to avoid readable strings."""
        a = self.rng.randint(100, 999)
        b = self.rng.randint(100, 999)
        
        predicates = [
            f'(bit32.band({a},{b}) <= bit32.bor({a},{b}))',  # Always true
            f'({a} * 0 == 0)',  # Always true
            f'(#{{{a},{b}}} <= 10)',  # Always true
            f'(math.floor({a}) == {a})',  # Always true
            f'({a} + {b} == {a + b})',  # Always true
            f'({a} * {a} >= 0)',  # Always true (square is non-negative)
            f'(({a} + {b}) > 0)',  # Always true (positive numbers)
        ]
        return self.rng.choice(predicates)
    
    def wrap_statement_with_opaque(self, statement: str) -> str:
        """
        Wrap a statement with an opaque predicate.
        
        The statement always executes, but it looks conditional.
        """
        predicate = self.generate_opaque_true()
        dead_var = self._gen_name()
        dead_value = self.rng.randint(1, 1000)
        
        return f'''if {predicate} then
{statement}
else
local {dead_var} = {dead_value}
end'''


class VariableMutator:
    """
    Adds fake variable mutations that get overwritten.
    
    Example:
    local x = 5
    becomes:
    local x = 999  -- fake value
    x = 5          -- real value
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
    
    def add_fake_assignment(self, var_name: str, real_value: str) -> str:
        """
        Generate a fake assignment followed by the real one.
        """
        fake_value = self.rng.randint(10000, 99999)
        return f'local {var_name} = {fake_value}\n{var_name} = {real_value}'


class SourcePreprocessor:
    """
    Main class that combines all source preprocessing transforms.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.dead_code = DeadCodeInjector(self.seed)
        self.string_splitter = StringSplitter(self.seed)
        self.control_flow = ControlFlowInjector(self.seed)
        self.variable_mutator = VariableMutator(self.seed)
    
    def preprocess(self, source: str, 
                   inject_dead_code: bool = True,
                   split_strings: bool = True,
                   num_dead_blocks: int = 3) -> str:
        """
        Apply all preprocessing transforms to source code.
        
        Args:
            source: Original Lua source code
            inject_dead_code: Whether to inject dead code
            split_strings: Whether to split string literals
            num_dead_blocks: Number of dead code blocks to inject
            
        Returns:
            Preprocessed source code
        """
        result = source
        
        if inject_dead_code:
            result = self.dead_code.inject_dead_code(result, num_dead_blocks)
        
        if split_strings:
            result = self.string_splitter.transform_strings_in_source(result)
        
        return result
