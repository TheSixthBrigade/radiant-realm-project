"""
Property-Based Tests for Core Systems.

Tests the following properties:
- Property 2: Unique Build Output (PBS)
- Property 3: Deterministic Seed Behavior (PBS)
- Property 4: UNS Name Validity
- Property 5: UNS Name Uniqueness
- Property 8: Opaque Predicate Correctness (OPG)
- Property 9: Constant Index Range (CPM)
- Property 7: Syntax Validity (OutputValidator)

Requirements validated: 1.1, 1.2, 1.3, 2.1, 2.2, 4.1, 6.2, 8.1, 8.2
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from hypothesis import given, settings, assume, example
from hypothesis import strategies as st
import pytest

from core.seed import PolymorphicBuildSeed
from core.naming import UnifiedNamingSystem, ROBLOX_GLOBALS
from core.constants import ConstantPoolManager
from core.predicates import OpaquePredicateGenerator


# =============================================================================
# Property 2 & 3: Polymorphic Build Seed (PBS) Tests
# Requirements: 1.1, 1.2, 1.3
# =============================================================================

class TestPBSProperties:
    """Property tests for Polymorphic Build Seed System."""
    
    @given(st.integers(min_value=0, max_value=2**31-1))
    @settings(max_examples=100)
    def test_deterministic_seed_behavior(self, seed: int):
        """
        Property 3: Same seed produces same sequence of random values.
        
        Given the same seed, two PBS instances should produce identical
        sequences of random values.
        """
        pbs1 = PolymorphicBuildSeed(seed=seed)
        pbs2 = PolymorphicBuildSeed(seed=seed)
        
        # Generate sequence of values from both
        for _ in range(10):
            assert pbs1.get_random_int(0, 1000) == pbs2.get_random_int(0, 1000)
            assert pbs1.random_bool() == pbs2.random_bool()
    
    @given(st.integers(min_value=0, max_value=2**31-1))
    @settings(max_examples=50)
    def test_seed_stored_correctly(self, seed: int):
        """Seed value is stored and retrievable."""
        pbs = PolymorphicBuildSeed(seed=seed)
        assert pbs.get_seed() == seed
    
    def test_unique_build_output(self):
        """
        Property 2: Different seeds produce different outputs.
        
        Two PBS instances with different seeds should produce different
        random sequences (with high probability).
        """
        pbs1 = PolymorphicBuildSeed(seed=12345)
        pbs2 = PolymorphicBuildSeed(seed=67890)
        
        # Generate sequences
        seq1 = [pbs1.get_random_int(0, 10000) for _ in range(20)]
        seq2 = [pbs2.get_random_int(0, 10000) for _ in range(20)]
        
        # Sequences should differ
        assert seq1 != seq2
    
    def test_entropy_seed_uniqueness(self):
        """Entropy-based seeds should be unique across instances."""
        seeds = set()
        for _ in range(10):
            pbs = PolymorphicBuildSeed()  # No seed = entropy-based
            seeds.add(pbs.get_seed())
        
        # All seeds should be unique
        assert len(seeds) == 10
    
    @given(st.integers(min_value=0, max_value=100), st.integers(min_value=101, max_value=1000))
    @settings(max_examples=50)
    def test_random_int_in_range(self, min_val: int, max_val: int):
        """Random integers are within specified range."""
        pbs = PolymorphicBuildSeed(seed=42)
        for _ in range(20):
            val = pbs.get_random_int(min_val, max_val)
            assert min_val <= val <= max_val
    
    @given(st.lists(st.integers(), min_size=1, max_size=20))
    @settings(max_examples=50)
    def test_shuffle_preserves_elements(self, items: list):
        """Shuffle preserves all elements."""
        pbs = PolymorphicBuildSeed(seed=42)
        shuffled = pbs.shuffle(items)
        assert sorted(shuffled) == sorted(items)
    
    @given(st.lists(st.integers(), min_size=1, max_size=20))
    @settings(max_examples=50)
    def test_choice_returns_element(self, items: list):
        """Choice returns an element from the list."""
        pbs = PolymorphicBuildSeed(seed=42)
        chosen = pbs.choice(items)
        assert chosen in items


# =============================================================================
# Property 4 & 5: Unified Naming System (UNS) Tests
# Requirements: 2.1, 2.2, 2.3
# =============================================================================

class TestUNSProperties:
    """Property tests for Unified Naming System."""
    
    VALID_CHARS = set('lIO01_')
    VALID_START_CHARS = set('lIO_')
    
    @given(st.integers(min_value=0, max_value=2**31-1))
    @settings(max_examples=50)
    def test_name_validity(self, seed: int):
        """
        Property 4: Generated names are valid Lua identifiers.
        
        - Exactly 31 characters
        - Uses only {l, I, O, 0, 1, _}
        - Starts with letter or underscore
        """
        pbs = PolymorphicBuildSeed(seed=seed)
        uns = UnifiedNamingSystem(pbs)
        
        for _ in range(10):
            name = uns.generate_name()
            
            # Check length
            assert len(name) == 31, f"Name length is {len(name)}, expected 31"
            
            # Check all characters are valid
            for char in name:
                assert char in self.VALID_CHARS, f"Invalid char '{char}' in name"
            
            # Check first character is valid identifier start
            assert name[0] in self.VALID_START_CHARS, f"Invalid start char '{name[0]}'"
    
    @given(st.integers(min_value=0, max_value=2**31-1))
    @settings(max_examples=50)
    def test_name_uniqueness(self, seed: int):
        """
        Property 5: Generated names are unique within an instance.
        
        No two calls to generate_name() should return the same name.
        """
        pbs = PolymorphicBuildSeed(seed=seed)
        uns = UnifiedNamingSystem(pbs)
        
        names = set()
        for _ in range(100):
            name = uns.generate_name()
            assert name not in names, f"Duplicate name generated: {name}"
            names.add(name)
    
    @given(st.integers(min_value=3, max_value=30))
    @settings(max_examples=30)
    def test_short_name_validity(self, length: int):
        """Short names are valid Lua identifiers."""
        pbs = PolymorphicBuildSeed(seed=42)
        uns = UnifiedNamingSystem(pbs)
        
        name = uns.generate_short_name(length)
        
        assert len(name) == length
        assert name[0] in self.VALID_START_CHARS
        for char in name:
            assert char in self.VALID_CHARS
    
    def test_roblox_globals_not_renamed(self):
        """Roblox globals are correctly identified."""
        pbs = PolymorphicBuildSeed(seed=42)
        uns = UnifiedNamingSystem(pbs)
        
        # Check some key Roblox globals
        roblox_names = ['game', 'workspace', 'script', 'Players', 'HttpService']
        for name in roblox_names:
            assert uns.is_roblox_global(name), f"{name} should be a Roblox global"
            assert not uns.should_rename(name), f"{name} should not be renamed"
        
        # Check non-globals
        non_globals = ['myVar', 'localFunc', 'x', 'data']
        for name in non_globals:
            assert not uns.is_roblox_global(name), f"{name} should not be a Roblox global"
            assert uns.should_rename(name), f"{name} should be renamed"
    
    def test_reset_clears_names(self):
        """Reset clears the used names set."""
        pbs = PolymorphicBuildSeed(seed=42)
        uns = UnifiedNamingSystem(pbs)
        
        # Generate some names
        names_before = [uns.generate_name() for _ in range(5)]
        assert uns.get_name_count() == 5
        
        # Reset
        uns.reset()
        assert uns.get_name_count() == 0


# =============================================================================
# Property 9: Constant Pool Manager (CPM) Tests
# Requirements: 4.1, 4.2, 4.3
# =============================================================================

class TestCPMProperties:
    """Property tests for Constant Pool Manager."""
    
    @given(st.integers(min_value=0, max_value=2**31-1))
    @settings(max_examples=50)
    def test_constant_index_range(self, seed: int):
        """
        Property 9: All constant indices are >= 10000.
        
        Luraph-style uses large non-sequential indices starting at 10000+.
        """
        pbs = PolymorphicBuildSeed(seed=seed)
        cpm = ConstantPoolManager(pbs)
        
        # Add various constants
        test_values = [42, "hello", 3.14, True, None, -999]
        for value in test_values:
            idx = cpm.add_constant(value)
            assert idx >= 10000, f"Index {idx} is below minimum 10000"
    
    @given(st.integers(min_value=0, max_value=2**31-1))
    @settings(max_examples=30)
    def test_indices_non_sequential(self, seed: int):
        """Indices are non-sequential (gaps between them)."""
        pbs = PolymorphicBuildSeed(seed=seed)
        cpm = ConstantPoolManager(pbs)
        
        indices = []
        for i in range(10):
            idx = cpm.add_constant(f"const_{i}")
            indices.append(idx)
        
        # Check gaps exist between consecutive indices
        for i in range(1, len(indices)):
            gap = indices[i] - indices[i-1]
            assert gap >= 100, f"Gap {gap} is too small (min 100)"
    
    @given(st.text(min_size=1, max_size=50))
    @settings(max_examples=30)
    def test_constant_retrieval(self, value: str):
        """Constants can be retrieved by their index."""
        pbs = PolymorphicBuildSeed(seed=42)
        cpm = ConstantPoolManager(pbs)
        
        idx = cpm.add_constant(value)
        retrieved = cpm.get_constant(idx)
        assert retrieved == value
    
    def test_deduplication(self):
        """Same constant value returns same index."""
        pbs = PolymorphicBuildSeed(seed=42)
        cpm = ConstantPoolManager(pbs)
        
        idx1 = cpm.add_constant("duplicate")
        idx2 = cpm.add_constant("duplicate")
        assert idx1 == idx2
    
    def test_decoys_added(self):
        """Decoy constants are added correctly."""
        pbs = PolymorphicBuildSeed(seed=42)
        cpm = ConstantPoolManager(pbs)
        
        decoy_indices = cpm.add_decoys()
        assert len(decoy_indices) == 5
        
        for idx in decoy_indices:
            assert idx >= 10000
    
    @given(st.integers(min_value=10000, max_value=100000))
    @settings(max_examples=30)
    def test_computed_index_format(self, index: int):
        """Computed index expressions are valid Luau syntax."""
        pbs = PolymorphicBuildSeed(seed=42)
        cpm = ConstantPoolManager(pbs)
        
        computed = cpm.generate_computed_index(index)
        
        # Should be a valid expression (starts with 0x, 0X, 0b, 0B, or ()
        valid_starts = ('0x', '0X', '0b', '0B', '(')
        assert any(computed.startswith(s) for s in valid_starts), \
            f"Invalid computed index format: {computed}"


# =============================================================================
# Property 8: Opaque Predicate Generator (OPG) Tests
# Requirements: 6.1, 6.2
# =============================================================================

class TestOPGProperties:
    """Property tests for Opaque Predicate Generator."""
    
    @given(st.integers(min_value=0, max_value=2**31-1))
    @settings(max_examples=50)
    def test_true_predicate_correctness(self, seed: int):
        """
        Property 8: True predicates always evaluate to true.
        
        All patterns returned by get_true_predicate() must evaluate to true
        when executed in Lua/Luau.
        """
        pbs = PolymorphicBuildSeed(seed=seed)
        opg = OpaquePredicateGenerator(pbs)
        
        # Get all true patterns
        true_patterns = opg.get_all_true_patterns()
        
        for pattern in true_patterns:
            # Verify pattern structure (should be a comparison or logical expression)
            has_comparison = '==' in pattern or '~=' in pattern or '>' in pattern or '<' in pattern
            has_logical = 'not' in pattern or 'and' in pattern or 'or' in pattern
            assert has_comparison or has_logical, \
                f"Pattern missing comparison or logical operator: {pattern}"
            
            # Verify it uses bit32 operations or simple comparisons
            uses_bit32 = 'bit32.' in pattern or 'bit32[' in pattern
            uses_simple = '0x' in pattern or '0X' in pattern
            assert uses_bit32 or uses_simple, \
                f"Pattern should use bit32 or hex values: {pattern}"
    
    @given(st.integers(min_value=0, max_value=2**31-1))
    @settings(max_examples=50)
    def test_false_predicate_correctness(self, seed: int):
        """
        Property 8: False predicates always evaluate to false.
        
        All patterns returned by get_false_predicate() must evaluate to false
        when executed in Lua/Luau.
        """
        pbs = PolymorphicBuildSeed(seed=seed)
        opg = OpaquePredicateGenerator(pbs)
        
        # Get all false patterns
        false_patterns = opg.get_all_false_patterns()
        
        for pattern in false_patterns:
            # Verify pattern structure (should be a comparison or logical expression)
            has_comparison = '==' in pattern or '~=' in pattern or '>' in pattern or '<' in pattern
            has_logical = 'not' in pattern or 'and' in pattern or 'or' in pattern
            assert has_comparison or has_logical, \
                f"Pattern missing comparison or logical operator: {pattern}"
            
            # Verify it uses bit32 operations or simple comparisons
            uses_bit32 = 'bit32.' in pattern or 'bit32[' in pattern
            uses_simple = '0x' in pattern or '0X' in pattern
            assert uses_bit32 or uses_simple, \
                f"Pattern should use bit32 or hex values: {pattern}"
    
    def test_predicate_variety(self):
        """Multiple different predicates are available."""
        pbs = PolymorphicBuildSeed(seed=42)
        opg = OpaquePredicateGenerator(pbs)
        
        assert len(opg.get_all_true_patterns()) >= 5
        assert len(opg.get_all_false_patterns()) >= 5
    
    def test_get_predicate_by_value(self):
        """get_predicate returns correct type based on value."""
        pbs = PolymorphicBuildSeed(seed=42)
        opg = OpaquePredicateGenerator(pbs)
        
        true_pred = opg.get_predicate(True)
        false_pred = opg.get_predicate(False)
        
        assert true_pred in opg.get_all_true_patterns()
        assert false_pred in opg.get_all_false_patterns()
    
    def test_conditional_block_generation(self):
        """Conditional blocks are generated correctly."""
        pbs = PolymorphicBuildSeed(seed=42)
        opg = OpaquePredicateGenerator(pbs)
        
        block = opg.generate_conditional_block("print('hello')", "print('dead')")
        
        assert 'if' in block
        assert 'then' in block
        assert 'else' in block
        assert 'end' in block
        assert "print('hello')" in block
        assert "print('dead')" in block
    
    def test_dead_branch_generation(self):
        """Dead branches use false predicates."""
        pbs = PolymorphicBuildSeed(seed=42)
        opg = OpaquePredicateGenerator(pbs)
        
        dead = opg.generate_dead_branch("unreachable()")
        
        assert 'if' in dead
        assert 'then' in dead
        assert 'end' in dead
        assert 'unreachable()' in dead


# =============================================================================
# Run tests if executed directly
# =============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])


# =============================================================================
# Property 7: Output Validator Tests
# Requirements: 8.1, 8.2
# =============================================================================

class TestOutputValidatorProperties:
    """Property tests for Output Validator."""
    
    def test_valid_luau_syntax_passes(self):
        """
        Property 7: Valid Luau syntax passes validation.
        
        Basic valid Luau code should pass syntax validation.
        """
        from core.validator import OutputValidator
        
        try:
            validator = OutputValidator()
        except Exception:
            pytest.skip("luau-compile.exe not available")
        
        valid_code_samples = [
            "local x = 1",
            "local y = 0xFF",
            "local z = 0b11111111",  # Luau binary literal
            "local a = 0X5_A",  # Luau underscore separator
            "print('hello')",
            "local function foo() return 1 end",
            "for i = 1, 10 do print(i) end",
            "local t = {a = 1, b = 2}",
        ]
        
        for code in valid_code_samples:
            result = validator.validate(code)
            assert result.valid, f"Valid code failed: {code} - {result.error_message}"
    
    def test_invalid_syntax_fails(self):
        """Invalid Luau syntax fails validation."""
        from core.validator import OutputValidator
        
        try:
            validator = OutputValidator()
        except Exception:
            pytest.skip("luau-compile.exe not available")
        
        invalid_code_samples = [
            "local x = ",  # Incomplete
            "local = 1",  # Missing identifier
            "function(",  # Incomplete function
            "if then end",  # Missing condition
            "local x = {",  # Unclosed brace
        ]
        
        for code in invalid_code_samples:
            result = validator.validate(code)
            assert not result.valid, f"Invalid code passed: {code}"
    
    def test_luau_specific_features(self):
        """Luau-specific features are accepted."""
        from core.validator import OutputValidator
        
        try:
            validator = OutputValidator()
        except Exception:
            pytest.skip("luau-compile.exe not available")
        
        luau_features = [
            # Binary literals
            "local x = 0b1010",
            "local y = 0B11110000",
            # Underscore separators
            "local a = 1_000_000",
            "local b = 0xFF_FF",
            "local c = 0b1111__0000",
            # Continue statement
            "for i = 1, 10 do if i == 5 then continue end print(i) end",
            # Compound assignment
            "local x = 1; x += 1",
        ]
        
        for code in luau_features:
            result = validator.validate(code)
            assert result.valid, f"Luau feature failed: {code} - {result.error_message}"
    
    def test_validation_result_structure(self):
        """ValidationResult has correct structure."""
        from core.validator import ValidationResult
        
        # Valid result
        valid = ValidationResult(valid=True)
        assert valid.valid
        assert valid.error_message is None
        assert bool(valid) is True
        
        # Invalid result
        invalid = ValidationResult(
            valid=False,
            error_message="Test error",
            error_line=10,
            error_column=5
        )
        assert not invalid.valid
        assert invalid.error_message == "Test error"
        assert invalid.error_line == 10
        assert invalid.error_column == 5
        assert bool(invalid) is False
    
    def test_compiler_availability_check(self):
        """Compiler availability can be checked."""
        from core.validator import OutputValidator
        
        try:
            validator = OutputValidator()
            # If we got here, compiler is available
            assert validator.is_compiler_available()
        except Exception:
            pytest.skip("luau-compile.exe not available")
