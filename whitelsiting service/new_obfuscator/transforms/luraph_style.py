"""
Luraph-Style Transforms for the Luraph-style obfuscator.

This module provides Luraph v14.4.1 style transformations including:
- LuraphFunctionTransformer: generateParams() and transformBody()
- LuraphStatementFormatter: format() and removeWhitespace()
- LargeIndexGenerator: Base 10000+ indices
- LuraphPatternLibrary: Standard Luraph patterns
- VMTemplateTransformer: Transform VM templates
- HandlerBodyDensifier (HBD): Densify handler bodies
- ConstantPoolReferenceInjector (CPRI): Inject constant references
- LuraphExpressionGenerator (LEG): Generate Luraph-style expressions

Requirements: 32.1, 32.2, 32.3, 32.4, 32.5, 32.6, 32.7, 32.8
"""

import re
from typing import List, Optional, Dict, Tuple, Any

try:
    from ..core.seed import PolymorphicBuildSeed
    from ..core.naming import UnifiedNamingSystem
    from ..core.constants import ConstantPoolManager
    from ..core.predicates import OpaquePredicateGenerator
except ImportError:
    from core.seed import PolymorphicBuildSeed
    from core.naming import UnifiedNamingSystem
    from core.constants import ConstantPoolManager
    from core.predicates import OpaquePredicateGenerator


class LuraphFunctionTransformer:
    """
    Luraph Function Transformer for transforming function definitions.
    
    Transforms function definitions to match Luraph v14.4.1 output style:
    - generateParams(): Generate obfuscated parameter names
    - transformBody(): Transform function body with Luraph patterns
    
    Example:
        >>> lft = LuraphFunctionTransformer(PolymorphicBuildSeed(seed=42))
        >>> lft.generate_params(3)
        ['_Il1lI1lOO', '_O0O1_Il1l', '_lI1lOO0O1']
        >>> lft.transform_body('return a + b')
        'e=17;(O[0x1])[0X4]=(O[1][4]+C);return e'
    
    Requirements: 32.1
    """
    
    # Parameter name length (Luraph uses 10-character params)
    PARAM_LENGTH = 10
    
    # Confusing characters for parameter names
    PARAM_CHARS = ['l', 'I', 'O', '0', '1', '_']
    
    # Valid start characters for identifiers
    VALID_START = ['l', 'I', 'O', '_']
    
    def __init__(self, seed: PolymorphicBuildSeed, naming: Optional[UnifiedNamingSystem] = None):
        """
        Initialize the Luraph Function Transformer.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            naming: Optional UnifiedNamingSystem for name generation
        """
        self.seed = seed
        self.naming = naming or UnifiedNamingSystem(seed)
        self._param_counter = 0
    
    def generate_params(self, count: int) -> List[str]:
        """
        Generate obfuscated parameter names.
        
        Luraph style uses 10-character confusing parameter names.
        
        Args:
            count: Number of parameters to generate
        
        Returns:
            List of obfuscated parameter names
        
        Example:
            >>> lft.generate_params(3)
            ['_Il1lI1lOO', '_O0O1_Il1l', '_lI1lOO0O1']
        """
        params = []
        for _ in range(count):
            # Generate 10-character confusing name
            first_char = self.seed.choice(self.VALID_START)
            remaining = self.seed.choices(self.PARAM_CHARS, self.PARAM_LENGTH - 1)
            param = first_char + ''.join(remaining)
            params.append(param)
            self._param_counter += 1
        return params
    
    def generate_single_letter_params(self, count: int) -> List[str]:
        """
        Generate single-letter parameter names (Luraph style).
        
        Luraph often uses single letters like O, e, C, F for parameters.
        
        Args:
            count: Number of parameters to generate
        
        Returns:
            List of single-letter parameter names
        """
        # Luraph-style single letter params
        letters = ['O', 'e', 'C', 'F', 'w', 'X', '_', 'I', 'l', 'S', 'P', 'H']
        params = []
        for i in range(count):
            if i < len(letters):
                params.append(letters[i])
            else:
                # Fall back to generated names
                params.append(self.naming.generate_short_name(2))
        return params
    
    def transform_body(self, body: str, context_var: str = 'O') -> str:
        """
        Transform function body with Luraph patterns.
        
        Applies transformations:
        - Variable assignments become table accesses
        - Returns are wrapped with state variables
        - Arithmetic is wrapped with bit32 operations
        
        Args:
            body: The function body code
            context_var: Context variable name (default 'O')
        
        Returns:
            Transformed function body
        
        Example:
            >>> lft.transform_body('return a + b')
            'e=17;(O[0x1])[0X4]=(O[1][4]+C);return e'
        """
        # Generate state variable
        state_var = self.seed.choice(['e', 'C', 'F', 'w'])
        state_value = self.seed.get_random_int(1, 100)
        
        # Format state value
        state_fmt = self._format_number(state_value)
        
        # Wrap body with state assignment
        transformed = f'{state_var}={state_fmt};{body}'
        
        # Transform simple returns to use state variable
        if 'return' in transformed and 'return ' + state_var not in transformed:
            # Add state return at end if not already returning state
            if not transformed.rstrip().endswith(f'return {state_var}'):
                transformed = transformed.rstrip(';') + f';return {state_var}'
        
        return transformed
    
    def transform_function(self, func_code: str) -> str:
        """
        Transform an entire function definition.
        
        Args:
            func_code: The function code (including 'function' keyword)
        
        Returns:
            Transformed function code
        """
        # Match function pattern
        pattern = r'function\s*\(([^)]*)\)\s*(.*?)\s*end'
        match = re.search(pattern, func_code, re.DOTALL)
        
        if not match:
            return func_code
        
        params_str = match.group(1)
        body = match.group(2)
        
        # Parse existing params
        if params_str.strip():
            param_count = len([p.strip() for p in params_str.split(',') if p.strip()])
        else:
            param_count = 0
        
        # Generate new params
        if param_count > 0:
            new_params = self.generate_single_letter_params(param_count)
            new_params_str = ','.join(new_params)
        else:
            new_params_str = ''
        
        # Transform body
        transformed_body = self.transform_body(body)
        
        return f'function({new_params_str}){transformed_body}end'
    
    def wrap_function_assignment(self, name: str, func_code: str) -> str:
        """
        Wrap a function assignment in Luraph style.
        
        Luraph style: I4=function(O,O,e,C)e=17;...end
        
        Args:
            name: Function name/alias
            func_code: The function code
        
        Returns:
            Wrapped function assignment
        """
        transformed = self.transform_function(func_code)
        return f'{name}={transformed}'
    
    def _format_number(self, num: int) -> str:
        """Format a number in Luraph style."""
        fmt = self.seed.get_random_int(0, 3)
        if fmt == 0:
            return f'0x{num:X}'
        elif fmt == 1:
            return f'0X{num:x}'
        elif fmt == 2 and num < 256:
            return f'0B{num:b}'
        else:
            return str(num)
    
    def __repr__(self) -> str:
        return f"LuraphFunctionTransformer(params_generated={self._param_counter})"


