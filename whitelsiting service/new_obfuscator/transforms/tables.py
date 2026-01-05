"""
Table Indirection Generator for the Luraph-style obfuscator.

This module provides table access transformations that match
Luraph v14.4.1 output style, including:
- Nested table indirection: table[key] -> S[0X2][21][0xb](...)
- Computed index expressions
- Table write indirection
- Instruction access transformation

Requirements: 10.1, 10.2, 10.3, 10.4
"""

from typing import List, Optional, Tuple

try:
    from ..core.seed import PolymorphicBuildSeed
    from ..core.constants import ConstantPoolManager
except ImportError:
    from core.seed import PolymorphicBuildSeed
    from core.constants import ConstantPoolManager


class ComputedIndexGenerator:
    """
    Computed Index Generator (CIG) for generating obfuscated index expressions.
    
    Generates computed index expressions instead of direct indices,
    making table access patterns harder to analyze.
    
    Example:
        >>> cig = ComputedIndexGenerator(PolymorphicBuildSeed(seed=42))
        >>> cig.generate(5)
        '(0x3+0x2)'
    """
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize the Computed Index Generator.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
    
    def generate(self, index: int) -> str:
        """
        Generate a computed index expression for the given index.
        
        Args:
            index: The target index value
        
        Returns:
            Computed expression that evaluates to the index
        
        Example:
            >>> cig.generate(10)
            '(0x5+0x5)'
        """
        method = self.seed.get_random_int(0, 6)
        
        if method == 0:
            return self._to_hex(index)
        elif method == 1:
            return self._to_binary(index)
        elif method == 2:
            return self._to_addition(index)
        elif method == 3:
            return self._to_subtraction(index)
        elif method == 4:
            return self._to_hex_underscore(index)
        elif method == 5:
            return self._to_mixed_format(index)
        else:
            return str(index)
    
    def _to_hex(self, num: int) -> str:
        """Convert to hex format."""
        prefix = self.seed.choice(['0x', '0X'])
        return f'{prefix}{num:X}'
    
    def _to_binary(self, num: int) -> str:
        """Convert to binary format (for small numbers)."""
        if num > 255:
            return self._to_hex(num)
        prefix = self.seed.choice(['0b', '0B'])
        return f'{prefix}{num:b}'
    
    def _to_hex_underscore(self, num: int) -> str:
        """Convert to hex with underscores."""
        hex_str = f'{num:X}'
        
        if len(hex_str) >= 2:
            # Insert underscore(s) at random position
            pos = self.seed.get_random_int(1, len(hex_str))
            underscore_count = self.seed.get_random_int(1, 2)
            underscores = '_' * underscore_count
            hex_str = hex_str[:pos] + underscores + hex_str[pos:]
        
        prefix = self.seed.choice(['0x', '0X'])
        return f'{prefix}{hex_str}'
    
    def _to_addition(self, num: int) -> str:
        """Convert to addition expression."""
        if num <= 0:
            return str(num)
        
        a = self.seed.get_random_int(0, num)
        b = num - a
        
        a_str = self._format_operand(a)
        b_str = self._format_operand(b)
        
        return f'({a_str}+{b_str})'
    
    def _to_subtraction(self, num: int) -> str:
        """Convert to subtraction expression."""
        extra = self.seed.get_random_int(1, 100)
        a = num + extra
        b = extra
        
        a_str = self._format_operand(a)
        b_str = self._format_operand(b)
        
        return f'({a_str}-{b_str})'
    
    def _to_mixed_format(self, num: int) -> str:
        """Convert using mixed format (hex/binary/decimal)."""
        fmt = self.seed.get_random_int(0, 2)
        
        if fmt == 0:
            return self._to_hex(num)
        elif fmt == 1 and num <= 255:
            return self._to_binary(num)
        else:
            return str(num)
    
    def _format_operand(self, num: int) -> str:
        """Format a number operand."""
        fmt = self.seed.get_random_int(0, 2)
        
        if fmt == 0:
            return str(num)
        elif fmt == 1:
            return f'0x{num:X}'
        else:
            return f'0X{num:x}'


