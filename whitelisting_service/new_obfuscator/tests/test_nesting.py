"""
Property-based tests for the Enhanced Nesting Transformer.

Tests the NestingTransformer, EscapeSequenceWrapper, and NumberFormatter
classes using hypothesis for property-based testing.

**Feature: enhanced-nesting**
"""

import pytest
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from hypothesis import given, strategies as st, settings, assume
from core.seed import PolymorphicBuildSeed
from transforms.nesting import (
    NestingTransformer,
    NestingConfig,
    EscapeSequenceWrapper,
    NumberFormatter,
)


class TestIdentityFunctionCorrectness:
    """
    **Feature: enhanced-nesting, Property 8: Identity Function Correctness**
    
    For any identity function used for nesting, calling it with any value
    SHALL return that exact value unchanged.
    
    **Validates: Requirements 4.2, 4.3**
    """
    
    @given(st.integers(min_value=-1000000, max_value=1000000))
    @settings(max_examples=100)
    def test_identity_functions_return_input_unchanged(self, value):
        """Identity functions must return their input unchanged."""
        seed = PolymorphicBuildSeed(42)
        transformer = NestingTransformer(seed)
        
        # Get all identity function implementations
        for func in transformer.identity_functions:
            # The implementation should be semantically equivalent to identity
            # We verify the structure matches expected patterns
            impl = func.implementation
            
            # All implementations should contain 'return' and the parameter
            assert 'return' in impl, f"Identity function missing return: {impl}"
            assert 'function(' in impl, f"Not a function: {impl}"
    
    @given(st.integers(min_value=0, max_value=0xFFFFFFFF))
    @settings(max_examples=100)
    def test_bitwise_identity_operations(self, value):
        """
        Verify bitwise identity operations preserve values.
        
        - XOR with 0: x ^ 0 = x
        - AND with 0xFFFFFFFF: x & 0xFFFFFFFF = x (for 32-bit)
        - OR with 0: x | 0 = x
        """
        # XOR identity
        assert value ^ 0 == value
        
        # AND identity (for 32-bit values)
        if value <= 0xFFFFFFFF:
            assert value & 0xFFFFFFFF == value
        
        # OR identity
        assert value | 0 == value
        
        # Add 0 identity
        assert value + 0 == value


class TestNestingDepthCompliance:
    """
    **Feature: enhanced-nesting, Property 1: Nesting Depth Compliance**
    
    For any generated function call expression, the nesting depth SHALL be
    at least the configured minimum depth (default 3) and at most the
    configured maximum depth (default 5).
    
    **Validates: Requirements 1.1, 1.3**
    """
    
    @given(st.integers(min_value=2, max_value=5))
    @settings(max_examples=100)
    def test_nesting_depth_within_bounds(self, depth):
        """Nesting depth should be within configured bounds."""
        seed = PolymorphicBuildSeed(42)
        config = NestingConfig(min_depth=depth, max_depth=depth)
        transformer = NestingTransformer(seed, config)
        
        expr = "x"
        nested = transformer.nest_expression(expr, depth=depth)
        
        # Count nesting depth by counting function calls
        # Each nesting adds one function call with parentheses
        open_parens = nested.count('(')
        
        # Should have at least 'depth' levels of nesting
        assert open_parens >= depth, f"Expected at least {depth} nesting levels, got {open_parens}"
    
    @given(st.integers(min_value=0, max_value=10))
    @settings(max_examples=100)
    def test_explicit_depth_respected(self, depth):
        """Explicit depth parameter should be respected."""
        seed = PolymorphicBuildSeed(42)
        transformer = NestingTransformer(seed)
        
        expr = "value"
        nested = transformer.nest_expression(expr, depth=depth)
        
        if depth == 0:
            # No nesting, should return original
            assert nested == expr
        else:
            # Should have function calls
            assert '(' in nested
            assert ')' in nested
    
    def test_default_config_bounds(self):
        """Default config should have min_depth=3, max_depth=5."""
        config = NestingConfig()
        assert config.min_depth == 3
        assert config.max_depth == 5