class LuraphStatementFormatter:
    """
    Luraph Statement Formatter for formatting statements.
    
    Provides:
    - format(): Format statements in Luraph style (dense, single-line)
    - removeWhitespace(): Remove unnecessary whitespace (alias for remove_whitespace)
    - remove_whitespace(): Remove unnecessary whitespace from code
    
    Luraph-style formatting characteristics:
    - No spaces around operators: a+b instead of a + b
    - No spaces around brackets: (x) instead of ( x )
    - Semicolons between statements: local x=1;local y=2
    - Preserved keyword spaces: local x, return x, function(
    - Single-line output for maximum density
    
    Example:
        >>> lsf = LuraphStatementFormatter(PolymorphicBuildSeed(seed=42))
        >>> lsf.format('local x = 1')
        'local x=1'
        >>> lsf.removeWhitespace('a + b')
        'a+b'
    
    Requirements: 32.2
    """
    
    # Operators that can have spaces removed
    OPERATORS = ['=', '+', '-', '*', '/', '%', '^', '<', '>', '~', ',', ';', ':', '.']
    
    # Two-character operators (must be processed before single-char)
    TWO_CHAR_OPS = ['==', '~=', '<=', '>=', '..', '::']
    
    # Keywords that require space after them when followed by identifier
    KEYWORDS_NEED_SPACE = [
        'local', 'return', 'function', 'if', 'then', 'else', 'elseif',
        'while', 'do', 'for', 'in', 'repeat', 'until', 'and', 'or', 'not',
        'end', 'break', 'continue', 'goto'
    ]
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize the Luraph Statement Formatter.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
    
    def format(self, statement: str) -> str:
        """
        Format a statement in Luraph style.
        
        Removes unnecessary whitespace while preserving required spaces
        for keywords. Produces dense, single-line output matching
        Luraph v14.4.1 style.
        
        Args:
            statement: The statement to format
        
        Returns:
            Formatted statement with minimal whitespace
        
        Example:
            >>> lsf.format('local x = 1')
            'local x=1'
            >>> lsf.format('if x > 0 then return x end')
            'if x>0 then return x end'
        """
        # Remove whitespace around operators
        result = self.remove_whitespace(statement)
        
        # Ensure keywords have required spaces
        result = self._fix_keyword_spaces(result)
        
        # Clean up any double semicolons
        result = re.sub(r';+', ';', result)
        
        # Remove trailing semicolon
        result = result.rstrip(';')
        
        return result
    
    def removeWhitespace(self, code: str) -> str:
        """
        Remove unnecessary whitespace from code (camelCase alias).
        
        This is an alias for remove_whitespace() to match the naming
        convention used in the requirements document.
        
        Args:
            code: The code to process
        
        Returns:
            Code with whitespace removed
        
        Example:
            >>> lsf.removeWhitespace('a + b')
            'a+b'
        """
        return self.remove_whitespace(code)
    
    def remove_whitespace(self, code: str) -> str:
        """
        Remove unnecessary whitespace from code.
        
        Removes spaces around operators, brackets, and collapses
        multiple whitespace characters into single spaces where needed.
        Preserves string literals.
        
        Args:
            code: The code to process
        
        Returns:
            Code with whitespace removed
        
        Example:
            >>> lsf.remove_whitespace('a + b')
            'a+b'
            >>> lsf.remove_whitespace('table[ key ]')
            'table[key]'
        """
        # First, extract strings to protect them
        code, strings = self._extract_strings(code)
        
        # Remove newlines and convert to single line
        code = code.replace('\n', ' ').replace('\r', '')
        
        # Remove spaces around two-character operators first
        for op in self.TWO_CHAR_OPS:
            code = re.sub(rf'\s*{re.escape(op)}\s*', op, code)
        
        # Remove spaces around single-character operators
        for op in self.OPERATORS:
            code = re.sub(rf'\s*{re.escape(op)}\s*', op, code)
        
        # Remove spaces around brackets
        code = re.sub(r'\s*\(\s*', '(', code)
        code = re.sub(r'\s*\)\s*', ')', code)
        code = re.sub(r'\s*\[\s*', '[', code)
        code = re.sub(r'\s*\]\s*', ']', code)
        code = re.sub(r'\s*\{\s*', '{', code)
        code = re.sub(r'\s*\}\s*', '}', code)
        
        # Collapse multiple spaces
        code = re.sub(r'\s+', ' ', code)
        
        # Restore strings
        code = self._restore_strings(code, strings)
        
        return code.strip()
    
    def _extract_strings(self, code: str) -> Tuple[str, List[str]]:
        """Extract string literals and replace with placeholders."""
        strings = []
        result = []
        i = 0
        
        while i < len(code):
            if code[i] in '"\'':
                quote = code[i]
                start = i
                i += 1
                while i < len(code):
                    if code[i] == '\\' and i + 1 < len(code):
                        i += 2
                        continue
                    if code[i] == quote:
                        i += 1
                        break
                    i += 1
                strings.append(code[start:i])
                result.append(f'\x00S{len(strings)-1}\x00')
                continue
            result.append(code[i])
            i += 1
        
        return ''.join(result), strings
    
    def _restore_strings(self, code: str, strings: List[str]) -> str:
        """Restore string literals from placeholders."""
        for i, s in enumerate(strings):
            code = code.replace(f'\x00S{i}\x00', s)
        return code
    
    def _fix_keyword_spaces(self, code: str) -> str:
        """Ensure keywords have required spaces."""
        keywords = ['local', 'return', 'function', 'if', 'then', 'else', 'elseif',
                   'while', 'do', 'for', 'in', 'repeat', 'until', 'and', 'or', 'not',
                   'end', 'break', 'continue']
        
        for kw in keywords:
            # Add space after keyword if followed by identifier
            code = re.sub(rf'\b{kw}([a-zA-Z_0-9])', rf'{kw} \1', code)
        
        return code
    
    def format_statement_list(self, statements: List[str]) -> str:
        """
        Format a list of statements with semicolons.
        
        Args:
            statements: List of statements
        
        Returns:
            Semicolon-separated formatted statements
        
        Example:
            >>> lsf.format_statement_list(['local x = 1', 'local y = 2', 'return x + y'])
            'local x=1;local y=2;return x+y'
        """
        formatted = [self.format(s) for s in statements if s.strip()]
        return ';'.join(formatted)
    
    def format_code(self, code: str) -> str:
        """
        Format multi-line code to single-line Luraph style.
        
        Converts multi-line Lua code to dense single-line format
        matching Luraph v14.4.1 output style.
        
        Args:
            code: Multi-line Lua code
        
        Returns:
            Single-line formatted code
        
        Example:
            >>> lsf.format_code('local x = 1\\nlocal y = 2\\nreturn x + y')
            'local x=1;local y=2;return x+y'
        """
        # Remove comments first
        code = self._remove_comments(code)
        
        # Split into lines and filter empty ones
        lines = [line.strip() for line in code.split('\n') if line.strip()]
        
        # Format each line and join with semicolons
        formatted_lines = []
        for line in lines:
            formatted = self.format(line)
            if formatted:
                formatted_lines.append(formatted)
        
        # Join with semicolons, handling cases where semicolons aren't needed
        result = self._join_statements(formatted_lines)
        
        # Final cleanup
        result = re.sub(r';+', ';', result)  # Remove double semicolons
        result = result.rstrip(';')  # Remove trailing semicolon
        
        return result
    
    def _remove_comments(self, code: str) -> str:
        """
        Remove comments from code.
        
        Handles both single-line (--) and multi-line (--[[ ]]) comments.
        
        Args:
            code: Lua code with comments
        
        Returns:
            Code with comments removed
        """
        # Remove multi-line comments --[[ ... ]]
        code = re.sub(r'--\[\[.*?\]\]', '', code, flags=re.DOTALL)
        
        # Remove single-line comments (but preserve strings)
        lines = []
        for line in code.split('\n'):
            # Find -- that's not in a string
            in_string = False
            quote_char = None
            result_chars = []
            i = 0
            while i < len(line):
                char = line[i]
                if not in_string:
                    if char in '"\'':
                        in_string = True
                        quote_char = char
                        result_chars.append(char)
                    elif char == '-' and i + 1 < len(line) and line[i+1] == '-':
                        # Check it's not --[[ (multi-line)
                        if i + 2 < len(line) and line[i+2] == '[':
                            result_chars.append(char)
                        else:
                            # Comment starts here, stop processing this line
                            break
                    else:
                        result_chars.append(char)
                else:
                    if char == '\\' and i + 1 < len(line):
                        result_chars.append(char)
                        result_chars.append(line[i+1])
                        i += 1
                    elif char == quote_char:
                        in_string = False
                        result_chars.append(char)
                    else:
                        result_chars.append(char)
                i += 1
            lines.append(''.join(result_chars))
        
        return '\n'.join(lines)
    
    def _join_statements(self, statements: List[str]) -> str:
        """
        Join statements with appropriate separators.
        
        Adds semicolons between statements where needed, but not after
        keywords like 'then', 'do', 'else', or before 'end', 'else', etc.
        
        Args:
            statements: List of formatted statements
        
        Returns:
            Joined statements
        """
        if not statements:
            return ''
        
        # Keywords that don't need semicolon after
        no_semi_after = ['then', 'do', 'else', 'function', '{', '(', ',']
        # Keywords that don't need semicolon before
        no_semi_before = ['end', 'else', 'elseif', 'until', ')', '}', ',']
        
        result = [statements[0]]
        
        for i in range(1, len(statements)):
            prev = result[-1].rstrip()
            curr = statements[i]
            
            # Determine if we need semicolon
            needs_semi = True
            
            for suffix in no_semi_after:
                if prev.endswith(suffix):
                    needs_semi = False
                    break
            
            for prefix in no_semi_before:
                if curr.startswith(prefix):
                    needs_semi = False
                    break
            
            # Don't add if previous already ends with semicolon
            if prev.endswith(';'):
                needs_semi = False
            
            if needs_semi:
                result.append(';')
            
            result.append(curr)
        
        return ''.join(result)
    
    def format_function_body(self, body: str) -> str:
        """
        Format a function body in Luraph style.
        
        Specifically handles function body formatting with proper
        semicolon placement and whitespace removal.
        
        Args:
            body: Function body code
        
        Returns:
            Formatted function body
        
        Example:
            >>> lsf.format_function_body('local x = 1\\nreturn x')
            'local x=1;return x'
        """
        return self.format_code(body)
    
    def __repr__(self) -> str:
        return "LuraphStatementFormatter()"



