"""
Constant Pool Manager (CPM) for the Luraph-style obfuscator.

This module manages constants with large non-sequential indices (base 10000+)
matching the Luraph obfuscation style. It also generates computed index
expressions and adds decoy constants to confuse analysis.

Requirements: 4.1, 4.2, 4.3
"""

from typing import Any, Dict, List, Optional, Tuple, Union

from .seed import PolymorphicBuildSeed


class ConstantPoolManager:
    """
    Constant Pool Manager for Luraph-style constant storage.
    
    Stores constants with large non-sequential indices (base 10000+)
    and generates computed index expressions for access. Also adds
    decoy constants to confuse static analysis.
    
    Attributes:
        BASE_INDEX: Minimum index value (10000)
        DECOY_COUNT: Number of fake constants to add (5)
    
    Example:
        >>> cpm = ConstantPoolManager(PolymorphicBuildSeed(seed=42))
        >>> idx = cpm.add_constant("hello")
        >>> idx >= 10000
        True
        >>> cpm.get_constant(idx)
        'hello'
    """
    
    # Minimum index value as per Luraph style
    BASE_INDEX = 10000
    
    # Number of decoy constants to add
    DECOY_COUNT = 5
    
    # Maximum gap between indices for non-sequential assignment
    MAX_INDEX_GAP = 5000
    MIN_INDEX_GAP = 100
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize the Constant Pool Manager.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
        self.constants: Dict[int, Any] = {}
        self.reverse_map: Dict[Any, int] = {}  # For deduplication
        self.next_index = self.BASE_INDEX + seed.get_random_int(0, 1000)
        self._decoys_added = False
    
    def add_constant(self, value: Any) -> int:
        """
        Add a constant and return its large non-sequential index.
        
        If the constant already exists, returns the existing index.
        
        Args:
            value: The constant value to store
        
        Returns:
            Large non-sequential index (>= 10000)
        
        Example:
            >>> cpm = ConstantPoolManager(PolymorphicBuildSeed(seed=42))
            >>> idx = cpm.add_constant("test")
            >>> idx >= 10000
            True
        """
        # Check for existing constant (deduplication)
        hashable_value = self._make_hashable(value)
        if hashable_value in self.reverse_map:
            return self.reverse_map[hashable_value]
        
        # Generate non-sequential index
        gap = self.seed.get_random_int(self.MIN_INDEX_GAP, self.MAX_INDEX_GAP)
        index = self.next_index + gap
        self.next_index = index + 1
        
        # Store constant
        self.constants[index] = value
        self.reverse_map[hashable_value] = index
        
        return index
    
    def _make_hashable(self, value: Any) -> Any:
        """
        Make a value hashable for deduplication.
        
        Args:
            value: Value to make hashable
        
        Returns:
            Hashable representation of the value
        """
        if isinstance(value, (list, dict)):
            return str(value)
        return value
    
    def get_constant(self, index: int) -> Any:
        """
        Get a constant by its index.
        
        Args:
            index: The constant index
        
        Returns:
            The constant value
        
        Raises:
            KeyError: If index not found
        """
        return self.constants[index]
    
    def has_constant(self, value: Any) -> bool:
        """
        Check if a constant value already exists.
        
        Args:
            value: The constant value to check
        
        Returns:
            True if the constant exists
        """
        hashable_value = self._make_hashable(value)
        return hashable_value in self.reverse_map
    
    def get_index(self, value: Any) -> Optional[int]:
        """
        Get the index of an existing constant.
        
        Args:
            value: The constant value
        
        Returns:
            The index if found, None otherwise
        """
        hashable_value = self._make_hashable(value)
        return self.reverse_map.get(hashable_value)
    
    def add_decoys(self) -> List[int]:
        """
        Add 5 fake constants to the pool.
        
        Decoy constants are random values that appear functional
        but are never actually used. They confuse static analysis.
        
        Returns:
            List of decoy constant indices
        """
        if self._decoys_added:
            return []
        
        decoy_indices = []
        
        for _ in range(self.DECOY_COUNT):
            # Generate random decoy value
            decoy_type = self.seed.get_random_int(0, 4)
            
            if decoy_type == 0:
                # Random large integer
                value = self.seed.get_random_int(-999999999, 999999999)
            elif decoy_type == 1:
                # Random float
                value = self.seed.get_random_float(-1000000, 1000000)
            elif decoy_type == 2:
                # Random string
                chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                length = self.seed.get_random_int(5, 20)
                value = ''.join(self.seed.choices(list(chars), length))
            elif decoy_type == 3:
                # Boolean-like value
                value = self.seed.choice([True, False, 0, 1, -1])
            else:
                # Nil-like placeholder
                value = None
            
            # Add with unique marker to avoid deduplication
            decoy_value = (value, f"__decoy_{len(decoy_indices)}")
            
            # Generate index manually to ensure it's in the pool
            gap = self.seed.get_random_int(self.MIN_INDEX_GAP, self.MAX_INDEX_GAP)
            index = self.next_index + gap
            self.next_index = index + 1
            
            self.constants[index] = value  # Store actual value, not tuple
            decoy_indices.append(index)
        
        self._decoys_added = True
        return decoy_indices
    
    def generate_computed_index(self, index: int) -> str:
        """
        Generate a computed index expression for accessing a constant.
        
        Instead of direct index access like F[11708], generates
        expressions like F[(0x2D8C)] or F[(11000+708)].
        
        Args:
            index: The constant index
        
        Returns:
            Computed index expression string
        
        Example:
            >>> cpm.generate_computed_index(11708)
            '(0x2D8C)'  # or '(11000+708)' or similar
        """
        method = self.seed.get_random_int(0, 5)
        
        if method == 0:
            # Hex format with underscores
            return self._to_hex_underscore(index)
        elif method == 1:
            # Binary format (for smaller indices)
            if index < 65536:
                return self._to_binary_underscore(index)
            return self._to_hex_underscore(index)
        elif method == 2:
            # Addition expression
            return self._to_addition(index)
        elif method == 3:
            # Subtraction expression
            return self._to_subtraction(index)
        elif method == 4:
            # Mixed hex
            return f'0X{index:X}'
        else:
            # Plain with parentheses
            return f'({index})'
    
    def _to_hex_underscore(self, num: int) -> str:
        """
        Convert number to hex with underscores.
        
        Args:
            num: Number to convert
        
        Returns:
            Hex string with underscores (e.g., '0X2D_8C')
        """
        hex_str = f'{num:X}'
        
        # Insert underscores randomly
        if len(hex_str) >= 4:
            pos = self.seed.get_random_int(2, len(hex_str) - 1)
            underscore_count = self.seed.get_random_int(1, 2)
            underscores = '_' * underscore_count
            hex_str = hex_str[:pos] + underscores + hex_str[pos:]
        
        # Random case for 0X prefix
        prefix = self.seed.choice(['0x', '0X'])
        return f'{prefix}{hex_str}'
    
    def _to_binary_underscore(self, num: int) -> str:
        """
        Convert number to binary with underscores.
        
        Args:
            num: Number to convert
        
        Returns:
            Binary string with underscores (e.g., '0B1011__1100')
        """
        bin_str = f'{num:b}'
        
        # Insert underscores
        if len(bin_str) >= 8:
            # Insert at byte boundaries
            parts = []
            for i in range(0, len(bin_str), 4):
                parts.append(bin_str[i:i+4])
            underscore_count = self.seed.get_random_int(1, 2)
            underscores = '_' * underscore_count
            bin_str = underscores.join(parts)
        
        prefix = self.seed.choice(['0b', '0B'])
        return f'{prefix}{bin_str}'
    
    def _to_addition(self, num: int) -> str:
        """
        Convert number to addition expression.
        
        Args:
            num: Number to convert
        
        Returns:
            Addition expression (e.g., '(11000+708)')
        """
        a = self.seed.get_random_int(0, num)
        b = num - a
        
        a_fmt = self._format_operand(a)
        b_fmt = self._format_operand(b)
        
        return f'({a_fmt}+{b_fmt})'
    
    def _to_subtraction(self, num: int) -> str:
        """
        Convert number to subtraction expression.
        
        Args:
            num: Number to convert
        
        Returns:
            Subtraction expression (e.g., '(12000-292)')
        """
        extra = self.seed.get_random_int(100, 5000)
        a = num + extra
        b = extra
        
        a_fmt = self._format_operand(a)
        b_fmt = self._format_operand(b)
        
        return f'({a_fmt}-{b_fmt})'
    
    def _format_operand(self, num: int) -> str:
        """
        Format a number operand in random format.
        
        Args:
            num: Number to format
        
        Returns:
            Formatted number string
        """
        fmt = self.seed.get_random_int(0, 2)
        
        if fmt == 0:
            return str(num)
        elif fmt == 1:
            return f'0x{num:X}'
        else:
            return f'0X{num:x}'
    
    def get_all_indices(self) -> List[int]:
        """
        Get all constant indices.
        
        Returns:
            List of all indices in the pool
        """
        return list(self.constants.keys())
    
    def get_count(self) -> int:
        """
        Get the number of constants in the pool.
        
        Returns:
            Number of constants
        """
        return len(self.constants)
    
    def generate_pool_code(self, pool_var: str = 'F') -> str:
        """
        Generate Lua code to initialize the constant pool.
        
        Args:
            pool_var: Variable name for the pool table
        
        Returns:
            Lua code initializing the constant pool
        """
        lines = [f'local {pool_var}={{}}']
        
        for index, value in self.constants.items():
            computed_idx = self.generate_computed_index(index)
            
            if isinstance(value, str):
                # String constant - will be encrypted by string obfuscator
                escaped = value.replace('\\', '\\\\').replace('"', '\\"')
                lines.append(f'{pool_var}[{computed_idx}]="{escaped}"')
            elif isinstance(value, bool):
                lines.append(f'{pool_var}[{computed_idx}]={str(value).lower()}')
            elif value is None:
                lines.append(f'{pool_var}[{computed_idx}]=nil')
            else:
                lines.append(f'{pool_var}[{computed_idx}]={value}')
        
        return ';'.join(lines)
    
    def __repr__(self) -> str:
        return f"ConstantPoolManager(constants={len(self.constants)}, next_index={self.next_index})"
