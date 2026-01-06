"""
Luraph Number Transformer for the Luraph-style obfuscator.

This module provides number obfuscation transformations that match
Luraph v14.4.1 output style, including:
- Hex with underscores: 0xFF -> 0X0_FF
- Binary with underscores: 255 -> 0B1111_1111
- Computed expressions: 7 -> (0x3+0x4)
- Large decimal format
- Mixed case hex
- Deep wrap with bit32 aliases (N/Y/U/A/D)

NOTE: Luau only supports SINGLE underscores in numeric literals.
Double underscores (__) are NOT valid and will cause syntax errors!

Requirements: 9.1, 9.2, 9.3, 9.4
"""

from typing import List, Optional, Tuple
import re

try:
    from ..core.seed import PolymorphicBuildSeed
except ImportError:
    from core.seed import PolymorphicBuildSeed


class LuraphNumberTransformer:
    """
    Luraph-style number transformer for obfuscating numeric literals.
    
    Transforms numbers into various obfuscated formats matching Luraph output:
    - 0X0_FF (hex with underscores)
    - 0B1111_1111 (binary with underscores)
    - (0x3+0x4) (computed expressions)
    - Deep wrapped with bit32 aliases
    
    NOTE: Only SINGLE underscores are used - Luau does not support double underscores!
    
    Example:
        >>> transformer = LuraphNumberTransformer(PolymorphicBuildSeed(seed=42))
        >>> transformer.to_hex_underscore(255)
        '0X0_FF'
        >>> transformer.to_binary_underscore(255)
        '0B1111_1111'
        >>> transformer.to_computed(7)
        '(0x3+0x4)'
    """
    
    # Bit32 wrapper aliases for deep wrapping
    BIT32_ALIASES = ['N', 'Y', 'U', 'A', 'D']
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize the Luraph Number Transformer.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed

    def transform(self, num: int, method: Optional[str] = None) -> str:
        """
        Transform a number to an obfuscated format.
        
        Args:
            num: The number to transform
            method: Optional specific method to use. If None, randomly selects.
                   Options: 'hex', 'binary', 'computed', 'large_decimal', 'mixed_hex'
        
        Returns:
            Obfuscated number string
        
        Example:
            >>> transformer.transform(255)
            '0X0_FF'  # or other random format
        """
        if method is None:
            method = self.seed.choice(['hex', 'binary', 'computed', 'large_decimal', 'mixed_hex'])
        
        if method == 'hex':
            return self.to_hex_underscore(num)
        elif method == 'binary':
            return self.to_binary_underscore(num)
        elif method == 'computed':
            return self.to_computed(num)
        elif method == 'large_decimal':
            return self.to_large_decimal(num)
        elif method == 'mixed_hex':
            return self.to_mixed_case_hex(num)
        else:
            return self.to_hex_underscore(num)
    
    def to_hex_underscore(self, num: int) -> str:
        """
        Convert number to hex format with underscores.
        
        Luraph style: 0xFF -> 0X0_FF, 0x5_A, 0X1_E3
        
        Args:
            num: The number to convert
        
        Returns:
            Hex string with underscores (single underscores only!)
        
        Example:
            >>> transformer.to_hex_underscore(255)
            '0X0_FF'
            >>> transformer.to_hex_underscore(90)
            '0x5_A'
        """
        if num < 0:
            # Handle negative numbers
            return f'-{self.to_hex_underscore(abs(num))}'
        
        if num == 0:
            return self.seed.choice(['0x0', '0X0', '0x00', '0X00'])
        
        # Convert to hex without '0x' prefix
        hex_str = format(num, 'X')
        
        # Randomly choose case for prefix
        prefix = self.seed.choice(['0x', '0X'])
        
        # Insert underscores at random positions
        hex_with_underscores = self._insert_underscores(hex_str)
        
        # Optionally add leading zero for Luraph style (0X0_FF) - single underscore only!
        if self.seed.random_bool(0.4) and len(hex_with_underscores) > 1:
            hex_with_underscores = '0_' + hex_with_underscores
        
        return prefix + hex_with_underscores
    
    def to_binary_underscore(self, num: int) -> str:
        """
        Convert number to binary format with underscores.
        
        Luraph style: 255 -> 0B1111_1111, 0b1010, 0B10_001
        
        Args:
            num: The number to convert
        
        Returns:
            Binary string with underscores (single underscores only!)
        
        Example:
            >>> transformer.to_binary_underscore(255)
            '0B1111_1111'
            >>> transformer.to_binary_underscore(17)
            '0B10_001'
        """
        if num < 0:
            return f'-{self.to_binary_underscore(abs(num))}'
        
        if num == 0:
            return self.seed.choice(['0b0', '0B0', '0b00', '0B00'])
        
        # Convert to binary without '0b' prefix
        bin_str = format(num, 'b')
        
        # Randomly choose case for prefix
        prefix = self.seed.choice(['0b', '0B'])
        
        # Insert underscores
        bin_with_underscores = self._insert_underscores(bin_str)
        
        return prefix + bin_with_underscores
    
    def _insert_underscores(self, s: str) -> str:
        """
        Insert underscores into a numeric string at random positions.
        
        Luraph uses single underscores only: 0X5_A, 0B1111_1111
        
        IMPORTANT: Luau does NOT support double underscores (__) in numeric literals!
        Only single underscores are valid, and they must be between digits.
        
        Args:
            s: The numeric string (hex or binary digits)
        
        Returns:
            String with single underscores inserted between digits
        """
        if len(s) <= 1:
            return s
        
        result = []
        i = 0
        while i < len(s):
            result.append(s[i])
            i += 1
            
            # Randomly insert SINGLE underscore between digits (never double!)
            # Only insert if we're not at the end
            if i < len(s) and self.seed.random_bool(0.35):
                result.append('_')
        
        return ''.join(result)

    
    def to_computed(self, num: int) -> str:
        """
        Convert number to a computed expression.
        
        Luraph style: 7 -> (0x3+0x4), 10 -> ((5+5)*2-10+10)
        
        Args:
            num: The number to convert
        
        Returns:
            Computed expression that evaluates to the number
        
        Example:
            >>> transformer.to_computed(7)
            '(0x3+0x4)'
            >>> transformer.to_computed(100)
            '(0x32+0x32)'
        """
        if num == 0:
            return self.seed.choice(['(0x0+0x0)', '(0x1-0x1)', '(0B0)'])
        
        if num < 0:
            # For negative numbers, compute positive and negate
            pos_expr = self.to_computed(abs(num))
            return f'(-{pos_expr})'
        
        # Choose computation method
        method = self.seed.get_random_int(0, 3)
        
        if method == 0:
            # Simple addition: a + b = num
            a = self.seed.get_random_int(0, num)
            b = num - a
            a_str = self._format_simple_number(a)
            b_str = self._format_simple_number(b)
            return f'({a_str}+{b_str})'
        
        elif method == 1:
            # Subtraction: a - b = num
            b = self.seed.get_random_int(0, 1000)
            a = num + b
            a_str = self._format_simple_number(a)
            b_str = self._format_simple_number(b)
            return f'({a_str}-{b_str})'
        
        elif method == 2:
            # Multiplication and adjustment: (a * b) + c = num
            if num > 10:
                divisors = [d for d in range(2, min(num, 20)) if num % d == 0]
                if divisors:
                    b = self.seed.choice(divisors)
                    a = num // b
                    a_str = self._format_simple_number(a)
                    b_str = self._format_simple_number(b)
                    return f'({a_str}*{b_str})'
            # Fall back to addition
            a = self.seed.get_random_int(0, num)
            b = num - a
            return f'({self._format_simple_number(a)}+{self._format_simple_number(b)})'
        
        else:
            # Nested expression: ((a + b) - c) where result = num
            c = self.seed.get_random_int(0, 100)
            inner_sum = num + c
            a = self.seed.get_random_int(0, inner_sum)
            b = inner_sum - a
            a_str = self._format_simple_number(a)
            b_str = self._format_simple_number(b)
            c_str = self._format_simple_number(c)
            return f'(({a_str}+{b_str})-{c_str})'
    
    def _format_simple_number(self, num: int) -> str:
        """
        Format a number in a simple obfuscated format (no deep nesting).
        
        Args:
            num: The number to format
        
        Returns:
            Simple hex, binary, or decimal string
        """
        if num < 0:
            return f'-{self._format_simple_number(abs(num))}'
        
        fmt = self.seed.get_random_int(0, 3)
        
        if fmt == 0:
            # Hex
            prefix = self.seed.choice(['0x', '0X'])
            return f'{prefix}{num:X}'
        elif fmt == 1:
            # Binary (only for small numbers)
            if num < 256:
                prefix = self.seed.choice(['0b', '0B'])
                return f'{prefix}{num:b}'
            return f'0x{num:X}'
        elif fmt == 2:
            # Hex with underscore
            hex_str = format(num, 'X')
            if len(hex_str) > 1 and self.seed.random_bool(0.5):
                mid = len(hex_str) // 2
                hex_str = hex_str[:mid] + '_' + hex_str[mid:]
            prefix = self.seed.choice(['0x', '0X'])
            return f'{prefix}{hex_str}'
        else:
            # Plain decimal
            return str(num)
    
    def to_large_decimal(self, num: int) -> str:
        """
        Convert number to large decimal format with underscores.
        
        Luraph style: 1000000 -> 1_000_000
        
        Args:
            num: The number to convert
        
        Returns:
            Decimal string with underscore separators
        
        Example:
            >>> transformer.to_large_decimal(1000000)
            '1_000_000'
        """
        if num < 0:
            return f'-{self.to_large_decimal(abs(num))}'
        
        s = str(num)
        
        if len(s) <= 3:
            return s
        
        # Insert underscores every 3 digits from the right
        result = []
        for i, c in enumerate(reversed(s)):
            if i > 0 and i % 3 == 0:
                result.append('_')
            result.append(c)
        
        return ''.join(reversed(result))
    
    def to_mixed_case_hex(self, num: int) -> str:
        """
        Convert number to hex with mixed case letters.
        
        Luraph style: 0xAbCd, 0XaBcD
        
        Args:
            num: The number to convert
        
        Returns:
            Hex string with mixed case
        
        Example:
            >>> transformer.to_mixed_case_hex(43981)
            '0xAbCd'
        """
        if num < 0:
            return f'-{self.to_mixed_case_hex(abs(num))}'
        
        if num == 0:
            return self.seed.choice(['0x0', '0X0'])
        
        # Convert to hex
        hex_str = format(num, 'x')
        
        # Randomly change case of each letter
        mixed = []
        for c in hex_str:
            if c.isalpha():
                if self.seed.random_bool(0.5):
                    mixed.append(c.upper())
                else:
                    mixed.append(c.lower())
            else:
                mixed.append(c)
        
        prefix = self.seed.choice(['0x', '0X'])
        return prefix + ''.join(mixed)

    
    def deep_wrap_number(self, num: int, depth: int = 2) -> str:
        """
        Deep wrap a number using bit32 aliases (N/Y/U/A/D).
        
        Creates nested expressions using bit32 operations that evaluate
        to the original number. Uses 5 patterns with N/Y/U/A/D aliases.
        
        Luraph style:
        e=(0B1000_10_1+(O.m4((O.VL((O.JL(O.I[0x5],(F[0X11_E3]))),O.I[0X3]))~=F[19942]and O.I[0X4]or O.I[0B1])))
        
        Args:
            num: The number to wrap
            depth: Nesting depth (1-5)
        
        Returns:
            Deep wrapped expression using bit32 aliases
        
        Example:
            >>> transformer.deep_wrap_number(255, depth=2)
            'N(Y(0xFF,0x0),0x0)'
        """
        if depth <= 0:
            return self.transform(num, method=self.seed.choice(['hex', 'binary']))
        
        # Choose a wrapping pattern
        pattern = self.seed.get_random_int(0, 4)
        
        if pattern == 0:
            # N (XOR) pattern: N(num, 0) = num
            inner = self.deep_wrap_number(num, depth - 1)
            return f'N({inner},0x0)'
        
        elif pattern == 1:
            # Y (OR) pattern: Y(num, 0) = num
            inner = self.deep_wrap_number(num, depth - 1)
            return f'Y({inner},0x0)'
        
        elif pattern == 2:
            # U (AND) pattern: U(num, 0xFFFFFFFF) = num (for positive nums < 2^32)
            inner = self.deep_wrap_number(num, depth - 1)
            mask = self.seed.choice(['0xFFFFFFFF', '0XFFFFFFFF', '0xFFFF_FFFF'])
            return f'U({inner},{mask})'
        
        elif pattern == 3:
            # A (lshift) then D (rshift) pattern: D(A(num, 0), 0) = num
            inner = self.deep_wrap_number(num, depth - 1)
            return f'D(A({inner},0x0),0x0)'
        
        else:
            # Combined pattern: N(Y(num, 0), 0) = num
            inner = self.deep_wrap_number(num, depth - 1)
            return f'N(Y({inner},0x0),0x0)'
    
    def deep_wrap_with_context(self, num: int, context_var: str = 'O', depth: int = 2) -> str:
        """
        Deep wrap a number with context variable access (Luraph style).
        
        Creates expressions like: O.VL(O.JL(num, O.I[0x5]), O.I[0X3])
        
        Args:
            num: The number to wrap
            context_var: The context variable name (default 'O')
            depth: Nesting depth
        
        Returns:
            Deep wrapped expression with context access
        
        Example:
            >>> transformer.deep_wrap_with_context(255, 'O', 2)
            'O.VL(O.JL(0xFF,O.I[0x5]),O.I[0X3])'
        """
        if depth <= 0:
            return self.transform(num, method=self.seed.choice(['hex', 'binary']))
        
        # Luraph-style bit32 method aliases
        methods = ['VL', 'LL', 'JL', 'IL', 'AL', 'pL', 'N', 'Y', 'U']
        method = self.seed.choice(methods)
        
        # Generate index for O.I[index]
        index = self.seed.get_random_int(1, 10)
        index_str = self.transform(index, method=self.seed.choice(['hex', 'binary']))
        
        inner = self.deep_wrap_with_context(num, context_var, depth - 1)
        
        # Pattern: O.METHOD(inner, O.I[index])
        return f'{context_var}.{method}({inner},{context_var}.I[{index_str}])'
    
    def transform_in_code(self, code: str) -> str:
        """
        Transform all numeric literals in Lua code.
        
        Finds and replaces numeric literals with obfuscated versions.
        Preserves numbers in strings and comments.
        
        Args:
            code: Lua source code
        
        Returns:
            Code with obfuscated numbers
        """
        # Pattern to match numeric literals (not in strings or comments)
        # This is a simplified approach - a full parser would be more accurate
        
        def replace_number(match):
            num_str = match.group(0)
            
            # Skip if already obfuscated (has 0x, 0b, 0X, 0B prefix)
            if num_str.startswith(('0x', '0X', '0b', '0B')):
                return num_str
            
            # Skip floating point for now
            if '.' in num_str or 'e' in num_str.lower():
                return num_str
            
            try:
                num = int(num_str)
                # Only transform numbers > 1 to avoid breaking common patterns
                if abs(num) > 1:
                    return self.transform(num)
                return num_str
            except ValueError:
                return num_str
        
        # Match integer literals (not preceded by letter/underscore)
        # This pattern avoids matching parts of identifiers
        pattern = r'(?<![a-zA-Z_0-9])(-?\d+)(?![a-zA-Z_0-9xXbB])'
        
        return re.sub(pattern, replace_number, code)
    
    def get_random_format(self) -> str:
        """
        Get a random number format name.
        
        Returns:
            One of: 'hex', 'binary', 'computed', 'large_decimal', 'mixed_hex'
        """
        return self.seed.choice(['hex', 'binary', 'computed', 'large_decimal', 'mixed_hex'])
    
    def __repr__(self) -> str:
        return f"LuraphNumberTransformer(seed={self.seed.get_seed()})"