class LargeIndexGenerator:
    """
    Large Index Generator for generating base 10000+ indices.
    
    Generates large non-sequential indices matching Luraph style:
    - F[11708], F[0X6_A4E], C[24240]
    
    Example:
        >>> lig = LargeIndexGenerator(PolymorphicBuildSeed(seed=42))
        >>> lig.generate_index()
        11708
        >>> lig.format_index(11708)
        '0X2D_8C'
    
    Requirements: 32.3
    """
    
    # Base index value (Luraph uses 10000+)
    BASE_INDEX = 10000
    
    # Maximum index value
    MAX_INDEX = 99999
    
    # Gap range between indices
    MIN_GAP = 100
    MAX_GAP = 5000
    
    def __init__(self, seed: PolymorphicBuildSeed, cpm: Optional[ConstantPoolManager] = None):
        """
        Initialize the Large Index Generator.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            cpm: Optional ConstantPoolManager for integration
        """
        self.seed = seed
        self.cpm = cpm
        self._next_index = self.BASE_INDEX + seed.get_random_int(0, 1000)
        self._used_indices: set = set()
    
    def generate_index(self) -> int:
        """
        Generate a large non-sequential index.
        
        Returns:
            Large index >= 10000
        
        Example:
            >>> lig.generate_index()
            11708
        """
        gap = self.seed.get_random_int(self.MIN_GAP, self.MAX_GAP)
        index = self._next_index + gap
        self._next_index = index + 1
        self._used_indices.add(index)
        return index
    
    def format_index(self, index: int) -> str:
        """
        Format an index in Luraph style.
        
        Uses various formats:
        - 0X2D_8C (hex with underscore)
        - 0x2D8C (plain hex)
        - 11708 (decimal)
        - 0B10110110001100 (binary for smaller values)
        
        Args:
            index: The index to format
        
        Returns:
            Formatted index string
        
        Example:
            >>> lig.format_index(11708)
            '0X2D_8C'
        """
        fmt = self.seed.get_random_int(0, 5)
        
        if fmt == 0:
            # Hex with underscore
            hex_str = f'{index:X}'
            if len(hex_str) >= 2:
                pos = self.seed.get_random_int(1, len(hex_str))
                # CRITICAL: Luau only supports SINGLE underscores in numeric literals!
                hex_str = hex_str[:pos] + '_' + hex_str[pos:]
            prefix = self.seed.choice(['0x', '0X'])
            return f'{prefix}{hex_str}'
        
        elif fmt == 1:
            # Plain hex
            prefix = self.seed.choice(['0x', '0X'])
            return f'{prefix}{index:X}'
        
        elif fmt == 2:
            # Mixed case hex
            hex_str = f'{index:x}'
            mixed = ''.join(c.upper() if self.seed.random_bool() else c for c in hex_str)
            prefix = self.seed.choice(['0x', '0X'])
            return f'{prefix}{mixed}'
        
        elif fmt == 3 and index < 65536:
            # Binary with underscores
            bin_str = f'{index:b}'
            if len(bin_str) >= 8:
                parts = [bin_str[i:i+4] for i in range(0, len(bin_str), 4)]
                # CRITICAL: Luau only supports SINGLE underscores in numeric literals!
                bin_str = '_'.join(parts)
            prefix = self.seed.choice(['0b', '0B'])
            return f'{prefix}{bin_str}'
        
        elif fmt == 4:
            # Decimal with underscore for large numbers
            dec_str = str(index)
            if len(dec_str) >= 4:
                pos = self.seed.get_random_int(1, len(dec_str))
                dec_str = dec_str[:pos] + '_' + dec_str[pos:]
            return dec_str
        
        else:
            # Plain decimal
            return str(index)
    
    def generate_formatted_index(self) -> str:
        """
        Generate and format a new index.
        
        Returns:
            Formatted large index string
        """
        index = self.generate_index()
        return self.format_index(index)
    
    def generate_table_access(self, table_name: str) -> str:
        """
        Generate a table access with large index.
        
        Args:
            table_name: Name of the table (e.g., 'F', 'C')
        
        Returns:
            Table access expression (e.g., 'F[11708]')
        """
        index = self.generate_formatted_index()
        return f'{table_name}[{index}]'
    
    def get_used_indices(self) -> set:
        """Get all used indices."""
        return self._used_indices.copy()
    
    def __repr__(self) -> str:
        return f"LargeIndexGenerator(next={self._next_index}, used={len(self._used_indices)})"


