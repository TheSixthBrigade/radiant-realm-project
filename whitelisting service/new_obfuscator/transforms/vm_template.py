"""
VM Stdlib Transformer - Transforms VM code to use table-based stdlib access.

This module removes all `local x = stdlib.y` definitions from the VM template
and replaces all stdlib usages with table-based access (e.g., O.t() instead of type()).

This is essential for achieving Luraph-style output where all stdlib is hidden
inside the returned function table.

Requirements: 8.3, 9.7
"""

import re
from typing import Dict, List, Set, Tuple

import sys
from pathlib import Path
_package_dir = Path(__file__).parent.parent.resolve()
if str(_package_dir) not in sys.path:
    sys.path.insert(0, str(_package_dir))

from core.stdlib_mapper import StdlibMapper


class VMStdlibTransformer:
    """
    Transforms VM template to use table-based stdlib access.
    
    This class:
    1. Removes all `local x = stdlib.y` definitions from the VM template
    2. Replaces all stdlib usages with table-based access (O.x)
    
    Example transformation:
        Before: local type = type; ... if type(v) == "number" then
        After:  ... if O.t(v) == "number" then
    """
    
    # Patterns for stdlib definitions to remove
    STDLIB_DEFINITION_PATTERNS = [
        # Direct globals: local type = type
        r'local\s+type\s*=\s*type\s*\n?',
        r'local\s+pcall\s*=\s*pcall\s*\n?',
        r'local\s+error\s*=\s*error\s*\n?',
        r'local\s+tonumber\s*=\s*tonumber\s*\n?',
        r'local\s+assert\s*=\s*assert\s*\n?',
        r'local\s+setmetatable\s*=\s*setmetatable\s*\n?',
        r'local\s+getmetatable\s*=\s*getmetatable\s*\n?',
        r'local\s+tostring\s*=\s*tostring\s*\n?',
        r'local\s+pairs\s*=\s*pairs\s*\n?',
        r'local\s+ipairs\s*=\s*ipairs\s*\n?',
        r'local\s+next\s*=\s*next\s*\n?',
        r'local\s+select\s*=\s*select\s*\n?',
        r'local\s+rawget\s*=\s*rawget\s*\n?',
        r'local\s+rawset\s*=\s*rawset\s*\n?',
        r'local\s+unpack\s*=\s*unpack\s*\n?',
        
        # String library: local string_format = string.format
        r'local\s+string_\w+\s*=\s*string\.\w+\s*\n?',
        
        # Table library: local table_move = table.move
        r'local\s+table_\w+\s*=\s*table\.\w+\s*\n?',
        
        # Coroutine library: local coroutine_yield = coroutine.yield
        r'local\s+coroutine_\w+\s*=\s*coroutine\.\w+\s*\n?',
        
        # Buffer library: local buffer_readu8 = buffer.readu8
        r'local\s+buffer_\w+\s*=\s*buffer\.\w+\s*\n?',
        
        # Bit32 library: local bit32_band = bit32.band
        r'local\s+bit32_\w+\s*=\s*bit32\.\w+\s*\n?',
        
        # Math library: local math_floor = math.floor
        r'local\s+math_\w+\s*=\s*math\.\w+\s*\n?',
        
        # Comment about environment changes
        r'--\s*//\s*Environment changes.*\n',
    ]
    
    # Stdlib usages to replace (original -> key from StdlibMapper)
    # These are the actual function calls in the VM code
    STDLIB_USAGE_REPLACEMENTS = {
        # Direct globals
        'type': 't',
        'pcall': 'pc',
        'error': 'er',
        'tonumber': 'tn',
        'assert': 'as',
        'setmetatable': 'sm',
        'getmetatable': 'gm',
        'tostring': 'ts',
        'pairs': 'pr',
        'ipairs': 'ip',
        'next': 'nx',
        'select': 'sl',
        'rawget': 'rg',
        'rawset': 'rs',
        'unpack': 'P',
        
        # String library aliases
        'string_format': 'sf',
        'string_sub': 'UL',
        'string_char': 'sc',
        'string_byte': 'sb',
        'string_pack': 'i',
        'string_len': 'sln',
        'string_find': 'sfd',
        'string_match': 'smt',
        'string_gsub': 'sgs',
        
        # Table library aliases
        'table_move': 'tm',
        'table_pack': 'tp',
        'table_unpack': 'tu',
        'table_create': 'tc',
        'table_insert': 'ti',
        'table_remove': 'tr',
        'table_concat': 'tcc',
        'table_sort': 'tst',
        
        # Coroutine library aliases
        'coroutine_create': 'cc',
        'coroutine_yield': 'U',
        'coroutine_resume': 'cr',
        'coroutine_close': 'cl',
        'coroutine_wrap': 'cw',
        'coroutine_status': 'cs',
        
        # Buffer library aliases
        'buffer_fromstring': 'bf',
        'buffer_len': 'bl',
        'buffer_create': 'bcr',
        'buffer_readu8': 'r8',
        'buffer_readu32': 'r32',
        'buffer_readstring': 'rstr',
        'buffer_readf32': 'rf32',
        'buffer_readf64': 'rf64',
        'buffer_writeu8': 'w8',
        'buffer_writeu32': 'w32',
        
        # Bit32 library aliases
        'bit32_bor': 'Y',
        'bit32_band': 'LL',
        'bit32_bxor': 'VL',
        'bit32_bnot': 'F4',
        'bit32_btest': 'bt',
        'bit32_rshift': 'B',
        'bit32_lshift': 'hL',
        'bit32_arshift': 'ar',
        'bit32_rrotate': 'IL',
        'bit32_lrotate': 'N',
        'bit32_extract': 'g4',
        'bit32_replace': 'm4',
    }
    
    def __init__(self, table_var: str = 'O'):
        """
        Initialize the VMTemplateTransformer.
        
        Args:
            table_var: The variable name for the stdlib table (default: 'O')
        """
        self.table_var = table_var
        self.stdlib_mapper = StdlibMapper()
        self.removed_definitions: List[str] = []
        self.replaced_usages: Dict[str, int] = {}
    
    def transform(self, vm_code: str) -> str:
        """
        Transform VM code to use table-based stdlib access.
        
        Args:
            vm_code: The original VM template code
            
        Returns:
            Transformed VM code with table-based stdlib access
        """
        # Reset tracking
        self.removed_definitions = []
        self.replaced_usages = {}
        
        # Step 1: Remove all stdlib definitions
        vm_code = self._remove_stdlib_definitions(vm_code)
        
        # Step 2: Replace all stdlib usages with table access
        vm_code = self._replace_stdlib_usages(vm_code)
        
        return vm_code
    
    def _remove_stdlib_definitions(self, code: str) -> str:
        """
        Remove all `local x = stdlib.y` definitions from the code.
        
        Args:
            code: The VM code
            
        Returns:
            Code with stdlib definitions removed
        """
        for pattern in self.STDLIB_DEFINITION_PATTERNS:
            matches = re.findall(pattern, code)
            for match in matches:
                self.removed_definitions.append(match.strip())
            code = re.sub(pattern, '', code)
        
        # Clean up any resulting empty lines
        code = re.sub(r'\n\s*\n\s*\n', '\n\n', code)
        
        return code
    
    def _replace_stdlib_usages(self, code: str) -> str:
        """
        Replace all stdlib usages with table-based access.
        
        Args:
            code: The VM code
            
        Returns:
            Code with stdlib usages replaced
        """
        # Sort by length (longest first) to avoid partial replacements
        sorted_replacements = sorted(
            self.STDLIB_USAGE_REPLACEMENTS.items(),
            key=lambda x: len(x[0]),
            reverse=True
        )
        
        for original, key in sorted_replacements:
            # Use word boundary to avoid partial matches
            # But be careful with underscores which are part of identifiers
            pattern = rf'\b{re.escape(original)}\b'
            
            # Count replacements
            count = len(re.findall(pattern, code))
            if count > 0:
                self.replaced_usages[original] = count
            
            # Replace with table access
            replacement = f'{self.table_var}.{key}'
            code = re.sub(pattern, replacement, code)
        
        return code
    
    def get_transform_stats(self) -> Dict:
        """
        Get statistics about the transformation.
        
        Returns:
            Dictionary with transformation statistics
        """
        return {
            'definitions_removed': len(self.removed_definitions),
            'usages_replaced': sum(self.replaced_usages.values()),
            'unique_functions_replaced': len(self.replaced_usages),
            'removed_definitions': self.removed_definitions,
            'replaced_usages': self.replaced_usages,
        }


def transform_vm_stdlib(vm_code: str, table_var: str = 'O') -> Tuple[str, Dict]:
    """
    Convenience function to transform VM template stdlib access.
    
    Args:
        vm_code: The original VM template code
        table_var: The variable name for the stdlib table
        
    Returns:
        Tuple of (transformed_code, stats)
    """
    transformer = VMStdlibTransformer(table_var)
    transformed = transformer.transform(vm_code)
    stats = transformer.get_transform_stats()
    return transformed, stats
