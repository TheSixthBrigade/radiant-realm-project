"""
Deep Expression Wrapper (DEW) and Arithmetic Expression Wrapper (AEW) for the Luraph-style obfuscator.

This module provides expression wrapping transformations that match
Luraph v14.4.1 output style, including:
- 3-5 level nesting for expressions
- Wrapper table generation
- Arithmetic expression wrapping with bit32 aliases
- Expression normalization for uniform complexity

Requirements: 5.1, 5.2, 11.1, 11.2, 11.3, 11.4
"""

from typing import List, Optional, Dict, Tuple
import re

try:
    from ..core.seed import PolymorphicBuildSeed
    from ..core.predicates import OpaquePredicateGenerator
except ImportError:
    from core.seed import PolymorphicBuildSeed
    from core.predicates import OpaquePredicateGenerator


class WrapperObjectGenerator:
    """
    Wrapper Object Generator (WOG) for creating wrapper table structures.
    
    Generates wrapper objects used for expression indirection:
    - Wrapper tables with nested access patterns
    - Method tables for function-style wrapping
    
    Example:
        >>> wog = WrapperObjectGenerator(PolymorphicBuildSeed(seed=42))
        >>> wog.generate_wrapper_table('W')
        'local W={[0x1]=function(x)return x end,[0x2]=function(a,b)return a+b end}'
    """
    
    # Wrapper table names used in Luraph style
    WRAPPER_NAMES = ['W', 'w', 'X', '_', 'O', 'C', 'F', 'e', 'S', 'P']
    
    # Method indices for wrapper functions
    METHOD_INDICES = [0x1, 0x2, 0x3, 0x5, 0x7, 0x9, 0xb, 0xd, 0x11, 0x13]
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize the Wrapper Object Generator.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
        self._generated_wrappers: Dict[str, str] = {}
    
    def generate_wrapper_table(self, name: Optional[str] = None) -> str:
        """
        Generate a wrapper table with utility functions.
        
        Args:
            name: Optional name for the wrapper table
        
        Returns:
            Lua code defining the wrapper table
        
        Example:
            >>> wog.generate_wrapper_table('W')
            'local W={[0x1]=function(x)return x end,...}'
        """
        if name is None:
            name = self.seed.choice(self.WRAPPER_NAMES)
        
        methods = []
        
        # Identity function
        idx1 = self._format_index(self.seed.choice(self.METHOD_INDICES))
        methods.append(f'[{idx1}]=function(x)return x end')
        
        # Binary operation wrapper
        idx2 = self._format_index(self.seed.choice(self.METHOD_INDICES))
        methods.append(f'[{idx2}]=function(a,b)return a end')
        
        # Ternary selector
        idx3 = self._format_index(self.seed.choice(self.METHOD_INDICES))
        methods.append(f'[{idx3}]=function(c,t,f)return c and t or f end')
        
        # Vararg passthrough
        idx4 = self._format_index(self.seed.choice(self.METHOD_INDICES))
        methods.append(f'[{idx4}]=function(...)return(...)end')
        
        table_def = f'local {name}={{{",".join(methods)}}}'
        self._generated_wrappers[name] = table_def
        
        return table_def
    
    def _format_index(self, idx: int) -> str:
        """Format an index in obfuscated format."""
        fmt = self.seed.get_random_int(0, 3)
        if fmt == 0:
            return f'0x{idx:X}'
        elif fmt == 1:
            return f'0X{idx:X}'
        elif fmt == 2 and idx < 256:
            return f'0b{idx:b}'
        else:
            return str(idx)
    
    def get_wrapper_call(self, wrapper_name: str, method_idx: int, *args: str) -> str:
        """
        Generate a wrapper function call.
        
        Args:
            wrapper_name: Name of the wrapper table
            method_idx: Index of the method to call
            *args: Arguments to pass
        
        Returns:
            Wrapper function call expression
        """
        idx_str = self._format_index(method_idx)
        args_str = ','.join(args)
        return f'{wrapper_name}[{idx_str}]({args_str})'
    
    def get_generated_wrappers(self) -> Dict[str, str]:
        """Get all generated wrapper definitions."""
        return self._generated_wrappers.copy()


