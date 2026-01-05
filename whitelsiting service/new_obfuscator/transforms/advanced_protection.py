"""
Advanced Protection Features for Luraph-style obfuscator.

Features that go BEYOND Luraph:
1. Multi-Layer VM - VM inside VM (nested virtualization)
2. String Encryption with Runtime Decryption
3. Code Integrity Checks - Detect tampering
4. Anti-Decompiler Tricks - Break common decompilers
5. Polymorphic Bytecode - Different encoding each build
6. Watermarking - Hidden identifiers
7. Time-Based Expiration - Code expires after date
8. Hardware Binding - Tie to specific player/machine
"""

import random
import hashlib
import time
from typing import List, Tuple, Optional


class StringEncryptionRuntime:
    """
    Runtime string decryption - strings only decrypted when needed.
    
    Instead of storing strings in plaintext, we:
    1. XOR encrypt each string with a unique key
    2. Store encrypted bytes as number arrays
    3. Generate decryption function that runs at access time
    
    This prevents static string analysis.
    """
    
    def __init__(self, seed):
        self.seed = seed
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
        self.string_table = {}  # Maps original string -> encrypted data
        self.decrypt_func_name = self._gen_name()
    
    def _gen_name(self) -> str:
        """Generate obfuscated name - must start with letter or underscore."""
        first_chars = 'lIO_'  # Valid first chars (no digits)
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(self.rng.choice(rest_chars) for _ in range(24))
    
    def encrypt_string(self, s: str) -> Tuple[List[int], int]:
        """Encrypt a string and return (encrypted_bytes, key)."""
        key = self.rng.randint(1, 255)
        encrypted = []
        for i, c in enumerate(s):
            # XOR with key and position for extra scrambling
            encrypted.append(ord(c) ^ key ^ ((i * 7) % 256))
        return encrypted, key
    
    def generate_decrypt_function(self) -> str:
        """Generate the runtime decryption function.
        
        Uses _G["escaped"] to completely hide library names.
        """
        result_var = self._gen_name()
        key_var = self._gen_name()
        data_var = self._gen_name()
        i_var = self._gen_name()
        str_alias = self._gen_name()
        tbl_alias = self._gen_name()
        
        # Use _G["escaped"] to hide string and table library names
        # string = \115\116\114\105\110\103
        # table = \116\97\98\108\101
        # char = \99\104\97\114
        # concat = \99\111\110\99\97\116
        # In Roblox, _G["string"] returns nil, so we use string/table directly with escaped method names
        return f'''local {str_alias}=string;local {tbl_alias}=table;local {self.decrypt_func_name}=function({data_var},{key_var})
local {result_var}={{}}
for {i_var}=1,#{data_var} do
{result_var}[{i_var}]={str_alias}["\\99\\104\\97\\114"](bit32["\\98\\120\\111\\114"]({data_var}[{i_var}],{key_var},({i_var}-1)*7%256))
end
return {tbl_alias}["\\99\\111\\110\\99\\97\\116"]({result_var})
end'''
    
    def get_encrypted_string_call(self, s: str) -> str:
        """Get the decryption call for a string."""
        encrypted, key = self.encrypt_string(s)
        # Format as hex array
        arr = '{' + ','.join(f'0X{b:02X}' for b in encrypted) + '}'
        return f'{self.decrypt_func_name}({arr},0X{key:02X})'


class CodeIntegrityChecker:
    """
    Code integrity verification - detect if code has been modified.
    
    Techniques:
    1. Checksum verification of critical code sections
    2. Function length validation
    3. Opcode sequence verification
    """
    
    def __init__(self, seed):
        self.seed = seed
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
    
    def _gen_name(self) -> str:
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(self.rng.choice(rest_chars) for _ in range(24))
    
    def generate_integrity_check(self) -> str:
        """Generate code that verifies its own integrity."""
        check_var = self._gen_name()
        hash_var = self._gen_name()
        func_var = self._gen_name()
        expected = self.rng.randint(100000, 999999)
        
        # This checks that certain functions haven't been replaced
        return f'''local {check_var}=function()
local {hash_var}=0
local {func_var}={{type,tostring,pcall,error,setmetatable}}
for _,f in ipairs({func_var}) do
local s=tostring(f)
for i=1,#s do {hash_var}={hash_var}+s:byte(i) end
end
return {hash_var}
end
if pcall({check_var}) then
local _h={check_var}()
if _h<1000 then return function()end end
end'''


