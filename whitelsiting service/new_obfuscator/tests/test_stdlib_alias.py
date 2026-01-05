"""
Property-Based Tests for Stdlib Alias Fix.

Tests the following properties:
- Property 1: No visible library names in output after obfuscation
- Property 2: Alias definition before usage
- Property 3: Direct library reference in definitions

Requirements validated: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1
"""

import sys
import os
import re

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from hypothesis import given, settings, assume
from hypothesis import strategies as st
import pytest

from config import ObfuscatorConfig


# =============================================================================
# Property 1: No Visible Library Names in Output
# Requirements: 1.1, 1.2, 1.3, 1.4
# =============================================================================

class TestStdlibAliasProperties:
    """Property tests for stdlib alias replacement."""
    
    STDLIB_LIBS = ['bit32', 'string', 'table', 'buffer', 'coroutine', 'math', 'os', 'debug']
    
    def _create_obfuscator(self, seed: int):
        """Create a LuraphObfuscator instance with given seed."""
        from obfuscate import LuraphObfuscator
        config = ObfuscatorConfig(seed=seed)
        return LuraphObfuscator(config)
    
    @given(st.integers(min_value=1, max_value=100))
    @settings(max_examples=20)
    def test_bracket_notation_replacement(self, seed: int):
        """
        Property 1: No visible library names in bracket notation after obfuscation.
        
        WHEN the obfuscator processes code containing lib["method"] patterns
        THEN the system SHALL replace lib with its assigned alias.
        """
        obfuscator = self._create_obfuscator(seed)
        
        # Initialize lib_aliases (normally done during obfuscation)
        obfuscator.lib_aliases = {}
        for lib in self.STDLIB_LIBS:
            obfuscator.lib_aliases[lib] = obfuscator.naming.generate_short_name(3)
        
        # Test code with bracket notation
        test_code = '''
local x = bit32["band"](0xFF, 0x0F)
local y = string["sub"]("hello", 1, 3)
local z = table["insert"](t, value)
local w = buffer["readu8"](buf, 0)
'''
        
        result = obfuscator._obfuscate_stdlib_access(test_code)
        
        # Verify no library names appear before brackets
        for lib in self.STDLIB_LIBS:
            # Pattern: lib[ should not exist (except in alias definitions)
            pattern = rf'\b{lib}\['
            matches = re.findall(pattern, result)
            assert len(matches) == 0, f"Found unobfuscated {lib}[ in output: {result}"
    
    @given(st.integers(min_value=1, max_value=100))
    @settings(max_examples=20)
    def test_escaped_bracket_notation_replacement(self, seed: int):
        """
        Property 1: Escaped string bracket notation is also replaced.
        
        WHEN the obfuscator processes code containing lib["\\escaped"] patterns
        THEN the system SHALL replace lib with its assigned alias.
        """
        obfuscator = self._create_obfuscator(seed)
        
        # Initialize lib_aliases
        obfuscator.lib_aliases = {}
        for lib in self.STDLIB_LIBS:
            obfuscator.lib_aliases[lib] = obfuscator.naming.generate_short_name(3)
        
        # Test code with escaped bracket notation (like what the obfuscator generates)
        test_code = r'''
local x = bit32["\98\97\110\100"](0xFF, 0x0F)
local y = string["\115\117\98"]("hello", 1, 3)
'''
        
        result = obfuscator._obfuscate_stdlib_access(test_code)
        
        # Verify no library names appear before brackets
        for lib in ['bit32', 'string']:
            pattern = rf'\b{lib}\['
            matches = re.findall(pattern, result)
            assert len(matches) == 0, f"Found unobfuscated {lib}[ in output"
    
    @given(st.integers(min_value=1, max_value=100))
    @settings(max_examples=20)
    def test_dot_notation_still_works(self, seed: int):
        """
        Property 1: Dot notation replacement still works after bracket fix.
        
        WHEN the obfuscator processes code containing lib.method patterns
        THEN the system SHALL replace lib with its assigned alias.
        """
        obfuscator = self._create_obfuscator(seed)
        
        # Initialize lib_aliases
        obfuscator.lib_aliases = {}
        for lib in self.STDLIB_LIBS:
            obfuscator.lib_aliases[lib] = obfuscator.naming.generate_short_name(3)
        
        # Test code with dot notation
        test_code = '''
local x = bit32.band(0xFF, 0x0F)
local y = string.sub("hello", 1, 3)
local z = table.insert(t, value)
'''
        
        result = obfuscator._obfuscate_stdlib_access(test_code)
        
        # Verify no library names appear with dot notation
        for lib in ['bit32', 'string', 'table']:
            # After obfuscation, lib.method becomes alias["escaped_method"]
            # So lib. should not exist
            pattern = rf'\b{lib}\.'
            matches = re.findall(pattern, result)
            assert len(matches) == 0, f"Found unobfuscated {lib}. in output"
    
    @given(st.integers(min_value=1, max_value=100))
    @settings(max_examples=20)
    def test_mixed_notation_replacement(self, seed: int):
        """
        Property 1: Mixed dot and bracket notation both get replaced.
        
        WHEN the obfuscator processes code with both notations
        THEN the system SHALL replace all library references.
        """
        obfuscator = self._create_obfuscator(seed)
        
        # Initialize lib_aliases
        obfuscator.lib_aliases = {}
        for lib in self.STDLIB_LIBS:
            obfuscator.lib_aliases[lib] = obfuscator.naming.generate_short_name(3)
        
        # Test code with mixed notation
        test_code = '''
local a = bit32.band(0xFF, 0x0F)
local b = bit32["bor"](0x10, 0x20)
local c = string.sub("test", 1)
local d = string["len"]("hello")
'''
        
        result = obfuscator._obfuscate_stdlib_access(test_code)
        
        # Verify no library names remain
        for lib in ['bit32', 'string']:
            dot_pattern = rf'\b{lib}\.'
            bracket_pattern = rf'\b{lib}\['
            assert len(re.findall(dot_pattern, result)) == 0, f"Found {lib}. in output"
            assert len(re.findall(bracket_pattern, result)) == 0, f"Found {lib}[ in output"