class ArithmeticExpressionWrapper:
    """
    Arithmetic Expression Wrapper (AEW) for wrapping arithmetic operations.
    
    Wraps arithmetic expressions using bit32 aliases and complex patterns
    matching Luraph v14.4.1 output style.
    
    Example:
        >>> aew = ArithmeticExpressionWrapper(PolymorphicBuildSeed(seed=42))
        >>> aew.wrap_addition('a', 'b')
        'N(Y(a,b),U(a,b))'
    """
    
    # Bit32 wrapper aliases
    BIT32_ALIASES = {
        'bxor': 'N',
        'bor': 'Y', 
        'band': 'U',
        'lshift': 'A',
        'rshift': 'D',
        'rrotate': 'IL',
        'lrotate': 'pL',
    }
    
    # Extended aliases for Luraph style
    EXTENDED_ALIASES = ['VL', 'LL', 'JL', 'AL', 'hL', 'm4', 'g4']
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize the Arithmetic Expression Wrapper.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
    
    def wrap_expression(self, expr: str, depth: int = 1) -> str:
        """
        Wrap an expression with bit32 operations that preserve its value.
        
        Args:
            expr: The expression to wrap
            depth: Nesting depth (1-5)
        
        Returns:
            Wrapped expression that evaluates to the same value
        """
        if depth <= 0:
            return expr
        
        pattern = self.seed.get_random_int(0, 4)
        
        if pattern == 0:
            # XOR with 0: N(expr, 0) = expr
            inner = self.wrap_expression(expr, depth - 1)
            return f'N({inner},0x0)'
        
        elif pattern == 1:
            # OR with 0: Y(expr, 0) = expr
            inner = self.wrap_expression(expr, depth - 1)
            return f'Y({inner},0x0)'
        
        elif pattern == 2:
            # AND with all 1s: U(expr, 0xFFFFFFFF) = expr
            inner = self.wrap_expression(expr, depth - 1)
            mask = self.seed.choice(['0xFFFFFFFF', '0XFFFFFFFF'])
            return f'U({inner},{mask})'
        
        elif pattern == 3:
            # Shift by 0: A(expr, 0) = expr or D(expr, 0) = expr
            inner = self.wrap_expression(expr, depth - 1)
            op = self.seed.choice(['A', 'D'])
            return f'{op}({inner},0x0)'
        
        else:
            # Double XOR: N(N(expr, k), k) = expr
            k = self.seed.get_random_int(1, 255)
            k_str = self._format_number(k)
            inner = self.wrap_expression(expr, depth - 1)
            return f'N(N({inner},{k_str}),{k_str})'
    
    def wrap_with_context(self, expr: str, context_var: str = 'O', depth: int = 2) -> str:
        """
        Wrap expression with context variable access (Luraph style).
        
        Creates expressions like: O.VL(O.JL(expr, O.I[0x5]), O.I[0X3])
        
        Args:
            expr: The expression to wrap
            context_var: The context variable name (default 'O')
            depth: Nesting depth
        
        Returns:
            Wrapped expression with context access
        """
        if depth <= 0:
            return expr
        
        # Choose method alias
        methods = ['VL', 'LL', 'JL', 'IL', 'AL', 'pL', 'N', 'Y', 'U']
        method = self.seed.choice(methods)
        
        # Generate index for context.I[index]
        index = self.seed.get_random_int(1, 10)
        index_str = self._format_number(index)
        
        inner = self.wrap_with_context(expr, context_var, depth - 1)
        
        # Pattern: O.METHOD(inner, O.I[index]) where O.I[index] is 0
        return f'{context_var}.{method}({inner},{context_var}.I[{index_str}])'
    
    def wrap_addition(self, a: str, b: str) -> str:
        """
        Wrap an addition operation.
        
        Args:
            a: First operand
            b: Second operand
        
        Returns:
            Wrapped addition expression
        """
        # a + b can be expressed as: bxor(bxor(a,b), band(a,b)*2)
        # But for simplicity, we just wrap the result
        return f'({a}+{b})'
    
    def wrap_subtraction(self, a: str, b: str) -> str:
        """
        Wrap a subtraction operation.
        
        Args:
            a: First operand
            b: Second operand
        
        Returns:
            Wrapped subtraction expression
        """
        return f'({a}-{b})'
    
    def wrap_comparison(self, a: str, op: str, b: str) -> str:
        """
        Wrap a comparison operation with ternary pattern.
        
        Luraph style: (a > b) and a or b
        
        Args:
            a: First operand
            op: Comparison operator
            b: Second operand
        
        Returns:
            Wrapped comparison expression
        """
        return f'({a}{op}{b})'
    
    def _format_number(self, num: int) -> str:
        """Format a number in obfuscated format."""
        fmt = self.seed.get_random_int(0, 3)
        if fmt == 0:
            return f'0x{num:X}'
        elif fmt == 1:
            return f'0X{num:x}'
        elif fmt == 2 and num < 256:
            return f'0b{num:b}'
        else:
            return str(num)


