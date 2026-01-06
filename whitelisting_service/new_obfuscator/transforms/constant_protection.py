"""
Constant Protection Transforms for enhanced obfuscation.

This module implements:
1. String Constant Encryption - Encrypt strings in bytecode, decrypt at runtime
2. Constant Folding Reversal - Break constants into computed expressions
3. VM Instruction Splitting - Split opcodes into micro-operations

These transforms make static analysis significantly harder.
"""

from typing import Tuple, List, Dict, Optional
import random
import struct
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from core import PolymorphicBuildSeed, UnifiedNamingSystem


class StringConstantEncryption:
    """
    Encrypts string constants in the VM at runtime.
    
    Instead of storing strings directly in the constants table,
    we store encrypted versions and decrypt them when accessed.
    
    This hides strings like "GetService", "Players", etc. from
    static analysis tools.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        
        # Generate encryption keys
        self.xor_key = self.seed.get_random_int(1, 255)
        self.rolling_mult = self.seed.get_random_int(3, 13)
        self.rolling_offset = self.seed.get_random_int(7, 31)
    
    def _gen_name(self, length: int = 20) -> str:
        """Generate obfuscated variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        return rng.choice(first_chars) + ''.join(
            rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def encrypt_string(self, s: str) -> List[int]:
        """
        Encrypt a string using XOR with rolling key.
        
        Args:
            s: The string to encrypt
            
        Returns:
            List of encrypted byte values
        """
        result = []
        for i, c in enumerate(s):
            byte = ord(c)
            # Layer 1: XOR with static key
            byte ^= self.xor_key
            # Layer 2: Rolling XOR
            byte ^= ((i * self.rolling_mult + self.rolling_offset) % 256)
            result.append(byte)
        return result
    
    def generate_decryptor_function(self) -> Tuple[str, str]:
        """
        Generate a Lua function that decrypts strings at runtime.
        
        Returns:
            Tuple of (Lua code, decryptor function name)
        """
        func_name = self._gen_name()
        input_var = self._gen_name(10)
        result_var = self._gen_name(10)
        i_var = self._gen_name(8)
        byte_var = self._gen_name(8)
        char_var = self._gen_name(8)
        
        # Use bit32 directly (not _G["bit32"] which returns nil in Roblox)
        code = f'''local {func_name}=function({input_var})
local {result_var}={{}}
for {i_var}=1,#{input_var} do
local {byte_var}={input_var}[{i_var}]
{byte_var}=bit32.bxor({byte_var},(({i_var}-1)*{self.rolling_mult}+{self.rolling_offset})%256)
{byte_var}=bit32.bxor({byte_var},{self.xor_key})
{result_var}[{i_var}]=string.char({byte_var})
end
return table.concat({result_var})
end'''
        
        return code, func_name
    
    def generate_encrypted_string_literal(self, s: str) -> str:
        """
        Generate Lua code for an encrypted string literal.
        
        Args:
            s: The string to encrypt
            
        Returns:
            Lua table literal with encrypted bytes
        """
        encrypted = self.encrypt_string(s)
        # Format as hex numbers for obfuscation
        hex_values = [f'0x{b:02X}' for b in encrypted]
        return '{' + ','.join(hex_values) + '}'
    
    def generate_lazy_decrypt_wrapper(self) -> Tuple[str, str, str]:
        """
        Generate a lazy decryption wrapper for the constants table.
        
        This wraps the constants table with a metatable that decrypts
        strings on first access and caches the result.
        
        Returns:
            Tuple of (wrapper code, wrapper function name, cache table name)
        """
        wrapper_name = self._gen_name()
        cache_name = self._gen_name()
        decrypt_name = self._gen_name()
        tbl_var = self._gen_name(10)
        key_var = self._gen_name(8)
        val_var = self._gen_name(8)
        
        # Generate the decryptor first
        decrypt_code, decrypt_func = self.generate_decryptor_function()
        
        # Use escape sequence for "table" string
        table_esc = ''.join(f'\\{ord(c)}' for c in 'table')
        g_var = self._gen_name()
        type_var = self._gen_name()
        setmt_var = self._gen_name()
        tbl_str = self._gen_name()
        
        code = f'''{decrypt_code}
local {g_var}=_G
local {type_var}={g_var}["\\116\\121\\112\\101"]
local {setmt_var}={g_var}["\\115\\101\\116\\109\\101\\116\\97\\116\\97\\98\\108\\101"]
local {tbl_str}="{table_esc}"
local {cache_name}={{}}
local {wrapper_name}=function({tbl_var})
return {setmt_var}({{}},{{
["\\95\\95\\105\\110\\100\\101\\120"]=function(_,{key_var})
if {cache_name}[{key_var}]~=nil then return {cache_name}[{key_var}]end
local {val_var}={tbl_var}[{key_var}]
if {type_var}({val_var})=={tbl_str} then
{val_var}={decrypt_func}({val_var})
{cache_name}[{key_var}]={val_var}
end
return {val_var}
end
}})
end'''
        
        return code, wrapper_name, cache_name


class LuraphStyleConstantObfuscation:
    """
    Luraph-style deeply nested constant obfuscation.
    
    Generates expressions like:
    (-0X23a8cE1D+(O.LL((O.VL((O.F4(O.I[0x5_]))-e[0Xc0D])))))
    
    Uses a helper table with obfuscated method names for bitwise operations.
    This is MUCH more aggressive than simple constant folding.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        # Use a SEPARATE RNG for name generation vs number obfuscation
        # This ensures names are consistent
        name_rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        
        # Generate obfuscated helper table and method names (like Luraph's O.LL, O.VL, O.F4)
        # These are generated ONCE and stored
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        
        def gen_name(length=8):
            return name_rng.choice(first_chars) + ''.join(name_rng.choice(rest_chars) for _ in range(length - 1))
        
        def gen_method():
            chars = 'lIOLVFAJhmpgNB'
            nums = '0124'
            return name_rng.choice(chars) + name_rng.choice(chars + nums)
        
        self.helper_table = gen_name(8)
        self.index_table = gen_name(8)  # Like Luraph's O.I
        self.cache_table = gen_name(8)  # Like Luraph's e[] cache
        
        # Method names (2-3 chars like Luraph: LL, VL, F4, IL, AL, JL, hL, m4, g4, pL, N, B)
        # These are FIXED after initialization
        self.methods = {
            'band': gen_method(),    # LL
            'bxor': gen_method(),    # VL
            'bnot': gen_method(),    # F4
            'rrotate': gen_method(), # IL
            'lrotate': gen_method(), # AL, pL, N
            'rshift': gen_method(),  # JL, B
            'lshift': gen_method(),  # hL
            'bor': gen_method(),     # m4
            'extract': gen_method(), # g4
        }
        
        # Pre-generate some random constants for the index table (like O.I[0x4], O.I[0x5])
        self.index_constants = [name_rng.randint(0, 0xFFFF) for _ in range(20)]
        
        # Pre-generate cache keys (like e[0Xc0D], e[11708])
        self.cache_keys = [name_rng.randint(0x100, 0xFFFF) for _ in range(30)]
        
        # SEPARATE RNG for number obfuscation (so it doesn't affect names)
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF) + 12345)
    
    def _gen_name(self, length: int = 8) -> str:
        """Generate obfuscated variable name (for internal use only)."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def generate_helper_table(self) -> str:
        """
        Generate the helper table with obfuscated bitwise operations.
        
        Returns Lua code like:
        local O={
            LL=bit32.band,
            VL=bit32.bxor,
            F4=bit32.bnot,
            I={0x5, 0x4, 0x3, ...}
        }
        """
        h = self.helper_table
        i = self.index_table
        c = self.cache_table
        
        # Build method assignments
        method_assigns = []
        for op, name in self.methods.items():
            method_assigns.append(f'{name}=bit32.{op}')
        
        # Build index table
        index_vals = ','.join(f'0x{v:X}' for v in self.index_constants)
        
        code = f'''local {h}={{
{','.join(method_assigns)},
{i}={{{index_vals}}}
}}
local {c}={{}}'''
        return code
    
    def obfuscate_number(self, n: int, depth: int = 4, use_aliases: bool = True) -> str:
        """
        Generate Luraph-style deeply nested expression for a number.
        
        Uses ONLY bit32 operations that are SAFE and won't cause overflow.
        All operations stay within 32-bit unsigned integer range.
        
        When use_aliases=True, uses helper table aliases like:
        (O.VL(O.VL((O.LL(0x1234,0xFFFFFFFF)),0x5678),0x4444))
        
        Args:
            n: The number to obfuscate
            depth: Nesting depth (2-4 recommended for safety)
            use_aliases: If True, use helper table aliases instead of bit32.xxx
            
        Returns:
            Deeply nested Lua expression that evaluates to n
        """
        # Ensure n is within 32-bit range
        n = n & 0xFFFFFFFF
        
        if depth <= 0:
            return self._format_hex(n)
        
        # Get method references - either aliased or direct
        h = self.helper_table if use_aliases else 'bit32'
        bxor = f'{h}.{self.methods["bxor"]}' if use_aliases else 'bit32.bxor'
        band = f'{h}.{self.methods["band"]}' if use_aliases else 'bit32.band'
        bor = f'{h}.{self.methods["bor"]}' if use_aliases else 'bit32.bor'
        
        # Choose a random strategy - ONLY use safe bit32 operations
        strategy = self.rng.randint(0, 4)
        
        if strategy == 0:
            # Pattern: Double XOR - (O.VL(O.VL(inner, key1), key2))
            # XOR is always safe and reversible
            key1 = self.rng.randint(0, 0xFFFF)
            key2 = self.rng.randint(0, 0xFFFF)
            inner_val = n ^ key1 ^ key2
            inner = self.obfuscate_number(inner_val, depth - 1, use_aliases)
            return f'({bxor}({bxor}({inner},{self._format_hex(key1)}),{self._format_hex(key2)}))'
        
        elif strategy == 1:
            # Pattern: Single XOR - (O.VL(inner, key))
            xor_key = self.rng.randint(0, 0xFFFF)
            inner_val = n ^ xor_key
            inner = self.obfuscate_number(inner_val, depth - 1, use_aliases)
            return f'({bxor}({inner},{self._format_hex(xor_key)}))'
        
        elif strategy == 2:
            # Pattern: (O.LL(inner, 0xFFFFFFFF)) - identity but adds nesting
            inner = self.obfuscate_number(n, depth - 1, use_aliases)
            return f'({band}({inner},{self._format_hex(0xFFFFFFFF)}))'
        
        elif strategy == 3:
            # Pattern: (O.m4(inner, 0)) - identity but adds nesting
            inner = self.obfuscate_number(n, depth - 1, use_aliases)
            return f'({bor}({inner},{self._format_hex(0)}))'
        
        else:
            # Pattern: Triple XOR for more complexity
            key1 = self.rng.randint(0, 0xFFFF)
            key2 = self.rng.randint(0, 0xFFFF)
            key3 = self.rng.randint(0, 0xFFFF)
            inner_val = n ^ key1 ^ key2 ^ key3
            inner = self.obfuscate_number(inner_val, depth - 1, use_aliases)
            return f'({bxor}({bxor}({bxor}({inner},{self._format_hex(key1)}),{self._format_hex(key2)}),{self._format_hex(key3)}))'
    
    def _format_hex(self, n: int) -> str:
        """Format number as hex with optional underscore (Luraph style)."""
        if n < 0:
            return f'-{self._format_hex(-n)}'
        
        hex_str = f'{n:X}'
        
        # Randomly add underscore separator (Luraph style: 0x5_A, 0Xc0D)
        if len(hex_str) > 2 and self.rng.random() < 0.3:
            pos = self.rng.randint(1, len(hex_str) - 1)
            hex_str = hex_str[:pos] + '_' + hex_str[pos:]
        
        # Random case for 0x prefix
        prefix = self.rng.choice(['0x', '0X'])
        return f'{prefix}{hex_str}'


class ConstantFoldingReversal:
    """
    Reverses constant folding by breaking constants into computed expressions.
    
    Instead of: local x = 42
    Generates:  local x = (0x1A + 0x10) * 1 + 0
    
    This makes it harder to understand the actual values being used.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None, luraph_style: 'LuraphStyleConstantObfuscation' = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        
        # Use provided Luraph-style obfuscator or create a new one
        # IMPORTANT: If sharing with ConstantProtectionIntegrator, pass the same instance!
        self.luraph_style = luraph_style or LuraphStyleConstantObfuscation(seed)
    
    def unfold_number(self, n: int, depth: int = 3, use_luraph_style: bool = False) -> str:
        """
        Convert a number into a computed expression.
        
        Args:
            n: The number to unfold
            depth: How many layers of computation to add
            use_luraph_style: If True, use Luraph-style deep nesting
            
        Returns:
            Lua expression that evaluates to n
        """
        # For deep nesting (depth >= 4), use Luraph-style
        if use_luraph_style or depth >= 4:
            return self.luraph_style.obfuscate_number(n, depth)
        
        if depth <= 0 or abs(n) > 0x7FFFFFFF:
            return self._format_number(n)
        
        # Choose a random unfolding strategy
        strategy = self.rng.randint(0, 5)
        
        if strategy == 0:
            # Addition: n = a + b
            a = self.rng.randint(-1000, 1000)
            b = n - a
            return f'({self.unfold_number(a, depth-1)}+{self.unfold_number(b, depth-1)})'
        
        elif strategy == 1:
            # Subtraction: n = a - b
            b = self.rng.randint(-1000, 1000)
            a = n + b
            return f'({self.unfold_number(a, depth-1)}-{self.unfold_number(b, depth-1)})'
        
        elif strategy == 2:
            # Multiplication (if n is divisible)
            if n != 0:
                divisors = [d for d in [2, 3, 4, 5, 7, 8, 10] if n % d == 0]
                if divisors:
                    d = self.rng.choice(divisors)
                    return f'({self.unfold_number(n // d, depth-1)}*{self._format_number(d)})'
            # Fall through to XOR
            return self._unfold_xor(n, depth)
        
        elif strategy == 3:
            # XOR: n = a XOR b
            return self._unfold_xor(n, depth)
        
        elif strategy == 4:
            # Bit shift (for powers of 2)
            if n > 0 and (n & (n - 1)) == 0:
                shift = n.bit_length() - 1
                return f'bit32.lshift(1,{self._format_number(shift)})'
            return self._unfold_xor(n, depth)
        
        else:
            # Band with identity: n = n AND 0xFFFFFFFF
            mask = 0xFFFFFFFF
            return f'bit32.band({self.unfold_number(n, depth-1)},{self._format_number(mask)})'
    
    def _unfold_xor(self, n: int, depth: int) -> str:
        """Unfold using XOR operation."""
        a = self.rng.randint(0, 0xFFFF)
        b = n ^ a
        return f'bit32.bxor({self.unfold_number(a, depth-1)},{self.unfold_number(b, depth-1)})'
    
    def _format_number(self, n: int) -> str:
        """Format a number in a random obfuscated format."""
        if n < 0:
            return f'({self._format_positive(-n)}*-1)'
        return self._format_positive(n)
    
    def _format_positive(self, n: int) -> str:
        """Format a positive number."""
        fmt = self.rng.randint(0, 3)
        if fmt == 0 and n <= 0xFFFF:
            # Hex format
            return f'0x{n:X}'
        elif fmt == 1 and n <= 255:
            # Binary format (Luau-specific)
            return f'0b{n:08b}'
        elif fmt == 2 and n > 100:
            # Hex with underscores
            hex_str = f'{n:X}'
            if len(hex_str) > 2:
                return f'0x{hex_str[:len(hex_str)//2]}_{hex_str[len(hex_str)//2:]}'
        return str(n)
    
    def unfold_string_index(self, s: str) -> str:
        """
        Convert a string to an expression using string.char.
        
        Args:
            s: The string to convert
            
        Returns:
            Lua expression using string.char
        """
        chars = []
        for c in s:
            code = ord(c)
            # Randomly choose between direct and computed
            if self.rng.random() < 0.5:
                chars.append(self.unfold_number(code, 2))
            else:
                chars.append(f'0x{code:02X}')
        
        return f'string.char({",".join(chars)})'


class VMInstructionSplitter:
    """
    Splits VM opcodes into micro-operations.
    
    Instead of a single opcode handler, we split it into multiple
    smaller operations that are harder to understand.
    
    Example:
    Original: stack[A] = constants[D]
    Split:    temp1 = D
              temp2 = constants[temp1]
              temp3 = A
              stack[temp3] = temp2
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
    
    def _gen_temp(self) -> str:
        """Generate a temporary variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(15)
        )
    
    def split_loadk(self, stack_var: str, constants_var: str, 
                    inst_a: str, inst_k: str) -> str:
        """
        Split LOADK opcode into micro-operations.
        
        Original: stack[inst.A] = inst.K
        """
        t1 = self._gen_temp()
        t2 = self._gen_temp()
        t3 = self._gen_temp()
        
        return f'''local {t1}={inst_a}
local {t2}={inst_k}
local {t3}={stack_var}
{t3}[{t1}]={t2}'''
    
    def split_gettable(self, stack_var: str, inst_a: str, 
                       inst_b: str, inst_c: str) -> str:
        """
        Split GETTABLE opcode into micro-operations.
        
        Original: stack[A] = stack[B][stack[C]]
        """
        t1 = self._gen_temp()
        t2 = self._gen_temp()
        t3 = self._gen_temp()
        t4 = self._gen_temp()
        
        return f'''local {t1}={inst_b}
local {t2}={stack_var}[{t1}]
local {t3}={inst_c}
local {t4}={stack_var}[{t3}]
{stack_var}[{inst_a}]={t2}[{t4}]'''
    
    def split_settable(self, stack_var: str, inst_a: str,
                       inst_b: str, inst_c: str) -> str:
        """
        Split SETTABLE opcode into micro-operations.
        
        Original: stack[A][stack[B]] = stack[C]
        """
        t1 = self._gen_temp()
        t2 = self._gen_temp()
        t3 = self._gen_temp()
        t4 = self._gen_temp()
        
        return f'''local {t1}={inst_a}
local {t2}={stack_var}[{t1}]
local {t3}={inst_b}
local {t4}={stack_var}[{t3}]
{t2}[{t4}]={stack_var}[{inst_c}]'''
    
    def split_call(self, stack_var: str, inst_a: str,
                   inst_b: str, inst_c: str) -> str:
        """
        Split CALL opcode into micro-operations.
        
        This is more complex as it involves function calls.
        """
        t_func = self._gen_temp()
        t_args = self._gen_temp()
        t_nargs = self._gen_temp()
        t_results = self._gen_temp()
        
        return f'''local {t_func}={stack_var}[{inst_a}]
local {t_nargs}={inst_b}-1
local {t_args}={{}}
for _i=1,{t_nargs} do {t_args}[_i]={stack_var}[{inst_a}+_i] end
local {t_results}={{pcall({t_func},table.unpack({t_args}))}}'''
    
    def split_arithmetic(self, op: str, stack_var: str, 
                         inst_a: str, inst_b: str, inst_c: str) -> str:
        """
        Split arithmetic opcodes (ADD, SUB, MUL, DIV, etc.)
        
        Original: stack[A] = stack[B] op stack[C]
        """
        t1 = self._gen_temp()
        t2 = self._gen_temp()
        t3 = self._gen_temp()
        
        ops = {
            'ADD': '+', 'SUB': '-', 'MUL': '*', 'DIV': '/',
            'MOD': '%', 'POW': '^'
        }
        lua_op = ops.get(op, '+')
        
        return f'''local {t1}={stack_var}[{inst_b}]
local {t2}={stack_var}[{inst_c}]
local {t3}={t1}{lua_op}{t2}
{stack_var}[{inst_a}]={t3}'''
    
    def generate_split_dispatch(self, opcode_var: str, handlers: Dict[int, str]) -> str:
        """
        Generate a split dispatch table where each opcode handler
        is broken into micro-operations.
        
        Args:
            opcode_var: Variable containing the opcode
            handlers: Dict mapping opcode numbers to handler code
            
        Returns:
            Lua dispatch code with split handlers
        """
        dispatch_var = self._gen_temp()
        
        lines = [f'local {dispatch_var}={{}}']
        
        for opcode, handler in handlers.items():
            # Wrap handler in a function
            lines.append(f'{dispatch_var}[{opcode}]=function()')
            lines.append(handler)
            lines.append('end')
        
        # Add dispatch call
        lines.append(f'if {dispatch_var}[{opcode_var}] then {dispatch_var}[{opcode_var}]() end')
        
        return '\n'.join(lines)


class ConstantProtectionIntegrator:
    """
    Integrates all constant protection features into the obfuscation pipeline.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.string_encryption = StringConstantEncryption(self.seed)
        # Create the Luraph constants instance FIRST
        self.luraph_constants = LuraphStyleConstantObfuscation(self.seed)
        # Share the same instance with ConstantFoldingReversal (pass it to constructor)
        self.constant_unfolding = ConstantFoldingReversal(self.seed, luraph_style=self.luraph_constants)
        self.instruction_splitter = VMInstructionSplitter(self.seed)
    
    def get_luraph_helper_table(self) -> str:
        """Get the Luraph-style helper table code to insert at the beginning."""
        return self.luraph_constants.generate_helper_table()
    
    def obfuscate_number_luraph_style(self, n: int, depth: int = 4) -> str:
        """Obfuscate a number using Luraph-style deep nesting."""
        return self.luraph_constants.obfuscate_number(n, depth)
    
    def generate_protected_constants_loader(self, enable_string_encryption: bool = True,
                                            enable_constant_unfolding: bool = True) -> Tuple[str, str]:
        """
        Generate code that loads constants with protection.
        
        Returns:
            Tuple of (protection code to insert before VM, wrapper function name)
        """
        code_parts = []
        wrapper_name = None
        
        if enable_string_encryption:
            wrapper_code, wrapper_name, _ = self.string_encryption.generate_lazy_decrypt_wrapper()
            code_parts.append(wrapper_code)
        
        return '\n'.join(code_parts), wrapper_name
    
    def transform_number_in_code(self, code: str, depth: int = 2) -> str:
        """
        Transform numeric literals in Lua code to computed expressions.
        
        CRITICAL: Must NOT transform:
        - Numbers inside strings (escape sequences)
        - Numbers used as array indices (breaks VM)
        - Numbers used in comparisons with opcodes
        - Small numbers (0-9) that are used everywhere
        
        This is a VERY conservative approach to avoid breaking the VM.
        Only transforms numbers that appear in specific safe patterns.
        """
        import re
        
        # First, protect all string literals by replacing them with placeholders
        string_placeholders = {}
        placeholder_counter = [0]
        
        def protect_string(match):
            placeholder = f"__STRING_PLACEHOLDER_{placeholder_counter[0]}__"
            string_placeholders[placeholder] = match.group(0)
            placeholder_counter[0] += 1
            return placeholder
        
        # Match double-quoted and single-quoted strings (including escape sequences)
        # Also match [[ ]] long strings
        string_pattern = r'"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'|\[\[.*?\]\]'
        protected_code = re.sub(string_pattern, protect_string, code, flags=re.DOTALL)
        
        # Only transform numbers in VERY specific safe patterns:
        # - Numbers after "local x = " (variable assignments)
        # - Numbers in arithmetic expressions like "+ 100" or "* 50"
        # DO NOT transform:
        # - Numbers in array access [n]
        # - Numbers in comparisons == n, ~= n
        # - Numbers after "op" (opcode comparisons)
        
        def replace_safe_number(match):
            prefix = match.group(1)
            num_str = match.group(2)
            try:
                n = int(num_str)
                # Only transform larger numbers (100+) to avoid breaking common patterns
                if 100 <= abs(n) < 10000:
                    return prefix + self.constant_unfolding.unfold_number(n, depth)
            except ValueError:
                pass
            return match.group(0)
        
        # Pattern: Match numbers after "= " (assignment) that are 100+
        # This is very conservative but safe
        assignment_pattern = r'(=\s*)(\d{3,})'
        transformed_code = re.sub(assignment_pattern, replace_safe_number, protected_code)
        
        # Restore string literals
        for placeholder, original in string_placeholders.items():
            transformed_code = transformed_code.replace(placeholder, original)
        
        return transformed_code
    
    def transform_numbers_aggressive_luraph(self, code: str, depth: int = 4, 
                                             transform_probability: float = 0.7) -> str:
        """
        AGGRESSIVE Luraph-style number transformation.
        
        Transforms hex numbers like 0X123 into deeply nested expressions like:
        (-0X23a8cE1D+(O.LL((O.VL((O.F4(O.I[0x5_]))-e[0Xc0D])))))
        
        This is applied to MOST numbers in the output, not just safe patterns.
        
        Args:
            code: The Lua code to transform
            depth: Nesting depth for expressions (4-6 recommended)
            transform_probability: Probability of transforming each number (0.0-1.0)
            
        Returns:
            Code with Luraph-style nested expressions
        """
        import re
        
        # First, protect all string literals
        string_placeholders = {}
        placeholder_counter = [0]
        
        def protect_string(match):
            placeholder = f"__STR_PH_{placeholder_counter[0]}__"
            string_placeholders[placeholder] = match.group(0)
            placeholder_counter[0] += 1
            return placeholder
        
        string_pattern = r'"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'|\[\[.*?\]\]'
        protected_code = re.sub(string_pattern, protect_string, code, flags=re.DOTALL)
        
        # Pattern to match hex numbers: 0x123, 0X1_23, 0XFF, etc.
        # Also match decimal numbers that are large enough
        hex_pattern = r'0[xX][0-9a-fA-F_]+'
        
        rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        
        def replace_hex_number(match):
            hex_str = match.group(0)
            
            # Random chance to skip transformation
            if rng.random() > transform_probability:
                return hex_str
            
            try:
                # Parse the hex number (remove underscores)
                clean_hex = hex_str.replace('_', '')
                n = int(clean_hex, 16)
                
                # Skip very small numbers (0-15) as they're often used for opcodes
                if n < 16:
                    return hex_str
                
                # Skip very large numbers that might overflow
                if n > 0x7FFFFFFF:
                    return hex_str
                
                # Transform to Luraph-style expression
                return self.luraph_constants.obfuscate_number(n, depth)
            except (ValueError, OverflowError):
                return hex_str
        
        # Transform hex numbers
        transformed_code = re.sub(hex_pattern, replace_hex_number, protected_code)
        
        # Also transform large decimal numbers (1000+)
        decimal_pattern = r'\b(\d{4,})\b'
        
        def replace_decimal_number(match):
            num_str = match.group(1)
            
            # Random chance to skip
            if rng.random() > transform_probability:
                return num_str
            
            try:
                n = int(num_str)
                if n > 0x7FFFFFFF:
                    return num_str
                return self.luraph_constants.obfuscate_number(n, depth)
            except (ValueError, OverflowError):
                return num_str
        
        transformed_code = re.sub(decimal_pattern, replace_decimal_number, transformed_code)
        
        # Restore string literals
        for placeholder, original in string_placeholders.items():
            transformed_code = transformed_code.replace(placeholder, original)
        
        return transformed_code


class VMStringEncryptor:
    """
    Encrypts string literals in the generated VM code.
    
    This encrypts strings that appear in the VM template itself,
    making it harder to understand the VM's structure.
    
    Note: This does NOT encrypt strings in the user's bytecode -
    those are already protected by the bytecode encryption layer.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        self.xor_key = self.seed.get_random_int(1, 255)
    
    def _gen_name(self, length: int = 15) -> str:
        """Generate obfuscated variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def encrypt_string_to_char_codes(self, s: str) -> str:
        """
        Convert a string to string.char() call with encrypted byte values.
        
        Args:
            s: The string to encrypt
            
        Returns:
            Lua expression like string.char(0x48,0x65,0x6C,0x6C,0x6F)
        """
        if not s:
            return '""'
        
        # XOR each character with the key
        encrypted_bytes = []
        for i, c in enumerate(s):
            byte = ord(c)
            # Simple XOR with position-dependent key
            encrypted = byte ^ ((self.xor_key + i) % 256)
            encrypted_bytes.append(encrypted)
        
        # Generate the decryption expression
        # We need to XOR back at runtime
        char_exprs = []
        for i, eb in enumerate(encrypted_bytes):
            # bit32.bxor(encrypted_byte, (key + position) % 256)
            key_at_pos = (self.xor_key + i) % 256
            char_exprs.append(f'bit32.bxor({eb},{key_at_pos})')
        
        return f'string.char({",".join(char_exprs)})'
    
    def encrypt_string_simple(self, s: str) -> str:
        """
        Convert a string to escape sequence format.
        
        This is simpler and doesn't require runtime decryption,
        but still hides the string from casual inspection.
        
        Args:
            s: The string to convert
            
        Returns:
            Lua string with escape sequences like "\\72\\101\\108\\108\\111"
        """
        if not s:
            return '""'
        
        # Convert to escape sequences
        escaped = ''.join(f'\\{ord(c)}' for c in s)
        return f'"{escaped}"'
    
    def transform_vm_strings(self, code: str, encrypt_method: str = 'escape') -> str:
        """
        Transform string literals in VM code to encrypted form.
        
        Args:
            code: The VM code
            encrypt_method: 'escape' for escape sequences, 'char' for string.char
            
        Returns:
            Transformed code with encrypted strings
        """
        import re
        
        # Strings to encrypt (VM-related strings that reveal structure)
        # We only encrypt specific strings to avoid breaking the code
        strings_to_encrypt = [
            'opcode', 'opname', 'opmode', 'kmode', 'usesAux',
            'stack', 'constants', 'upvalues', 'proto', 'protos',
            'code', 'numparams', 'maxstacksize', 'isvararg',
            'linedefined', 'debugname', 'flags', 'typeinfo',
            'mainProto', 'stringTable', 'protoTable',
        ]
        
        for s in strings_to_encrypt:
            # Match the string as a standalone string literal
            pattern = f'"{re.escape(s)}"'
            if encrypt_method == 'escape':
                replacement = self.encrypt_string_simple(s)
            else:
                replacement = self.encrypt_string_to_char_codes(s)
            code = code.replace(pattern, replacement)
        
        return code
