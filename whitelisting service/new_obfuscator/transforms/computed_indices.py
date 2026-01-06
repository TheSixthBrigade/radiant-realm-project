"""
Computed Index Generator

This module provides computed arithmetic expressions for table indices
to make the code harder to analyze statically.

Target output style:
    a5[((2352+162-258))]  -- instead of a5[2256]
    t[((0x100*2+0x56))]   -- instead of t[598]

Requirements: ultra-obfuscation spec 4.x
"""

from dataclasses import dataclass
from typing import List, Dict, Optional, Set
import random

try:
    from ..core.seed import PolymorphicBuildSeed
except ImportError:
    from core.seed import PolymorphicBuildSeed


@dataclass
class ComputedIndexConfig:
    """Configuration for computed index generation."""
    min_terms: int = 2              # Minimum terms in expression
    max_terms: int = 4              # Maximum terms in expression
    use_hex: bool = True            # Use hex numbers
    use_parentheses: bool = True    # Add extra parentheses
    probability: float = 0.7        # Probability of computing an index


class ComputedIndexGenerator:
    """
    Generates computed arithmetic expressions for integer values.
    
    Instead of:
        table[256]
    
    Generates:
        table[((128+128))]
        table[((0x100*1+0))]
        table[((512-256))]
    """
    
    def __init__(self, seed: PolymorphicBuildSeed, config: ComputedIndexConfig = None):
        self.seed = seed
        self.config = config or ComputedIndexConfig()
        self._cache: Dict[int, List[str]] = {}  # Cache expressions per value
    
    def _format_number(self, value: int) -> str:
        """Format a number, optionally as hex."""
        if self.config.use_hex and self.seed.random_bool(0.4):
            prefix = self.seed.choice(['0x', '0X'])
            hex_str = format(abs(value), 'x')
            # Mix case
            hex_str = ''.join(
                c.upper() if self.seed.random_bool(0.5) else c
                for c in hex_str
            )
            result = f"{prefix}{hex_str}"
            return f"-{result}" if value < 0 else result
        return str(value)
    
    def _generate_addition(self, target: int) -> str:
        """Generate addition expression: a + b = target."""
        a = self.seed.get_random_int(1, max(target - 1, 1))
        b = target - a
        return f"({self._format_number(a)}+{self._format_number(b)})"
    
    def _generate_subtraction(self, target: int) -> str:
        """Generate subtraction expression: a - b = target."""
        b = self.seed.get_random_int(1, 1000)
        a = target + b
        return f"({self._format_number(a)}-{self._format_number(b)})"
    
    def _generate_multiplication(self, target: int) -> str:
        """Generate multiplication expression: a * b = target."""
        if target == 0:
            return f"({self._format_number(0)}*{self._format_number(self.seed.get_random_int(1, 100))})"
        
        # Find factors
        factors = []
        for i in range(1, min(abs(target) + 1, 100)):
            if target % i == 0:
                factors.append(i)
        
        if factors:
            a = self.seed.choice(factors)
            b = target // a
            return f"({self._format_number(a)}*{self._format_number(b)})"
        
        # Fallback to addition
        return self._generate_addition(target)
    
    def _generate_modulo(self, target: int) -> str:
        """Generate modulo expression: a % b = target."""
        if target < 0:
            return self._generate_addition(target)
        
        # a % b = target where a = n*b + target
        b = self.seed.get_random_int(target + 1, target + 100)
        n = self.seed.get_random_int(1, 10)
        a = n * b + target
        return f"({self._format_number(a)}%{self._format_number(b)})"
    
    def _generate_complex(self, target: int) -> str:
        """Generate complex multi-term expression."""
        num_terms = self.seed.get_random_int(self.config.min_terms, self.config.max_terms)
        
        if num_terms == 2:
            op = self.seed.choice(['+', '-', '*'])
            if op == '+':
                return self._generate_addition(target)
            elif op == '-':
                return self._generate_subtraction(target)
            else:
                return self._generate_multiplication(target)
        
        # For 3+ terms, build incrementally
        # Start with a base value
        base = self.seed.get_random_int(100, 5000)
        diff = target - base
        
        # Split diff into multiple operations
        parts = [self._format_number(base)]
        remaining = diff
        
        for i in range(num_terms - 2):
            chunk = self.seed.get_random_int(-500, 500)
            if self.seed.random_bool(0.5):
                parts.append(f"+{self._format_number(chunk)}")
            else:
                parts.append(f"-{self._format_number(-chunk)}")
                chunk = -chunk
            remaining -= chunk
        
        # Final term to reach target
        if remaining >= 0:
            parts.append(f"+{self._format_number(remaining)}")
        else:
            parts.append(f"-{self._format_number(-remaining)}")
        
        return f"({''.join(parts)})"
    
    def generate_expression(self, value: int) -> str:
        """
        Generate a computed expression that evaluates to the given value.
        
        Args:
            value: The target integer value
            
        Returns:
            A string expression that evaluates to value
        """
        if not self.seed.random_bool(self.config.probability):
            return str(value)
        
        # Choose generation method
        method = self.seed.get_random_int(0, 4)
        
        if method == 0:
            expr = self._generate_addition(value)
        elif method == 1:
            expr = self._generate_subtraction(value)
        elif method == 2:
            expr = self._generate_multiplication(value)
        elif method == 3 and value >= 0:
            expr = self._generate_modulo(value)
        else:
            expr = self._generate_complex(value)
        
        # Maybe add extra parentheses
        if self.config.use_parentheses and self.seed.random_bool(0.5):
            expr = f"({expr})"
        
        # Cache for variety tracking
        if value not in self._cache:
            self._cache[value] = []
        self._cache[value].append(expr)
        
        return expr
    
    def generate_unique_expression(self, value: int) -> str:
        """
        Generate a unique expression for a value (different from cached ones).
        """
        # Try up to 5 times to get a unique expression
        for _ in range(5):
            expr = self.generate_expression(value)
            if value not in self._cache or expr not in self._cache[value]:
                return expr
        
        # Fallback: force complex expression
        return self._generate_complex(value)
    
    def apply_to_code(self, code: str) -> str:
        """
        Apply computed indices to table access patterns in code.
        
        Transforms:
            table[123] -> table[((100+23))]
            
        SAFE: Only transforms simple table[number] patterns where:
        - The [ is preceded by an identifier or ]
        - The number is a simple decimal integer (not hex/binary)
        - The ] immediately follows the number
        """
        result = []
        i = 0
        
        while i < len(code):
            char = code[i]
            
            # Skip strings
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
                # Check for long comment --[[
                if i + 3 < len(code) and code[i+2] == '[' and code[i+3] == '[':
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
            
            # Check for table[number] pattern - ONLY simple cases
            if char == '[' and i > 0:
                # Check what precedes the [ - must be identifier char or ]
                prev_char = code[i-1]
                if not (prev_char.isalnum() or prev_char == '_' or prev_char == ']'):
                    result.append(char)
                    i += 1
                    continue
                
                # Look for simple decimal number after [
                j = i + 1
                
                # Skip whitespace
                while j < len(code) and code[j] in ' \t':
                    j += 1
                
                # Must start with digit (not - for negative, not 0x for hex)
                if j < len(code) and code[j].isdigit():
                    # Check it's not hex (0x) or binary (0b)
                    if code[j] == '0' and j + 1 < len(code) and code[j+1] in 'xXbB':
                        result.append(char)
                        i += 1
                        continue
                    
                    # Parse decimal number
                    num_start = j
                    while j < len(code) and code[j].isdigit():
                        j += 1
                    
                    # Skip whitespace after number
                    k = j
                    while k < len(code) and code[k] in ' \t':
                        k += 1
                    
                    # Must be followed by ]
                    if k < len(code) and code[k] == ']':
                        num_str = code[num_start:j]
                        try:
                            value = int(num_str)
                            # Only transform reasonable values (not tiny like 0,1,2)
                            if value >= 10:
                                expr = self.generate_expression(value)
                                result.append(f"[{expr}]")
                                i = k + 1
                                continue
                        except ValueError:
                            pass
            
            result.append(char)
            i += 1
        
        return ''.join(result)


# Convenience function
def create_computed_index_generator(seed: PolymorphicBuildSeed) -> ComputedIndexGenerator:
    """Create a computed index generator with default settings."""
    return ComputedIndexGenerator(seed)