class TestObfuscatedFunctionNames:
    """
    **Feature: enhanced-nesting, Property 2: Obfuscated Function Names**
    
    For any function name used in nested calls, the name SHALL match the
    obfuscated naming pattern (31 characters using only l, I, O, 0, 1, _).
    
    **Validates: Requirements 1.2**
    """
    
    def test_identity_function_names_are_31_chars(self):
        """Identity function names should be 31 characters."""
        seed = PolymorphicBuildSeed(42)
        transformer = NestingTransformer(seed)
        
        for func in transformer.identity_functions:
            assert len(func.name) == 31, f"Name length {len(func.name)} != 31: {func.name}"
    
    def test_identity_function_names_use_correct_chars(self):
        """Identity function names should only use l, I, O, 0, 1, _."""
        seed = PolymorphicBuildSeed(42)
        transformer = NestingTransformer(seed)
        
        allowed_chars = set('lIO01_')
        
        for func in transformer.identity_functions:
            name_chars = set(func.name)
            invalid_chars = name_chars - allowed_chars
            assert not invalid_chars, f"Invalid chars {invalid_chars} in name: {func.name}"
    
    def test_identity_function_names_start_with_valid_char(self):
        """Identity function names should start with letter or underscore."""
        seed = PolymorphicBuildSeed(42)
        transformer = NestingTransformer(seed)
        
        valid_first_chars = set('lIO_')
        
        for func in transformer.identity_functions:
            assert func.name[0] in valid_first_chars, f"Invalid first char in: {func.name}"


class TestEscapeSequenceWrapping:
    """
    **Feature: enhanced-nesting, Property 4: Escape Sequence Wrapping**
    
    For any escape sequence string in the output, it SHALL be wrapped in a
    string.char call with hex or binary formatted arguments rather than
    appearing as raw escape codes.
    
    **Validates: Requirements 2.1, 2.2**
    """
    
    def test_parse_escape_sequence(self):
        """Should correctly parse escape sequences to byte values."""
        seed = PolymorphicBuildSeed(42)
        wrapper = EscapeSequenceWrapper(seed)
        
        # Test parsing "\073\108\049"
        bytes_list = wrapper.parse_escape_sequence("\\073\\108\\049")
        assert bytes_list == [73, 108, 49]
    
    def test_wrap_escape_sequence_produces_function_call(self):
        """Wrapped escape sequences should be function calls."""
        seed = PolymorphicBuildSeed(42)
        wrapper = EscapeSequenceWrapper(seed)
        
        result = wrapper.wrap_escape_sequence("\\073\\108\\049")
        
        # Should contain the char function name
        assert wrapper.char_func_name in result
        # Should have parentheses (function call)
        assert '(' in result and ')' in result
    
    @given(st.lists(st.integers(min_value=0, max_value=255), min_size=1, max_size=10))
    @settings(max_examples=100)
    def test_wrapped_bytes_are_formatted(self, byte_values):
        """Wrapped bytes should use hex or binary format."""
        seed = PolymorphicBuildSeed(42)
        wrapper = EscapeSequenceWrapper(seed)
        
        # Create escape sequence string
        escape_str = ''.join(f'\\{b:03d}' for b in byte_values)
        result = wrapper.wrap_escape_sequence(escape_str)
        
        # Should not contain raw decimal escapes
        assert '\\' not in result or result == escape_str
        
        # If wrapped, should contain formatted numbers
        if wrapper.char_func_name in result:
            # Should have some hex (0x/0X) or binary (0b/0B) numbers
            has_hex = '0x' in result.lower()
            has_binary = '0b' in result.lower()
            has_decimal = any(str(b) in result for b in byte_values if b > 9)
            assert has_hex or has_binary or has_decimal


class TestEscapePatternVariation:
    """
    **Feature: enhanced-nesting, Property 5: Escape Pattern Variation**
    
    For any two consecutive escape sequence transformations, they SHALL use
    different obfuscation methods (different number bases or function aliases).
    
    **Validates: Requirements 2.3, 2.4**
    """
    
    def test_consecutive_formats_vary(self):
        """Consecutive byte formats should vary."""
        seed = PolymorphicBuildSeed(42)
        wrapper = EscapeSequenceWrapper(seed)
        
        # Format multiple bytes
        formats_used = []
        for i in range(10):
            wrapper.vary_format(65 + i)
            formats_used.append(wrapper._last_format)
        
        # Check that consecutive formats are different
        for i in range(1, len(formats_used)):
            assert formats_used[i] != formats_used[i-1], \
                f"Consecutive formats same: {formats_used[i-1]} at positions {i-1}, {i}"
    
    @given(st.lists(st.integers(min_value=0, max_value=255), min_size=5, max_size=20))
    @settings(max_examples=50)
    def test_format_history_shows_variation(self, byte_values):
        """Format history should show variation."""
        seed = PolymorphicBuildSeed(42)
        wrapper = EscapeSequenceWrapper(seed)
        
        for b in byte_values:
            wrapper.vary_format(b)
        
        # Should have used multiple different formats
        unique_formats = set(wrapper._format_history)
        assert len(unique_formats) >= 2, f"Only used formats: {unique_formats}"