class DeepExpressionWrapper:
    """
    Deep Expression Wrapper (DEW) for creating 3-5 level nested expressions.
    
    Transforms simple expressions into deeply nested structures matching
    Luraph v14.4.1 output style:
    - Wrapper table indirection
    - Bit32 operation wrapping
    - Ternary conditional patterns
    - Context variable access
    
    Example:
        >>> dew = DeepExpressionWrapper(PolymorphicBuildSeed(seed=42))
        >>> dew.wrap_expression('x + 1')
        'W[0x1]((O.VL((O.JL(x + 1,O.I[0x5])),O.I[0X3])))'
    """
    
    # Minimum and maximum nesting depth
    MIN_DEPTH = 3
    MAX_DEPTH = 5
    
    # Context variable names
    CONTEXT_VARS = ['O', 'C', 'F', 'e', 'w', 'X', '_']
    
    # Wrapper table names
    WRAPPER_TABLES = ['W', 'S', 'P', 'H', 'T']
    
    def __init__(self, seed: PolymorphicBuildSeed, opg: Optional[OpaquePredicateGenerator] = None):
        """
        Initialize the Deep Expression Wrapper.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
            opg: Optional OpaquePredicateGenerator for conditional wrapping
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
        self.wog = WrapperObjectGenerator(seed)
        self.aew = ArithmeticExpressionWrapper(seed)
        
        # Track generated wrapper tables
        self._wrapper_definitions: List[str] = []
    
    def wrap_expression(self, expr: str, depth: Optional[int] = None) -> str:
        """
        Wrap an expression with 3-5 levels of nesting.
        
        Args:
            expr: The expression to wrap
            depth: Optional specific depth (default: random 3-5)
        
        Returns:
            Deeply nested expression that evaluates to the same value
        
        Example:
            >>> dew.wrap_expression('x')
            'W[0x1]((O.VL((O.JL(x,O.I[0x5])),O.I[0X3])))'
        """
        if depth is None:
            depth = self.seed.get_random_int(self.MIN_DEPTH, self.MAX_DEPTH)
        
        # Start with the base expression
        result = expr
        
        # Apply nested wrapping
        for i in range(depth):
            wrap_type = self.seed.get_random_int(0, 4)
            
            if wrap_type == 0:
                # Bit32 wrapper
                result = self._wrap_with_bit32(result)
            elif wrap_type == 1:
                # Context variable access
                result = self._wrap_with_context(result)
            elif wrap_type == 2:
                # Wrapper table call
                result = self._wrap_with_table(result)
            elif wrap_type == 3:
                # Ternary pattern
                result = self._wrap_with_ternary(result)
            else:
                # Parenthesized nesting
                result = f'(({result}))'
        
        return result
    
    def _wrap_with_bit32(self, expr: str) -> str:
        """Wrap expression with bit32 operation that preserves value."""
        return self.aew.wrap_expression(expr, depth=1)
    
    def _wrap_with_context(self, expr: str) -> str:
        """Wrap expression with context variable access."""
        context_var = self.seed.choice(self.CONTEXT_VARS)
        methods = ['VL', 'LL', 'JL', 'IL', 'AL', 'pL', 'N', 'Y', 'U']
        method = self.seed.choice(methods)
        
        # Generate index
        index = self.seed.get_random_int(1, 10)
        index_str = self._format_index(index)
        
        # O.METHOD(expr, O.I[index]) where O.I[index] should be 0 for identity
        return f'{context_var}.{method}(({expr}),{context_var}.I[{index_str}])'
    
    def _wrap_with_table(self, expr: str) -> str:
        """Wrap expression with wrapper table call."""
        wrapper = self.seed.choice(self.WRAPPER_TABLES)
        method_idx = self.seed.choice([0x1, 0x2, 0x3, 0x5, 0x7, 0x9, 0xb, 0xd])
        idx_str = self._format_index(method_idx)
        
        return f'{wrapper}[{idx_str}](({expr}))'
    
    def _wrap_with_ternary(self, expr: str) -> str:
        """Wrap expression with ternary conditional pattern."""
        # Use opaque predicate that's always true
        predicate = self.opg.get_true_predicate()
        
        # Generate a dummy alternative
        dummy = self._generate_dummy_value()
        
        return f'({predicate} and ({expr}) or {dummy})'
    
    def _format_index(self, idx: int) -> str:
        """Format an index in obfuscated format."""
        fmt = self.seed.get_random_int(0, 3)
        if fmt == 0:
            return f'0x{idx:X}'
        elif fmt == 1:
            return f'0X{idx:X}'
        elif fmt == 2 and idx < 256:
            return f'0B{idx:b}'
        else:
            return str(idx)
    
    def _generate_dummy_value(self) -> str:
        """Generate a dummy value for dead branches."""
        dummy_type = self.seed.get_random_int(0, 3)
        if dummy_type == 0:
            return 'nil'
        elif dummy_type == 1:
            return self._format_index(self.seed.get_random_int(0, 255))
        elif dummy_type == 2:
            return '0x0'
        else:
            return 'false'
    
    def generate_wrapper_table(self, name: Optional[str] = None) -> str:
        """
        Generate a wrapper table definition.
        
        Args:
            name: Optional name for the wrapper table
        
        Returns:
            Lua code defining the wrapper table
        """
        table_def = self.wog.generate_wrapper_table(name)
        self._wrapper_definitions.append(table_def)
        return table_def
    
    def wrap_arithmetic(self, left: str, op: str, right: str, depth: Optional[int] = None) -> str:
        """
        Wrap an arithmetic expression with deep nesting.
        
        Args:
            left: Left operand
            op: Operator (+, -, *, /, %)
            right: Right operand
            depth: Optional nesting depth
        
        Returns:
            Deeply wrapped arithmetic expression
        """
        # First create the basic expression
        basic_expr = f'({left}{op}{right})'
        
        # Then wrap it deeply
        return self.wrap_expression(basic_expr, depth)
    
    def wrap_comparison(self, left: str, op: str, right: str) -> str:
        """
        Wrap a comparison expression with Luraph-style pattern.
        
        Luraph style: (a > b) and a or b patterns
        
        Args:
            left: Left operand
            op: Comparison operator
            right: Right operand
        
        Returns:
            Wrapped comparison expression
        """
        comparison = f'({left}{op}{right})'
        
        # Wrap in ternary-style pattern
        return f'({comparison} and {left} or {right})'
    
    def wrap_function_call(self, func: str, args: List[str], depth: Optional[int] = None) -> str:
        """
        Wrap a function call with deep nesting.
        
        Args:
            func: Function name or expression
            args: List of argument expressions
            depth: Optional nesting depth
        
        Returns:
            Wrapped function call
        """
        # Wrap each argument
        wrapped_args = [self.wrap_expression(arg, depth=1) for arg in args]
        
        # Create the call
        call = f'{func}({",".join(wrapped_args)})'
        
        # Wrap the entire call
        if depth is None:
            depth = self.seed.get_random_int(1, 2)
        
        return self.wrap_expression(call, depth)
    
    def get_wrapper_definitions(self) -> List[str]:
        """Get all generated wrapper table definitions."""
        return self._wrapper_definitions.copy()
    
    def generate_all_wrappers(self) -> str:
        """
        Generate all required wrapper table definitions.
        
        Returns:
            Lua code with all wrapper definitions
        """
        definitions = []
        
        # Generate wrapper tables
        for name in self.WRAPPER_TABLES[:3]:  # Generate 3 wrapper tables
            definitions.append(self.wog.generate_wrapper_table(name))
        
        return ';'.join(definitions)
    
    def __repr__(self) -> str:
        return f"DeepExpressionWrapper(depth={self.MIN_DEPTH}-{self.MAX_DEPTH})"


class ExpressionNormalizer:
    """
    Expression Normalizer (EN) for uniform complexity wrapping.
    
    Ensures all expressions have similar complexity levels by wrapping
    simple expressions to match target complexity while maintaining
    functional equivalence.
    
    Requirements: 5.1, 5.2
    
    Example:
        >>> en = ExpressionNormalizer(PolymorphicBuildSeed(seed=42))
        >>> en.normalize('x')  # Simple variable
        'W[0x1]((O.VL((x),O.I[0x5])))'
        >>> en.normalize('a + b * c')  # Already complex
        'a + b * c'  # Less wrapping needed
    """
    
    # Target complexity level (nesting depth)
    TARGET_COMPLEXITY = 3
    
    # Complexity thresholds
    SIMPLE_THRESHOLD = 5  # Characters
    MEDIUM_THRESHOLD = 20
    COMPLEX_THRESHOLD = 50
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize the Expression Normalizer.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
        self.dew = DeepExpressionWrapper(seed)
    
    def normalize(self, expr: str, target_complexity: Optional[int] = None) -> str:
        """
        Normalize expression to target complexity level.
        
        Simple expressions get more wrapping, complex expressions get less.
        
        Args:
            expr: The expression to normalize
            target_complexity: Optional target complexity (default: 3)
        
        Returns:
            Normalized expression with uniform complexity
        """
        if target_complexity is None:
            target_complexity = self.TARGET_COMPLEXITY
        
        # Estimate current complexity
        current_complexity = self._estimate_complexity(expr)
        
        # Calculate needed wrapping depth
        needed_depth = max(0, target_complexity - current_complexity)
        
        if needed_depth == 0:
            return expr
        
        return self.dew.wrap_expression(expr, depth=needed_depth)
    
    def _estimate_complexity(self, expr: str) -> int:
        """
        Estimate the complexity of an expression.
        
        Args:
            expr: The expression to analyze
        
        Returns:
            Estimated complexity level (0-5)
        """
        length = len(expr)
        
        # Count nesting indicators
        paren_depth = self._count_max_paren_depth(expr)
        bracket_depth = self._count_max_bracket_depth(expr)
        
        # Count operators
        operator_count = len(re.findall(r'[+\-*/%^<>=~]', expr))
        
        # Calculate complexity score
        complexity = 0
        
        if length < self.SIMPLE_THRESHOLD:
            complexity = 0
        elif length < self.MEDIUM_THRESHOLD:
            complexity = 1
        elif length < self.COMPLEX_THRESHOLD:
            complexity = 2
        else:
            complexity = 3
        
        # Add for nesting
        complexity += min(paren_depth, 2)
        complexity += min(bracket_depth, 1)
        
        # Add for operators
        if operator_count > 3:
            complexity += 1
        
        return min(complexity, 5)
    
    def _count_max_paren_depth(self, expr: str) -> int:
        """Count maximum parenthesis nesting depth."""
        max_depth = 0
        current_depth = 0
        
        for char in expr:
            if char == '(':
                current_depth += 1
                max_depth = max(max_depth, current_depth)
            elif char == ')':
                current_depth = max(0, current_depth - 1)
        
        return max_depth
    
    def _count_max_bracket_depth(self, expr: str) -> int:
        """Count maximum bracket nesting depth."""
        max_depth = 0
        current_depth = 0
        
        for char in expr:
            if char == '[':
                current_depth += 1
                max_depth = max(max_depth, current_depth)
            elif char == ']':
                current_depth = max(0, current_depth - 1)
        
        return max_depth
    
    def normalize_all(self, expressions: List[str]) -> List[str]:
        """
        Normalize a list of expressions to uniform complexity.
        
        Args:
            expressions: List of expressions to normalize
        
        Returns:
            List of normalized expressions
        """
        return [self.normalize(expr) for expr in expressions]
    
    def wrap_simple_expression(self, expr: str) -> str:
        """
        Wrap a simple expression to match complex ones.
        
        Args:
            expr: Simple expression (variable, literal, etc.)
        
        Returns:
            Wrapped expression with target complexity
        """
        return self.normalize(expr, target_complexity=self.TARGET_COMPLEXITY)
    
    def __repr__(self) -> str:
        return f"ExpressionNormalizer(target={self.TARGET_COMPLEXITY})"
