"""
Stdlib Table Generator for Luraph-Style Output

Generates the returned table structure with stdlib aliases and function definitions
mixed together, matching Luraph v14.4.1's output style.

Pattern: return({P=unpack,VL=bit32.bxor,I4=function()...end,LL=bit32.band,...})

Requirements: 1.1, 1.2, 4.1, 4.2, 4.3, 4.4
"""

import random
from typing import Dict, List, Optional


class StdlibTableGenerator:
    """
    Generates Luraph-style returned table with interleaved stdlib aliases
    and function definitions.
    
    Example output:
    return({I4=function(O,O,e,C)...end,P=unpack,VL=bit32.bxor,D=function()...end,...})
    """
    
    # Short cryptic keys for stdlib (from Luraph analysis)
    STDLIB_KEYS = {
        'unpack': 'P',
        'bit32.bxor': 'VL',
        'bit32.band': 'LL',
        'bit32.bor': 'IL',
        'bit32.rshift': 'B',
        'bit32.lshift': 'hL',
        'bit32.lrotate': 'N',
        'bit32.rrotate': 'AL',
        'bit32.bnot': 'F4',
        'bit32.extract': 'g4',
        'bit32.replace': 'm4',
        'bit32.arshift': 'JL',
        'string.sub': 'UL',
        'string': 'p',
        'string.pack': 'i',
        'string.byte': 'Y',
        'string.char': 'C',
        'coroutine.yield': 'U',
        'coroutine.wrap': 'cw',
        'buffer.fromstring': 'bf',
        'buffer.readu8': 'r8',
        'buffer.readu32': 'r32',
        'buffer.len': 'bL',
        'buffer.readf32': 'rf',
        'buffer.readf64': 'rd',
        'buffer.readstring': 'rs',
        'type': 't',
        'pcall': 'pc',
        'error': 'er',
        'select': 's',
        'setmetatable': 'sm',
        'getmetatable': 'gm',
        'tonumber': 'tn',
        'tostring': 'ts',
        'assert': 'as',
        'rawget': 'rg',
        'rawset': 'rw',
        'table.unpack': 'tu',
        'table.pack': 'tp',
        'table.create': 'tc',
        'table.insert': 'ti',
        'table.remove': 'tr',
        'table.move': 'tm',
        'table.concat': 'tC',
        'coroutine.create': 'cc',
        'coroutine.resume': 'cr',
        'coroutine.close': 'cl',
    }
    
    # Function key patterns (Luraph style: letter + optional digit)
    FUNCTION_KEY_PATTERNS = [
        'I4', 'z4', 'f4', 'h4', 'A4', 'J4', 'R4', 'T4', 'G4', 'V4',
        'D', 'W', 'j', 'a', 'Z', 'S', 'F', 'R', 'T', 'G', 'V', 'H', 'K',
        'q4', 'w4', 'e4', 'r4', 't4', 'y4', 'u4', 'o4', 'p4',
        'Q', 'E', 'X', 'M', 'L', 'O', 'n', 'b', 'v', 'c', 'x',
    ]
    
    def __init__(self, seed: int = None):
        """
        Initialize the generator with optional seed for deterministic output.
        
        Args:
            seed: Random seed for reproducible ordering
        """
        self.seed = seed
        self.rng = random.Random(seed)
        self._used_keys = set()
    
    def get_stdlib_key(self, stdlib_func: str) -> str:
        """
        Get the short key for a stdlib function.
        
        Args:
            stdlib_func: The stdlib function name (e.g., 'unpack', 'bit32.band')
            
        Returns:
            Short key like 'P', 'LL', 'VL'
        """
        return self.STDLIB_KEYS.get(stdlib_func, stdlib_func)
    
    def generate_function_key(self) -> str:
        """
        Generate a unique cryptic function key.
        
        Returns:
            Short key like 'I4', 'D', 'z4'
        """
        available = [k for k in self.FUNCTION_KEY_PATTERNS if k not in self._used_keys]
        if not available:
            # Generate new keys if we run out
            idx = len(self._used_keys)
            key = f'_{idx}'
            self._used_keys.add(key)
            return key
        
        key = self.rng.choice(available)
        self._used_keys.add(key)
        return key
    
    def generate(self, vm_functions: Dict[str, str], stdlib_subset: List[str] = None) -> str:
        """
        Generate returned table with interleaved stdlib and functions.
        
        Args:
            vm_functions: Dict of {key: function_code} for VM functions
            stdlib_subset: Optional list of stdlib functions to include
                          If None, includes all commonly used ones
            
        Returns:
            String like: return({P=unpack,I4=function()...end,VL=bit32.bxor,...})
        """
        entries = []
        
        # Add stdlib aliases
        if stdlib_subset is None:
            # Default commonly used stdlib
            stdlib_subset = [
                'unpack', 'bit32.bxor', 'bit32.band', 'bit32.bor',
                'bit32.rshift', 'bit32.lshift', 'bit32.lrotate', 'bit32.rrotate',
                'bit32.bnot', 'bit32.extract', 'bit32.replace', 'bit32.arshift',
                'string.sub', 'string', 'string.pack',
                'coroutine.yield',
            ]
        
        for func in stdlib_subset:
            key = self.get_stdlib_key(func)
            entries.append(f'{key}={func}')
        
        # Add VM function definitions
        for key, func_code in vm_functions.items():
            entries.append(f'{key}={func_code}')
        
        # Randomize order to interleave stdlib and functions
        self.rng.shuffle(entries)
        
        # Build the returned table
        return 'return({' + ','.join(entries) + '})'
    
    def generate_stdlib_table(self, table_var: str = 'O') -> str:
        """
        Generate just the stdlib table definition (for use inside a function).
        
        Args:
            table_var: Variable name for the table
            
        Returns:
            String like: local O={P=unpack,VL=bit32.bxor,...}
        """
        entries = []
        
        # Core stdlib that VM needs
        core_stdlib = [
            ('P', 'unpack'),
            ('VL', 'bit32.bxor'),
            ('LL', 'bit32.band'),
            ('IL', 'bit32.bor'),
            ('B', 'bit32.rshift'),
            ('hL', 'bit32.lshift'),
            ('N', 'bit32.lrotate'),
            ('AL', 'bit32.rrotate'),
            ('F4', 'bit32.bnot'),
            ('g4', 'bit32.extract'),
            ('m4', 'bit32.replace'),
            ('JL', 'bit32.arshift'),
            ('UL', 'string.sub'),
            ('p', 'string'),
            ('i', 'string.pack'),
            ('U', 'coroutine.yield'),
            ('pL', 'bit32.lrotate'),  # Duplicate with different key (Luraph does this)
        ]
        
        for key, func in core_stdlib:
            entries.append(f'{key}={func}')
        
        # Shuffle for randomization
        self.rng.shuffle(entries)
        
        return f'local {table_var}={{{",".join(entries)}}}'
    
    def get_reverse_mapping(self) -> Dict[str, str]:
        """
        Get reverse mapping from stdlib function to key.
        
        Returns:
            Dict like {'unpack': 'P', 'bit32.band': 'LL', ...}
        """
        return dict(self.STDLIB_KEYS)


# Alias for backwards compatibility
StdlibMapper = StdlibTableGenerator
