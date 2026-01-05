"""
Module Wrapper for ModuleScript Support

Generates wrapper code that properly handles return values for ModuleScripts
vs regular Scripts. ModuleScripts must return a value, while regular Scripts
should not return anything.

Requirements: 1.1, 1.2 - ModuleScript return value handling
"""

from typing import Optional


class ModuleWrapper:
    """
    Generates wrapper code for different script types.
    
    For ModuleScripts:
        - The wrapper returns the result of VM execution
        - Pattern: return(function()...return vm()...end)()
    
    For regular Scripts:
        - The wrapper executes but does not return
        - Pattern: return(function()...vm()...end)()
    """
    
    def __init__(self, seed=None):
        """
        Initialize the wrapper generator.
        
        Args:
            seed: Optional PolymorphicBuildSeed for deterministic generation
        """
        self.seed = seed
    
    def generate_exec_code(
        self,
        method_table_var: str,
        deserialize_key: str,
        load_key: str,
        lib_aliases_str: str,
        bytecode_var: str,
        encoded_bytecode: str,
        module_var: str,
        env_var: str,
        closure_var: str,
        dead_code: str,
        false_pred: str,
        is_module: bool = False
    ) -> str:
        """
        Generate the execution code that runs the VM.
        
        Args:
            method_table_var: Variable name for method table
            deserialize_key: Key for deserialize function in table
            load_key: Key for load function in table
            lib_aliases_str: Library alias string to append to table
            bytecode_var: Variable name for bytecode
            encoded_bytecode: The encoded bytecode string
            module_var: Variable name for deserialized module
            env_var: Variable name for environment
            closure_var: Variable name for closure
            dead_code: Dead code block for obfuscation
            false_pred: False predicate for dead code branch
            is_module: If True, return the VM result (ModuleScript mode)
        
        Returns:
            Lua code string for execution
        """
        # Build the execution code
        exec_lines = [
            f'local {method_table_var}={{{deserialize_key}={deserialize_key},{load_key}={load_key}{lib_aliases_str}}}',
            f'local {bytecode_var}={encoded_bytecode}',
            f'local {module_var}={method_table_var}.{deserialize_key}({bytecode_var})',
            f'local {env_var}=getfenv and getfenv()or _ENV',
            f'local {closure_var}={method_table_var}.{load_key}({module_var},{env_var})',
            f'if {false_pred} then {dead_code} end',
        ]
        
        # The key difference: ModuleScripts return the result, Scripts don't
        if is_module:
            # ModuleScript: return the result of VM execution
            exec_lines.append(f'return({closure_var}())')
        else:
            # Regular Script: execute but don't return
            exec_lines.append(f'{closure_var}()')
        
        return '\n'.join(exec_lines)
    
    def wrap_output(
        self,
        table_var: str,
        all_entries: list,
        main_func_key: str,
        is_module: bool = False
    ) -> str:
        """
        Generate the final wrapped output.
        
        Args:
            table_var: Variable name for the main table
            all_entries: List of table entries (functions, constants, etc.)
            main_func_key: Key for the main execution function
            is_module: If True, return the result (ModuleScript mode)
        
        Returns:
            Final Lua code string
        """
        entries_str = ','.join(all_entries)
        
        if is_module:
            # ModuleScript: return the result of main function
            # Pattern: return(function()local t={...};return t.main()end)()
            return f"return(function()local {table_var}={{{entries_str}}};return {table_var}.{main_func_key}()end)()"
        else:
            # Regular Script: execute main function, don't return its result
            # Pattern: return(function()local t={...};t.main()end)()
            return f"return(function()local {table_var}={{{entries_str}}};{table_var}.{main_func_key}()end)()"
    
    @staticmethod
    def is_module_script(source: str) -> bool:
        """
        Check if source code is a ModuleScript (has top-level return).
        
        Convenience method that uses ScriptTypeDetector.
        
        Args:
            source: Lua source code
        
        Returns:
            True if source has top-level return statement
        """
        from .script_type import ScriptTypeDetector
        detector = ScriptTypeDetector()
        return detector.has_return_statement(source)
