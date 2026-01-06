"""
Tests for Luraph-Style Transforms.

Tests all components of the luraph_style module:
- LuraphFunctionTransformer
- LuraphStatementFormatter
- LargeIndexGenerator
- LuraphPatternLibrary
- VMTemplateTransformer
- HandlerBodyDensifier
- ConstantPoolReferenceInjector
- LuraphExpressionGenerator
- LuraphStyleTransformer

Requirements: 32.1, 32.2, 32.3, 32.4, 32.5, 32.6, 32.7, 32.8
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from core.seed import PolymorphicBuildSeed
from transforms.luraph_style import (
    LuraphFunctionTransformer,
    LuraphStatementFormatter,
    LargeIndexGenerator,
    LuraphPatternLibrary,
    VMTemplateTransformer,
    HandlerBodyDensifier,
    ConstantPoolReferenceInjector,
    LuraphExpressionGenerator,
    LuraphStyleTransformer,
)


class TestLuraphFunctionTransformer:
    """Tests for LuraphFunctionTransformer (Requirement 32.1)."""
    
    def test_generate_params_count(self):
        """Test that generate_params returns correct number of params."""
        seed = PolymorphicBuildSeed(42)
        lft = LuraphFunctionTransformer(seed)
        params = lft.generate_params(3)
        assert len(params) == 3
    
    def test_generate_params_length(self):
        """Test that generated params are 10 characters."""
        seed = PolymorphicBuildSeed(42)
        lft = LuraphFunctionTransformer(seed)
        params = lft.generate_params(5)
        for param in params:
            assert len(param) == 10
    
    def test_generate_params_valid_start(self):
        """Test that params start with valid identifier character."""
        seed = PolymorphicBuildSeed(42)
        lft = LuraphFunctionTransformer(seed)
        params = lft.generate_params(10)
        valid_starts = {'l', 'I', 'O', '_'}
        for param in params:
            assert param[0] in valid_starts
    
    def test_generate_single_letter_params(self):
        """Test single letter parameter generation."""
        seed = PolymorphicBuildSeed(42)
        lft = LuraphFunctionTransformer(seed)
        params = lft.generate_single_letter_params(4)
        assert len(params) == 4
        # First 4 should be O, e, C, F
        assert params == ['O', 'e', 'C', 'F']
    
    def test_transform_body_adds_state(self):
        """Test that transform_body adds state variable."""
        seed = PolymorphicBuildSeed(42)
        lft = LuraphFunctionTransformer(seed)
        result = lft.transform_body('return a + b')
        # Should contain state assignment
        assert '=' in result
        assert 'return' in result


class TestLuraphStatementFormatter:
    """Tests for LuraphStatementFormatter (Requirement 32.2)."""
    
    def test_format_removes_spaces_around_equals(self):
        """Test that format removes spaces around =."""
        seed = PolymorphicBuildSeed(42)
        lsf = LuraphStatementFormatter(seed)
        result = lsf.format('local x = 1')
        assert 'x=1' in result
    
    def test_remove_whitespace(self):
        """Test whitespace removal."""
        seed = PolymorphicBuildSeed(42)
        lsf = LuraphStatementFormatter(seed)
        result = lsf.remove_whitespace('a + b * c')
        assert result == 'a+b*c'
    
    def test_preserves_keyword_spaces(self):
        """Test that keyword spaces are preserved."""
        seed = PolymorphicBuildSeed(42)
        lsf = LuraphStatementFormatter(seed)
        result = lsf.format('local x = 1')
        assert 'local ' in result or 'local x' in result
    
    def test_removeWhitespace_alias(self):
        """Test that removeWhitespace is an alias for remove_whitespace."""
        seed = PolymorphicBuildSeed(42)
        lsf = LuraphStatementFormatter(seed)
        result1 = lsf.remove_whitespace('a + b')
        result2 = lsf.removeWhitespace('a + b')
        assert result1 == result2
        assert result1 == 'a+b'
    
    def test_format_code_multiline(self):
        """Test format_code converts multi-line to single-line."""
        seed = PolymorphicBuildSeed(42)
        lsf = LuraphStatementFormatter(seed)
        code = 'local x = 1\nlocal y = 2\nreturn x + y'
        result = lsf.format_code(code)
        assert '\n' not in result
        assert 'local x=1' in result
        assert 'local y=2' in result
        assert 'return x+y' in result
    
    def test_format_code_removes_comments(self):
        """Test that format_code removes comments."""
        seed = PolymorphicBuildSeed(42)
        lsf = LuraphStatementFormatter(seed)
        code = 'local x = 1 -- this is a comment\nreturn x'
        result = lsf.format_code(code)
        assert '--' not in result
        assert 'comment' not in result
    
    def test_format_statement_list(self):
        """Test format_statement_list joins with semicolons."""
        seed = PolymorphicBuildSeed(42)
        lsf = LuraphStatementFormatter(seed)
        statements = ['local x = 1', 'local y = 2', 'return x + y']
        result = lsf.format_statement_list(statements)
        assert ';' in result
        assert 'local x=1' in result
    
    def test_format_function_body(self):
        """Test format_function_body formats correctly."""
        seed = PolymorphicBuildSeed(42)
        lsf = LuraphStatementFormatter(seed)
        body = 'local x = 1\nreturn x'
        result = lsf.format_function_body(body)
        assert '\n' not in result
        assert 'local x=1' in result
        assert 'return x' in result
    
    def test_format_preserves_strings(self):
        """Test that format preserves string contents."""
        seed = PolymorphicBuildSeed(42)
        lsf = LuraphStatementFormatter(seed)
        result = lsf.format('local s = "hello world"')
        assert '"hello world"' in result
    
    def test_format_handles_brackets(self):
        """Test that format removes spaces around brackets."""
        seed = PolymorphicBuildSeed(42)
        lsf = LuraphStatementFormatter(seed)
        result = lsf.remove_whitespace('table[ key ]')
        assert result == 'table[key]'
    
    def test_format_handles_two_char_operators(self):
        """Test that format handles two-character operators."""
        seed = PolymorphicBuildSeed(42)
        lsf = LuraphStatementFormatter(seed)
        result = lsf.remove_whitespace('a == b')
        assert result == 'a==b'
        result = lsf.remove_whitespace('a ~= b')
        assert result == 'a~=b'
        result = lsf.remove_whitespace('a .. b')
        assert result == 'a..b'


class TestLargeIndexGenerator:
    """Tests for LargeIndexGenerator (Requirement 32.3)."""
    
    def test_generate_index_above_base(self):
        """Test that generated indices are >= 10000."""
        seed = PolymorphicBuildSeed(42)
        lig = LargeIndexGenerator(seed)
        for _ in range(10):
            index = lig.generate_index()
            assert index >= 10000
    
    def test_indices_are_non_sequential(self):
        """Test that indices have gaps between them."""
        seed = PolymorphicBuildSeed(42)
        lig = LargeIndexGenerator(seed)
        indices = [lig.generate_index() for _ in range(5)]
        for i in range(1, len(indices)):
            gap = indices[i] - indices[i-1]
            assert gap >= 100  # MIN_GAP
    
    def test_format_index_produces_valid_lua(self):
        """Test that formatted indices are valid Lua syntax."""
        seed = PolymorphicBuildSeed(42)
        lig = LargeIndexGenerator(seed)
        for _ in range(10):
            formatted = lig.generate_formatted_index()
            # Should be a valid number format
            assert any([
                formatted.startswith('0x'),
                formatted.startswith('0X'),
                formatted.startswith('0b'),
                formatted.startswith('0B'),
                formatted[0].isdigit(),
            ])


class TestLuraphPatternLibrary:
    """Tests for LuraphPatternLibrary (Requirement 32.4)."""
    
    def test_ternary_pattern(self):
        """Test ternary pattern generation."""
        seed = PolymorphicBuildSeed(42)
        lpl = LuraphPatternLibrary(seed)
        result = lpl.get_ternary_pattern('x > 0', 'x', '0')
        assert 'and' in result
        assert 'or' in result
    
    def test_arithmetic_pattern(self):
        """Test arithmetic pattern generation."""
        seed = PolymorphicBuildSeed(42)
        lpl = LuraphPatternLibrary(seed)
        result = lpl.get_arithmetic_pattern('a', '+', 'b')
        # Should contain bit32 method calls
        assert '.' in result
        assert '(' in result
    
    def test_table_access_pattern(self):
        """Test table access pattern generation."""
        seed = PolymorphicBuildSeed(42)
        lpl = LuraphPatternLibrary(seed)
        result = lpl.get_table_access_pattern('S', 'key', depth=2)
        # Should have nested brackets
        assert result.count('[') >= 3


class TestHandlerBodyDensifier:
    """Tests for HandlerBodyDensifier (Requirement 32.6)."""
    
    def test_densify_removes_newlines(self):
        """Test that densify removes newlines."""
        seed = PolymorphicBuildSeed(42)
        hbd = HandlerBodyDensifier(seed)
        result = hbd.densify('local x = 1\nreturn x')
        assert '\n' not in result
    
    def test_densify_adds_semicolons(self):
        """Test that densify adds semicolons between statements."""
        seed = PolymorphicBuildSeed(42)
        hbd = HandlerBodyDensifier(seed)
        result = hbd.densify('local x = 1\nlocal y = 2')
        assert ';' in result
    
    def test_densify_removes_comments(self):
        """Test that densify removes comments."""
        seed = PolymorphicBuildSeed(42)
        hbd = HandlerBodyDensifier(seed)
        result = hbd.densify('local x = 1 -- comment\nreturn x')
        assert '--' not in result


class TestConstantPoolReferenceInjector:
    """Tests for ConstantPoolReferenceInjector (Requirement 32.7)."""
    
    def test_inject_reference_returns_table_access(self):
        """Test that inject_reference returns table access."""
        seed = PolymorphicBuildSeed(42)
        cpri = ConstantPoolReferenceInjector(seed)
        result = cpri.inject_reference('hello')
        assert '[' in result
        assert ']' in result
    
    def test_inject_same_value_returns_same_ref(self):
        """Test that same value returns same reference."""
        seed = PolymorphicBuildSeed(42)
        cpri = ConstantPoolReferenceInjector(seed)
        ref1 = cpri.inject_reference('hello')
        ref2 = cpri.inject_reference('hello')
        assert ref1 == ref2
    
    def test_inject_different_values_returns_different_refs(self):
        """Test that different values return different references."""
        seed = PolymorphicBuildSeed(42)
        cpri = ConstantPoolReferenceInjector(seed)
        ref1 = cpri.inject_reference('hello')
        ref2 = cpri.inject_reference('world')
        assert ref1 != ref2


class TestLuraphExpressionGenerator:
    """Tests for LuraphExpressionGenerator (Requirement 32.8)."""
    
    def test_generate_complex_expression(self):
        """Test complex expression generation."""
        seed = PolymorphicBuildSeed(42)
        leg = LuraphExpressionGenerator(seed)
        result = leg.generate_complex_expression('x', depth=2)
        # Should have nested structure
        assert result.count('(') >= 2
    
    def test_generate_table_chain(self):
        """Test table chain generation."""
        seed = PolymorphicBuildSeed(42)
        leg = LuraphExpressionGenerator(seed)
        result = leg.generate_table_chain('x', depth=3)
        # Should have multiple table accesses
        assert result.count('[') >= 3
    
    def test_generate_conditional_expression(self):
        """Test conditional expression generation."""
        seed = PolymorphicBuildSeed(42)
        leg = LuraphExpressionGenerator(seed)
        result = leg.generate_conditional_expression('x > 0', 'x', '0')
        assert 'and' in result
        assert 'or' in result


class TestLuraphStyleTransformer:
    """Tests for LuraphStyleTransformer (combined interface)."""
    
    def test_transform_basic_code(self):
        """Test basic code transformation."""
        seed = PolymorphicBuildSeed(42)
        lst = LuraphStyleTransformer(seed)
        code = 'local x = 1\nreturn x'
        result = lst.transform(code)
        # Should be densified
        assert '\n' not in result or result.count('\n') < code.count('\n')
    
    def test_get_pattern(self):
        """Test pattern retrieval."""
        seed = PolymorphicBuildSeed(42)
        lst = LuraphStyleTransformer(seed)
        result = lst.get_pattern('ternary', condition='x', true_val='1', false_val='0')
        assert 'and' in result
        assert 'or' in result
    
    def test_generate_expression(self):
        """Test expression generation through combined interface."""
        seed = PolymorphicBuildSeed(42)
        lst = LuraphStyleTransformer(seed)
        result = lst.generate_expression('x', depth=2)
        assert '(' in result


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
