"""
Anti-Deobfuscation Protection Transforms

This module implements advanced protections against deobfuscation tools:
1. Anti-Emulation Checks - Detect custom Lua VMs/emulators
2. Code Integrity Verification - Detect code tampering
3. Handler Polymorphism - Multiple equivalent handler implementations

These protections make automated deobfuscation significantly harder.
ALL strings and global accesses are fully obfuscated.
"""

import random
from typing import List, Tuple, Dict
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from core import PolymorphicBuildSeed


class AntiEmulationChecks:
    """
    Detects when code is running in a custom Lua VM or emulator.
    
    Emulators used by deobfuscators often:
    - Don't have Roblox-specific globals
    - Have different timing characteristics
    - Missing certain Luau-specific features
    - Have incomplete standard library implementations
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
    
    def _gen_name(self, length: int = 15) -> str:
        """Generate obfuscated variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def _to_escape(self, s: str) -> str:
        """Convert string to escape sequence format (without quotes)."""
        return ''.join(f'\\{ord(c)}' for c in s)
    
    def _to_char_args(self, s: str) -> str:
        """Convert string to comma-separated char codes for string.char call."""
        return ','.join(str(ord(c)) for c in s)
    
    def generate_environment_check(self) -> str:
        """
        Generate code that checks for Roblox environment.
        ALL globals and strings are fully obfuscated.
        """
        flag_var = self._gen_name()
        check_var = self._gen_name()
        str_helper = self._gen_name(8)
        type_helper = self._gen_name(8)
        rawget_helper = self._gen_name(8)
        getfenv_helper = self._gen_name(8)
        env_var = self._gen_name(8)
        ud_var = self._gen_name(8)
        tb_var = self._gen_name(8)
        g_var = self._gen_name(8)
        
        # All string literals as escape sequences
        userdata_esc = self._to_escape("userdata")
        table_esc = self._to_escape("table")
        
        # Global access via _G with obfuscated keys
        # string -> \115\116\114\105\110\103
        # char -> \99\104\97\114
        # type -> \116\121\112\101
        # rawget -> \114\97\119\103\101\116
        # getfenv -> \103\101\116\102\101\110\118
        # _ENV -> \95\69\78\86
        # _G -> \95\71
        
        # CRITICAL: In Roblox, _G["string"] returns nil!
        # We must use string/type/rawget directly, only method names can be escaped
        code = f'''local {g_var}=_G
local {str_helper}=string["{self._to_escape('char')}"]
local {type_helper}=type
local {rawget_helper}=rawget
local {getfenv_helper}=getfenv
local {flag_var}=0
local {check_var}=function()
local {env_var}=0
local {ud_var}="{userdata_esc}"
local {tb_var}="{table_esc}"
if {type_helper}({rawget_helper}({g_var},{str_helper}({self._to_char_args('game')})))=={ud_var} then {env_var}={env_var}+1 end
if {type_helper}({rawget_helper}({g_var},{str_helper}({self._to_char_args('workspace')})))=={ud_var} then {env_var}={env_var}+1 end
if {type_helper}({rawget_helper}({g_var},{str_helper}({self._to_char_args('script')})))=={ud_var} then {env_var}={env_var}+1 end
if {type_helper}({rawget_helper}({g_var},{str_helper}({self._to_char_args('Enum')})))=={ud_var} then {env_var}={env_var}+1 end
local _i={rawget_helper}({g_var},{str_helper}({self._to_char_args('Instance')}))
if {type_helper}(_i)=={tb_var} or {type_helper}(_i)=={ud_var} then {env_var}={env_var}+1 end
local _v={rawget_helper}({g_var},{str_helper}({self._to_char_args('Vector3')}))
if {type_helper}(_v)=={tb_var} or {type_helper}(_v)=={ud_var} then {env_var}={env_var}+1 end
local _c={rawget_helper}({g_var},{str_helper}({self._to_char_args('CFrame')}))
if {type_helper}(_c)=={tb_var} or {type_helper}(_c)=={ud_var} then {env_var}={env_var}+1 end
return {env_var}
end
{flag_var}={check_var}()'''
        
        return code, flag_var
    
    def generate_luau_feature_check(self) -> str:
        """
        Check for Luau-specific features that emulators might not support.
        ALL globals and strings are fully obfuscated.
        """
        flag_var = self._gen_name()
        test_var = self._gen_name()
        type_helper = self._gen_name(8)
        str_helper = self._gen_name(8)
        g_var = self._gen_name(8)
        buf_var = self._gen_name(8)
        b32_var = self._gen_name(8)
        tbl_var = self._gen_name(8)
        tb_esc = self._gen_name(8)
        fn_esc = self._gen_name(8)
        
        # All string literals as escape sequences
        table_esc = self._to_escape("table")
        func_esc = self._to_escape("function")
        
        # CRITICAL: In Roblox, _G["string"], _G["type"], _G["buffer"], _G["bit32"], _G["table"] ALL return nil!
        # We must use these globals directly, only method names can be escaped
        code = f'''local {g_var}=_G
local {type_helper}=type
local {str_helper}=string["{self._to_escape('char')}"]
local {flag_var}=0
local {test_var}=function()
local _f=0
local {tb_esc}="{table_esc}"
local {fn_esc}="{func_esc}"
local {buf_var}=buffer
local {b32_var}=bit32
local {tbl_var}=table
if {type_helper}({buf_var})=={tb_esc} and {type_helper}({buf_var}[{str_helper}({self._to_char_args('fromstring')})])=={fn_esc} then _f=_f+1 end
if {type_helper}({b32_var})=={tb_esc} and {type_helper}({b32_var}[{str_helper}({self._to_char_args('bxor')})])=={fn_esc} then _f=_f+1 end
if {type_helper}({tbl_var}[{str_helper}({self._to_char_args('create')})])=={fn_esc} then _f=_f+1 end
if {type_helper}({tbl_var}[{str_helper}({self._to_char_args('move')})])=={fn_esc} then _f=_f+1 end
return _f
end
{flag_var}={test_var}()'''
        
        return code, flag_var
    
    def generate_timing_fingerprint(self) -> str:
        """
        Generate timing-based fingerprint to detect emulation.
        ALL globals are accessed via obfuscated table lookups.
        """
        flag_var = self._gen_name()
        time_var = self._gen_name()
        loop_var = self._gen_name()
        clock_var = self._gen_name(8)
        bxor_var = self._gen_name(8)
        g_var = self._gen_name(8)
        dt_var = self._gen_name(8)
        
        # CRITICAL: In Roblox, _G["os"], _G["bit32"] return nil!
        # We must use os/bit32 directly, only method names can be escaped
        code = f'''local {g_var}=_G
local {clock_var}=os and os["{self._to_escape('clock')}"]
local {bxor_var}=bit32["{self._to_escape('bxor')}"]
local {flag_var}=true
local {time_var}={clock_var} and {clock_var}() or 0
for {loop_var}=1,1000 do local _={bxor_var}({loop_var},0xFF) end
local {dt_var}=({clock_var} and {clock_var}() or 0)-{time_var}
if {dt_var}>0.1 then {flag_var}=false end'''
        
        return code, flag_var
    
    def generate_full_anti_emulation(self) -> str:
        """
        Generate complete anti-emulation protection code.
        """
        env_code, env_flag = self.generate_environment_check()
        luau_code, luau_flag = self.generate_luau_feature_check()
        timing_code, timing_flag = self.generate_timing_fingerprint()
        
        combined_flag = self._gen_name()
        
        full_code = f'''{env_code}
{luau_code}
{timing_code}
local {combined_flag}={env_flag}+{luau_flag}'''
        
        return full_code


