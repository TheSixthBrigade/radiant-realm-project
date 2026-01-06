"""
Bitwise Wrapper System (BWS) for the Luraph-style obfuscator.

This module provides single-letter aliases for bit32 operations,
matching the Luraph obfuscation style. The wrapper definitions
use obfuscated string.char sequences to access bit32 methods.

Requirements: 3.1, 3.2, 3.3
"""

from typing import Dict, List, Tuple

from .seed import PolymorphicBuildSeed


class BitwiseWrapperSystem:
    """
    Bitwise Wrapper System for creating obfuscated bit32 operation aliases.
    
    Creates 10 single/double-letter aliases for bit32 operations:
    - N: bit32.bxor
    - Y: bit32.bor
    - U: bit32.band
    - A: bit32.lshift (add-like)
    - D: bit32.rshift (sub-like)
    - IL: bit32.rrotate
    - AL: bit32.lshift
    - JL: bit32.rshift
    - LL: bit32.band
    - VL: bit32.bxor
    
    The definitions use obfuscated string.char escape sequences to
    access bit32 methods, making static analysis more difficult.
    
    Example:
        >>> bws = BitwiseWrapperSystem(PolymorphicBuildSeed(seed=42))
        >>> print(bws.generate_definitions())
        local _b32=bit32;local _chr=string["\99\104\97\114"];
        local N=_b32[_chr(0x62,0x78,0x6F,0x72)];...
    """
    
    # Wrapper aliases and their corresponding bit32 methods
    WRAPPERS: Dict[str, str] = {
        'N': 'bxor',      # XOR
        'Y': 'bor',       # OR
        'U': 'band',      # AND
        'A': 'lshift',    # Left shift (add-like)
        'D': 'rshift',    # Right shift (sub-like)
        'IL': 'rrotate',  # Right rotate
        'AL': 'lshift',   # Left shift (alternate)
        'JL': 'rshift',   # Right shift (alternate)
        'LL': 'band',     # AND (alternate)
        'VL': 'bxor',     # XOR (alternate)
    }
    
    # Additional bit32 methods that may be used
    EXTRA_METHODS: Dict[str, str] = {
        'pL': 'lrotate',  # Left rotate
        'hL': 'bnot',     # NOT
        'NL': 'extract',  # Extract bits
        'RL': 'replace',  # Replace bits
        'TL': 'btest',    # Test bits
    }
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize the Bitwise Wrapper System.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
        self._bit32_var = self._generate_obfuscated_name('bit32')
        self._char_var = self._generate_obfuscated_name('char')
    
    def _generate_obfuscated_name(self, base: str) -> str:
        """
        Generate an obfuscated variable name.
        
        Args:
            base: Base name for reference
        
        Returns:
            Obfuscated variable name
        """
        chars = ['_', 'l', 'I', 'O', '0', '1']
        prefix = self.seed.choice(['_', 'l', 'I', 'O'])
        suffix = ''.join(self.seed.choices(chars, 3))
        return prefix + suffix
    
    def _string_to_escape_sequence(self, s: str) -> str:
        """
        Convert a string to Lua escape sequence format.
        
        Args:
            s: String to convert
        
        Returns:
            Lua string with decimal escape sequences
        
        Example:
            >>> bws._string_to_escape_sequence("char")
            '"\\99\\104\\97\\114"'
        """
        escaped = ''.join(f'\\{ord(c)}' for c in s)
        return f'"{escaped}"'
    
    def _string_to_hex_chars(self, s: str) -> str:
        """
        Convert a string to string.char hex arguments.
        
        Args:
            s: String to convert
        
        Returns:
            Comma-separated hex values for string.char
        
        Example:
            >>> bws._string_to_hex_chars("bxor")
            '0x62,0x78,0x6F,0x72'
        """
        return ','.join(f'0x{ord(c):02X}' for c in s)
    
    def _string_to_mixed_format(self, s: str) -> str:
        """
        Convert a string to mixed format (hex, decimal, binary).
        
        Args:
            s: String to convert
        
        Returns:
            Comma-separated values in mixed formats
        """
        formats = [
            lambda c: f'0x{ord(c):02X}',
            lambda c: f'0X{ord(c):02X}',
            lambda c: str(ord(c)),
            lambda c: f'0b{ord(c):08b}' if ord(c) < 128 else f'0x{ord(c):02X}',
        ]
        
        result = []
        for c in s:
            fmt = self.seed.choice(formats)
            result.append(fmt(c))
        return ','.join(result)
    
    def generate_definitions(self, include_extra: bool = False, bit32_alias: str = None, string_alias: str = None) -> str:
        """
        Generate obfuscated bit32 wrapper definitions.
        
        Args:
            include_extra: Include extra bit32 methods beyond the core 10
            bit32_alias: Optional alias for bit32 library (e.g., '_m')
            string_alias: Optional alias for string library (e.g., '_s')
        
        Returns:
            Lua code defining all bit32 wrapper aliases
        
        Example output:
            local _Il0=_m;local _O1l=_s["\99\104\97\114"];
            local N=_Il0[_O1l(0x62,0x78,0x6F,0x72)];
            ...
        
        CRITICAL: Uses aliases to hide library names completely.
        """
        lines = []
        
        # Use alias if provided, otherwise use library directly
        bit32_ref = bit32_alias if bit32_alias else 'bit32'
        string_ref = string_alias if string_alias else 'string'
        
        # Create bit32 reference
        lines.append(f'local {self._bit32_var}={bit32_ref}')
        
        # Create string.char reference
        # "char" = \99\104\97\114
        lines.append(f'local {self._char_var}={string_ref}["\\99\\104\\97\\114"]')
        
        # Generate wrapper definitions
        wrappers = dict(self.WRAPPERS)
        if include_extra:
            wrappers.update(self.EXTRA_METHODS)
        
        for alias, method in wrappers.items():
            method_chars = self._string_to_mixed_format(method)
            lines.append(
                f'local {alias}={self._bit32_var}[{self._char_var}({method_chars})]'
            )
        
        return ';'.join(lines)
    
    def generate_definitions_dense(self, include_extra: bool = False) -> str:
        """
        Generate dense (single-line) bit32 wrapper definitions.
        
        Args:
            include_extra: Include extra bit32 methods
        
        Returns:
            Single-line Lua code with all definitions
        """
        return self.generate_definitions(include_extra).replace('\n', '')
    
    def _generate_bit32_access(self) -> str:
        """
        Generate obfuscated bit32 library access.
        
        Returns:
            Obfuscated code to access bit32 library
        """
        # Could use: bit32, _G["bit32"], _G[string.char(98,105,116,51,50)]
        return 'bit32'
    
    def get_wrapper_alias(self, operation: str) -> str:
        """
        Get the wrapper alias for a bit32 operation.
        
        Args:
            operation: The bit32 operation name (e.g., 'bxor', 'band')
        
        Returns:
            The wrapper alias (e.g., 'N', 'U')
        
        Raises:
            KeyError: If operation is not in the wrapper map
        """
        # Reverse lookup
        for alias, method in self.WRAPPERS.items():
            if method == operation:
                return alias
        for alias, method in self.EXTRA_METHODS.items():
            if method == operation:
                return alias
        raise KeyError(f"No wrapper alias for operation: {operation}")
    
    def get_all_aliases(self) -> List[str]:
        """
        Get all wrapper alias names.
        
        Returns:
            List of all wrapper alias names
        """
        return list(self.WRAPPERS.keys())
    
    def wrap_operation(self, operation: str, *args: str) -> str:
        """
        Wrap a bit32 operation call with its alias.
        
        Args:
            operation: The bit32 operation name
            *args: Arguments to pass to the operation
        
        Returns:
            Wrapped operation call using alias
        
        Example:
            >>> bws.wrap_operation('bxor', 'a', 'b')
            'N(a,b)'
        """
        alias = self.get_wrapper_alias(operation)
        args_str = ','.join(args)
        return f'{alias}({args_str})'
    
    def get_bit32_var(self) -> str:
        """Get the obfuscated bit32 variable name."""
        return self._bit32_var
    
    def get_char_var(self) -> str:
        """Get the obfuscated string.char variable name."""
        return self._char_var
    
    def __repr__(self) -> str:
        return f"BitwiseWrapperSystem(wrappers={len(self.WRAPPERS)})"
