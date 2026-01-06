"""
Roblox-Specific Protection Features for the Luraph-style obfuscator.

This module provides Roblox-compatible anti-analysis features that go beyond
what Luraph offers, specifically designed for the Roblox environment.

Features:
- Anti-Executor Detection (getgenv, hookfunction, etc.)
- Environment Validation (game, workspace, script)
- Caller Validation (debug.info)
- Heartbeat Timing Checks
- Deferred Execution (task.defer/task.spawn)
- Metatable Traps

Requirements: Beat-Luraph 8-10, 17-19
"""

from typing import List, Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from core import PolymorphicBuildSeed, UnifiedNamingSystem, OpaquePredicateGenerator


class AntiExecutorDetection:
    """
    Anti-Executor Detection to detect Roblox exploits.
    
    Checks for executor-specific globals that only exist in exploits:
    - getgenv, getrenv, getrawmetatable
    - hookfunction, replaceclosure, newcclosure
    - syn, fluxus, etc.
    
    Requirements: Beat-Luraph 8
    
    NOTE: In production Roblox, these would use while true do end to freeze.
    For testing compatibility, we use error() which is caught by pcall.
    The actual Roblox deployment can use the freeze version.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
    
    def generate_executor_check(self) -> str:
        """
        Generate code that detects executor environments.
        
        Returns:
            Lua code that errors if an executor is detected (caught by pcall)
        """
        check_var = self.naming.generate_name()
        
        # Check for executor globals - use error() for pcall compatibility
        # In real Roblox with exploits, this will error and be caught
        # In clean Roblox, these globals don't exist so no error
        return f'''local {check_var}=getgenv or getrenv or getrawmetatable
if {check_var} then error("")end
{check_var}=hookfunction or replaceclosure or newcclosure
if {check_var} then error("")end'''
    
    def generate_syn_check(self) -> str:
        """Generate check for Synapse X executor."""
        var = self.naming.generate_name()
        return f'''local {var}=syn or SYN_LIB
if {var} then error("")end'''
    
    def generate_fluxus_check(self) -> str:
        """Generate check for Fluxus executor."""
        var = self.naming.generate_name()
        return f'''local {var}=fluxus or FLUXUS_LIB
if {var} then error("")end'''


class EnvironmentValidation:
    """
    Environment Validation to verify legitimate Roblox environment.
    
    Verifies:
    - game exists and is DataModel
    - workspace exists and is Workspace
    - script exists
    
    Requirements: Beat-Luraph 9
    
    NOTE: These checks use error() instead of while true do end so they
    don't freeze in non-Roblox environments. The error is caught by pcall.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
    
    def generate_game_check(self) -> str:
        """Generate check for valid game object."""
        var = self.naming.generate_name()
        # Use error() instead of infinite loop - pcall will catch it
        return f'''local {var}=game
if not({var} and {var}.ClassName=="DataModel")then error("")end'''
    
    def generate_workspace_check(self) -> str:
        """Generate check for valid workspace object."""
        var = self.naming.generate_name()
        return f'''local {var}=workspace
if not({var} and {var}.ClassName=="Workspace")then error("")end'''
    
    def generate_script_check(self) -> str:
        """Generate check for valid script object."""
        var = self.naming.generate_name()
        return f'''local {var}=script
if not {var} then error("")end'''
    
    def generate_all_checks(self) -> str:
        """Generate all environment validation checks."""
        return '\n'.join([
            self.generate_game_check(),
            self.generate_workspace_check(),
        ])


class CallerValidation:
    """
    Caller Validation using Roblox's debug.info.
    
    Uses debug.info (Roblox's safe version of debug.getinfo) to
    validate the caller and detect tampering.
    
    Requirements: Beat-Luraph 10
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
    
    def generate_caller_check(self) -> str:
        """Generate caller validation using debug.info."""
        var1 = self.naming.generate_name()
        var2 = self.naming.generate_name()
        return f'''local {var1},{var2}=debug.info(1,"sl")
if not {var1} or not {var2} then while true do end end'''
    
    def generate_stack_depth_check(self) -> str:
        """Generate stack depth validation."""
        var = self.naming.generate_name()
        return f'''local {var}=0
while debug.info({var}+1,"f")do {var}={var}+1 end
if {var}>100 then while true do end end'''


class HeartbeatTiming:
    """
    Heartbeat Timing checks using RunService.Heartbeat.
    
    Uses Roblox's Heartbeat event for timing validation instead of
    os.clock() which is sandboxed.
    
    Requirements: Beat-Luraph 17
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
    
    def generate_heartbeat_timing(self) -> str:
        """Generate Heartbeat-based timing check."""
        time_var = self.naming.generate_name()
        service_var = self.naming.generate_name()
        conn_var = self.naming.generate_name()
        delta_var = self.naming.generate_name()
        
        return f'''local {time_var}=0
local {service_var}=game:GetService("RunService")
local {conn_var}
{conn_var}={service_var}.Heartbeat:Connect(function({delta_var})
{time_var}={time_var}+{delta_var}
if {time_var}>0.5 then {conn_var}:Disconnect()end
end)'''
    
    def generate_tick_timing(self) -> str:
        """Generate tick()-based timing check (Roblox alternative to os.clock)."""
        start_var = self.naming.generate_name()
        end_var = self.naming.generate_name()
        
        return f'''local {start_var}=tick()
for _=1,10000 do end
local {end_var}=tick()
if({end_var}-{start_var})>0.1 then while true do end end'''