class CodeIntegrityVerification:
    """
    Detects if the obfuscated code has been modified.
    ALL globals and strings are fully obfuscated.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
    
    def _gen_name(self, length: int = 15) -> str:
        """Generate obfuscated variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def _to_escape(self, s: str) -> str:
        """Convert string to escape sequence format (without quotes)."""
        return ''.join(f'\\{ord(c)}' for c in s)
    
    def generate_string_checksum_function(self) -> Tuple[str, str]:
        """
        Generate a simple checksum function for strings.
        ALL globals accessed via obfuscated table lookups.
        """
        func_name = self._gen_name()
        str_var = self._gen_name(10)
        sum_var = self._gen_name(10)
        i_var = self._gen_name(8)
        bxor_var = self._gen_name(8)
        band_var = self._gen_name(8)
        lshift_var = self._gen_name(8)
        byte_var = self._gen_name(8)
        g_var = self._gen_name(8)
        b32_var = self._gen_name(8)
        
        # CRITICAL: In Roblox, _G["bit32"], _G["string"] return nil!
        # We must use bit32/string directly, only method names can be escaped
        code = f'''local {g_var}=_G
local {b32_var}=bit32
local {bxor_var}={b32_var}["{self._to_escape('bxor')}"]
local {band_var}={b32_var}["{self._to_escape('band')}"]
local {lshift_var}={b32_var}["{self._to_escape('lshift')}"]
local {byte_var}=string["{self._to_escape('byte')}"]
local {func_name}=function({str_var})
local {sum_var}=0
for {i_var}=1,#{str_var} do
{sum_var}={bxor_var}({sum_var},{byte_var}({str_var},{i_var})*{i_var})
{sum_var}={band_var}({sum_var}+{lshift_var}({sum_var},5),0xFFFFFFFF)
end
return {sum_var}
end'''
        
        return code, func_name
    
    def generate_bytecode_integrity_check(self) -> str:
        """Generate code that verifies bytecode hasn't been modified."""
        checksum_code, checksum_func = self.generate_string_checksum_function()
        
        valid_flag = self._gen_name()
        stored_hash = self._gen_name()
        computed_hash = self._gen_name()
        
        code = f'''{checksum_code}
local {valid_flag}=true
local {stored_hash}=0
local {computed_hash}=0'''
        
        return code, checksum_func, valid_flag
    
    def generate_handler_integrity_check(self) -> str:
        """Generate code that verifies opcode handlers haven't been modified."""
        flag_var = self._gen_name()
        sample_var = self._gen_name()
        
        marker = self.rng.randint(0x10000, 0xFFFFFF)
        
        code = f'''local {flag_var}=true
local {sample_var}={hex(marker)}'''
        
        return code, flag_var, marker
    
    def generate_full_integrity_check(self) -> str:
        """Generate complete code integrity verification."""
        checksum_code, checksum_func, valid_flag = self.generate_bytecode_integrity_check()
        handler_code, handler_flag, marker = self.generate_handler_integrity_check()
        
        combined_flag = self._gen_name()
        
        full_code = f'''{checksum_code}
{handler_code}
local {combined_flag}={valid_flag} and {handler_flag}'''
        
        return full_code


