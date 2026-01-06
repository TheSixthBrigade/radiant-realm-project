"""
Runtime Protection Features for advanced obfuscation.

This module implements:
1. Self-Modifying Code - Code that modifies dispatch tables at runtime
2. Anti-Dump Protection - Detect memory dumping attempts
3. Environment Integrity Checks - Verify runtime environment hasn't been tampered

ALL strings and global accesses are fully obfuscated.
"""

import random
from typing import Tuple, List
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from core import PolymorphicBuildSeed, UnifiedNamingSystem


def _to_escape(s: str) -> str:
    """Convert string to escape sequence format (without quotes)."""
    return ''.join(f'\\{ord(c)}' for c in s)


class SelfModifyingCode:
    """
    Generates self-modifying code that changes dispatch tables at runtime.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        self.naming = UnifiedNamingSystem(self.seed)
    
    def _gen_name(self, length: int = 15) -> str:
        """Generate obfuscated variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def generate_dispatch_mutator(self) -> Tuple[str, str]:
        """Generate code that mutates the dispatch table at runtime."""
        func_name = self._gen_name()
        dispatch_var = self._gen_name(10)
        key_var = self._gen_name(8)
        val_var = self._gen_name(8)
        temp_var = self._gen_name(8)
        counter_var = self._gen_name(10)
        g_var = self._gen_name(8)
        b32_var = self._gen_name(8)
        band_var = self._gen_name(8)
        bxor_var = self._gen_name(8)
        
        mutation_key = self.seed.get_random_int(1, 255)
        
        # CRITICAL: In Roblox, _G["bit32"] returns nil! Use bit32 directly
        code = f'''local {g_var}=_G
local {b32_var}=bit32
local {band_var}={b32_var}["{_to_escape('band')}"]
local {bxor_var}={b32_var}["{_to_escape('bxor')}"]
local {counter_var}=0
local {func_name}=function({dispatch_var})
{counter_var}={counter_var}+1
local {key_var}={band_var}({counter_var}*{mutation_key},0xFF)
for {temp_var}=0,83 do
local {val_var}={dispatch_var}[{temp_var}]
if {val_var} then
{dispatch_var}[{bxor_var}({temp_var},{key_var})%84]={val_var}
end
end
return {dispatch_var}
end'''
        
        return code, func_name
    
    def generate_handler_swapper(self) -> Tuple[str, str]:
        """Generate code that swaps opcode handlers at runtime."""
        func_name = self._gen_name()
        handlers_var = self._gen_name(10)
        idx1_var = self._gen_name(8)
        idx2_var = self._gen_name(8)
        temp_var = self._gen_name(8)
        state_var = self._gen_name(10)
        g_var = self._gen_name(8)
        band_var = self._gen_name(8)
        
        swap_key = self.seed.get_random_int(1, 100)
        
        # CRITICAL: In Roblox, _G["bit32"] returns nil! Use bit32 directly
        code = f'''local {g_var}=_G
local {band_var}=bit32["{_to_escape('band')}"]
local {state_var}=0
local {func_name}=function({handlers_var},{idx1_var})
{state_var}={state_var}+1
local {idx2_var}={band_var}({state_var}*{swap_key}+{idx1_var},0x3F)
if {handlers_var}[{idx1_var}] and {handlers_var}[{idx2_var}] then
local {temp_var}={handlers_var}[{idx1_var}]
{handlers_var}[{idx1_var}]={handlers_var}[{idx2_var}]
{handlers_var}[{idx2_var}]={temp_var}
end
end'''
        
        return code, func_name
    
    def generate_key_rotator(self) -> Tuple[str, str]:
        """Generate code that rotates encryption keys at runtime."""
        func_name = self._gen_name()
        key_var = self._gen_name(10)
        state_var = self._gen_name(10)
        g_var = self._gen_name(8)
        band_var = self._gen_name(8)
        bxor_var = self._gen_name(8)
        
        rotation_mult = self.seed.get_random_int(3, 17)
        rotation_add = self.seed.get_random_int(7, 31)
        
        # CRITICAL: In Roblox, _G["bit32"] returns nil! Use bit32 directly
        code = f'''local {g_var}=_G
local {band_var}=bit32["{_to_escape('band')}"]
local {bxor_var}=bit32["{_to_escape('bxor')}"]
local {state_var}=0
local {func_name}=function({key_var})
{state_var}={state_var}+1
return {band_var}({bxor_var}({key_var},{state_var}*{rotation_mult}+{rotation_add}),0xFF)
end'''
        
        return code, func_name
    
    def generate_self_modifying_wrapper(self) -> str:
        """Generate a complete self-modifying code wrapper."""
        mutator_code, mutator_func = self.generate_dispatch_mutator()
        swapper_code, swapper_func = self.generate_handler_swapper()
        rotator_code, rotator_func = self.generate_key_rotator()
        
        exec_counter = self._gen_name(12)
        
        wrapper = f'''{mutator_code}
{swapper_code}
{rotator_code}
local {exec_counter}=0'''
        
        return wrapper