class LuraphPatternLibrary:
    """
    Luraph Pattern Library for applying standard Luraph patterns.
    
    Contains common patterns from Luraph v14.4.1:
    - Conditional patterns with opaque predicates
    - Table access patterns with nested indirection
    - Arithmetic patterns with bit32 wrappers
    - State machine patterns
    
    Example:
        >>> lpl = LuraphPatternLibrary(PolymorphicBuildSeed(seed=42))
        >>> lpl.get_conditional_pattern('x > 0')
        'if not F[11708]then(F)[11755]=...;else e=(F[11708]);end'
    
    Requirements: 32.4
    """
    
    # Common Luraph variable names
    CONTEXT_VARS = ['O', 'C', 'F', 'e', 'w', 'X', '_', 'S', 'P', 'H']
    
    # Bit32 method aliases
    BIT32_METHODS = ['VL', 'LL', 'JL', 'IL', 'AL', 'pL', 'hL', 'm4', 'g4', 'N', 'Y', 'U']
    
    def __init__(self, seed: PolymorphicBuildSeed, 
                 opg: Optional[OpaquePredicateGenerator] = None,
                 lig: Optional[LargeIndexGenerator] = None):
        """
        Initialize the Luraph Pattern Library.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            opg: Optional OpaquePredicateGenerator
            lig: Optional LargeIndexGenerator
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
        self.lig = lig or LargeIndexGenerator(seed)
    
    def get_conditional_pattern(self, condition: str, true_body: str, false_body: str = '') -> str:
        """
        Generate a Luraph-style conditional pattern.
        
        Luraph style:
        if not F[11708]then(F)[11755]=...;else e=(F[11708]);end
        
        Args:
            condition: The condition expression
            true_body: Code for true branch
            false_body: Code for false branch (optional)
        
        Returns:
            Luraph-style conditional
        """
        # Generate indices for the pattern
        idx1 = self.lig.generate_formatted_index()
        idx2 = self.lig.generate_formatted_index()
        
        state_var = self.seed.choice(['e', 'C', 'F', 'w'])
        table_var = self.seed.choice(['F', 'C', 'O'])
        
        if false_body:
            return f'if not {table_var}[{idx1}]then({table_var})[{idx2}]=({true_body});else {state_var}=({false_body});end'
        else:
            return f'if {condition} then {true_body} end'
    
    def get_table_access_pattern(self, table: str, key: str, depth: int = 2) -> str:
        """
        Generate a Luraph-style nested table access pattern.
        
        Luraph style: S[0X2][21][0xb]((S[2][0B0010101][0Xb](...)))
        
        Args:
            table: Base table name
            key: The key to access
            depth: Nesting depth (default 2)
        
        Returns:
            Nested table access expression
        """
        result = table
        for _ in range(depth):
            idx = self.lig.generate_formatted_index()
            result = f'{result}[{idx}]'
        
        return f'{result}[{key}]'
    
    def get_arithmetic_pattern(self, left: str, op: str, right: str) -> str:
        """
        Generate a Luraph-style arithmetic pattern.
        
        Luraph style: (O.VL((O.JL(a,O.I[0x5])),O.I[0X3]))
        
        Args:
            left: Left operand
            op: Operator
            right: Right operand
        
        Returns:
            Wrapped arithmetic expression
        """
        context = self.seed.choice(self.CONTEXT_VARS)
        method1 = self.seed.choice(self.BIT32_METHODS)
        method2 = self.seed.choice(self.BIT32_METHODS)
        
        idx1 = self._format_small_index()
        idx2 = self._format_small_index()
        
        # Basic pattern: (O.METHOD((left op right), O.I[idx]))
        inner = f'({left}{op}{right})'
        return f'({context}.{method1}(({context}.{method2}({inner},{context}.I[{idx1}])),{context}.I[{idx2}]))'
    
    def get_ternary_pattern(self, condition: str, true_val: str, false_val: str) -> str:
        """
        Generate a Luraph-style ternary pattern.
        
        Luraph style: (condition and true_val or false_val)
        
        Args:
            condition: The condition
            true_val: Value if true
            false_val: Value if false
        
        Returns:
            Ternary expression
        """
        return f'({condition} and {true_val} or {false_val})'
    
    def get_state_machine_pattern(self, initial_state: int, body: str) -> str:
        """
        Generate a Luraph-style state machine pattern.
        
        Luraph style: F=0X0053_;while true do if F<=0x16 then...end
        
        Args:
            initial_state: Initial state value
            body: State machine body
        
        Returns:
            State machine code
        """
        state_var = self.seed.choice(['F', 'C', 'e', 'w'])
        state_fmt = self._format_number(initial_state)
        
        return f'{state_var}={state_fmt};while true do {body} end'
    
    def get_return_table_pattern(self, entries: Dict[str, str]) -> str:
        """
        Generate a Luraph-style return table pattern.
        
        Luraph style: return({I4=function(...)end,P=unpack,VL=bit32.bxor,...})
        
        Args:
            entries: Dictionary of table entries
        
        Returns:
            Return table expression
        """
        formatted_entries = []
        for key, value in entries.items():
            formatted_entries.append(f'{key}={value}')
        
        return f'return({{{",".join(formatted_entries)}}})'
    
    def get_unicode_escape_pattern(self, text: str) -> str:
        r"""
        Generate a Luraph-style unicode escape pattern.
        
        Luraph style: '\\u{02E}\\u{02E}...'
        
        Args:
            text: Text to convert
        
        Returns:
            Unicode escape string
        """
        escapes = []
        for char in text:
            code = ord(char)
            escapes.append(f'\\u{{{code:03X}}}')
        return f"'{''.join(escapes)}'"
    
    def _format_small_index(self) -> str:
        """Format a small index (1-10) in various formats."""
        idx = self.seed.get_random_int(1, 10)
        fmt = self.seed.get_random_int(0, 3)
        if fmt == 0:
            return f'0x{idx:X}'
        elif fmt == 1:
            return f'0X{idx:X}'
        elif fmt == 2:
            return f'0B{idx:b}'
        else:
            return str(idx)
    
    def _format_number(self, num: int) -> str:
        """Format a number in Luraph style."""
        fmt = self.seed.get_random_int(0, 4)
        if fmt == 0:
            hex_str = f'{num:X}'
            if len(hex_str) >= 2:
                pos = len(hex_str) // 2
                hex_str = hex_str[:pos] + '_' + hex_str[pos:]
            return f'0X{hex_str}'
        elif fmt == 1:
            return f'0x{num:X}'
        elif fmt == 2 and num < 256:
            return f'0B{num:b}'
        else:
            return str(num)
    
    def __repr__(self) -> str:
        return "LuraphPatternLibrary()"



class VMTemplateTransformer:
    """
    VM Template Transformer for transforming VM templates.
    
    Transforms the FIU VM template to match Luraph style:
    - Rename variables to confusing names
    - Transform function definitions
    - Apply number obfuscation
    - Densify code structure
    
    Example:
        >>> vtt = VMTemplateTransformer(PolymorphicBuildSeed(seed=42))
        >>> vtt.transform(vm_code)
        '...(obfuscated VM code)...'
    
    Requirements: 32.5
    """
    
    # VM-specific variables that need renaming
    VM_VARS = [
        'luau_deserialize', 'luau_load', 'luau_execute',
        'bytecode', 'module', 'closure', 'env',
        'stack', 'upvalues', 'constants', 'protos',
        'pc', 'top', 'base', 'vararg',
    ]
    
    # Opcode handler names
    OPCODE_HANDLERS = [
        'NOP', 'BREAK', 'LOADNIL', 'LOADB', 'LOADN', 'LOADK',
        'MOVE', 'GETGLOBAL', 'SETGLOBAL', 'GETUPVAL', 'SETUPVAL',
        'CLOSEUPVALS', 'GETIMPORT', 'GETTABLE', 'SETTABLE',
        'GETTABLEKS', 'SETTABLEKS', 'GETTABLEN', 'SETTABLEN',
        'NEWCLOSURE', 'NAMECALL', 'CALL', 'RETURN', 'JUMP',
        'JUMPBACK', 'JUMPIF', 'JUMPIFNOT', 'JUMPIFEQ', 'JUMPIFLE',
        'JUMPIFLT', 'JUMPIFNOTEQ', 'JUMPIFNOTLE', 'JUMPIFNOTLT',
        'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'POW', 'ADDK', 'SUBK',
        'MULK', 'DIVK', 'MODK', 'POWK', 'AND', 'OR', 'ANDK', 'ORK',
        'CONCAT', 'NOT', 'MINUS', 'LENGTH', 'NEWTABLE', 'DUPTABLE',
        'SETLIST', 'FORNPREP', 'FORNLOOP', 'FORGLOOP', 'FORGPREP_INEXT',
        'FORGLOOP_INEXT', 'FORGPREP_NEXT', 'FORGLOOP_NEXT', 'GETVARARGS',
        'DUPCLOSURE', 'PREPVARARGS', 'LOADKX', 'JUMPX', 'FASTCALL',
        'COVERAGE', 'CAPTURE', 'SUBRK', 'DIVRK',
    ]
    
    def __init__(self, seed: PolymorphicBuildSeed, naming: Optional[UnifiedNamingSystem] = None):
        """
        Initialize the VM Template Transformer.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            naming: Optional UnifiedNamingSystem for name generation
        """
        self.seed = seed
        self.naming = naming or UnifiedNamingSystem(seed)
        self.lft = LuraphFunctionTransformer(seed, naming)
        self.lsf = LuraphStatementFormatter(seed)
        self._var_map: Dict[str, str] = {}
    
    def transform(self, vm_code: str) -> str:
        """
        Transform VM template to Luraph style.
        
        Args:
            vm_code: The VM template code
        
        Returns:
            Transformed VM code
        """
        # Step 1: Generate variable mappings
        self._generate_var_mappings()
        
        # Step 2: Rename variables
        result = self._rename_variables(vm_code)
        
        # Step 3: Transform function definitions
        result = self._transform_functions(result)
        
        # Step 4: Apply number transformations
        result = self._transform_numbers(result)
        
        return result
    
    def _generate_var_mappings(self) -> None:
        """Generate mappings from original to obfuscated variable names."""
        for var in self.VM_VARS:
            self._var_map[var] = self.naming.generate_name()
    
    def _rename_variables(self, code: str) -> str:
        """Rename VM variables to obfuscated names."""
        result = code
        for orig, obf in self._var_map.items():
            # Use word boundary matching to avoid partial replacements
            result = re.sub(rf'\b{orig}\b', obf, result)
        return result
    
    def _transform_functions(self, code: str) -> str:
        """Transform function definitions in the VM code."""
        # Match function definitions
        pattern = r'(local\s+)?function\s+(\w+)\s*\(([^)]*)\)'
        
        def replace_func(match):
            local_prefix = match.group(1) or ''
            func_name = match.group(2)
            params = match.group(3)
            
            # Generate new function name if not already mapped
            if func_name not in self._var_map:
                self._var_map[func_name] = self.naming.generate_short_name(8)
            
            new_name = self._var_map[func_name]
            
            # Generate new parameter names
            if params.strip():
                param_list = [p.strip() for p in params.split(',') if p.strip()]
                new_params = self.lft.generate_single_letter_params(len(param_list))
                new_params_str = ','.join(new_params)
            else:
                new_params_str = ''
            
            return f'{local_prefix}function {new_name}({new_params_str})'
        
        return re.sub(pattern, replace_func, code)
    
    def _transform_numbers(self, code: str) -> str:
        """Transform numeric literals in the VM code."""
        # Skip strings when transforming numbers
        result = []
        i = 0
        while i < len(code):
            if code[i] in '"\'':
                # Skip string
                quote = code[i]
                start = i
                i += 1
                while i < len(code):
                    if code[i] == '\\' and i + 1 < len(code):
                        i += 2
                        continue
                    if code[i] == quote:
                        i += 1
                        break
                    i += 1
                result.append(code[start:i])
            else:
                result.append(code[i])
                i += 1
        
        code = ''.join(result)
        
        # Transform numbers outside strings
        def transform_num(match):
            num_str = match.group(0)
            if num_str.startswith(('0x', '0X', '0b', '0B')):
                return num_str
            try:
                num = int(num_str)
                if num < 2:
                    return num_str
                return self._format_number(num)
            except ValueError:
                return num_str
        
        pattern = r'(?<![a-zA-Z_0-9xXbB])(\d+)(?![a-zA-Z_0-9])'
        return re.sub(pattern, transform_num, code)
    
    def _format_number(self, num: int) -> str:
        """Format a number in Luraph style."""
        fmt = self.seed.get_random_int(0, 4)
        if fmt == 0 and num < 65536:
            bin_str = f'{num:b}'
            if len(bin_str) >= 4:
                parts = [bin_str[i:i+4] for i in range(0, len(bin_str), 4)]
                bin_str = '_'.join(parts)
            return f'0B{bin_str}'
        elif fmt == 1:
            hex_str = f'{num:X}'
            if len(hex_str) >= 2:
                pos = len(hex_str) // 2
                hex_str = hex_str[:pos] + '_' + hex_str[pos:]
            return f'0X{hex_str}'
        elif fmt == 2:
            return f'0x{num:X}'
        else:
            return str(num)
    
    def get_var_map(self) -> Dict[str, str]:
        """Get the variable name mapping."""
        return self._var_map.copy()
    
    def __repr__(self) -> str:
        return f"VMTemplateTransformer(vars_mapped={len(self._var_map)})"


class HandlerBodyDensifier:
    """
    Handler Body Densifier (HBD) for densifying handler bodies.
    
    Densifies opcode handler bodies to match Luraph style:
    - Remove all unnecessary whitespace
    - Combine statements with semicolons
    - Wrap in parentheses where appropriate
    
    Example:
        >>> hbd = HandlerBodyDensifier(PolymorphicBuildSeed(seed=42))
        >>> hbd.densify('local x = 1\\nreturn x')
        'local x=1;return x'
    
    Requirements: 32.6
    """
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize the Handler Body Densifier.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
        self.lsf = LuraphStatementFormatter(seed)
    
    def densify(self, code: str) -> str:
        """
        Densify handler body code.
        
        Args:
            code: The handler body code
        
        Returns:
            Densified code
        
        Example:
            >>> hbd.densify('local x = 1\\nreturn x')
            'local x=1;return x'
        """
        # Remove comments
        code = self._remove_comments(code)
        
        # Split into lines and process
        lines = code.split('\n')
        statements = []
        
        for line in lines:
            stripped = line.strip()
            if stripped:
                # Format each statement
                formatted = self.lsf.format(stripped)
                if formatted:
                    statements.append(formatted)
        
        # Join with semicolons
        result = ';'.join(statements)
        
        # Clean up double semicolons
        result = re.sub(r';+', ';', result)
        
        # Remove trailing semicolon
        result = result.rstrip(';')
        
        return result
    
    def _remove_comments(self, code: str) -> str:
        """Remove comments from code."""
        # Remove multi-line comments
        code = re.sub(r'--\[\[.*?\]\]', '', code, flags=re.DOTALL)
        
        # Remove single-line comments (but preserve strings)
        lines = []
        for line in code.split('\n'):
            # Simple approach: find -- not in string
            in_string = False
            quote_char = None
            result = []
            i = 0
            while i < len(line):
                char = line[i]
                if not in_string:
                    if char in '"\'':
                        in_string = True
                        quote_char = char
                        result.append(char)
                    elif char == '-' and i + 1 < len(line) and line[i+1] == '-':
                        # Comment starts here
                        break
                    else:
                        result.append(char)
                else:
                    if char == '\\' and i + 1 < len(line):
                        result.append(char)
                        result.append(line[i+1])
                        i += 1
                    elif char == quote_char:
                        in_string = False
                        result.append(char)
                    else:
                        result.append(char)
                i += 1
            lines.append(''.join(result))
        
        return '\n'.join(lines)
    
    def densify_handler(self, handler_code: str) -> str:
        """
        Densify an opcode handler function.
        
        Args:
            handler_code: The handler function code
        
        Returns:
            Densified handler code
        """
        # Match function body
        match = re.search(r'function\s*\([^)]*\)\s*(.*?)\s*end', handler_code, re.DOTALL)
        if not match:
            return self.densify(handler_code)
        
        body = match.group(1)
        densified_body = self.densify(body)
        
        # Reconstruct function
        func_start = handler_code[:match.start(1)]
        func_end = handler_code[match.end(1):]
        
        return func_start + densified_body + func_end
    
    def wrap_in_parentheses(self, expr: str) -> str:
        """
        Wrap expression in parentheses (Luraph style).
        
        Args:
            expr: Expression to wrap
        
        Returns:
            Parenthesized expression
        """
        # Don't double-wrap
        if expr.startswith('(') and expr.endswith(')'):
            return expr
        return f'({expr})'
    
    def __repr__(self) -> str:
        return "HandlerBodyDensifier()"



class ConstantPoolReferenceInjector:
    """
    Constant Pool Reference Injector (CPRI) for injecting constant references.
    
    Injects constant pool references throughout the code:
    - Replace literal values with constant pool lookups
    - Use large indices (10000+)
    - Apply computed index expressions
    
    Example:
        >>> cpri = ConstantPoolReferenceInjector(PolymorphicBuildSeed(seed=42))
        >>> cpri.inject_reference('hello')
        'F[11708]'
    
    Requirements: 32.7
    """
    
    # Default constant pool variable names
    POOL_VARS = ['F', 'C', 'K', 'P']
    
    def __init__(self, seed: PolymorphicBuildSeed, 
                 cpm: Optional[ConstantPoolManager] = None,
                 lig: Optional[LargeIndexGenerator] = None):
        """
        Initialize the Constant Pool Reference Injector.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            cpm: Optional ConstantPoolManager
            lig: Optional LargeIndexGenerator
        """
        self.seed = seed
        self.cpm = cpm or ConstantPoolManager(seed)
        self.lig = lig or LargeIndexGenerator(seed)
        self._pool_var = self.seed.choice(self.POOL_VARS)
        self._injected_refs: Dict[Any, str] = {}
    
    def inject_reference(self, value: Any) -> str:
        """
        Inject a constant pool reference for a value.
        
        Args:
            value: The value to reference
        
        Returns:
            Constant pool reference expression
        
        Example:
            >>> cpri.inject_reference('hello')
            'F[11708]'
        """
        # Check if already injected
        hashable = self._make_hashable(value)
        if hashable in self._injected_refs:
            return self._injected_refs[hashable]
        
        # Add to constant pool
        index = self.cpm.add_constant(value)
        
        # Format the reference
        formatted_idx = self.lig.format_index(index)
        ref = f'{self._pool_var}[{formatted_idx}]'
        
        self._injected_refs[hashable] = ref
        return ref
    
    def _make_hashable(self, value: Any) -> Any:
        """Make a value hashable for caching."""
        if isinstance(value, (list, dict)):
            return str(value)
        return value
    
    def inject_string(self, s: str) -> str:
        """
        Inject a string constant reference.
        
        Args:
            s: The string value
        
        Returns:
            Constant pool reference for the string
        """
        return self.inject_reference(s)
    
    def inject_number(self, num: int) -> str:
        """
        Inject a number constant reference.
        
        Args:
            num: The number value
        
        Returns:
            Constant pool reference for the number
        """
        return self.inject_reference(num)
    
    def inject_in_code(self, code: str) -> str:
        """
        Inject constant pool references throughout code.
        
        Replaces string literals and large numbers with constant pool lookups.
        
        Args:
            code: The code to process
        
        Returns:
            Code with constant pool references injected
        """
        # Extract and replace strings
        result = self._inject_string_refs(code)
        
        # Replace large numbers
        result = self._inject_number_refs(result)
        
        return result
    
    def _inject_string_refs(self, code: str) -> str:
        """Inject constant pool references for strings."""
        result = []
        i = 0
        
        while i < len(code):
            if code[i] in '"\'':
                quote = code[i]
                start = i
                i += 1
                
                # Find end of string
                while i < len(code):
                    if code[i] == '\\' and i + 1 < len(code):
                        i += 2
                        continue
                    if code[i] == quote:
                        i += 1
                        break
                    i += 1
                
                # Extract string value
                string_literal = code[start:i]
                string_value = string_literal[1:-1]  # Remove quotes
                
                # Only inject for longer strings
                if len(string_value) >= 3:
                    ref = self.inject_reference(string_value)
                    result.append(ref)
                else:
                    result.append(string_literal)
            else:
                result.append(code[i])
                i += 1
        
        return ''.join(result)
    
    def _inject_number_refs(self, code: str) -> str:
        """Inject constant pool references for large numbers."""
        def replace_num(match):
            num_str = match.group(0)
            if num_str.startswith(('0x', '0X', '0b', '0B')):
                return num_str
            try:
                num = int(num_str)
                # Only inject for large numbers
                if num >= 1000:
                    return self.inject_reference(num)
                return num_str
            except ValueError:
                return num_str
        
        pattern = r'(?<![a-zA-Z_0-9xXbB])(\d+)(?![a-zA-Z_0-9])'
        return re.sub(pattern, replace_num, code)
    
    def generate_pool_initialization(self) -> str:
        """
        Generate constant pool initialization code.
        
        Returns:
            Lua code to initialize the constant pool
        """
        return self.cpm.generate_pool_code(self._pool_var)
    
    def get_pool_var(self) -> str:
        """Get the constant pool variable name."""
        return self._pool_var
    
    def set_pool_var(self, var: str) -> None:
        """Set the constant pool variable name."""
        self._pool_var = var
    
    def __repr__(self) -> str:
        return f"ConstantPoolReferenceInjector(pool={self._pool_var}, refs={len(self._injected_refs)})"


class LuraphExpressionGenerator:
    """
    Luraph Expression Generator (LEG) for generating Luraph-style expressions.
    
    Generates complex expressions matching Luraph v14.4.1 output:
    - Nested bit32 operations
    - Table access chains
    - Ternary conditionals
    - Computed indices
    
    Example:
        >>> leg = LuraphExpressionGenerator(PolymorphicBuildSeed(seed=42))
        >>> leg.generate_complex_expression('x')
        '(O.VL((O.JL(x,O.I[0x5])),O.I[0X3]))'
    
    Requirements: 32.8
    """
    
    # Context variable names
    CONTEXT_VARS = ['O', 'C', 'F', 'e', 'w', 'X', '_']
    
    # Bit32 method aliases
    BIT32_METHODS = ['VL', 'LL', 'JL', 'IL', 'AL', 'pL', 'hL', 'm4', 'g4', 'N', 'Y', 'U']
    
    # Table names for nested access
    TABLE_NAMES = ['S', 'P', 'H', 'T', 'W']
    
    def __init__(self, seed: PolymorphicBuildSeed,
                 opg: Optional[OpaquePredicateGenerator] = None,
                 lig: Optional[LargeIndexGenerator] = None):
        """
        Initialize the Luraph Expression Generator.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            opg: Optional OpaquePredicateGenerator
            lig: Optional LargeIndexGenerator
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
        self.lig = lig or LargeIndexGenerator(seed)
    
    def generate_complex_expression(self, base_expr: str, depth: int = 3) -> str:
        """
        Generate a complex Luraph-style expression.
        
        Args:
            base_expr: The base expression to wrap
            depth: Nesting depth (default 3)
        
        Returns:
            Complex wrapped expression
        
        Example:
            >>> leg.generate_complex_expression('x')
            '(O.VL((O.JL(x,O.I[0x5])),O.I[0X3]))'
        """
        result = base_expr
        
        for _ in range(depth):
            wrap_type = self.seed.get_random_int(0, 4)
            
            if wrap_type == 0:
                result = self._wrap_with_bit32_method(result)
            elif wrap_type == 1:
                result = self._wrap_with_table_access(result)
            elif wrap_type == 2:
                result = self._wrap_with_ternary(result)
            elif wrap_type == 3:
                result = self._wrap_with_parentheses(result)
            else:
                result = self._wrap_with_arithmetic(result)
        
        return result
    
    def _wrap_with_bit32_method(self, expr: str) -> str:
        """Wrap expression with bit32 method call."""
        context = self.seed.choice(self.CONTEXT_VARS)
        method = self.seed.choice(self.BIT32_METHODS)
        idx = self._format_small_index()
        
        return f'({context}.{method}(({expr}),{context}.I[{idx}]))'
    
    def _wrap_with_table_access(self, expr: str) -> str:
        """Wrap expression with nested table access."""
        table = self.seed.choice(self.TABLE_NAMES)
        idx1 = self.lig.generate_formatted_index()
        idx2 = self._format_small_index()
        
        return f'{table}[{idx1}][{idx2}](({expr}))'
    
    def _wrap_with_ternary(self, expr: str) -> str:
        """Wrap expression with ternary conditional."""
        predicate = self.opg.get_true_predicate()
        dummy = self._generate_dummy()
        
        return f'({predicate} and ({expr}) or {dummy})'
    
    def _wrap_with_parentheses(self, expr: str) -> str:
        """Wrap expression with nested parentheses."""
        return f'(({expr}))'
    
    def _wrap_with_arithmetic(self, expr: str) -> str:
        """Wrap expression with identity arithmetic."""
        # Add 0 or multiply by 1
        op = self.seed.choice(['+0x0', '*0x1', '-0x0'])
        return f'(({expr}){op})'
    
    def generate_table_chain(self, base: str, depth: int = 3) -> str:
        """
        Generate a nested table access chain.
        
        Luraph style: S[0X2][21][0xb]((S[2][0B0010101][0Xb](...)))
        
        Args:
            base: Base expression
            depth: Chain depth
        
        Returns:
            Nested table access chain
        """
        result = base
        for _ in range(depth):
            table = self.seed.choice(self.TABLE_NAMES)
            idx = self.lig.generate_formatted_index()
            result = f'{table}[{idx}](({result}))'
        return result
    
    def generate_arithmetic_chain(self, base: str, depth: int = 2) -> str:
        """
        Generate a chain of arithmetic operations.
        
        Args:
            base: Base expression
            depth: Chain depth
        
        Returns:
            Arithmetic chain expression
        """
        result = base
        for _ in range(depth):
            context = self.seed.choice(self.CONTEXT_VARS)
            method1 = self.seed.choice(self.BIT32_METHODS)
            method2 = self.seed.choice(self.BIT32_METHODS)
            idx1 = self._format_small_index()
            idx2 = self._format_small_index()
            
            result = f'({context}.{method1}(({context}.{method2}(({result}),{context}.I[{idx1}])),{context}.I[{idx2}]))'
        
        return result
    
    def generate_conditional_expression(self, condition: str, true_val: str, false_val: str) -> str:
        """
        Generate a Luraph-style conditional expression.
        
        Args:
            condition: The condition
            true_val: Value if true
            false_val: Value if false
        
        Returns:
            Conditional expression
        """
        # Wrap condition with opaque predicate
        wrapped_cond = f'({condition})'
        
        # Generate complex true/false values
        complex_true = self.generate_complex_expression(true_val, depth=1)
        complex_false = self.generate_complex_expression(false_val, depth=1)
        
        return f'({wrapped_cond} and {complex_true} or {complex_false})'
    
    def generate_function_call_expression(self, func: str, args: List[str]) -> str:
        """
        Generate a Luraph-style function call expression.
        
        Args:
            func: Function name or expression
            args: List of arguments
        
        Returns:
            Function call expression
        """
        # Wrap each argument
        wrapped_args = [self.generate_complex_expression(arg, depth=1) for arg in args]
        
        # Generate the call
        args_str = ','.join(wrapped_args)
        call = f'{func}({args_str})'
        
        # Wrap the entire call
        return self.generate_complex_expression(call, depth=1)
    
    def _format_small_index(self) -> str:
        """Format a small index (1-10)."""
        idx = self.seed.get_random_int(1, 10)
        fmt = self.seed.get_random_int(0, 3)
        if fmt == 0:
            return f'0x{idx:X}'
        elif fmt == 1:
            return f'0X{idx:X}'
        elif fmt == 2:
            return f'0B{idx:b}'
        else:
            return str(idx)
    
    def _generate_dummy(self) -> str:
        """Generate a dummy value for dead branches."""
        dummy_type = self.seed.get_random_int(0, 3)
        if dummy_type == 0:
            return 'nil'
        elif dummy_type == 1:
            return self._format_small_index()
        elif dummy_type == 2:
            return '0x0'
        else:
            return 'false'
    
    def __repr__(self) -> str:
        return "LuraphExpressionGenerator()"