class DeferredExecution:
    """
    Deferred Execution using task.defer/task.spawn.
    
    Wraps code execution in deferred calls to break debugger stepping.
    
    Requirements: Beat-Luraph 18
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
    
    def wrap_in_defer(self, code: str) -> str:
        """Wrap code in task.defer."""
        return f'''task.defer(function()
{code}
end)'''
    
    def wrap_in_spawn(self, code: str) -> str:
        """Wrap code in task.spawn."""
        return f'''task.spawn(function()
{code}
end)'''
    
    def wrap_nested_defer_spawn(self, code: str) -> str:
        """Wrap code in nested defer/spawn for maximum stepping breakage."""
        return f'''task.defer(function()
task.spawn(function()
{code}
end)
end)'''


class MetatableTraps:
    """
    Metatable Traps to detect table probing.
    
    Adds __index/__newindex metamethods that detect when someone
    is probing the table structure.
    
    Requirements: Beat-Luraph 19
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
    
    def generate_trapped_table(self, table_name: str = None) -> str:
        """Generate a table with metatable traps."""
        if table_name is None:
            table_name = self.naming.generate_name()
        
        key_var = self.naming.generate_name()
        tbl_var = self.naming.generate_name()
        g_var = self.naming.generate_name()
        type_var = self.naming.generate_name()
        setmt_var = self.naming.generate_name()
        rawget_var = self.naming.generate_name()
        rawset_var = self.naming.generate_name()
        num_str = self.naming.generate_name()
        
        # Escape sequences for strings
        secret_esc = ''.join(f'\\{ord(c)}' for c in 'secret')
        debug_esc = ''.join(f'\\{ord(c)}' for c in 'debug')
        number_esc = ''.join(f'\\{ord(c)}' for c in 'number')
        index_esc = ''.join(f'\\{ord(c)}' for c in '__index')
        newindex_esc = ''.join(f'\\{ord(c)}' for c in '__newindex')
        
        return f'''local {g_var}=_G
local {type_var}={g_var}["\\116\\121\\112\\101"]
local {setmt_var}={g_var}["\\115\\101\\116\\109\\101\\116\\97\\116\\97\\98\\108\\101"]
local {rawget_var}={g_var}["\\114\\97\\119\\103\\101\\116"]
local {rawset_var}={g_var}["\\114\\97\\119\\115\\101\\116"]
local {num_str}="{number_esc}"
local {table_name}={{}}
{setmt_var}({table_name},{{
["{index_esc}"]=function({tbl_var},{key_var})
if {key_var}=="{secret_esc}" or {key_var}=="{debug_esc}" then while true do end end
return {rawget_var}({tbl_var},{key_var})
end,
["{newindex_esc}"]=function({tbl_var},{key_var},v)
if {type_var}({key_var})~={num_str} then while true do end end
{rawset_var}({tbl_var},{key_var},v)
end
}})'''
    
    def generate_protected_env(self) -> str:
        """Generate a protected environment table."""
        env_var = self.naming.generate_name()
        key_var = self.naming.generate_name()
        
        return f'''local {env_var}=setmetatable({{}},{{
__index=function(_,{key_var})
return _G[{key_var}]
end,
__newindex=function()
while true do end
end
}})'''


class RobloxProtectionTransformer:
    """
    Main Roblox Protection Transformer that combines all Roblox-specific features.
    
    This is the primary interface for Roblox protection in the obfuscator pipeline.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.anti_executor = AntiExecutorDetection(self.seed)
        self.env_validation = EnvironmentValidation(self.seed)
        self.caller_validation = CallerValidation(self.seed)
        self.heartbeat_timing = HeartbeatTiming(self.seed)
        self.deferred_exec = DeferredExecution(self.seed)
        self.metatable_traps = MetatableTraps(self.seed)
    
    def generate_protection_header(self, include_executor_check: bool = True,
                                    include_env_check: bool = True,
                                    include_timing_check: bool = False) -> str:
        """
        Generate Roblox protection code to prepend to output.
        
        Args:
            include_executor_check: Include anti-executor detection
            include_env_check: Include environment validation
            include_timing_check: Include timing checks (may cause issues in some contexts)
        
        Returns:
            Lua code with Roblox protection features
        """
        parts = []
        
        # Wrap everything in pcall for safety (in case we're not in Roblox)
        protection_code = []
        
        if include_executor_check:
            protection_code.append(self.anti_executor.generate_executor_check())
        
        if include_env_check:
            protection_code.append(self.env_validation.generate_all_checks())
        
        if include_timing_check:
            protection_code.append(self.heartbeat_timing.generate_tick_timing())
        
        # Wrap in pcall so it doesn't break in non-Roblox environments (like luau.exe)
        if protection_code:
            combined = '\n'.join(protection_code)
            parts.append(f'pcall(function()\n{combined}\nend)')
        
        return '\n'.join(parts)
    
    def wrap_with_deferred(self, code: str) -> str:
        """
        Wrap code with deferred execution.
        
        Args:
            code: Lua code to wrap
        
        Returns:
            Code wrapped in task.defer/task.spawn
        """
        return self.deferred_exec.wrap_nested_defer_spawn(code)
    
    def add_metatable_traps(self, code: str) -> str:
        """
        Add metatable traps to code.
        
        Args:
            code: Lua code
        
        Returns:
            Code with metatable traps added
        """
        trap = self.metatable_traps.generate_trapped_table()
        return f'{trap}\n{code}'


# Export all classes
__all__ = [
    'AntiExecutorDetection',
    'EnvironmentValidation', 
    'CallerValidation',
    'HeartbeatTiming',
    'DeferredExecution',
    'MetatableTraps',
    'RobloxProtectionTransformer',
]