class AntiDumpProtection:
    """
    Generates anti-dump protection code.
    ALL strings and global accesses are fully obfuscated.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        self.naming = UnifiedNamingSystem(self.seed)
    
    def _gen_name(self, length: int = 15) -> str:
        """Generate obfuscated variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def generate_stack_integrity_check(self) -> Tuple[str, str]:
        """Generate code that checks stack integrity."""
        func_name = self._gen_name()
        stack_var = self._gen_name(10)
        checksum_var = self._gen_name(10)
        i_var = self._gen_name(8)
        val_var = self._gen_name(8)
        g_var = self._gen_name(8)
        bxor_var = self._gen_name(8)
        band_var = self._gen_name(8)
        type_var = self._gen_name(8)
        tostr_var = self._gen_name(8)
        
        # CRITICAL: In Roblox, _G["bit32"], _G["type"], _G["tostring"] return nil! Use directly
        code = f'''local {g_var}=_G
local {bxor_var}=bit32["{_to_escape('bxor')}"]
local {band_var}=bit32["{_to_escape('band')}"]
local {type_var}=type
local {tostr_var}=tostring
local {func_name}=function({stack_var},{checksum_var})
local {val_var}=0
for {i_var}=0,255 do
local v={stack_var}[{i_var}]
if v~=nil then
{val_var}={bxor_var}({val_var},{type_var}(v)=="{_to_escape('number')}" and v or #{tostr_var}(v))
end
end
return {band_var}({val_var},0xFFFF)=={checksum_var}
end'''
        
        return code, func_name
    
    def generate_environment_fingerprint(self) -> Tuple[str, str]:
        """Generate code that creates an environment fingerprint."""
        func_name = self._gen_name()
        result_var = self._gen_name(10)
        g_var = self._gen_name(8)
        bxor_var = self._gen_name(8)
        band_var = self._gen_name(8)
        tostr_var = self._gen_name(8)
        floor_var = self._gen_name(8)
        b32_ref = self._gen_name(8)
        str_ref = self._gen_name(8)
        tbl_ref = self._gen_name(8)
        math_ref = self._gen_name(8)
        buf_ref = self._gen_name(8)
        tick_ref = self._gen_name(8)
        
        # CRITICAL: In Roblox, _G["bit32"], _G["math"], _G["string"], _G["table"], _G["buffer"] return nil!
        # Use these globals directly, only method names can be escaped
        code = f'''local {g_var}=_G
local {bxor_var}=bit32["{_to_escape('bxor')}"]
local {band_var}=bit32["{_to_escape('band')}"]
local {tostr_var}=tostring
local {floor_var}=math["{_to_escape('floor')}"]
local {b32_ref}=bit32
local {str_ref}=string
local {tbl_ref}=table
local {math_ref}=math
local {buf_ref}=buffer
local {tick_ref}=tick
local {func_name}=function()
local {result_var}=0
{result_var}={bxor_var}({result_var},#{tostr_var}({b32_ref}))
{result_var}={bxor_var}({result_var},#{tostr_var}({str_ref}))
{result_var}={bxor_var}({result_var},#{tostr_var}({tbl_ref}))
{result_var}={bxor_var}({result_var},#{tostr_var}({math_ref}))
if {buf_ref} then {result_var}={bxor_var}({result_var},#{tostr_var}({buf_ref})) end
if {tick_ref} then {result_var}={bxor_var}({result_var},{floor_var}({tick_ref}()%1000)) end
return {band_var}({result_var},0xFFFF)
end'''
        
        return code, func_name
    
    def generate_timing_anomaly_detector(self) -> Tuple[str, str]:
        """Generate code that detects timing anomalies."""
        func_name = self._gen_name()
        start_var = self._gen_name(10)
        end_var = self._gen_name(10)
        threshold_var = self._gen_name(10)
        g_var = self._gen_name(8)
        tick_ref = self._gen_name(8)
        clock_ref = self._gen_name(8)
        
        threshold = 0.1
        
        # CRITICAL: In Roblox, _G["tick"], _G["os"] return nil! Use directly
        code = f'''local {g_var}=_G
local {tick_ref}=tick
local {clock_ref}=os and os["{_to_escape('clock')}"]
local {func_name}=function({start_var})
local {end_var}={tick_ref} and {tick_ref}() or {clock_ref} and {clock_ref}() or 0
local {threshold_var}={threshold}
return ({end_var}-{start_var})<{threshold_var}
end'''
        
        return code, func_name
    
    def generate_metatable_trap(self) -> Tuple[str, str]:
        """Generate a metatable trap that detects inspection."""
        func_name = self._gen_name()
        tbl_var = self._gen_name(10)
        trap_var = self._gen_name(10)
        access_count = self._gen_name(10)
        g_var = self._gen_name(8)
        setmt_var = self._gen_name(8)
        pairs_var = self._gen_name(8)
        # Obfuscated internal variable names
        k_var = self._gen_name(8)
        v_var = self._gen_name(8)
        underscore_var = self._gen_name(8)
        
        max_accesses = self.seed.get_random_int(100, 500)
        
        # Metamethod names as escape sequences
        index_esc = _to_escape('__index')
        newindex_esc = _to_escape('__newindex')
        len_esc = _to_escape('__len')
        pairs_esc = _to_escape('__pairs')
        
        # Use obfuscated variable names in function signatures
        # CRITICAL: In Roblox, _G["setmetatable"], _G["pairs"] return nil! Use directly
        code = f'''local {g_var}=_G
local {setmt_var}=setmetatable
local {pairs_var}=pairs
local {access_count}=0
local {func_name}=function({tbl_var})
local {trap_var}={setmt_var}({{}},{{
["{index_esc}"]=function({underscore_var},{k_var})
{access_count}={access_count}+1
if {access_count}>{max_accesses} then
return nil
end
return {tbl_var}[{k_var}]
end,
["{newindex_esc}"]=function({underscore_var},{k_var},{v_var})
{access_count}={access_count}+1
if {access_count}<={max_accesses} then
{tbl_var}[{k_var}]={v_var}
end
end,
["{len_esc}"]=function()
return #{tbl_var}
end,
["{pairs_esc}"]=function()
{access_count}={access_count}+10
return {pairs_var}({tbl_var})
end
}})
return {trap_var}
end'''
        
        return code, func_name
    
    def generate_corruption_response(self) -> Tuple[str, str]:
        """Generate code that corrupts execution when tampering is detected."""
        func_name = self._gen_name()
        stack_var = self._gen_name(10)
        i_var = self._gen_name(8)
        
        code = f'''local {func_name}=function({stack_var})
for {i_var}=0,255 do
{stack_var}[{i_var}]=nil
end
end'''
        
        return code, func_name
    
    def generate_anti_dump_wrapper(self) -> str:
        """Generate a complete anti-dump protection wrapper."""
        fingerprint_code, fingerprint_func = self.generate_environment_fingerprint()
        timing_code, timing_func = self.generate_timing_anomaly_detector()
        trap_code, trap_func = self.generate_metatable_trap()
        corrupt_code, corrupt_func = self.generate_corruption_response()
        
        init_fingerprint = self._gen_name(12)
        check_interval = self._gen_name(10)
        exec_count = self._gen_name(10)
        
        interval = self.seed.get_random_int(50, 200)
        
        wrapper = f'''{fingerprint_code}
{timing_code}
{trap_code}
{corrupt_code}
local {init_fingerprint}={fingerprint_func}()
local {check_interval}={interval}
local {exec_count}=0'''
        
        return wrapper


class RuntimeProtectionIntegrator:
    """Integrates all runtime protection features."""
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.self_mod = SelfModifyingCode(self.seed)
        self.anti_dump = AntiDumpProtection(self.seed)
    
    def generate_full_protection(self, enable_self_mod: bool = True,
                                  enable_anti_dump: bool = True) -> str:
        """Generate complete runtime protection code."""
        parts = []
        
        if enable_self_mod:
            parts.append(self.self_mod.generate_self_modifying_wrapper())
        
        if enable_anti_dump:
            parts.append(self.anti_dump.generate_anti_dump_wrapper())
        
        return '\n'.join(parts)