# Convenience class that combines all Luraph-style transforms
class LuraphStyleTransformer:
    """
    Combined Luraph-Style Transformer that integrates all components.
    
    Provides a unified interface for applying all Luraph-style transforms:
    - Function transformation
    - Statement formatting
    - Large index generation
    - Pattern application
    - VM template transformation
    - Handler body densification
    - Constant pool reference injection
    - Expression generation
    
    Example:
        >>> lst = LuraphStyleTransformer(PolymorphicBuildSeed(seed=42))
        >>> lst.transform(code)
        '...(fully transformed code)...'
    """
    
    def __init__(self, seed: PolymorphicBuildSeed,
                 naming: Optional[UnifiedNamingSystem] = None,
                 cpm: Optional[ConstantPoolManager] = None,
                 opg: Optional[OpaquePredicateGenerator] = None):
        """
        Initialize the Luraph Style Transformer.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            naming: Optional UnifiedNamingSystem
            cpm: Optional ConstantPoolManager
            opg: Optional OpaquePredicateGenerator
        """
        self.seed = seed
        self.naming = naming or UnifiedNamingSystem(seed)
        self.cpm = cpm or ConstantPoolManager(seed)
        self.opg = opg or OpaquePredicateGenerator(seed)
        
        # Initialize all components
        self.lig = LargeIndexGenerator(seed, cpm)
        self.lft = LuraphFunctionTransformer(seed, self.naming)
        self.lsf = LuraphStatementFormatter(seed)
        self.lpl = LuraphPatternLibrary(seed, self.opg, self.lig)
        self.vtt = VMTemplateTransformer(seed, self.naming)
        self.hbd = HandlerBodyDensifier(seed)
        self.cpri = ConstantPoolReferenceInjector(seed, self.cpm, self.lig)
        self.leg = LuraphExpressionGenerator(seed, self.opg, self.lig)
    
    def transform(self, code: str, options: Optional[Dict[str, bool]] = None) -> str:
        """
        Apply all Luraph-style transforms to code.
        
        Args:
            code: The code to transform
            options: Optional dict of transform options
        
        Returns:
            Fully transformed code
        """
        options = options or {}
        
        # Apply transforms in order
        if options.get('transform_functions', True):
            code = self._transform_functions(code)
        
        if options.get('inject_constants', True):
            code = self.cpri.inject_in_code(code)
        
        if options.get('densify', True):
            code = self.hbd.densify(code)
        
        if options.get('format_statements', True):
            code = self.lsf.remove_whitespace(code)
        
        return code
    
    def _transform_functions(self, code: str) -> str:
        """Transform all function definitions in code."""
        # Match function definitions
        pattern = r'function\s*\([^)]*\)\s*.*?\s*end'
        
        def replace_func(match):
            return self.lft.transform_function(match.group(0))
        
        return re.sub(pattern, replace_func, code, flags=re.DOTALL)
    
    def transform_vm_template(self, vm_code: str) -> str:
        """Transform a VM template."""
        return self.vtt.transform(vm_code)
    
    def generate_expression(self, base: str, depth: int = 3) -> str:
        """Generate a complex expression."""
        return self.leg.generate_complex_expression(base, depth)
    
    def get_pattern(self, pattern_type: str, **kwargs) -> str:
        """
        Get a Luraph pattern by type.
        
        Args:
            pattern_type: Type of pattern ('conditional', 'table_access', 'arithmetic', etc.)
            **kwargs: Pattern-specific arguments
        
        Returns:
            Generated pattern
        """
        if pattern_type == 'conditional':
            return self.lpl.get_conditional_pattern(
                kwargs.get('condition', 'true'),
                kwargs.get('true_body', ''),
                kwargs.get('false_body', '')
            )
        elif pattern_type == 'table_access':
            return self.lpl.get_table_access_pattern(
                kwargs.get('table', 'S'),
                kwargs.get('key', '0'),
                kwargs.get('depth', 2)
            )
        elif pattern_type == 'arithmetic':
            return self.lpl.get_arithmetic_pattern(
                kwargs.get('left', 'a'),
                kwargs.get('op', '+'),
                kwargs.get('right', 'b')
            )
        elif pattern_type == 'ternary':
            return self.lpl.get_ternary_pattern(
                kwargs.get('condition', 'true'),
                kwargs.get('true_val', '1'),
                kwargs.get('false_val', '0')
            )
        elif pattern_type == 'state_machine':
            return self.lpl.get_state_machine_pattern(
                kwargs.get('initial_state', 0x53),
                kwargs.get('body', '')
            )
        else:
            raise ValueError(f"Unknown pattern type: {pattern_type}")
    
    def __repr__(self) -> str:
        return "LuraphStyleTransformer()"