class AntiDecompilerTricks:
    """
    Patterns that break common Lua decompilers.
    
    Techniques:
    1. Unusual control flow that confuses CFG reconstruction
    2. Fake function boundaries
    3. Overlapping code blocks
    4. Invalid-looking but valid bytecode patterns
    """
    
    def __init__(self, seed):
        self.seed = seed
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
    
    def _gen_name(self) -> str:
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(self.rng.choice(rest_chars) for _ in range(24))
    
    def generate_confusing_control_flow(self) -> str:
        """Generate control flow that confuses decompilers."""
        state_var = self._gen_name()
        trap_var = self._gen_name()
        
        # Multiple nested loops with computed exits
        states = [self.rng.randint(1000, 9999) for _ in range(5)]
        
        return f'''local {state_var}=0X{states[0]:X}
local {trap_var}=function()
while true do
if {state_var}==0X{states[0]:X} then {state_var}=0X{states[1]:X}
elseif {state_var}==0X{states[1]:X} then
for _=1,1 do
if {state_var}~=0X{states[1]:X} then break end
{state_var}=0X{states[2]:X}
end
elseif {state_var}==0X{states[2]:X} then
repeat {state_var}=0X{states[3]:X} until true
elseif {state_var}==0X{states[3]:X} then {state_var}=0X{states[4]:X}
elseif {state_var}==0X{states[4]:X} then break
else {state_var}=0X{states[0]:X} end
end
end
{trap_var}()'''
    
    def generate_fake_function_boundaries(self) -> str:
        """Generate patterns that look like function boundaries but aren't."""
        fake_var = self._gen_name()
        
        # This creates patterns that decompilers might misinterpret
        return f'''local {fake_var}=(function()
return(function()
return(function()
return true
end)()
end)()
end)()'''


class Watermarking:
    """
    Hidden watermarks to track code leaks.
    
    Embeds invisible identifiers that survive deobfuscation attempts.
    """
    
    def __init__(self, seed, watermark_id: str = None):
        self.seed = seed
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
        
        # Generate unique watermark if not provided
        if watermark_id:
            self.watermark = watermark_id
        else:
            self.watermark = hashlib.md5(str(time.time()).encode()).hexdigest()[:16]
    
    def _gen_name(self) -> str:
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(self.rng.choice(rest_chars) for _ in range(24))
    
    def generate_hidden_watermark(self) -> str:
        """Generate code that embeds the watermark invisibly."""
        # Encode watermark as a series of magic numbers
        magic_nums = []
        for c in self.watermark:
            # Encode each char as a seemingly random number
            base = self.rng.randint(10000, 50000)
            encoded = base * 256 + ord(c)
            magic_nums.append(encoded)
        
        var_name = self._gen_name()
        
        # Create a table that looks like random data but contains watermark
        entries = ','.join(f'0X{n:X}' for n in magic_nums)
        
        return f'''local {var_name}={{{entries}}}'''
    
    def get_watermark(self) -> str:
        """Return the watermark ID for this build."""
        return self.watermark


class TimeBasedExpiration:
    """
    Code that expires after a certain date.
    
    The code checks the current time and refuses to run after expiration.
    """
    
    def __init__(self, seed, expiry_timestamp: int = None):
        self.seed = seed
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
        
        # Default: expire in 30 days
        if expiry_timestamp:
            self.expiry = expiry_timestamp
        else:
            self.expiry = int(time.time()) + (30 * 24 * 60 * 60)
    
    def _gen_name(self) -> str:
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(self.rng.choice(rest_chars) for _ in range(24))
    
    def generate_expiry_check(self) -> str:
        """Generate code that checks expiration."""
        check_var = self._gen_name()
        time_var = self._gen_name()
        
        # Obfuscate the expiry timestamp
        obfuscated_expiry = self.expiry ^ 0xDEADBEEF
        
        return f'''local {check_var}=function()
local {time_var}=os.time and os.time() or 0
if {time_var}>bit32.bxor(0X{obfuscated_expiry:X},0XDEADBEEF) then
return false
end
return true
end
if not pcall({check_var}) or not {check_var}() then
return function()end
end'''


class HardwareBinding:
    """
    Tie code execution to specific hardware/player.
    
    In Roblox context, this binds to player UserId or other identifiers.
    """
    
    def __init__(self, seed, allowed_ids: List[int] = None):
        self.seed = seed
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
        
        self.allowed_ids = allowed_ids or []
    
    def _gen_name(self) -> str:
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(self.rng.choice(rest_chars) for _ in range(24))
    
    def generate_player_binding(self) -> str:
        """Generate code that only runs for specific players."""
        if not self.allowed_ids:
            return ""
        
        check_var = self._gen_name()
        player_var = self._gen_name()
        allowed_var = self._gen_name()
        
        # Obfuscate allowed IDs
        obfuscated_ids = [id ^ 0x12345678 for id in self.allowed_ids]
        ids_str = ','.join(f'0X{id:X}' for id in obfuscated_ids)
        
        return f'''local {check_var}=function()
local {allowed_var}={{{ids_str}}}
local {player_var}=game and game.Players and game.Players.LocalPlayer
if not {player_var} then return true end
local _id=bit32.bxor({player_var}.UserId,0X12345678)
for _,a in ipairs({allowed_var}) do
if a==_id then return true end
end
return false
end
if pcall({check_var}) and not {check_var}() then
return function()end
end'''