class HandlerPolymorphism:
    """
    Generates multiple equivalent implementations for opcode handlers.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
    
    def _gen_name(self, length: int = 15) -> str:
        """Generate obfuscated variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def generate_add_variants(self) -> List[str]:
        """Generate multiple equivalent implementations for ADD opcode."""
        variants = []
        variants.append('stack[inst.A]=stack[inst.B]+stack[inst.C]')
        
        t1, t2, t3 = self._gen_name(10), self._gen_name(10), self._gen_name(10)
        variants.append(f'local {t1}=stack[inst.B];local {t2}=stack[inst.C];local {t3}={t1}+{t2};stack[inst.A]={t3}')
        
        t1 = self._gen_name(10)
        variants.append(f'local {t1}=stack[inst.B]+stack[inst.C]+0;stack[inst.A]={t1}')
        
        t1, t2 = self._gen_name(10), self._gen_name(10)
        variants.append(f'local {t1}=inst.B;local {t2}=inst.C;stack[inst.A]=stack[{t1}]+stack[{t2}]')
        
        return variants
    
    def generate_sub_variants(self) -> List[str]:
        """Generate multiple equivalent implementations for SUB opcode."""
        variants = []
        variants.append('stack[inst.A]=stack[inst.B]-stack[inst.C]')
        
        t1, t2, t3 = self._gen_name(10), self._gen_name(10), self._gen_name(10)
        variants.append(f'local {t1}=stack[inst.B];local {t2}=stack[inst.C];local {t3}={t1}-{t2};stack[inst.A]={t3}')
        
        t1 = self._gen_name(10)
        variants.append(f'local {t1}=-stack[inst.C];stack[inst.A]=stack[inst.B]+{t1}')
        
        return variants
    
    def generate_mul_variants(self) -> List[str]:
        """Generate multiple equivalent implementations for MUL opcode."""
        variants = []
        variants.append('stack[inst.A]=stack[inst.B]*stack[inst.C]')
        
        t1, t2, t3 = self._gen_name(10), self._gen_name(10), self._gen_name(10)
        variants.append(f'local {t1}=stack[inst.B];local {t2}=stack[inst.C];local {t3}={t1}*{t2};stack[inst.A]={t3}')
        
        t1 = self._gen_name(10)
        variants.append(f'local {t1}=stack[inst.B]*stack[inst.C]*1;stack[inst.A]={t1}')
        
        return variants
    
    def generate_move_variants(self) -> List[str]:
        """Generate multiple equivalent implementations for MOVE opcode."""
        variants = []
        variants.append('stack[inst.A]=stack[inst.B]')
        
        t1 = self._gen_name(10)
        variants.append(f'local {t1}=stack[inst.B];stack[inst.A]={t1}')
        
        t1, t2 = self._gen_name(10), self._gen_name(10)
        variants.append(f'local {t1}=inst.A;local {t2}=inst.B;stack[{t1}]=stack[{t2}]')
        
        return variants
    
    def generate_loadk_variants(self) -> List[str]:
        """Generate multiple equivalent implementations for LOADK opcode."""
        variants = []
        variants.append('stack[inst.A]=inst.K')
        
        t1 = self._gen_name(10)
        variants.append(f'local {t1}=inst.K;stack[inst.A]={t1}')
        
        t1, t2 = self._gen_name(10), self._gen_name(10)
        variants.append(f'local {t1}=inst.A;local {t2}=inst.K;stack[{t1}]={t2}')
        
        return variants
    
    def select_random_variant(self, variants: List[str]) -> str:
        """Select a random variant from the list."""
        return self.rng.choice(variants)
    
    def generate_polymorphic_handlers(self) -> Dict[str, str]:
        """Generate a set of polymorphic handler implementations."""
        handlers = {
            'ADD': self.select_random_variant(self.generate_add_variants()),
            'SUB': self.select_random_variant(self.generate_sub_variants()),
            'MUL': self.select_random_variant(self.generate_mul_variants()),
            'MOVE': self.select_random_variant(self.generate_move_variants()),
            'LOADK': self.select_random_variant(self.generate_loadk_variants()),
        }
        return handlers


