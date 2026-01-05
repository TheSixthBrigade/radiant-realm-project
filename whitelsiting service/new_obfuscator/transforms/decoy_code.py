"""
Decoy Code Generator

This module generates fake code blocks that look real but have no effect.
This confuses decompilers and static analysis tools.

Target output style:
    for _,v in pairs(t) do if v then break end end  -- fake loop
    if (x>0)==(x>0) then end  -- always-true conditional

Requirements: ultra-obfuscation spec 6.x
"""

from dataclasses import dataclass
from typing import List, Optional
import random

try:
    from ..core.seed import PolymorphicBuildSeed
except ImportError:
    from core.seed import PolymorphicBuildSeed


@dataclass
class DecoyCodeConfig:
    """Configuration for decoy code generation."""
    num_decoy_loops: int = 3        # Number of fake loops to inject
    num_decoy_conditionals: int = 2  # Number of fake conditionals
    use_same_naming: bool = True    # Use same naming patterns as real code
    inject_probability: float = 0.5  # Probability of injecting at each point


class DecoyCodeGenerator:
    """
    Generates fake code blocks that look real but do nothing.
    
    Types of decoy code:
    1. Fake for-loops that iterate but do nothing useful
    2. Fake conditionals with always-true/false predicates
    3. Fake variable assignments that are never used
    4. Fake function calls to non-existent functions (wrapped in pcall)
    """
    
    # Confusing variable names (Luraph-style)
    VAR_NAMES = [
        '_Il1lI', '_O0O0O', '_lIlIl', '_1l1l1', '_OlOlO',
        '_I1I1I', '_0l0l0', '_IlIlI', '_O1O1O', '_l0l0l',
        'sC', 'sp', 'sK', 'sO', 'sr', 'sl', 'sE', 'sW',
    ]
    
    # Table names for fake iterations
    TABLE_NAMES = ['_t', '_T', '_tbl', '_arr', '_lst', '_d']
    
    def __init__(self, seed: PolymorphicBuildSeed, config: DecoyCodeConfig = None):
        self.seed = seed
        self.config = config or DecoyCodeConfig()
        self._used_vars: set = set()
    
    def _get_var_name(self) -> str:
        """Get a confusing variable name."""
        return self.seed.choice(self.VAR_NAMES)
    
    def _get_unique_var(self) -> str:
        """Get a unique variable name."""
        for _ in range(20):
            name = self._get_var_name()
            if name not in self._used_vars:
                self._used_vars.add(name)
                return name
        # Fallback
        idx = len(self._used_vars)
        name = f"_v{idx}"
        self._used_vars.add(name)
        return name
    
    def generate_fake_loop(self) -> str:
        """
        Generate a fake for-loop that does nothing.
        
        Examples:
            for _,v in pairs({}) do if v then break end end
            for i=1,0 do end  -- never executes
        """
        loop_type = self.seed.get_random_int(0, 3)
        
        if loop_type == 0:
            # Empty pairs loop
            var = self._get_unique_var()
            return f"for _,{var} in pairs({{}}) do if {var} then break end end"
        
        elif loop_type == 1:
            # Zero-iteration numeric loop
            var = self._get_unique_var()
            return f"for {var}=1,0 do end"
        
        elif loop_type == 2:
            # Loop with immediate break
            var = self._get_unique_var()
            return f"for {var}=1,1 do break end"
        
        else:
            # Loop over empty table
            tbl = self.seed.choice(self.TABLE_NAMES)
            var = self._get_unique_var()
            return f"local {tbl}={{}};for _,{var} in ipairs({tbl}) do end"
    
    def generate_fake_conditional(self) -> str:
        """
        Generate a fake conditional that always evaluates the same way.
        
        Examples:
            if (1==1) then end  -- always true, empty body
            if (1==0) then print("never") end  -- never executes
        """
        cond_type = self.seed.get_random_int(0, 4)
        
        if cond_type == 0:
            # Always true, empty body
            return "if (1==1) then end"
        
        elif cond_type == 1:
            # Always false, fake body
            var = self._get_unique_var()
            return f"if (1==0) then local {var}=0 end"
        
        elif cond_type == 2:
            # Tautology: x == x
            var = self._get_unique_var()
            val = self.seed.get_random_int(1, 100)
            return f"local {var}={val};if ({var}=={var}) then end"
        
        elif cond_type == 3:
            # Type check that's always true
            var = self._get_unique_var()
            return f"local {var}=0;if type({var})=='number' then end"
        
        else:
            # Comparison that's always false
            return "if (0>1) then error('unreachable') end"
    
    def generate_fake_assignment(self) -> str:
        """
        Generate a fake variable assignment that's never used.
        """
        var = self._get_unique_var()
        val_type = self.seed.get_random_int(0, 3)
        
        if val_type == 0:
            val = self.seed.get_random_int(0, 1000)
            return f"local {var}={val}"
        elif val_type == 1:
            return f"local {var}={{}}"
        elif val_type == 2:
            return f"local {var}=nil"
        else:
            return f"local {var}=function()end"
    
    def generate_fake_pcall(self) -> str:
        """
        Generate a fake pcall that catches errors from non-existent functions.
        """
        var = self._get_unique_var()
        func = self._get_unique_var()
        return f"local {var}=pcall(function()local {func}=nil;if {func} then {func}()end end)"
    
    def generate_decoy_block(self) -> str:
        """
        Generate a block of decoy code.
        """
        parts = []
        
        # Add some fake loops
        for _ in range(self.seed.get_random_int(1, self.config.num_decoy_loops)):
            parts.append(self.generate_fake_loop())
        
        # Add some fake conditionals
        for _ in range(self.seed.get_random_int(1, self.config.num_decoy_conditionals)):
            parts.append(self.generate_fake_conditional())
        
        # Maybe add fake assignments
        if self.seed.random_bool(0.5):
            parts.append(self.generate_fake_assignment())
        
        # Maybe add fake pcall
        if self.seed.random_bool(0.3):
            parts.append(self.generate_fake_pcall())
        
        # Shuffle for variety
        self.seed.shuffle(parts)
        
        return ';'.join(parts)
    
    def inject_into_code(self, code: str, num_injections: int = 3) -> str:
        """
        Inject decoy code at strategic points in the code.
        
        Injection points:
        - After local variable declarations
        - Before return statements
        - After function definitions
        """
        lines = code.split('\n')
        result = []
        injections_made = 0
        
        for i, line in enumerate(lines):
            result.append(line)
            
            if injections_made >= num_injections:
                continue
            
            # Check if this is a good injection point
            stripped = line.strip()
            
            # After local declarations
            if stripped.startswith('local ') and '=' in stripped:
                if self.seed.random_bool(self.config.inject_probability):
                    decoy = self.generate_decoy_block()
                    result.append(decoy)
                    injections_made += 1
                    continue
            
            # After function definitions (end of function)
            if stripped == 'end' and i > 0:
                if self.seed.random_bool(self.config.inject_probability * 0.5):
                    decoy = self.generate_decoy_block()
                    result.append(decoy)
                    injections_made += 1
                    continue
        
        return '\n'.join(result)
    
    def apply_to_code(self, code: str) -> str:
        """
        Apply decoy code injection to the given code.
        
        SAFE: Only injects at statement boundaries, not inside expressions.
        """
        # For minified code (single line), inject at safe statement boundaries
        if '\n' not in code or code.count('\n') < 5:
            return self._inject_into_minified_safe(code)
        
        return self.inject_into_code(code)
    
    def _inject_into_minified_safe(self, code: str) -> str:
        """
        Inject decoy code into minified (single-line) code SAFELY.
        
        Only injects after complete statements that end with:
        - 'end;' (after function/if/for/while blocks)
        - 'end)' followed by certain patterns
        
        NEVER injects:
        - Inside function calls
        - Inside table constructors
        - Inside expressions
        """
        # Find safe injection points - after 'end;' or 'end)(...)'
        # These are guaranteed to be statement boundaries
        
        result = []
        i = 0
        injections = 0
        max_injections = 3
        
        while i < len(code):
            result.append(code[i])
            
            # Check for 'end;' pattern - safe injection point
            if injections < max_injections and i >= 2:
                # Look for 'end;' 
                if code[i] == ';' and i >= 3:
                    if code[i-3:i] == 'end':
                        if self.seed.random_bool(0.3):
                            decoy = self.generate_decoy_block()
                            result.append(decoy + ';')
                            injections += 1
                
                # Look for 'end)(...);' pattern (wrapper function call end)
                elif code[i] == ';' and i >= 6:
                    # Check if this looks like end of wrapper: )(...);
                    j = i - 1
                    # Skip back through )(...)
                    paren_depth = 0
                    found_pattern = False
                    while j >= 0 and j > i - 20:
                        if code[j] == ')':
                            paren_depth += 1
                        elif code[j] == '(':
                            paren_depth -= 1
                            if paren_depth == 0:
                                # Check if preceded by )
                                if j > 0 and code[j-1] == ')':
                                    found_pattern = True
                                break
                        j -= 1
                    
                    # Don't inject at wrapper boundaries - too risky
            
            i += 1
        
        return ''.join(result)


# Convenience function
def create_decoy_code_generator(seed: PolymorphicBuildSeed) -> DecoyCodeGenerator:
    """Create a decoy code generator with default settings."""
    return DecoyCodeGenerator(seed)