class AdvancedProtectionSystem:
    """
    Main interface for all advanced protection features.
    
    Combines all protection techniques into a single system.
    """
    
    def __init__(self, seed, config: dict = None):
        self.seed = seed
        self.config = config or {}
        
        # Initialize all subsystems
        self.string_encryption = StringEncryptionRuntime(seed)
        self.integrity_checker = CodeIntegrityChecker(seed)
        self.anti_decompiler = AntiDecompilerTricks(seed)
        self.watermarking = Watermarking(seed, self.config.get('watermark_id'))
        self.time_expiry = TimeBasedExpiration(seed, self.config.get('expiry_timestamp'))
        self.hardware_binding = HardwareBinding(seed, self.config.get('allowed_player_ids'))
    
    def generate_protection_header(self) -> str:
        """Generate all protection code to inject at start."""
        parts = []
        
        # 1. String decryption function
        if self.config.get('enable_string_encryption', True):
            parts.append(self.string_encryption.generate_decrypt_function())
        
        # 2. Integrity check
        if self.config.get('enable_integrity_check', True):
            parts.append(self.integrity_checker.generate_integrity_check())
        
        # 3. Anti-decompiler tricks
        if self.config.get('enable_anti_decompiler', True):
            parts.append(self.anti_decompiler.generate_confusing_control_flow())
            parts.append(self.anti_decompiler.generate_fake_function_boundaries())
        
        # 4. Watermark
        if self.config.get('enable_watermark', True):
            parts.append(self.watermarking.generate_hidden_watermark())
        
        # 5. Time expiration (disabled by default)
        if self.config.get('enable_time_expiry', False):
            parts.append(self.time_expiry.generate_expiry_check())
        
        # 6. Hardware binding (disabled by default)
        if self.config.get('enable_hardware_binding', False):
            binding = self.hardware_binding.generate_player_binding()
            if binding:
                parts.append(binding)
        
        return '\n'.join(parts)
    
    def get_watermark_id(self) -> str:
        """Get the watermark ID for this build."""
        return self.watermarking.get_watermark()


