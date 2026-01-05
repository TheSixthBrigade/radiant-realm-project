"""
Ultra-Deep Nesting System

This module provides EXTREME nesting that EXCEEDS Luraph v14.4.1:
- 3-5 identity function tables (O, sC, sp, sK, sO)
- 5-8 layers of nesting with no adjacent repeats
- Computed arithmetic between layers like (-0X23a8cE1D+(nested))-e[0Xc0D]
- Mixed hex formats with underscores (0x5_, 0X23a8cE1D)

Target output style:
    (-0X23a8cE1D+(O.LL((sC.sp((O.VL((sK.sr((O.F4(42))-O.I[3])))-e[0Xc0D])))))

Requirements: ultra-obfuscation spec 1.x, 5.x
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple
import re
import random

try:
    from ..core.seed import PolymorphicBuildSeed
except ImportError:
    from core.seed import PolymorphicBuildSeed


@dataclass
class UltraNestingConfig:
    """Configuration for ultra-deep nesting."""
    min_depth: int = 5              # Minimum nesting layers (5-8)
    max_depth: int = 8              # Maximum nesting layers
    num_tables: int = 4             # Number of identity tables (3-5)
    funcs_per_table: int = 5        # Functions per table (4-6)
    arithmetic_probability: float = 0.6  # Higher chance for arithmetic
    nest_threshold: int = 2         # Only nest numbers >= this value
    use_table_indices: bool = True  # Use O.I[x] style indices


@dataclass
class IdentityTable:
    """Represents a single identity function table."""
    name: str                       # Table name (O, sC, sp, etc.)
    func_keys: List[str]            # Function keys (LL, VL, F4, etc.)
    func_impls: Dict[str, str]      # Key -> implementation
    index_array_key: str            # Key for index array (I, l, etc.)
    index_values: List[int]         # Values in index array [0,1,2,3,...]
    
    def to_lua(self) -> str:
        """Generate Lua definition code."""
        parts = []
        
        # Add identity functions
        for key in self.func_keys:
            impl = self.func_impls.get(key, "function(x)return x end")
            parts.append(f"{key}={impl}")
        
        # Add index array with values that include 0 for identity operations
        idx_vals = ",".join(str(v) for v in self.index_values)
        parts.append(f"{self.index_array_key}={{{idx_vals}}}")
        
        return f"local {self.name}={{{','.join(parts)}}}"


class MultiTableGenerator:
    """Generates multiple identity function tables."""
    
    # Luraph-style table names - AVOID 'O' as it conflicts with constant protection
    TABLE_NAMES = ['sC', 'sp', 'sK', 'sO', 'sr', 'sl', 'a0', 'sE', 'sW', 'sX']
    
    # Function key patterns (2-3 chars)
    FUNC_KEYS = ['LL', 'VL', 'F4', 'IL', 'AL', 'pL', 'hL', 'JL', 'm4', 'g4', 
                 'N', 'Y', 'U', 'B', 'D', 'z', 'W', 'R', 'P', 'S']
    
    # Index array key options
    INDEX_KEYS = ['I', 'l', 'L', '_I', 'Il', 'i', '_']
    
    def __init__(self, seed: PolymorphicBuildSeed, config: UltraNestingConfig = None):
        self.seed = seed
        self.config = config or UltraNestingConfig()
        self._used_names: Set[str] = set()
        self._used_func_keys: Set[str] = set()
    
    def _get_unique_name(self, candidates: List[str]) -> str:
        """Get a unique name from candidates."""
        available = [n for n in candidates if n not in self._used_names]
        if not available:
            # Generate fallback
            for i in range(100):
                fallback = f"t{i}"
                if fallback not in self._used_names:
                    self._used_names.add(fallback)
                    return fallback
        name = self.seed.choice(available)
        self._used_names.add(name)
        return name
    
    def _get_unique_func_keys(self, count: int) -> List[str]:
        """Get unique function keys."""
        keys = []
        available = [k for k in self.FUNC_KEYS if k not in self._used_func_keys]
        
        for _ in range(count):
            if available:
                key = self.seed.choice(available)
                available.remove(key)
            else:
                # Generate fallback
                key = f"f{len(self._used_func_keys)}"
            self._used_func_keys.add(key)
            keys.append(key)
        
        return keys
    
    def _generate_identity_impl(self, variant: int) -> str:
        """Generate identity function implementation."""
        patterns = [
            "function(x)return x end",
            "function(x)return x+0 end",
            "function(x)return x*1 end",
            "function(x)return x-0 end",
            "function(x)return bit32.bxor(x,0)end",
            "function(x)return bit32.bor(x,0)end",
            "function(x)return bit32.band(x,0xFFFFFFFF)end",
            "function(x)return bit32.lshift(x,0)end",
        ]
        return patterns[variant % len(patterns)]
    
    def generate_table(self) -> IdentityTable:
        """Generate a single identity table."""
        name = self._get_unique_name(self.TABLE_NAMES)
        func_keys = self._get_unique_func_keys(self.config.funcs_per_table)
        
        # Generate implementations
        func_impls = {}
        for i, key in enumerate(func_keys):
            func_impls[key] = self._generate_identity_impl(i)
        
        # Get index array key
        idx_key = self._get_unique_name(self.INDEX_KEYS)
        
        # Generate index values (include 0 for identity, plus useful constants)
        index_values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
        
        return IdentityTable(
            name=name,
            func_keys=func_keys,
            func_impls=func_impls,
            index_array_key=idx_key,
            index_values=index_values
        )
    
    def generate_tables(self, count: int = None) -> List[IdentityTable]:
        """Generate multiple identity tables."""
        count = count or self.config.num_tables
        return [self.generate_table() for _ in range(count)]


class UltraArithmeticMixer:
    """Adds complex computed arithmetic to nested expressions."""
    
    def __init__(self, seed: PolymorphicBuildSeed, tables: List[IdentityTable]):
        self.seed = seed
        self.tables = tables
    
    def _format_hex(self, value: int) -> str:
        """Format number as hex with random case and underscores."""
        hex_str = format(abs(value), 'x')
        
        # Mix case randomly
        mixed = ''.join(
            c.upper() if self.seed.random_bool(0.5) else c
            for c in hex_str
        )
        
        # Maybe add underscores
        if len(mixed) > 2 and self.seed.random_bool(0.3):
            pos = self.seed.get_random_int(1, len(mixed) - 1)
            mixed = mixed[:pos] + '_' + mixed[pos:]
        
        prefix = self.seed.choice(['0x', '0X'])
        result = f"{prefix}{mixed}"
        
        if value < 0:
            result = f"-{result}"
        
        return result
    
    def _get_table_index_ref(self) -> str:
        """Generate table index reference like O.I[3]."""
        table = self.seed.choice(self.tables)
        # Use index 1-based (Lua arrays are 1-indexed)
        # Index 1 contains 0, which is identity for addition/subtraction
        idx = self.seed.get_random_int(1, 6)  # 1-6 (values 0-5)
        return f"{table.name}.{table.index_array_key}[{idx}]"
    
    def _generate_operand(self) -> str:
        """Generate arithmetic operand."""
        choice = self.seed.get_random_int(0, 2)
        if choice == 0:
            # Large hex literal
            value = self.seed.get_random_int(0x1000, 0x3FFFFFFF)
            return self._format_hex(value)
        elif choice == 1:
            # Table index reference
            return self._get_table_index_ref()
        else:
            # Computed expression
            a = self.seed.get_random_int(100, 9999)
            b = self.seed.get_random_int(1, 99)
            op = self.seed.choice(['+', '-', '*', '%'])
            return f"(({a}){op}({b}))"
    
    def add_arithmetic(self, nested_expr: str, probability: float = 0.6) -> str:
        """Add computed arithmetic around nested expression.
        
        CRITICAL: All patterns MUST be identity-preserving!
        The result must equal the original nested_expr value.
        """
        if not self.seed.random_bool(probability):
            return nested_expr
        
        pattern = self.seed.get_random_int(0, 5)
        
        if pattern == 0:
            # (operand+(nested)-operand) = nested
            operand = self._generate_operand()
            return f"({operand}+({nested_expr})-{operand})"
        elif pattern == 1:
            # ((nested)+0) = nested - use table index that contains 0
            table = self.seed.choice(self.tables)
            # Index 1 contains value 0
            zero_ref = f"{table.name}.{table.index_array_key}[1]"
            return f"(({nested_expr})+{zero_ref})"
        elif pattern == 2:
            # ((nested)-0) = nested - use table index that contains 0
            table = self.seed.choice(self.tables)
            zero_ref = f"{table.name}.{table.index_array_key}[1]"
            return f"(({nested_expr})-{zero_ref})"
        elif pattern == 3:
            # (0+(nested)) = nested
            table = self.seed.choice(self.tables)
            zero_ref = f"{table.name}.{table.index_array_key}[1]"
            return f"({zero_ref}+({nested_expr}))"
        elif pattern == 4:
            # Double add/sub: (operand+(nested)-operand) with hex operand
            value = self.seed.get_random_int(0x1000, 0xFFFFFF)
            hex_op = self._format_hex(value)
            return f"({hex_op}+({nested_expr})-{hex_op})"
        else:
            # Triple operation: (a+(b+(nested)-b)-a) = nested
            a = self._format_hex(self.seed.get_random_int(0x100, 0xFFFF))
            b = self._format_hex(self.seed.get_random_int(0x100, 0xFFFF))
            return f"({a}+({b}+({nested_expr})-{b})-{a})"


class MultiTableNestingSystem:
    """
    Ultra-deep nesting system with multiple identity tables.
    
    Generates output like:
    (-0X23a8cE1D+(O.LL((sC.sp((O.VL((sK.sr((O.F4(42))-O.I[3])))-e[0Xc0D])))))
    """
    
    def __init__(self, seed: PolymorphicBuildSeed, config: UltraNestingConfig = None):
        self.seed = seed
        self.config = config or UltraNestingConfig()
        
        # Generate multiple tables
        self.table_gen = MultiTableGenerator(seed, self.config)
        self.tables = self.table_gen.generate_tables()
        
        # Initialize arithmetic mixer
        self.arith_mixer = UltraArithmeticMixer(seed, self.tables)
        
        # Track last used table/function to avoid repeats
        self._last_table: Optional[str] = None
        self._last_func: Optional[str] = None
    
    def get_table_definitions(self) -> str:
        """Get Lua code defining all identity tables."""
        return ';'.join(table.to_lua() for table in self.tables)
    
    def _select_table_and_func(self) -> Tuple[IdentityTable, str]:
        """Select table and function, avoiding adjacent repeats."""
        # Filter out last used table if possible
        available_tables = [t for t in self.tables if t.name != self._last_table]
        if not available_tables:
            available_tables = self.tables
        
        table = self.seed.choice(available_tables)
        
        # Filter out last used function if possible
        available_funcs = [f for f in table.func_keys if f != self._last_func]
        if not available_funcs:
            available_funcs = table.func_keys
        
        func = self.seed.choice(available_funcs)
        
        self._last_table = table.name
        self._last_func = func
        
        return table, func
    
    def nest_expression(self, expr: str, depth: int = None) -> str:
        """
        Wrap expression in 5-8 layers of nesting.
        
        Returns something like:
        O.LL((sC.sp((O.VL((sK.sr((O.F4(expr)))))))))
        """
        if depth is None:
            depth = self.seed.get_random_int(self.config.min_depth, self.config.max_depth)
        
        result = expr
        
        for i in range(depth):
            table, func = self._select_table_and_func()
            
            # Maybe add arithmetic at some layers
            if i > 0 and self.seed.random_bool(0.3):
                # Add identity-preserving arithmetic: +0 or -0
                # Index 1 contains value 0, so this is identity
                result = f"(({result})-{table.name}.{table.index_array_key}[1])"
            
            result = f"{table.name}.{func}(({result}))"
        
        return result
    
    def nest_with_arithmetic(self, expr: str, depth: int = None) -> str:
        """Wrap expression with nesting AND outer arithmetic."""
        nested = self.nest_expression(expr, depth)
        return self.arith_mixer.add_arithmetic(nested, self.config.arithmetic_probability)
    
    def apply_to_code(self, code: str) -> str:
        """Apply ultra-deep nesting to all safe numeric literals in code."""
        result = []
        i = 0
        
        while i < len(code):
            char = code[i]
            
            # Skip string literals
            if char == '"' or char == "'":
                quote = char
                start = i
                i += 1
                while i < len(code):
                    if code[i] == '\\' and i + 1 < len(code):
                        i += 2
                    elif code[i] == quote:
                        i += 1
                        break
                    else:
                        i += 1
                result.append(code[start:i])
                continue
            
            # Skip long strings [[...]]
            if char == '[' and i + 1 < len(code) and code[i+1] == '[':
                start = i
                end = code.find(']]', i + 2)
                if end != -1:
                    result.append(code[start:end+2])
                    i = end + 2
                else:
                    result.append(code[i])
                    i += 1
                continue
            
            # Skip comments
            if char == '-' and i + 1 < len(code) and code[i+1] == '-':
                start = i
                if i + 3 < len(code) and code[i+2:i+4] == '[[':
                    end = code.find(']]', i + 4)
                    if end != -1:
                        result.append(code[start:end+2])
                        i = end + 2
                    else:
                        result.append(code[start:])
                        break
                else:
                    end = code.find('\n', i)
                    if end != -1:
                        result.append(code[start:end])
                        i = end
                    else:
                        result.append(code[start:])
                        break
                continue
            
            # Check for numeric literal
            if char.isdigit() or (char == '.' and i + 1 < len(code) and code[i+1].isdigit()):
                # Check if part of identifier
                if i > 0 and (code[i-1].isalnum() or code[i-1] == '_'):
                    result.append(char)
                    i += 1
                    continue
                
                # Parse the full number
                num_str = self._parse_number(code, i)
                if num_str:
                    i += len(num_str)
                    
                    # Check if followed by identifier char
                    if i < len(code) and (code[i].isalpha() or code[i] == '_'):
                        result.append(num_str)
                        continue
                    
                    # Check if safe to nest
                    num_val = self._parse_number_value(num_str)
                    if num_val is not None and num_val >= self.config.nest_threshold:
                        nested = self.nest_with_arithmetic(num_str)
                        result.append(nested)
                    else:
                        result.append(num_str)
                else:
                    result.append(char)
                    i += 1
                continue
            
            result.append(char)
            i += 1
        
        return ''.join(result)
    
    def _parse_number(self, code: str, start: int) -> Optional[str]:
        """Parse a numeric literal starting at position start."""
        i = start
        
        # Check for hex (0x/0X) or binary (0b/0B)
        if i + 1 < len(code) and code[i] == '0':
            if code[i+1] in 'xX':
                i += 2
                while i < len(code) and code[i] in '0123456789abcdefABCDEF_':
                    i += 1
                return code[start:i] if i > start + 2 else None
            elif code[i+1] in 'bB':
                i += 2
                while i < len(code) and code[i] in '01_':
                    i += 1
                return code[start:i] if i > start + 2 else None
        
        # Decimal number
        while i < len(code) and (code[i].isdigit() or code[i] == '_'):
            i += 1
        
        # Decimal point
        if i < len(code) and code[i] == '.':
            if i + 1 < len(code) and code[i+1].isdigit():
                i += 1
                while i < len(code) and (code[i].isdigit() or code[i] == '_'):
                    i += 1
        
        # Exponent
        if i < len(code) and code[i] in 'eE':
            if i + 1 < len(code) and (code[i+1].isdigit() or code[i+1] in '+-'):
                i += 1
                if code[i] in '+-':
                    i += 1
                while i < len(code) and code[i].isdigit():
                    i += 1
        
        return code[start:i] if i > start else None
    
    def _parse_number_value(self, num_str: str) -> Optional[int]:
        """Parse a number string to get its integer value."""
        clean = num_str.replace('_', '')
        
        try:
            if clean.startswith(('0x', '0X')):
                return int(clean, 16)
            elif clean.startswith(('0b', '0B')):
                return int(clean, 2)
            elif '.' in clean or 'e' in clean.lower():
                return int(float(clean))
            else:
                return int(clean)
        except:
            return None


# Convenience function for easy integration
def create_ultra_nesting_system(seed: PolymorphicBuildSeed, 
                                 min_depth: int = 5, 
                                 max_depth: int = 8,
                                 num_tables: int = 4) -> MultiTableNestingSystem:
    """Create an ultra-deep nesting system with custom settings."""
    config = UltraNestingConfig(
        min_depth=min_depth,
        max_depth=max_depth,
        num_tables=num_tables
    )
    return MultiTableNestingSystem(seed, config)