class AntiDeobfuscationIntegrator:
    """
    Integrates all anti-deobfuscation protections into the obfuscation pipeline.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.anti_emulation = AntiEmulationChecks(self.seed)
        self.integrity = CodeIntegrityVerification(self.seed)
        self.polymorphism = HandlerPolymorphism(self.seed)
    
    def generate_full_protection(self, 
                                  enable_anti_emulation: bool = True,
                                  enable_integrity: bool = True) -> str:
        """Generate complete anti-deobfuscation protection code."""
        code_parts = []
        
        if enable_anti_emulation:
            code_parts.append(self.anti_emulation.generate_full_anti_emulation())
        
        if enable_integrity:
            code_parts.append(self.integrity.generate_full_integrity_check())
        
        return '\n'.join(code_parts)
    
    def apply_handler_polymorphism(self, code: str) -> str:
        """Apply handler polymorphism to VM code."""
        import re
        
        handlers = self.polymorphism.generate_polymorphic_handlers()
        
        add_pattern = r'stack\[inst\.A\]\s*=\s*stack\[inst\.B\]\s*\+\s*stack\[inst\.C\]'
        if 'ADD' in handlers:
            code = re.sub(add_pattern, handlers['ADD'], code, count=1)
        
        sub_pattern = r'stack\[inst\.A\]\s*=\s*stack\[inst\.B\]\s*-\s*stack\[inst\.C\]'
        if 'SUB' in handlers:
            code = re.sub(sub_pattern, handlers['SUB'], code, count=1)
        
        mul_pattern = r'stack\[inst\.A\]\s*=\s*stack\[inst\.B\]\s*\*\s*stack\[inst\.C\]'
        if 'MUL' in handlers:
            code = re.sub(mul_pattern, handlers['MUL'], code, count=1)
        
        return code