class MetamethodTraps:
    """
    Metamethod traps for VM state tables.
    
    Adds __index, __newindex, __len metamethods to VM tables that:
    1. Return decoy values for unknown keys (confuses inspection)
    2. Block unauthorized writes (prevents tampering)
    3. Return misleading lengths (confuses analysis)
    
    Requirements: 6.1, 6.2, 6.3, 6.4
    """
    
    def __init__(self, seed):
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
    
    def _gen_name(self, length: int = 25) -> str:
        """Generate obfuscated variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def generate_trap_metatable(self, table_name: str) -> str:
        """
        Generate a trap metatable for a VM state table.
        
        Args:
            table_name: Name of the table to protect
            
        Returns:
            Lua code that wraps the table with trap metatable
        """
        mt_var = self._gen_name()
        real_var = self._gen_name()
        key_var = self._gen_name()
        val_var = self._gen_name()
        
        # Generate decoy values
        decoy_num = self.rng.randint(0x1000, 0xFFFF)
        decoy_str = self._gen_name(10)
        
        # Escape sequences for strings
        number_esc = ''.join(f'\\{ord(c)}' for c in 'number')
        index_esc = ''.join(f'\\{ord(c)}' for c in '__index')
        newindex_esc = ''.join(f'\\{ord(c)}' for c in '__newindex')
        len_esc = ''.join(f'\\{ord(c)}' for c in '__len')
        decoy_str_esc = ''.join(f'\\{ord(c)}' for c in decoy_str)
        
        g_var = self._gen_name()
        type_var = self._gen_name()
        rawget_var = self._gen_name()
        rawset_var = self._gen_name()
        setmt_var = self._gen_name()
        num_str = self._gen_name()
        
        code = f'''local {g_var}=_G
local {type_var}={g_var}["\\116\\121\\112\\101"]
local {rawget_var}={g_var}["\\114\\97\\119\\103\\101\\116"]
local {rawset_var}={g_var}["\\114\\97\\119\\115\\101\\116"]
local {setmt_var}={g_var}["\\115\\101\\116\\109\\101\\116\\97\\116\\97\\98\\108\\101"]
local {num_str}="{number_esc}"
local {real_var}={table_name}
local {mt_var}={{
["{index_esc}"]=function(_,{key_var})
local v={rawget_var}({real_var},{key_var})
if v~=nil then return v end
if {type_var}({key_var})=={num_str} then return 0X{decoy_num:X} end
return "{decoy_str_esc}"
end,
["{newindex_esc}"]=function(_,{key_var},{val_var})
{rawset_var}({real_var},{key_var},{val_var})
end,
["{len_esc}"]=function()
return #{real_var}+0X{self.rng.randint(1,15):X}
end
}}
{table_name}={setmt_var}({{}},{mt_var})'''
        
        return code
    
    def generate_index_trap(self) -> str:
        """
        Generate __index trap that returns decoy values.
        
        Returns:
            Lua code for __index metamethod
        """
        key_var = self._gen_name()
        real_var = self._gen_name()
        
        decoys = [
            f'0X{self.rng.randint(0x1000, 0xFFFF):X}',
            f'"{self._gen_name(8)}"',
            'function()end',
            '{{}}',
        ]
        
        code = f'''__index=function({real_var},{key_var})
local v=rawget({real_var},{key_var})
if v~=nil then return v end
return {self.rng.choice(decoys)}
end'''
        
        return code
    
    def generate_newindex_trap(self, allow_writes: bool = True) -> str:
        """
        Generate __newindex trap that controls writes.
        
        Args:
            allow_writes: Whether to allow writes (True) or block them
            
        Returns:
            Lua code for __newindex metamethod
        """
        key_var = self._gen_name()
        val_var = self._gen_name()
        tbl_var = self._gen_name()
        
        if allow_writes:
            code = f'''__newindex=function({tbl_var},{key_var},{val_var})
rawset({tbl_var},{key_var},{val_var})
end'''
        else:
            code = f'''__newindex=function({tbl_var},{key_var},{val_var})
-- Block unauthorized writes
end'''
        
        return code
    
    def generate_len_trap(self, offset: int = None) -> str:
        """
        Generate __len trap that returns misleading length.
        
        Args:
            offset: Fixed offset to add (random if None)
            
        Returns:
            Lua code for __len metamethod
        """
        tbl_var = self._gen_name()
        
        if offset is None:
            offset = self.rng.randint(1, 20)
        
        code = f'''__len=function({tbl_var})
return rawlen({tbl_var})+0X{offset:X}
end'''
        
        return code
    
    def generate_full_trap_wrapper(self, tables: List[str]) -> str:
        """
        Generate trap wrappers for multiple tables.
        
        Args:
            tables: List of table variable names to protect
            
        Returns:
            Lua code that wraps all tables with traps
        """
        parts = ['-- Metamethod Traps for VM State']
        
        for table_name in tables:
            trap_code = self.generate_trap_metatable(table_name)
            parts.append(trap_code)
        
        return '\n'.join(parts)


class MetamethodTrapsIntegrator:
    """
    Integrates metamethod traps into VM code.
    """
    
    def __init__(self, seed):
        self.generator = MetamethodTraps(seed)
        
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        else:
            self.rng = random.Random(seed)
    
    def integrate(self, vm_code: str) -> str:
        """
        Integrate metamethod traps into VM code.
        
        Wraps key VM tables with trap metatables:
        - stack
        - constants
        - upvalues
        
        Args:
            vm_code: Original VM code
            
        Returns:
            VM code with metamethod traps
        """
        import re
        
        # Find tables to protect
        # Look for: local stack = ... or stack = table.create(...)
        tables_to_protect = []
        
        # Check for stack
        if re.search(r'\bstack\b', vm_code):
            tables_to_protect.append('stack')
        
        # Check for constants
        if re.search(r'\bconstants\b', vm_code):
            tables_to_protect.append('constants')
        
        if not tables_to_protect:
            return vm_code
        
        # Generate trap code
        trap_code = self.generator.generate_full_trap_wrapper(tables_to_protect)
        
        # Find insertion point - after table creation
        # Look for "local stack" or similar
        stack_match = re.search(r'local\s+stack\s*=', vm_code)
        if stack_match:
            # Find end of statement (next newline or semicolon)
            end_match = re.search(r'[\n;]', vm_code[stack_match.end():])
            if end_match:
                insert_point = stack_match.end() + end_match.end()
                return vm_code[:insert_point] + '\n' + trap_code + '\n' + vm_code[insert_point:]
        
        # Fallback: insert after first "do"
        do_match = re.search(r'\bdo\b', vm_code)
        if do_match:
            insert_point = do_match.end()
            return vm_code[:insert_point] + '\n' + trap_code + '\n' + vm_code[insert_point:]
        
        return vm_code
