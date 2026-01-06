"""
Opaque Predicate Generator (OPG) for the Luraph-style obfuscator.

This module generates always-true and always-false conditions using
bit32 operations that are difficult for static analysis tools to
evaluate. These predicates are used to create fake branches and
confuse control flow analysis.

Requirements: 6.1, 6.2
"""

from typing import List, Tuple

from .seed import PolymorphicBuildSeed


class OpaquePredicateGenerator:
    """
    Opaque Predicate Generator for creating always-true/false conditions.
    
    Generates 10 distinct patterns using bit32 operations that always
    evaluate to a known boolean value but are difficult for static
    analysis to determine.
    
    Example:
        >>> opg = OpaquePredicateGenerator(PolymorphicBuildSeed(seed=42))
        >>> opg.get_true_predicate()
        '(bit32.band(0xFF,0xFF)==0xFF)'
        >>> opg.get_false_predicate()
        '(bit32.bxor(0x5A,0x5A)~=0)'
    """
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize the Opaque Predicate Generator.
        
        Args:
            seed: PolymorphicBuildSeed instance for randomization
        """
        self.seed = seed
        self._true_patterns = self._init_true_patterns()
        self._false_patterns = self._init_false_patterns()
    
    def _init_true_patterns(self) -> List[str]:
        """
        Initialize always-true predicate patterns.
        
        These patterns use _G["escaped"] to hide bit32 library name.
        
        Returns:
            List of always-true predicate strings
        """
        # Use _G["escaped"]["escaped"] to hide bit32 methods
        # bit32 = \98\105\116\51\50
        # band = \98\97\110\100
        # bor = \98\111\114
        # bxor = \98\120\111\114
        # lshift = \108\115\104\105\102\116
        # rshift = \114\115\104\105\102\116
        # NOTE: Use bit32 directly - _G["bit32"] returns nil in Roblox!
        b32 = 'bit32'
        band = f'{b32}["\\98\\97\\110\\100"]'
        bor = f'{b32}["\\98\\111\\114"]'
        bxor = f'{b32}["\\98\\120\\111\\114"]'
        lshift = f'{b32}["\\108\\115\\104\\105\\102\\116"]'
        rshift = f'{b32}["\\114\\115\\104\\105\\102\\116"]'
        
        return [
            # Pattern 1: band(x, x) == x (identity)
            f'({band}(0xFF,0xFF)==0xFF)',
            
            # Pattern 2: bor(0, x) == x (identity)
            f'({bor}(0x0,0x1)==0x1)',
            
            # Pattern 3: bxor(x, y) where x != y gives non-zero
            f'({bxor}(0x5A,0x5B)~=0)',
            
            # Pattern 4: lshift(1, 0) == 1
            f'({lshift}(0x1,0x0)==0x1)',
            
            # Pattern 5: rshift(x, 0) == x (identity)
            f'({rshift}(0xFF,0x0)==0xFF)',
            
            # Luraph-style patterns (no bit32 needed)
            # Pattern 6: not(not true) == true
            '(not(not(0x1==0x1)))',
            
            # Pattern 7: Double negation with comparison
            '(not(0x1~=0x1))',
            
            # Pattern 8: Complex nested not
            f'(not(not({band}(0xFF,0xFF)==0xFF)))',
            
            # Pattern 9: Math identity (x*1 == x)
            '((0x5A*0x1)==0x5A)',
            
            # Pattern 10: Math identity (x+0 == x)
            '((0xFF+0x0)==0xFF)',
            
            # Pattern 11: Comparison chain
            '(0x1<=0x1)',
            
            # Pattern 12: Type check (always true for numbers)
            '(type(0x1)=="number")',
        ]
    
    def _init_false_patterns(self) -> List[str]:
        """
        Initialize always-false predicate patterns.
        
        These patterns use _G["escaped"] to hide bit32 library name.
        
        Returns:
            List of always-false predicate strings
        """
        # NOTE: Use bit32 directly - _G["bit32"] returns nil in Roblox!
        b32 = 'bit32'
        band = f'{b32}["\\98\\97\\110\\100"]'
        bor = f'{b32}["\\98\\111\\114"]'
        bxor = f'{b32}["\\98\\120\\111\\114"]'
        lshift = f'{b32}["\\108\\115\\104\\105\\102\\116"]'
        rshift = f'{b32}["\\114\\115\\104\\105\\102\\116"]'
        
        return [
            # Pattern 1: bxor(x, x) == 0, so ~= 0 is false
            f'({bxor}(0x5A,0x5A)~=0)',
            
            # Pattern 2: band(0, x) == 0, so ~= 0 is false
            f'({band}(0x0,0xFF)~=0)',
            
            # Pattern 3: lshift(0, x) == 0, so > 0 is false
            f'({lshift}(0x0,0x5)>0)',
            
            # Pattern 4: bor(x, x) == x, so ~= x is false
            f'({bor}(0xAA,0xAA)~=0xAA)',
            
            # Pattern 5: rshift(0, x) == 0, so ~= 0 is false
            f'({rshift}(0x0,0x3)~=0)',
            
            # Luraph-style patterns (no bit32 needed)
            # Pattern 6: not(true) == false
            '(not(0x1==0x1))',
            
            # Pattern 7: Double negation of false
            '(not(not(0x1~=0x1)))',
            
            # Pattern 8: Impossible comparison
            '(0x1>0x1)',
            
            # Pattern 9: Math impossibility
            '((0x5A*0x0)~=0x0)',
            
            # Pattern 10: Type mismatch (number is never string)
            '(type(0x1)=="string")',
            
            # Pattern 11: Comparison chain (impossible)
            '(0x1>0x2)',
            
            # Pattern 12: Complex nested false
            f'(not(not({bxor}(0x5A,0x5A)~=0)))',
        ]
    
    def get_true_predicate(self) -> str:
        """
        Get a random always-true predicate.
        
        Returns:
            A predicate string that always evaluates to true
        
        Example:
            >>> opg.get_true_predicate()
            '(bit32.band(0xFF,0xFF)==0xFF)'
        """
        return self.seed.choice(self._true_patterns)
    
    def get_false_predicate(self) -> str:
        """
        Get a random always-false predicate.
        
        Returns:
            A predicate string that always evaluates to false
        
        Example:
            >>> opg.get_false_predicate()
            '(bit32.bxor(0x5A,0x5A)~=0)'
        """
        return self.seed.choice(self._false_patterns)
    
    def get_predicate(self, value: bool) -> str:
        """
        Get a predicate that evaluates to the specified boolean value.
        
        Args:
            value: The desired boolean result
        
        Returns:
            A predicate string that evaluates to the specified value
        """
        if value:
            return self.get_true_predicate()
        return self.get_false_predicate()
    
    def generate_complex_true(self) -> str:
        """
        Generate a more complex always-true predicate.
        
        Uses _G["escaped"] to hide bit32 library name.
        
        Returns:
            Complex always-true predicate string
        """
        # NOTE: Use bit32 directly - _G["bit32"] returns nil in Roblox!
        b32 = 'bit32'
        band = f'{b32}["\\98\\97\\110\\100"]'
        bor = f'{b32}["\\98\\111\\114"]'
        bxor = f'{b32}["\\98\\120\\111\\114"]'
        lshift = f'{b32}["\\108\\115\\104\\105\\102\\116"]'
        
        patterns = [
            # Nested operations
            f'(({band}({bor}(0x0,0xFF),0xFF))==0xFF)',
            
            # Double negation equivalent
            f'({bxor}({bxor}(0x5A,0x5A),0x0)==0)',
            
            # Shift and mask
            f'(({band}({lshift}(0x1,0x4),0x10))==0x10)',
            
            # Simple math (no bit32 needed)
            '((0xFF+0x0)==0xFF)',
            
            # Type check
            '(type(0x1)=="number")',
        ]
        return self.seed.choice(patterns)
    
    def generate_complex_false(self) -> str:
        """
        Generate a more complex always-false predicate.
        
        Uses _G["escaped"] to hide bit32 library name.
        
        Returns:
            Complex always-false predicate string
        """
        # NOTE: Use bit32 directly - _G["bit32"] returns nil in Roblox!
        b32 = 'bit32'
        band = f'{b32}["\\98\\97\\110\\100"]'
        bor = f'{b32}["\\98\\111\\114"]'
        bxor = f'{b32}["\\98\\120\\111\\114"]'
        rshift = f'{b32}["\\114\\115\\104\\105\\102\\116"]'
        
        patterns = [
            # Nested operations that result in 0
            f'(({band}({bxor}(0xFF,0xFF),0xFF))~=0)',
            
            # Impossible equality
            f'({bor}(0x0,0x0)~=0)',
            
            # Shift to zero
            f'({rshift}(0x1,0x20)~=0)',
            
            # XOR self is always 0
            f'({bxor}(0xABCD,0xABCD)>0)',
            
            # AND with 0 is always 0
            f'({band}(0xFFFFFFFF,0x0)~=0)',
        ]
        return self.seed.choice(patterns)
    
    def generate_with_wrapper(self, value: bool, wrappers: dict = None) -> str:
        """
        Generate a predicate using wrapper aliases (N, Y, U, etc.).
        
        Args:
            value: The desired boolean result
            wrappers: Optional dict mapping operation names to aliases
        
        Returns:
            Predicate string using wrapper aliases
        """
        if wrappers is None:
            wrappers = {
                'bxor': 'N',
                'bor': 'Y',
                'band': 'U',
                'lshift': 'A',
                'rshift': 'D',
            }
        
        if value:
            patterns = [
                f'({wrappers["band"]}(0xFF,0xFF)==0xFF)',
                f'({wrappers["bor"]}(0x0,0x1)==0x1)',
                f'({wrappers["bxor"]}(0x5A,0x5B)~=0)',
                f'({wrappers["lshift"]}(0x1,0x0)==0x1)',
                f'({wrappers["rshift"]}(0xFF,0x0)==0xFF)',
            ]
        else:
            patterns = [
                f'({wrappers["bxor"]}(0x5A,0x5A)~=0)',
                f'({wrappers["band"]}(0x0,0xFF)~=0)',
                f'({wrappers["lshift"]}(0x0,0x5)>0)',
                f'({wrappers["bor"]}(0xAA,0xAA)~=0xAA)',
                f'({wrappers["rshift"]}(0x0,0x3)~=0)',
            ]
        
        return self.seed.choice(patterns)
    
    def generate_conditional_block(self, true_code: str, false_code: str = '') -> str:
        """
        Generate a conditional block with opaque predicate.
        
        Args:
            true_code: Code to execute (always runs)
            false_code: Dead code (never runs)
        
        Returns:
            Conditional block with opaque predicate
        """
        predicate = self.get_true_predicate()
        
        if false_code:
            return f'if {predicate} then {true_code} else {false_code} end'
        return f'if {predicate} then {true_code} end'
    
    def generate_dead_branch(self, dead_code: str) -> str:
        """
        Generate a dead branch that never executes.
        
        Args:
            dead_code: Code that will never run
        
        Returns:
            Conditional block with always-false predicate
        """
        predicate = self.get_false_predicate()
        return f'if {predicate} then {dead_code} end'
    
    def get_all_true_patterns(self) -> List[str]:
        """
        Get all always-true predicate patterns.
        
        Returns:
            List of all true patterns
        """
        return self._true_patterns.copy()
    
    def get_all_false_patterns(self) -> List[str]:
        """
        Get all always-false predicate patterns.
        
        Returns:
            List of all false patterns
        """
        return self._false_patterns.copy()
    
    def add_custom_pattern(self, pattern: str, is_true: bool) -> None:
        """
        Add a custom predicate pattern.
        
        Args:
            pattern: The predicate pattern string
            is_true: Whether the pattern evaluates to true
        """
        if is_true:
            self._true_patterns.append(pattern)
        else:
            self._false_patterns.append(pattern)
    
    def __repr__(self) -> str:
        return (
            f"OpaquePredicateGenerator("
            f"true_patterns={len(self._true_patterns)}, "
            f"false_patterns={len(self._false_patterns)})"
        )