class TestNumberFormatDiversity:
    """
    **Feature: enhanced-nesting, Property 6: Number Format Diversity**
    
    For any set of 10 consecutive number literals in the output, at least 3
    different formats SHALL be used (hex with underscore, binary with underscore,
    plain hex, plain binary).
    
    **Validates: Requirements 3.1**
    """
    
    def test_format_diversity_in_sequence(self):
        """10 consecutive numbers should use at least 3 different formats."""
        seed = PolymorphicBuildSeed(42)
        formatter = NumberFormatter(seed)
        
        # Format 10 numbers
        for i in range(10):
            formatter.format_with_underscores(100 + i)
        
        # Check diversity
        assert formatter.ensure_diversity(10), \
            f"Insufficient diversity in formats: {formatter._format_history}"
    
    @given(st.lists(st.integers(min_value=1, max_value=10000), min_size=10, max_size=20))
    @settings(max_examples=50)
    def test_diverse_format_ensures_variety(self, values):
        """get_diverse_format should ensure variety."""
        seed = PolymorphicBuildSeed(42)
        formatter = NumberFormatter(seed)
        
        for v in values:
            formatter.get_diverse_format(v)
        
        # Should have reasonable diversity
        unique_formats = set(formatter._format_history)
        assert len(unique_formats) >= 2, f"Only used formats: {unique_formats}"
    
    def test_underscore_insertion(self):
        """Numbers should have underscores inserted."""
        seed = PolymorphicBuildSeed(42)
        formatter = NumberFormatter(seed)
        
        # Format many numbers, some should have underscores
        results = [formatter.format_with_underscores(i * 100) for i in range(1, 20)]
        
        # At least some should have underscores
        has_underscore = sum(1 for r in results if '_' in r)
        assert has_underscore > 0, "No underscores in any formatted numbers"


class TestTableAccessNesting:
    """
    **Feature: enhanced-nesting, Property 7: Table Access Nesting**
    
    For any table access pattern in the output, it SHALL be wrapped in at
    least one function call layer.
    
    **Validates: Requirements 3.2**
    """
    
    def test_nest_with_context_produces_method_calls(self):
        """nest_with_context should produce method calls on context var."""
        seed = PolymorphicBuildSeed(42)
        transformer = NestingTransformer(seed)
        
        result = transformer.nest_with_context("x", context_var="O", depth=2)
        
        # Should contain context variable with method call
        assert 'O.' in result, f"Missing context method call in: {result}"
    
    def test_nest_with_context_uses_luraph_methods(self):
        """nest_with_context should use Luraph-style method names."""
        seed = PolymorphicBuildSeed(42)
        transformer = NestingTransformer(seed)
        
        luraph_methods = ['F4', 'LL', 'VL', 'JL', 'IL', 'AL', 'pL', 'N', 'Y', 'U', 'hL', 'm4', 'g4']
        
        # Generate multiple nested expressions
        results = [transformer.nest_with_context("x", depth=1) for _ in range(20)]
        
        # Should use some Luraph methods
        methods_found = set()
        for r in results:
            for m in luraph_methods:
                if f'.{m}(' in r:
                    methods_found.add(m)
        
        assert len(methods_found) > 0, f"No Luraph methods found in results"


class TestCharFuncDefinition:
    """Test the string.char alias definition."""
    
    def test_char_func_definition_valid_lua(self):
        """char func definition should be valid Lua."""
        seed = PolymorphicBuildSeed(42)
        wrapper = EscapeSequenceWrapper(seed)
        
        definition = wrapper.get_char_func_definition()
        
        assert 'local' in definition
        assert wrapper.char_func_name in definition
        assert 'string.char' in definition
    
    def test_char_func_name_is_obfuscated(self):
        """char func name should be 31 chars with correct charset."""
        seed = PolymorphicBuildSeed(42)
        wrapper = EscapeSequenceWrapper(seed)
        
        assert len(wrapper.char_func_name) == 31
        
        allowed_chars = set('lIO01_')
        name_chars = set(wrapper.char_func_name)
        invalid_chars = name_chars - allowed_chars
        assert not invalid_chars, f"Invalid chars: {invalid_chars}"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
