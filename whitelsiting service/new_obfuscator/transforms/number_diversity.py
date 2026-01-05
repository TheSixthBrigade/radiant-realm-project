"""
Number Diversity Formatter

This module provides diverse number formatting to make patterns harder to detect.
Uses mixed hex/binary formats with underscores for Luraph-style obfuscation.

Target output style:
    0X5_A, 0x5a, 0B1111__1111, 0b11111111
    (0x3+0x4), (7*1), (14/2)

Requirements: ultra-obfuscation spec 7.x
"""

from dataclasses import dataclass
from typing import Dict, Set, Optional
import re

try:
    from ..core.seed import PolymorphicBuildSeed
except ImportError:
    from core.seed import PolymorphicBuildSeed


@dataclass
class NumberDiversityConfig:
    """Configuration for number diversity formatting."""
    use_hex: bool = True            # Use hexadecimal format
    use_binary: bool = True         # Use binary format (Luau-only)
    use_underscores: bool = True    # Use underscore separators
    use_computed: bool = True       # Use computed expressions
    mix_case: bool = True           # Mix upper/lower case in hex
    diversity_probability: float = 0.7  # Probability of diversifying


class NumberDiversityFormatter:
    """
    Formats numbers in diverse ways to avoid pattern detection.
    
    Formats:
    - Hex: 0xFF, 0XFF, 0x5_A, 0X5__A
    - Binary: 0b11111111, 0B1111_1111 (Luau-only)
    - Computed: (128+128), (0x100*1)
    - Mixed case: 0xAb, 0XaB
    """
    
    def __init__(self, seed: PolymorphicBuildSeed, config: NumberDiversityConfig = None):
        self.seed = seed
        self.config = config or NumberDiversityConfig()
        self._used_formats: Dict[int, Set[str]] = {}  # Track used formats per value
    
    def _add_underscores(self, s: str) -> str:
        """Add random underscores to a string."""
        if len(s) < 2:
            return s
        
        result = []
        for i, c in enumerate(s):
            result.append(c)
            # Maybe add underscore after this char (not at end)
            if i < len(s) - 1 and self.seed.random_bool(0.2):
                # Single or double underscore
                if self.seed.random_bool(0.3):
                    result.append('__')
                else:
                    result.append('_')
        
        return ''.join(result)
    
    def _mix_case(self, s: str) -> str:
        """Randomly mix case of hex digits."""
        return ''.join(
            c.upper() if self.seed.random_bool(0.5) else c.lower()
            for c in s
        )
    
    def format_as_hex(self, value: int) -> str:
        """Format number as hexadecimal."""
        if value < 0:
            hex_str = format(-value, 'x')
            prefix = self.seed.choice(['0x', '0X']) if self.config.mix_case else '0x'
            
            if self.config.mix_case:
                hex_str = self._mix_case(hex_str)
            
            if self.config.use_underscores and len(hex_str) > 1:
                hex_str = self._add_underscores(hex_str)
            
            return f"-{prefix}{hex_str}"
        
        hex_str = format(value, 'x')
        prefix = self.seed.choice(['0x', '0X']) if self.config.mix_case else '0x'
        
        if self.config.mix_case:
            hex_str = self._mix_case(hex_str)
        
        if self.config.use_underscores and len(hex_str) > 1:
            hex_str = self._add_underscores(hex_str)
        
        return f"{prefix}{hex_str}"
    
    def format_as_binary(self, value: int) -> str:
        """Format number as binary (Luau-only feature)."""
        if value < 0 or value > 0xFFFFFFFF:
            # Binary doesn't work well for negative or very large numbers
            return self.format_as_hex(value)
        
        bin_str = format(value, 'b')
        prefix = self.seed.choice(['0b', '0B'])
        
        if self.config.use_underscores and len(bin_str) > 4:
            bin_str = self._add_underscores(bin_str)
        
        return f"{prefix}{bin_str}"
    
    def format_as_computed(self, value: int) -> str:
        """Format number as a computed expression."""
        if value == 0:
            return self.seed.choice(['(0)', '(1-1)', '(0*1)'])
        
        if value == 1:
            return self.seed.choice(['(1)', '(2-1)', '(1*1)'])
        
        op_type = self.seed.get_random_int(0, 3)
        
        if op_type == 0:
            # Addition
            a = self.seed.get_random_int(1, max(value - 1, 1))
            b = value - a
            a_fmt = self.format_simple(a)
            b_fmt = self.format_simple(b)
            return f"({a_fmt}+{b_fmt})"
        
        elif op_type == 1:
            # Subtraction
            b = self.seed.get_random_int(1, 100)
            a = value + b
            a_fmt = self.format_simple(a)
            b_fmt = self.format_simple(b)
            return f"({a_fmt}-{b_fmt})"
        
        elif op_type == 2:
            # Multiplication (if value has factors)
            for factor in [2, 3, 4, 5, 7, 8, 10]:
                if value % factor == 0:
                    other = value // factor
                    f_fmt = self.format_simple(factor)
                    o_fmt = self.format_simple(other)
                    return f"({f_fmt}*{o_fmt})"
            # Fallback to addition
            return self.format_as_computed(value)
        
        else:
            # Division (if value divides evenly)
            multiplier = self.seed.get_random_int(2, 5)
            dividend = value * multiplier
            d_fmt = self.format_simple(dividend)
            m_fmt = self.format_simple(multiplier)
            return f"({d_fmt}/{m_fmt})"
    
    def format_simple(self, value: int) -> str:
        """Format a number simply (hex or decimal, no computed)."""
        if self.config.use_hex and self.seed.random_bool(0.5):
            return self.format_as_hex(value)
        return str(value)
    
    def format_diverse(self, value: int) -> str:
        """
        Format a number with maximum diversity.
        
        Chooses randomly from available formats, avoiding recently used ones.
        """
        if not self.seed.random_bool(self.config.diversity_probability):
            return str(value)
        
        # Build list of available formats
        formats = []
        
        if self.config.use_hex:
            formats.append('hex')
        
        if self.config.use_binary and 0 <= value <= 0xFFFF:
            formats.append('binary')
        
        if self.config.use_computed and value >= 0:
            formats.append('computed')
        
        formats.append('decimal')  # Always available
        
        # Choose format
        fmt = self.seed.choice(formats)
        
        if fmt == 'hex':
            result = self.format_as_hex(value)
        elif fmt == 'binary':
            result = self.format_as_binary(value)
        elif fmt == 'computed':
            result = self.format_as_computed(value)
        else:
            result = str(value)
        
        # Track used format
        if value not in self._used_formats:
            self._used_formats[value] = set()
        self._used_formats[value].add(result)
        
        return result
    
    def format_unique(self, value: int) -> str:
        """
        Format a number differently from previous uses.
        """
        # Try up to 5 times to get a unique format
        for _ in range(5):
            result = self.format_diverse(value)
            if value not in self._used_formats or result not in self._used_formats[value]:
                return result
        
        # Fallback: force computed
        return self.format_as_computed(value)
    
    def apply_to_code(self, code: str) -> str:
        """
        Apply number diversity formatting to numbers in code.
        
        SAFE: Skips numbers that are:
        - Inside strings (including escape sequences like \\123)
        - Already in hex (0x) or binary (0b) format
        - Part of identifiers
        - Very small (0-9) as these are often opcodes/indices
        """
        result = []
        i = 0
        
        while i < len(code):
            char = code[i]
            
            # Skip strings completely (including escape sequences inside)
            if char == '"' or char == "'":
                quote = char
                start = i
                i += 1
                while i < len(code):
                    if code[i] == '\\' and i + 1 < len(code):
                        i += 2  # Skip escape sequence entirely
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
            
            # Check for number - but be very careful
            if char.isdigit():
                # Skip if part of identifier (preceded by letter/underscore)
                if i > 0 and (code[i-1].isalnum() or code[i-1] == '_'):
                    result.append(char)
                    i += 1
                    continue
                
                # Check if this is already hex or binary - skip those
                if char == '0' and i + 1 < len(code) and code[i+1] in 'xXbB':
                    # Already formatted - copy as-is
                    start = i
                    i += 2
                    while i < len(code) and (code[i] in '0123456789abcdefABCDEF_'):
                        i += 1
                    result.append(code[start:i])
                    continue
                
                # Parse decimal number
                num_start = i
                while i < len(code) and (code[i].isdigit() or code[i] == '_'):
                    i += 1
                
                # Check for decimal point (float) - skip floats
                if i < len(code) and code[i] == '.':
                    if i + 1 < len(code) and code[i+1].isdigit():
                        # It's a float - copy as-is
                        i += 1
                        while i < len(code) and (code[i].isdigit() or code[i] == '_'):
                            i += 1
                        result.append(code[num_start:i])
                        continue
                
                # Check if followed by identifier char - skip
                if i < len(code) and (code[i].isalpha() or code[i] == '_'):
                    result.append(code[num_start:i])
                    continue
                
                num_str = code[num_start:i]
                
                # Try to parse and diversify
                try:
                    # Remove underscores for parsing
                    clean = num_str.replace('_', '')
                    value = int(clean)
                    
                    # Only diversify numbers >= 10 and <= reasonable size
                    # Skip small numbers (often opcodes, indices)
                    if 10 <= value <= 0xFFFFFF:
                        diverse = self.format_diverse(value)
                        result.append(diverse)
                    else:
                        result.append(num_str)
                except:
                    result.append(num_str)
                continue
            
            result.append(char)
            i += 1
        
        return ''.join(result)
    
    def _parse_number(self, code: str, start: int) -> Optional[str]:
        """Parse a numeric literal."""
        i = start
        
        # Check for hex or binary
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
        
        # Decimal
        while i < len(code) and (code[i].isdigit() or code[i] == '_'):
            i += 1
        
        # Decimal point
        if i < len(code) and code[i] == '.':
            if i + 1 < len(code) and code[i+1].isdigit():
                i += 1
                while i < len(code) and (code[i].isdigit() or code[i] == '_'):
                    i += 1
        
        return code[start:i] if i > start else None
    
    def _parse_value(self, num_str: str) -> Optional[int]:
        """Parse a number string to integer."""
        clean = num_str.replace('_', '')
        
        try:
            if clean.startswith(('0x', '0X')):
                return int(clean, 16)
            elif clean.startswith(('0b', '0B')):
                return int(clean, 2)
            elif '.' in clean:
                return int(float(clean))
            else:
                return int(clean)
        except:
            return None


# Convenience function
def create_number_diversity_formatter(seed: PolymorphicBuildSeed) -> NumberDiversityFormatter:
    """Create a number diversity formatter with default settings."""
    return NumberDiversityFormatter(seed)