class TableIndirectionGenerator:
    """
    Table Indirection Generator for Luraph-style table access obfuscation.
    
    Transforms simple table accesses into nested indirection patterns
    matching Luraph v14.4.1 output style:
    - table[key] -> S[0X2][21][0xb]((S[2][0B0010101]...))
    - table[key] = value -> similar nested pattern
    
    Attributes:
        MIN_DEPTH: Minimum nesting depth (2)
        MAX_DEPTH: Maximum nesting depth (4)
    
    Example:
        >>> tig = TableIndirectionGenerator(PolymorphicBuildSeed(seed=42))
        >>> tig.wrap_table_read('table', 'key')
        'S[0X2][21][0xb](table,key)'
    """
    
    # Nesting depth range
    MIN_DEPTH = 2
    MAX_DEPTH = 4
    
    # Wrapper table names used in Luraph style
    WRAPPER_TABLES = ['S', 'O', 'C', 'F', 'w', 'e', 'X', '_']
    
    # Method names for function-style access
    METHOD_INDICES = [0xb, 0xd, 0x5, 0x7, 0x9, 0x11, 0x13, 0x15]
    
    def __init__(self, seed: PolymorphicBuildSeed, cpm: Optional[ConstantPoolManager] = None):
        """
        Initialize the Table Indirection Generator.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            cpm: Optional ConstantPoolManager for constant indices
        """
        self.seed = seed
        self.cpm = cpm
        self.cig = ComputedIndexGenerator(seed)
        
        # Track generated wrapper structures
        self._wrapper_structures: List[str] = []
    
    def wrap_table_read(self, table_name: str, key: str, depth: Optional[int] = None) -> str:
        """
        Wrap a table read operation with nested indirection.
        
        Transforms: table[key] -> S[0X2][21][0xb]((S[2][0B0010101][0Xb](table,key)))
        
        Args:
            table_name: The table variable name
            key: The key expression
            depth: Optional nesting depth (default: random 2-4)
        
        Returns:
            Obfuscated table read expression
        
        Example:
            >>> tig.wrap_table_read('myTable', 'myKey')
            'S[0X2][21][0xb](myTable,myKey)'
        """
        if depth is None:
            depth = self.seed.get_random_int(self.MIN_DEPTH, self.MAX_DEPTH)
        
        # Choose wrapper table
        wrapper_table = self.seed.choice(self.WRAPPER_TABLES)
        
        # Build nested access chain
        access_chain = self._build_access_chain(wrapper_table, depth)
        
        # Choose access style
        style = self.seed.get_random_int(0, 2)
        
        if style == 0:
            # Function-style: S[0X2][21][0xb](table,key)
            method_idx = self.seed.choice(self.METHOD_INDICES)
            method_idx_str = self.cig.generate(method_idx)
            return f'{access_chain}[{method_idx_str}]({table_name},{key})'
        
        elif style == 1:
            # Nested function call: S[0X2][21][0xb]((inner_access))
            inner = self._build_inner_access(table_name, key)
            method_idx = self.seed.choice(self.METHOD_INDICES)
            method_idx_str = self.cig.generate(method_idx)
            return f'{access_chain}[{method_idx_str}](({inner}))'
        
        else:
            # Direct nested access: S[0X2][21][table][key]
            return f'{access_chain}[{table_name}][{key}]'
    
    def wrap_table_write(self, table_name: str, key: str, value: str, depth: Optional[int] = None) -> str:
        """
        Wrap a table write operation with nested indirection.
        
        Transforms: table[key] = value -> (S[0X2][21])[table][key] = value
        
        Args:
            table_name: The table variable name
            key: The key expression
            value: The value expression
            depth: Optional nesting depth (default: random 2-4)
        
        Returns:
            Obfuscated table write statement
        
        Example:
            >>> tig.wrap_table_write('myTable', 'myKey', 'myValue')
            '(S[0X2][21])[myTable][myKey]=(myValue)'
        """
        if depth is None:
            depth = self.seed.get_random_int(self.MIN_DEPTH, self.MAX_DEPTH)
        
        # Choose wrapper table
        wrapper_table = self.seed.choice(self.WRAPPER_TABLES)
        
        # Build nested access chain
        access_chain = self._build_access_chain(wrapper_table, depth)
        
        # Choose write style
        style = self.seed.get_random_int(0, 2)
        
        if style == 0:
            # Parenthesized access: (S[0X2][21])[table][key]=(value)
            return f'({access_chain})[{table_name}][{key}]=({value})'
        
        elif style == 1:
            # Function-style write: S[0X2][21][0xd](table,key,value)
            method_idx = self.seed.choice(self.METHOD_INDICES)
            method_idx_str = self.cig.generate(method_idx)
            return f'{access_chain}[{method_idx_str}]({table_name},{key},{value})'
        
        else:
            # Direct nested write
            return f'{access_chain}[{table_name}][{key}]=({value})'
    
    def transform_instruction_access(self, instr_table: str, pc: str, field: Optional[str] = None) -> str:
        """
        Transform instruction table access for VM bytecode.
        
        Transforms: instructions[pc] -> O.I[pc] or similar
        
        Args:
            instr_table: The instruction table name
            pc: The program counter expression
            field: Optional field name for instruction fields
        
        Returns:
            Obfuscated instruction access expression
        
        Example:
            >>> tig.transform_instruction_access('instructions', 'pc', 'opcode')
            'O.I[pc].opcode'
        """
        # Choose context variable
        context_var = self.seed.choice(['O', 'C', 'F', 'e'])
        
        # Choose instruction table alias
        instr_alias = self.seed.choice(['I', 'i', 'J', 'j'])
        
        # Format PC
        pc_formatted = self._format_index_expression(pc)
        
        if field:
            # Access with field: O.I[pc].field or O.I[pc][field]
            field_style = self.seed.get_random_int(0, 1)
            if field_style == 0:
                return f'{context_var}.{instr_alias}[{pc_formatted}].{field}'
            else:
                field_str = self._format_field_name(field)
                return f'{context_var}.{instr_alias}[{pc_formatted}][{field_str}]'
        else:
            # Simple access: O.I[pc]
            return f'{context_var}.{instr_alias}[{pc_formatted}]'
    
    def generate_wrapper_table(self, name: str, depth: int = 3) -> str:
        """
        Generate a wrapper table structure for indirection.
        
        Creates nested table structures used for indirection:
        local S = {{}, {[21]={[0xb]=function(t,k) return t[k] end}}}
        
        Args:
            name: Variable name for the wrapper table
            depth: Nesting depth
        
        Returns:
            Lua code defining the wrapper table
        """
        # Generate nested structure
        inner_methods = self._generate_inner_methods()
        
        # Build nested table
        indices = []
        for _ in range(depth):
            idx = self.seed.get_random_int(1, 30)
            indices.append(self.cig.generate(idx))
        
        # Create table definition
        table_def = f'local {name}={{{{}}'
        
        for i, idx in enumerate(indices):
            if i == len(indices) - 1:
                # Innermost level has methods
                table_def += f',{{[{idx}]={{{inner_methods}}}}}'
            else:
                table_def += f',{{[{idx}]={{}}}}'
        
        table_def += '}'
        
        self._wrapper_structures.append(table_def)
        return table_def
    
    def _build_access_chain(self, base: str, depth: int) -> str:
        """
        Build a nested access chain.
        
        Args:
            base: Base table name
            depth: Number of nested accesses
        
        Returns:
            Access chain string (e.g., 'S[0X2][21]')
        """
        chain = base
        
        for _ in range(depth):
            idx = self.seed.get_random_int(1, 30)
            idx_str = self.cig.generate(idx)
            chain = f'{chain}[{idx_str}]'
        
        return chain
    
    def _build_inner_access(self, table_name: str, key: str) -> str:
        """
        Build an inner access expression for nested wrapping.
        
        Args:
            table_name: Table name
            key: Key expression
        
        Returns:
            Inner access expression
        """
        # Choose inner wrapper
        inner_wrapper = self.seed.choice(self.WRAPPER_TABLES)
        inner_depth = self.seed.get_random_int(1, 2)
        
        inner_chain = self._build_access_chain(inner_wrapper, inner_depth)
        method_idx = self.seed.choice(self.METHOD_INDICES)
        method_idx_str = self.cig.generate(method_idx)
        
        return f'{inner_chain}[{method_idx_str}]({table_name},{key})'
    
    def _format_index_expression(self, expr: str) -> str:
        """
        Format an index expression.
        
        Args:
            expr: The expression to format
        
        Returns:
            Formatted expression
        """
        # If it's a simple number, obfuscate it
        try:
            num = int(expr)
            return self.cig.generate(num)
        except ValueError:
            # It's a variable or complex expression
            return expr
    
    def _format_field_name(self, field: str) -> str:
        """
        Format a field name for bracket notation.
        
        Args:
            field: Field name
        
        Returns:
            Formatted field string
        """
        # Use string.char encoding for field names
        style = self.seed.get_random_int(0, 2)
        
        if style == 0:
            # Direct string: "field"
            return f'"{field}"'
        elif style == 1:
            # Escape sequence string
            escaped = ''.join(f'\\{ord(c):03d}' for c in field)
            return f'"{escaped}"'
        else:
            # Hex escape sequence
            escaped = ''.join(f'\\x{ord(c):02X}' for c in field)
            return f'"{escaped}"'
    
    def _generate_inner_methods(self) -> str:
        """
        Generate inner method definitions for wrapper tables.
        
        Returns:
            Lua code for inner methods
        """
        methods = []
        
        for method_idx in self.METHOD_INDICES[:4]:  # Use first 4 methods
            idx_str = self.cig.generate(method_idx)
            
            # Generate method body
            method_type = self.seed.get_random_int(0, 2)
            
            if method_type == 0:
                # Read method: function(t,k) return t[k] end
                methods.append(f'[{idx_str}]=function(t,k)return t[k]end')
            elif method_type == 1:
                # Write method: function(t,k,v) t[k]=v end
                methods.append(f'[{idx_str}]=function(t,k,v)t[k]=v end')
            else:
                # Identity method: function(...) return ... end
                methods.append(f'[{idx_str}]=function(...)return(...)end')
        
        return ','.join(methods)
    
    def wrap_with_ternary(self, table_name: str, key: str, condition: str) -> str:
        """
        Wrap table access with ternary-style conditional.
        
        Luraph style: P>H and P or H pattern applied to table access.
        
        Args:
            table_name: Table name
            key: Key expression
            condition: Condition expression
        
        Returns:
            Ternary-wrapped table access
        
        Example:
            >>> tig.wrap_with_ternary('T', 'k', 'P>H')
            'S[0X2][0B010101][0Xd](P>H and T or T)'
        """
        wrapper_table = self.seed.choice(self.WRAPPER_TABLES)
        depth = self.seed.get_random_int(2, 3)
        access_chain = self._build_access_chain(wrapper_table, depth)
        
        method_idx = self.seed.choice(self.METHOD_INDICES)
        method_idx_str = self.cig.generate(method_idx)
        
        # Build ternary expression
        ternary = f'{condition} and {table_name} or {table_name}'
        
        return f'{access_chain}[{method_idx_str}](({ternary}))'
    
    def generate_nested_access_pattern(self, base_table: str, keys: List[str]) -> str:
        """
        Generate a deeply nested access pattern for multiple keys.
        
        Args:
            base_table: Base table name
            keys: List of key expressions
        
        Returns:
            Nested access pattern
        
        Example:
            >>> tig.generate_nested_access_pattern('T', ['a', 'b', 'c'])
            'S[0X2][21][0xb]((S[2][0B0010101][0Xb]((S[0X2][0B010101][0Xd](T[a]))[b]))[c])'
        """
        if not keys:
            return base_table
        
        # Start with innermost access
        result = f'{base_table}[{keys[0]}]'
        
        # Wrap each subsequent key access
        for key in keys[1:]:
            # Wrap current result
            wrapper_table = self.seed.choice(self.WRAPPER_TABLES)
            depth = self.seed.get_random_int(1, 2)
            access_chain = self._build_access_chain(wrapper_table, depth)
            
            method_idx = self.seed.choice(self.METHOD_INDICES)
            method_idx_str = self.cig.generate(method_idx)
            
            result = f'{access_chain}[{method_idx_str}](({result}))[{key}]'
        
        # Final outer wrap
        wrapper_table = self.seed.choice(self.WRAPPER_TABLES)
        depth = self.seed.get_random_int(2, 3)
        access_chain = self._build_access_chain(wrapper_table, depth)
        
        method_idx = self.seed.choice(self.METHOD_INDICES)
        method_idx_str = self.cig.generate(method_idx)
        
        return f'{access_chain}[{method_idx_str}](({result}))'
    
    def get_wrapper_structures(self) -> List[str]:
        """
        Get all generated wrapper table structures.
        
        Returns:
            List of wrapper table definition strings
        """
        return self._wrapper_structures.copy()
    
    def __repr__(self) -> str:
        return f"TableIndirectionGenerator(seed={self.seed.get_seed()})"
