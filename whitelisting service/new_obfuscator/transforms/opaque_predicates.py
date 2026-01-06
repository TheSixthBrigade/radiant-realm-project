"""
Enhanced Opaque Predicates for advanced obfuscation.

Opaque predicates are expressions that always evaluate to the same value
(true or false) but are difficult for static analysis to determine.

This module provides more complex opaque predicates than the basic ones,
using mathematical properties, bit operations, and type checks.
"""

import random
from typing import List, Tuple
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from core import PolymorphicBuildSeed, UnifiedNamingSystem


class EnhancedOpaquePredicates:
    """
    Generates complex opaque predicates that are hard to analyze statically.
    
    Categories:
    1. Mathematical invariants (always true/false based on math properties)
    2. Bit operation invariants (properties of bitwise operations)
    3. Type invariants (type checks that are always true/false)
    4. Table invariants (properties of Lua tables)
    5. String invariants (properties of strings)
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        self.naming = UnifiedNamingSystem(self.seed)
    
    def _gen_name(self, length: int = 12) -> str:
        """Generate obfuscated variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def _random_int(self, min_val: int = 1, max_val: int = 1000) -> int:
        """Generate a random integer."""
        return self.rng.randint(min_val, max_val)
    
    # =========================================================================
    # Mathematical Invariants (Always True)
    # =========================================================================
    
    def math_true_square_non_negative(self) -> str:
        """x^2 >= 0 for all real x"""
        x = self._random_int()
        return f'(({x}*{x}) >= 0)'
    
    def math_true_abs_non_negative(self) -> str:
        """abs(x) >= 0 for all x"""
        x = self._random_int(-1000, 1000)
        return f'(math.abs({x}) >= 0)'
    
    def math_true_sum_commutative(self) -> str:
        """a + b == b + a"""
        a = self._random_int()
        b = self._random_int()
        return f'(({a}+{b}) == ({b}+{a}))'
    
    def math_true_mult_identity(self) -> str:
        """x * 1 == x"""
        x = self._random_int()
        return f'(({x}*1) == {x})'
    
    def math_true_add_identity(self) -> str:
        """x + 0 == x"""
        x = self._random_int()
        return f'(({x}+0) == {x})'
    
    def math_true_double_negation(self) -> str:
        """-(-x) == x"""
        x = self._random_int()
        return f'((-(-{x})) == {x})'
    
    # =========================================================================
    # Mathematical Invariants (Always False)
    # =========================================================================
    
    def math_false_square_negative(self) -> str:
        """x^2 < 0 is always false for real x"""
        x = self._random_int()
        return f'(({x}*{x}) < 0)'
    
    def math_false_abs_negative(self) -> str:
        """abs(x) < 0 is always false"""
        x = self._random_int(-1000, 1000)
        return f'(math.abs({x}) < 0)'
    
    def math_false_zero_nonzero(self) -> str:
        """0 ~= 0 is always false"""
        return '(0 ~= 0)'
    
    def math_false_mult_zero(self) -> str:
        """x * 0 ~= 0 is always false"""
        x = self._random_int()
        return f'(({x}*0) ~= 0)'
    
    # =========================================================================
    # Bit Operation Invariants (Always True)
    # =========================================================================
    
    def bit_true_and_subset(self) -> str:
        """(a AND b) <= a and (a AND b) <= b"""
        a = self._random_int(0, 0xFFFF)
        b = self._random_int(0, 0xFFFF)
        return f'(bit32.band({a},{b}) <= {a})'
    
    def bit_true_or_superset(self) -> str:
        """(a OR b) >= a and (a OR b) >= b"""
        a = self._random_int(0, 0xFFFF)
        b = self._random_int(0, 0xFFFF)
        return f'(bit32.bor({a},{b}) >= {a})'
    
    def bit_true_xor_self_zero(self) -> str:
        """x XOR x == 0"""
        x = self._random_int(0, 0xFFFF)
        return f'(bit32.bxor({x},{x}) == 0)'
    
    def bit_true_and_self(self) -> str:
        """x AND x == x"""
        x = self._random_int(0, 0xFFFF)
        return f'(bit32.band({x},{x}) == {x})'
    
    def bit_true_or_self(self) -> str:
        """x OR x == x"""
        x = self._random_int(0, 0xFFFF)
        return f'(bit32.bor({x},{x}) == {x})'
    
    def bit_true_and_zero(self) -> str:
        """x AND 0 == 0"""
        x = self._random_int(0, 0xFFFF)
        return f'(bit32.band({x},0) == 0)'
    
    def bit_true_or_zero(self) -> str:
        """x OR 0 == x"""
        x = self._random_int(0, 0xFFFF)
        return f'(bit32.bor({x},0) == {x})'
    
    # =========================================================================
    # Bit Operation Invariants (Always False)
    # =========================================================================
    
    def bit_false_and_greater(self) -> str:
        """(a AND b) > a is always false (when a,b >= 0)"""
        a = self._random_int(1, 0xFFFF)
        b = self._random_int(0, 0xFFFF)
        return f'(bit32.band({a},{b}) > {a})'
    
    def bit_false_xor_self_nonzero(self) -> str:
        """x XOR x ~= 0 is always false"""
        x = self._random_int(0, 0xFFFF)
        return f'(bit32.bxor({x},{x}) ~= 0)'
    
    # =========================================================================
    # Type Invariants (Always True) - REMOVED to avoid readable strings
    # Use numeric predicates instead
    # =========================================================================
    
    def type_true_number(self) -> str:
        """Numeric predicate instead of type check to avoid readable strings"""
        n = self._random_int()
        return f'(({n}*{n}) >= 0)'
    
    def type_true_string(self) -> str:
        """Numeric predicate instead of type check to avoid readable strings"""
        n = self._random_int()
        return f'(({n}+0) == {n})'
    
    def type_true_table(self) -> str:
        """Numeric predicate instead of type check to avoid readable strings"""
        n = self._random_int()
        return f'(({n}*1) == {n})'
    
    def type_true_function(self) -> str:
        """Numeric predicate instead of type check to avoid readable strings"""
        n = self._random_int()
        return f'((-(-{n})) == {n})'
    
    def type_true_boolean(self) -> str:
        """Numeric predicate instead of type check to avoid readable strings"""
        n = self._random_int()
        return f'((0*{n}) == 0)'
    
    # =========================================================================
    # Type Invariants (Always False) - REMOVED to avoid readable strings
    # Use numeric predicates instead
    # =========================================================================
    
    def type_false_number_string(self) -> str:
        """Numeric predicate instead of type check to avoid readable strings"""
        n = self._random_int()
        return f'(({n}*{n}) < 0)'
    
    def type_false_string_number(self) -> str:
        """Numeric predicate instead of type check to avoid readable strings"""
        n = self._random_int()
        return f'(({n}+1) == {n})'
    
    def type_false_table_function(self) -> str:
        """Numeric predicate instead of type check to avoid readable strings"""
        n = self._random_int()
        m = self._random_int()
        return f'(({n}*0) ~= 0)'
    
    # =========================================================================
    # Table Invariants (Always True)
    # =========================================================================
    
    def table_true_empty_length(self) -> str:
        """#{} == 0"""
        return '(#{} == 0)'
    
    def table_true_length_non_negative(self) -> str:
        """#t >= 0 for any table t"""
        return '(#{1,2,3} >= 0)'
    
    def table_true_specific_length(self) -> str:
        """#{a,b,c} == 3"""
        n = self.rng.randint(2, 5)
        elements = ','.join(str(self._random_int()) for _ in range(n))
        return f'(#{{{elements}}} == {n})'
    
    # =========================================================================
    # Table Invariants (Always False)
    # =========================================================================
    
    def table_false_empty_nonzero(self) -> str:
        """#{} > 0 is always false"""
        return '(#{} > 0)'
    
    def table_false_length_negative(self) -> str:
        """#t < 0 is always false"""
        return '(#{1,2,3} < 0)'
    
    # =========================================================================
    # String Invariants (Always True) - REMOVED to avoid readable strings
    # Use numeric predicates instead
    # =========================================================================
    
    def string_true_empty_length(self) -> str:
        """Numeric predicate instead of string check to avoid readable strings"""
        n = self._random_int()
        return f'((0+{n}) == {n})'
    
    def string_true_length_non_negative(self) -> str:
        """Numeric predicate instead of string check to avoid readable strings"""
        n = self._random_int()
        return f'(({n}-{n}) == 0)'
    
    def string_true_concat_length(self) -> str:
        """Numeric predicate instead of string check to avoid readable strings"""
        a = self._random_int()
        b = self._random_int()
        return f'(({a}+{b}) == ({b}+{a}))'
    
    # =========================================================================
    # Compound Predicates (Combinations)
    # =========================================================================
    
    def compound_true_and(self) -> str:
        """Combine two true predicates with AND"""
        p1 = self.get_random_true_predicate()
        p2 = self.get_random_true_predicate()
        return f'({p1} and {p2})'
    
    def compound_true_or_with_true(self) -> str:
        """true OR anything is true"""
        p1 = self.get_random_true_predicate()
        p2 = self.get_random_false_predicate()
        return f'({p1} or {p2})'
    
    def compound_false_and_with_false(self) -> str:
        """false AND anything is false"""
        p1 = self.get_random_false_predicate()
        p2 = self.get_random_true_predicate()
        return f'({p1} and {p2})'
    
    def compound_false_or(self) -> str:
        """Combine two false predicates with OR"""
        p1 = self.get_random_false_predicate()
        p2 = self.get_random_false_predicate()
        return f'({p1} or {p2})'
    
    # =========================================================================
    # Random Predicate Generators
    # =========================================================================
    
    def get_random_true_predicate(self) -> str:
        """Get a random predicate that's always true."""
        true_generators = [
            self.math_true_square_non_negative,
            self.math_true_abs_non_negative,
            self.math_true_sum_commutative,
            self.math_true_mult_identity,
            self.math_true_add_identity,
            self.math_true_double_negation,
            self.bit_true_and_subset,
            self.bit_true_or_superset,
            self.bit_true_xor_self_zero,
            self.bit_true_and_self,
            self.bit_true_or_self,
            self.bit_true_and_zero,
            self.bit_true_or_zero,
            self.type_true_number,
            self.type_true_string,
            self.type_true_table,
            self.type_true_boolean,
            self.table_true_empty_length,
            self.table_true_length_non_negative,
            self.string_true_empty_length,
            self.string_true_length_non_negative,
        ]
        return self.rng.choice(true_generators)()
    
    def get_random_false_predicate(self) -> str:
        """Get a random predicate that's always false."""
        false_generators = [
            self.math_false_square_negative,
            self.math_false_abs_negative,
            self.math_false_zero_nonzero,
            self.math_false_mult_zero,
            self.bit_false_and_greater,
            self.bit_false_xor_self_nonzero,
            self.type_false_number_string,
            self.type_false_string_number,
            self.type_false_table_function,
            self.table_false_empty_nonzero,
            self.table_false_length_negative,
        ]
        return self.rng.choice(false_generators)()
    
    def get_complex_true_predicate(self, depth: int = 2) -> str:
        """Get a complex predicate that's always true."""
        if depth <= 0:
            return self.get_random_true_predicate()
        
        strategy = self.rng.randint(0, 2)
        if strategy == 0:
            # AND of two true predicates
            p1 = self.get_complex_true_predicate(depth - 1)
            p2 = self.get_complex_true_predicate(depth - 1)
            return f'({p1} and {p2})'
        elif strategy == 1:
            # OR with a true predicate
            p1 = self.get_complex_true_predicate(depth - 1)
            p2 = self.get_random_false_predicate()
            return f'({p1} or {p2})'
        else:
            # NOT of a false predicate
            p = self.get_random_false_predicate()
            return f'(not {p})'
    
    def get_complex_false_predicate(self, depth: int = 2) -> str:
        """Get a complex predicate that's always false."""
        if depth <= 0:
            return self.get_random_false_predicate()
        
        strategy = self.rng.randint(0, 2)
        if strategy == 0:
            # OR of two false predicates
            p1 = self.get_complex_false_predicate(depth - 1)
            p2 = self.get_complex_false_predicate(depth - 1)
            return f'({p1} or {p2})'
        elif strategy == 1:
            # AND with a false predicate
            p1 = self.get_complex_false_predicate(depth - 1)
            p2 = self.get_random_true_predicate()
            return f'({p1} and {p2})'
        else:
            # NOT of a true predicate
            p = self.get_random_true_predicate()
            return f'(not {p})'
