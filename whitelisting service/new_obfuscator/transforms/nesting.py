"""
Luraph-Style Nesting System v2

This module provides Luraph v14.4.1 style nesting with:
- Short table-based function names (O.LL, O.VL, O.F4)
- 3-4 layers of nesting with no adjacent repeats
- Optional arithmetic mixing like (nested)-e[0Xc0D]

Target output style:
    (-0X23a8cE1D+(O.LL((O.VL((O.F4(O.I[0x5_]))-e[0Xc0D])))))

Requirements: luraph-nesting-v2 spec
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set
import re

try:
    from ..core.seed import PolymorphicBuildSeed
except ImportError:
    from core.seed import PolymorphicBuildSeed


@dataclass
class NestingConfig:
    """Configuration for Luraph-style nesting."""
    min_depth: int = 3              # Minimum nesting layers
    max_depth: int = 4              # Maximum nesting layers  
    num_functions: int = 6          # Number of identity functions
    arithmetic_probability: float = 0.3  # Chance to add arithmetic
    nest_threshold: int = 2         # Only nest numbers >= this value
    # Backward compatibility fields (ignored but accepted)
    identity_function_count: int = 6  # Alias for num_functions
    nest_numbers: bool = True
    nest_table_indices: bool = True
    nest_function_args: bool = True
    nest_arithmetic: bool = True
    escape_wrap_probability: float = 0.95


@dataclass
class GeneratedTable:
    """Represents the generated nesting table."""
    name: str                       # Table name (1-2 chars)
    func_keys: List[str]            # Function keys (2-3 chars each)
    func_impls: Dict[str, str]      # Key -> implementation
    index_array_key: str            # Key for index array (e.g., 'I')
    index_values: List[int]         # Values in index array
    
    def to_lua(self) -> str:
        """Generate Lua definition code as single dense statement."""
        parts = []
        
        # Add identity functions
        for key in self.func_keys:
            impl = self.func_impls.get(key, "function(x)return x end")
            parts.append(f"{key}={impl}")
        
        # Add index array
        idx_vals = ",".join(str(v) for v in self.index_values)
        parts.append(f"{self.index_array_key}={{{idx_vals}}}")
        
        return f"local {self.name}={{{','.join(parts)}}}"


class NestingTableGenerator:
    """Generates the nesting table definition."""
    
    # Allowed characters for table name (1-2 chars)
    TABLE_NAME_CHARS = 'OoIlL_'
    TABLE_NAME_FIRST = 'OoIlL_'
    
    # Allowed characters for function keys (2-3 chars)
    FUNC_KEY_CHARS = 'lILVF0123456789_'
    FUNC_KEY_FIRST = 'lILVF_'
    
    def __init__(self, seed: PolymorphicBuildSeed, config: NestingConfig = None):
        self.seed = seed
        self.config = config or NestingConfig()
        self._generated_keys: Set[str] = set()
    
    def generate_table_name(self) -> str:
        """Generate 1-2 char table name like 'O', 'l_', 'IL'."""
        length = self.seed.get_random_int(1, 2)
        name = self.seed.choice(list(self.TABLE_NAME_FIRST))
        if length == 2:
            name += self.seed.choice(list(self.TABLE_NAME_CHARS))
        return name
    
    def generate_func_key(self) -> str:
        """Generate a unique 2-3 char function key."""
        for _ in range(100):  # Prevent infinite loop
            length = self.seed.get_random_int(2, 3)
            key = self.seed.choice(list(self.FUNC_KEY_FIRST))
            for _ in range(length - 1):
                key += self.seed.choice(list(self.FUNC_KEY_CHARS))
            
            if key not in self._generated_keys:
                self._generated_keys.add(key)
                return key
        
        # Fallback: use counter
        fallback = f"F{len(self._generated_keys)}"
        self._generated_keys.add(fallback)
        return fallback
    
    def generate_func_keys(self, count: int = None) -> List[str]:
        """Generate multiple unique function keys."""
        count = count or self.config.num_functions
        return [self.generate_func_key() for _ in range(count)]
    
    def generate_identity_functions(self, keys: List[str]) -> Dict[str, str]:
        """Generate identity function implementations.
        
        4 patterns that all return input unchanged:
        - return x
        - x + 0
        - x * 1  
        - bit32.bxor(x, 0)
        """
        patterns = [
            "function(x)return x end",
            "function(x)return x+0 end",
            "function(x)return x*1 end",
            "function(x)return bit32.bxor(x,0)end",
        ]
        
        impls = {}
        for i, key in enumerate(keys):
            pattern_idx = i % len(patterns)
            impls[key] = patterns[pattern_idx]
        
        return impls
    
    def generate_index_array_key(self) -> str:
        """Generate short key for index array."""
        candidates = ['I', 'l', 'L', '_I', 'Il']
        for key in candidates:
            if key not in self._generated_keys:
                self._generated_keys.add(key)
                return key
        return 'IX'
    
    def generate_index_values(self) -> List[int]:
        """Generate useful constant values for index array."""
        # Basic values 0-15 plus some hex constants
        values = list(range(16))
        values.extend([0xFF, 0x100, 0x1000, 0xFFFF])
        return values
    
    def generate_table(self) -> GeneratedTable:
        """Generate complete nesting table."""
        name = self.generate_table_name()
        keys = self.generate_func_keys()
        impls = self.generate_identity_functions(keys)
        idx_key = self.generate_index_array_key()
        idx_vals = self.generate_index_values()
        
        return GeneratedTable(
            name=name,
            func_keys=keys,
            func_impls=impls,
            index_array_key=idx_key,
            index_values=idx_vals
        )


class PatternSelector:
    """Selects nesting patterns ensuring variety."""
    
    def __init__(self, func_keys: List[str], seed: PolymorphicBuildSeed):
        self.func_keys = func_keys
        self.seed = seed
    
    def select_layers(self, depth: int = None) -> List[str]:
        """Select function keys for each layer.
        
        Ensures no adjacent layers use the same key.
        """
        if depth is None:
            depth = self.seed.get_random_int(3, 4)
        
        if len(self.func_keys) < 2:
            return self.func_keys * depth
        
        layers = []
        last_key = None
        
        for _ in range(depth):
            # Filter out last used key
            available = [k for k in self.func_keys if k != last_key]
            if not available:
                available = self.func_keys
            
            key = self.seed.choice(available)
            layers.append(key)
            last_key = key
        
        return layers


class ArithmeticMixer:
    """Adds arithmetic operations to nested expressions."""
    
    def __init__(self, seed: PolymorphicBuildSeed, table_name: str, index_key: str):
        self.seed = seed
        self.table_name = table_name
        self.index_key = index_key
    
    def generate_hex_literal(self) -> str:
        """Generate a hex literal with mixed case."""
        value = self.seed.get_random_int(0x10, 0xFFFFFF)
        hex_str = format(value, 'x')
        
        # Mix case randomly
        mixed = ''.join(
            c.upper() if self.seed.random_bool(0.5) else c
            for c in hex_str
        )
        
        prefix = self.seed.choice(['0x', '0X'])
        return f"{prefix}{mixed}"
    
    def generate_table_index(self) -> str:
        """Generate table index reference like O.I[0x5]."""
        # Use the nesting table's index array
        idx = self.seed.get_random_int(1, 15)  # Index into the I array (1-based in Lua)
        return f"{self.table_name}.{self.index_key}[{idx}]"
    
    def generate_operand(self) -> str:
        """Generate arithmetic operand (hex literal or table index)."""
        if self.seed.random_bool(0.5):
            return self.generate_hex_literal()
        else:
            return self.generate_table_index()
    
    def add_arithmetic(self, nested_expr: str, probability: float = 0.3) -> str:
        """Optionally add arithmetic around nested expression."""
        if not self.seed.random_bool(probability):
            return nested_expr
        
        operand = self.generate_operand()
        pattern = self.seed.get_random_int(0, 2)
        
        if pattern == 0:
            # (nested)-operand
            return f"(({nested_expr})-{operand})"
        elif pattern == 1:
            # (-operand+(nested))
            return f"(-{operand}+({nested_expr}))"
        else:
            # (nested)+operand
            return f"(({nested_expr})+{operand})"


class LuraphNestingSystem:
    """Main nesting system matching Luraph v14.4.1 style."""
    
    def __init__(self, seed: PolymorphicBuildSeed, config: NestingConfig = None):
        """Initialize with seed for deterministic generation."""
        self.seed = seed
        self.config = config or NestingConfig()
        
        # Generate table structure
        self.table_gen = NestingTableGenerator(seed, self.config)
        self.table = self.table_gen.generate_table()
        
        # Initialize pattern selector
        self.pattern_selector = PatternSelector(self.table.func_keys, seed)
        
        # Initialize arithmetic mixer
        self.arith_mixer = ArithmeticMixer(
            seed, 
            self.table.name, 
            self.table.index_array_key
        )
    
    def get_table_definition(self) -> str:
        """Get the Lua code defining the nesting table."""
        return self.table.to_lua()
    
    def nest_expression(self, expr: str, depth: int = None) -> str:
        """Wrap expression in 3-4 layers of nesting.
        
        Returns something like:
        O.LL((O.VL((O.F4(expr)))))
        """
        layers = self.pattern_selector.select_layers(depth)
        
        result = expr
        for key in reversed(layers):
            result = f"{self.table.name}.{key}(({result}))"
        
        return result
    
    def nest_with_arithmetic(self, expr: str) -> str:
        """Wrap expression with nesting AND arithmetic."""
        nested = self.nest_expression(expr)
        return self.arith_mixer.add_arithmetic(
            nested, 
            self.config.arithmetic_probability
        )
    
    def apply_to_code(self, code: str) -> str:
        """Apply nesting to all safe numeric literals in code.
        
        Skips:
        - String literals
        - Numbers < nest_threshold (0, 1)
        - Numbers that are part of identifiers
        """
        result = []
        i = 0
        
        while i < len(code):
            char = code[i]
            
            # Skip string literals (single or double quoted)
            if char == '"' or char == "'":
                quote = char
                start = i
                i += 1
                while i < len(code):
                    if code[i] == '\\' and i + 1 < len(code):
                        i += 2  # Skip escape sequence
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


# Convenience exports for backward compatibility
NestingTransformer = LuraphNestingSystem
EscapeSequenceWrapper = None  # Removed - use string obfuscation instead
NumberFormatter = None  # Removed - integrated into nesting system


# Add backward compatibility methods to LuraphNestingSystem
def _get_identity_function_definitions(self) -> str:
    """Backward compatibility: Get identity function definitions as Lua code."""
    return self.get_table_definition()

def _apply_heavy_nesting_to_code(self, code: str) -> str:
    """Backward compatibility: Apply nesting to code."""
    return self.apply_to_code(code)

# Monkey-patch for backward compatibility
LuraphNestingSystem.get_identity_function_definitions = _get_identity_function_definitions
LuraphNestingSystem.apply_heavy_nesting_to_code = _apply_heavy_nesting_to_code