# =============================================================================
# Property 2: Alias Definition Before Usage
# Requirements: 2.1, 2.2, 2.3
# =============================================================================

class TestAliasDefinitionOrder:
    """Property tests for alias definition ordering."""
    
    def _create_obfuscator(self, seed: int):
        """Create a LuraphObfuscator instance with given seed."""
        from obfuscate import LuraphObfuscator
        config = ObfuscatorConfig(seed=seed)
        return LuraphObfuscator(config)
    
    @given(st.integers(min_value=1, max_value=50))
    @settings(max_examples=10)
    def test_alias_definitions_generated(self, seed: int):
        """
        Property 2: Alias definitions are generated for all used libraries.
        
        WHEN library aliases are generated
        THEN the system SHALL create definitions for all stdlib libraries.
        """
        obfuscator = self._create_obfuscator(seed)
        
        # Initialize lib_aliases
        obfuscator.lib_aliases = {
            'bit32': '_a',
            'string': '_b',
            'table': '_c',
        }
        
        defs = obfuscator._generate_lib_alias_definitions()
        
        # Verify definitions exist for each alias
        assert 'local _a=bit32' in defs
        assert 'local _b=string' in defs
        assert 'local _c=table' in defs


# =============================================================================
# Property 3: Direct Library Reference in Definitions
# Requirements: 3.1
# =============================================================================

class TestDirectLibraryReference:
    """Property tests for direct library references."""
    
    def _create_obfuscator(self, seed: int):
        """Create a LuraphObfuscator instance with given seed."""
        from obfuscate import LuraphObfuscator
        config = ObfuscatorConfig(seed=seed)
        return LuraphObfuscator(config)
    
    @given(st.integers(min_value=1, max_value=50))
    @settings(max_examples=10)
    def test_no_global_table_access(self, seed: int):
        """
        Property 3: Alias definitions use direct library references, not _G.
        
        WHEN generating alias definitions
        THEN the system SHALL use direct library references (e.g., local _m=bit32)
        NOT _G["bit32"] which returns nil in Roblox.
        """
        obfuscator = self._create_obfuscator(seed)
        
        # Initialize lib_aliases
        obfuscator.lib_aliases = {
            'bit32': '_a',
            'string': '_b',
        }
        
        defs = obfuscator._generate_lib_alias_definitions()
        
        # Verify NO _G["lib"] patterns exist
        assert '_G["bit32"]' not in defs
        assert '_G["string"]' not in defs
        assert "_G['bit32']" not in defs
        assert "_G['string']" not in defs
        
        # Verify direct references are used
        assert '=bit32' in defs
        assert '=string' in defs


# =============================================================================
# Run tests if executed directly
# =============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
