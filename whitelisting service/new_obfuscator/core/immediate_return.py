"""
Immediate Return Pattern Generator for ModuleScript Support

Generates obfuscated output using the immediate return pattern:
return(function(...)...end)(...)

This pattern is essential for ModuleScripts because:
1. No persistent VM state that triggers "recursive require" detection
2. Everything executes in a single expression
3. Return value propagates immediately

Requirements: 1.1, 1.2, 1.5 - ModuleScript return value handling
"""

import re
from typing import Optional


class ImmediateReturnGenerator:
    """
    Generates ModuleScript-compatible output using immediate return pattern.
    
    The key insight from Luraph/diff_obfuscator is that everything happens
    in a single return(function(...)...end)(...) expression with no
    persistent state that could trigger recursive require detection.
    
    Pattern:
    return(function(...)
        -- All VM code inlined here
        -- Bytecode decoding inline
        -- Execute and return immediately
    end)(...)
    """
    
    def __init__(self, seed=None, naming=None):
        """
        Initialize the generator.
        
        Args:
            seed: PolymorphicBuildSeed for deterministic randomness
            naming: UnifiedNamingSystem for variable name generation
        """
        self.seed = seed
        self.naming = naming
    
    def generate(self, vm_code: str, bytecode_decoder: str, 
                 deserialize_func: str, load_func: str,
                 lib_alias_defs: str = "") -> str:
        """
        Generate immediate return pattern output for ModuleScripts.
        
        Args:
            vm_code: The VM template code (Virtualization.lua content)
            bytecode_decoder: The bytecode decoding expression
            deserialize_func: Name of the deserialize function (may be renamed)
            load_func: Name of the load function (may be renamed)
            lib_alias_defs: Library alias definitions (e.g., local _b=bit32)
            
        Returns:
            Complete obfuscated output using immediate return pattern
        """
        # Generate variable names
        if self.naming:
            bytecode_var = self.naming.generate_short_alias()
            module_var = self.naming.generate_short_alias()
            env_var = self.naming.generate_short_alias()
            args_var = self.naming.generate_short_alias()
        else:
            bytecode_var = '_bc'
            module_var = '_md'
            env_var = '_ev'
            args_var = '_ag'
        
        # Remove the final return statement from VM template
        # We'll inline everything instead
        vm_code_clean = self._strip_final_return(vm_code)
        
        # Build the immediate return pattern
        # Key: Everything in ONE function call, return result immediately
        output = f'''return(function(...)
{lib_alias_defs}
{vm_code_clean}
local {args_var}={{...}}
local {bytecode_var}={bytecode_decoder}
local {module_var}={deserialize_func}({bytecode_var})
local {env_var}=getfenv and getfenv()or _ENV
return(select(1,({load_func}({module_var},{env_var}))(table.unpack({args_var}))))
end)(...)'''
        
        return output
    
    def generate_simple(self, vm_code: str, bytecode_decoder: str) -> str:
        """
        Generate a simpler immediate return pattern.
        
        This version assumes the VM code already has luau_deserialize and
        luau_load defined, and just needs to be wrapped properly.
        
        Args:
            vm_code: The VM template code
            bytecode_decoder: The bytecode decoding expression
            
        Returns:
            Complete obfuscated output
        """
        # Generate variable names
        if self.naming:
            bytecode_var = self.naming.generate_short_alias()
            module_var = self.naming.generate_short_alias()
            env_var = self.naming.generate_short_alias()
        else:
            bytecode_var = '_bc'
            module_var = '_md'
            env_var = '_ev'
        
        # Remove the final return statement from VM template
        vm_code_clean = self._strip_final_return(vm_code)
        
        # Build the immediate return pattern
        output = f'''return(function(...)
{vm_code_clean}
local {bytecode_var}={bytecode_decoder}
local {module_var}=luau_deserialize({bytecode_var})
local {env_var}=getfenv and getfenv()or _ENV
return(select(1,(luau_load({module_var},{env_var}))(table.unpack({{...}}))))
end)(...)'''
        
        return output
    
    def wrap_existing_output(self, existing_output: str) -> str:
        """
        Wrap existing obfuscated output in immediate return pattern.
        
        This is useful when the output was generated with the dispatch loop
        approach and needs to be converted to immediate return.
        
        Args:
            existing_output: The existing obfuscated code
            
        Returns:
            Code wrapped in immediate return pattern
        """
        # Check if already using immediate return pattern
        if existing_output.strip().startswith('return(function('):
            return existing_output
        
        # Check if it starts with return( but not the function pattern
        if existing_output.strip().startswith('return('):
            # Already has return, might just need adjustment
            # Extract the inner expression and wrap properly
            return existing_output
        
        # Wrap in immediate return pattern
        return f'''return(function(...)
{existing_output}
end)(...)'''
    
    def _strip_final_return(self, code: str) -> str:
        """
        Remove the final return statement from VM code.
        
        The VM template ends with:
        return {
            luau_newsettings = luau_newsettings,
            ...
        }
        
        We need to remove this since we're inlining everything.
        """
        # Find the last "return {" that's at the module level
        # This is the VM's export table
        last_return_idx = code.rfind("return {")
        if last_return_idx != -1:
            # Check if this is the module-level return (not inside a function)
            # Simple heuristic: if it's near the end of the file
            remaining = code[last_return_idx:]
            if remaining.count('{') - remaining.count('}') >= 0:
                # This looks like the module return, remove it
                code = code[:last_return_idx].rstrip()
        
        return code
    
    def generate_with_table_wrapper(self, vm_code: str, bytecode_decoder: str,
                                     deserialize_func: str, load_func: str,
                                     lib_alias_defs: str = "",
                                     extra_table_entries: list = None) -> str:
        """
        Generate output with Luraph-style table wrapper.
        
        Pattern: return(function(...)local T={...funcs...};return T.main(...)end)(...)
        
        This matches the Luraph output style more closely while still
        using the immediate return pattern.
        
        Args:
            vm_code: The VM template code
            bytecode_decoder: The bytecode decoding expression
            deserialize_func: Name of the deserialize function
            load_func: Name of the load function
            lib_alias_defs: Library alias definitions
            extra_table_entries: Additional table entries (decoys, helpers)
            
        Returns:
            Complete obfuscated output
        """
        # Generate variable names
        if self.naming:
            table_var = self.naming.generate_short_alias()
            main_key = self.naming.generate_short_alias()
            bytecode_var = self.naming.generate_short_alias()
            module_var = self.naming.generate_short_alias()
            env_var = self.naming.generate_short_alias()
            args_var = self.naming.generate_short_alias()
        else:
            table_var = '_T'
            main_key = '_M'
            bytecode_var = '_bc'
            module_var = '_md'
            env_var = '_ev'
            args_var = '_ag'
        
        # Remove the final return statement from VM template
        vm_code_clean = self._strip_final_return(vm_code)
        
        # Build extra entries string
        extra_entries_str = ""
        if extra_table_entries:
            extra_entries_str = "," + ",".join(extra_table_entries)
        
        # Build the main function that executes the VM
        main_func = f'''{main_key}=function(...)
{lib_alias_defs}
{vm_code_clean}
local {args_var}={{...}}
local {bytecode_var}={bytecode_decoder}
local {module_var}={deserialize_func}({bytecode_var})
local {env_var}=getfenv and getfenv()or _ENV
return(select(1,({load_func}({module_var},{env_var}))(table.unpack({args_var}))))
end'''
        
        # Build the complete output with table wrapper
        output = f'''return(function(...)local {table_var}={{{main_func}{extra_entries_str}}};return({table_var}.{main_key}(...))end)(...)'''
        
        return output


def create_immediate_return_generator(seed=None, naming=None) -> ImmediateReturnGenerator:
    """
    Factory function to create an ImmediateReturnGenerator.
    
    Args:
        seed: PolymorphicBuildSeed for deterministic randomness
        naming: UnifiedNamingSystem for variable name generation
        
    Returns:
        Configured ImmediateReturnGenerator instance
    """
    return ImmediateReturnGenerator(seed=seed, naming=naming)
