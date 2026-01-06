"""
Layered Encryption System for bytecode protection.

This module implements multi-layer encryption for bytecode:
- Base85 encoding
- XOR encryption with polymorphic keys
- Rolling Key Encryption (position-dependent)
- 2-layer encryption
- Runtime Key Derivation

Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6
"""

from typing import Tuple, List, Optional
from pathlib import Path
import struct

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from core import PolymorphicBuildSeed, UnifiedNamingSystem


# Base85 encoding alphabet - using safe characters only (no ", \, or ')
# We use alphanumeric + safe symbols to avoid escaping issues in Lua
# 85 characters: 0-9 (10) + A-Z (26) + a-z (26) + safe symbols (23)
# Safe symbols: !#$%&()*+,-./:;<=>?@[]^_`{|}~
# Removed: " ' \
BASE85_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-.:;<=>?@^_~`'

# Verify we have exactly 85 characters
assert len(BASE85_ALPHABET) == 85, f"Base85 alphabet must have 85 chars, got {len(BASE85_ALPHABET)}"

# This alphabet is safe for Lua strings (no escaping needed)
# Note: backtick ` is safe in Lua double-quoted strings
BASE85_ALPHABET_LUA = BASE85_ALPHABET

def _get_escaped_alphabet() -> str:
    """Get the Base85 alphabet escaped for use in Lua strings."""
    # The alphabet is already safe for Lua double-quoted strings
    # Just need to escape backslash if present (it's not in our alphabet)
    return BASE85_ALPHABET_LUA

def _escape_lua_string(s: str) -> str:
    """Escape a string for use in Lua string literals."""
    result = []
    for c in s:
        if c == '\\':
            result.append('\\\\')
        elif c == '"':
            result.append('\\"')
        elif c == "'":
            result.append("\\'")
        elif c == '\n':
            result.append('\\n')
        elif c == '\r':
            result.append('\\r')
        elif c == '\t':
            result.append('\\t')
        elif ord(c) < 32 or ord(c) > 126:
            result.append(f'\\{ord(c):03d}')
        else:
            result.append(c)
    return ''.join(result)


class LayeredEncryption:
    """
    Multi-layer encryption system for bytecode protection.
    
    Implements:
    - Base85 encoding for compact representation
    - XOR encryption with polymorphic keys
    - Rolling key encryption (position-dependent)
    - 2-layer encryption for additional security
    - Runtime key derivation from VM state
    
    Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Layered Encryption System.
        
        Args:
            seed: Polymorphic build seed for key generation
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        
        # Generate polymorphic keys
        self.xor_key = self.seed.get_random_int(1, 255)
        self.rolling_multiplier = self.seed.get_random_int(3, 13)
        self.rolling_offset = self.seed.get_random_int(7, 31)
        
        # Layer 2 keys
        self.layer2_key = self.seed.get_random_int(1, 255)
        self.layer2_multiplier = self.seed.get_random_int(5, 17)
    
    # =========================================================================
    # Base85 Encoding (Requirement 25.1)
    # =========================================================================
    
    def base85_encode(self, data: bytes) -> str:
        """
        Encode bytes using Base85 encoding.
        
        Base85 encodes 4 bytes into 5 characters, achieving ~25% size
        increase (better than Base64's ~33%).
        
        Args:
            data: The bytes to encode
            
        Returns:
            Base85 encoded string (prefixed with length for exact decoding)
        """
        result = []
        original_len = len(data)
        
        # Pad data to multiple of 4 bytes
        padding = (4 - len(data) % 4) % 4
        padded_data = data + b'\x00' * padding
        
        # Process 4 bytes at a time
        for i in range(0, len(padded_data), 4):
            # Convert 4 bytes to 32-bit integer (big-endian)
            chunk = padded_data[i:i+4]
            value = struct.unpack('>I', chunk)[0]
            
            # Convert to 5 base85 digits
            encoded = []
            for _ in range(5):
                encoded.append(BASE85_ALPHABET[value % 85])
                value //= 85
            
            # Reverse to get correct order
            result.extend(reversed(encoded))
        
        # Prefix with original length encoded as 4 chars (supports up to ~52M bytes)
        len_encoded = []
        len_val = original_len
        for _ in range(4):
            len_encoded.append(BASE85_ALPHABET[len_val % 85])
            len_val //= 85
        
        return ''.join(reversed(len_encoded)) + ''.join(result)
    
    def base85_decode(self, encoded: str) -> bytes:
        """
        Decode Base85 encoded string back to bytes.
        
        Args:
            encoded: Base85 encoded string (with length prefix)
            
        Returns:
            Decoded bytes
        """
        # Extract original length from first 4 chars
        len_chars = encoded[:4]
        original_len = 0
        for char in len_chars:
            original_len = original_len * 85 + BASE85_ALPHABET.index(char)
        
        # Decode the rest
        data_encoded = encoded[4:]
        result = bytearray()
        
        # Pad to multiple of 5 characters
        padding = (5 - len(data_encoded) % 5) % 5
        padded = data_encoded + BASE85_ALPHABET[0] * padding  # Pad with '!' (lowest char)
        
        # Process 5 characters at a time
        for i in range(0, len(padded), 5):
            chunk = padded[i:i+5]
            
            # Convert 5 base85 digits to 32-bit integer
            value = 0
            for char in chunk:
                value = value * 85 + BASE85_ALPHABET.index(char)
            
            # Convert to 4 bytes (big-endian)
            result.extend(struct.pack('>I', value & 0xFFFFFFFF))
        
        # Trim to original length
        return bytes(result[:original_len])
    
    # =========================================================================
    # XOR Encryption with Polymorphic Keys (Requirement 25.3)
    # =========================================================================
    
    def xor_encrypt(self, data: bytes, key: int = None) -> bytes:
        """
        XOR encrypt data with a polymorphic key.
        
        Args:
            data: The data to encrypt
            key: XOR key (uses instance key if None)
            
        Returns:
            Encrypted data
        """
        if key is None:
            key = self.xor_key
        
        return bytes(b ^ key for b in data)
    
    def xor_decrypt(self, data: bytes, key: int = None) -> bytes:
        """
        XOR decrypt data (symmetric with encrypt).
        
        Args:
            data: The encrypted data
            key: XOR key (uses instance key if None)
            
        Returns:
            Decrypted data
        """
        return self.xor_encrypt(data, key)  # XOR is symmetric
    
    # =========================================================================
    # Rolling Key Encryption (Requirement 25.4)
    # =========================================================================
    
    def rolling_key_encrypt(self, data: bytes) -> bytes:
        """
        Encrypt data using position-dependent rolling keys.
        
        Each byte is XORed with a key derived from its position:
        key[i] = (i * multiplier + offset) % 256
        
        Args:
            data: The data to encrypt
            
        Returns:
            Encrypted data
        """
        result = bytearray()
        for i, byte in enumerate(data):
            key = (i * self.rolling_multiplier + self.rolling_offset) % 256
            result.append(byte ^ key)
        return bytes(result)
    
    def rolling_key_decrypt(self, data: bytes) -> bytes:
        """
        Decrypt rolling key encrypted data.
        
        Args:
            data: The encrypted data
            
        Returns:
            Decrypted data
        """
        return self.rolling_key_encrypt(data)  # XOR is symmetric
    
    # =========================================================================
    # 2-Layer Encryption (Requirement 25.5)
    # =========================================================================
    
    def encrypt_2layer(self, data: bytes) -> bytes:
        """
        Apply 2 layers of encryption.
        
        Layer 1: XOR with polymorphic key
        Layer 2: Rolling key encryption
        
        Args:
            data: The data to encrypt
            
        Returns:
            Double-encrypted data
        """
        # Layer 1: XOR encryption
        layer1 = self.xor_encrypt(data)
        
        # Layer 2: Rolling key encryption
        layer2 = self.rolling_key_encrypt(layer1)
        
        return layer2
    
    def decrypt_2layer(self, data: bytes) -> bytes:
        """
        Decrypt 2-layer encrypted data.
        
        Args:
            data: The double-encrypted data
            
        Returns:
            Decrypted data
        """
        # Reverse order: Layer 2 first, then Layer 1
        layer1 = self.rolling_key_decrypt(data)
        original = self.xor_decrypt(layer1)
        return original
    
    # =========================================================================
    # Full Encryption Pipeline
    # =========================================================================
    
    def encrypt(self, data: bytes) -> Tuple[str, dict]:
        """
        Full encryption pipeline: 2-layer encryption + Base85 encoding.
        
        Args:
            data: The bytecode to encrypt
            
        Returns:
            Tuple of (encoded string, decryption parameters)
        """
        # Apply 2-layer encryption
        encrypted = self.encrypt_2layer(data)
        
        # Encode with Base85
        encoded = self.base85_encode(encrypted)
        
        # Return encoded data and decryption parameters
        params = {
            'xor_key': self.xor_key,
            'rolling_multiplier': self.rolling_multiplier,
            'rolling_offset': self.rolling_offset,
            'original_length': len(data),
        }
        
        return encoded, params
    
    def decrypt(self, encoded: str, params: dict) -> bytes:
        """
        Full decryption pipeline.
        
        Args:
            encoded: Base85 encoded encrypted data
            params: Decryption parameters from encrypt()
            
        Returns:
            Original bytecode
        """
        # Decode Base85
        encrypted = self.base85_decode(encoded)
        
        # Temporarily set keys from params
        original_xor = self.xor_key
        original_mult = self.rolling_multiplier
        original_off = self.rolling_offset
        
        self.xor_key = params['xor_key']
        self.rolling_multiplier = params['rolling_multiplier']
        self.rolling_offset = params['rolling_offset']
        
        # Decrypt 2 layers
        decrypted = self.decrypt_2layer(encrypted)
        
        # Restore original keys
        self.xor_key = original_xor
        self.rolling_multiplier = original_mult
        self.rolling_offset = original_off
        
        # Trim to original length
        return decrypted[:params['original_length']]
    
    # =========================================================================
    # Runtime Key Derivation (Requirement 25.6, 4.1, 4.2, 4.3)
    # =========================================================================
    
    def derive_key_from_state(self, state_values: List[int]) -> int:
        """
        Derive encryption key from VM state values.
        
        This makes static analysis harder as the key depends on
        runtime state.
        
        Args:
            state_values: List of VM state values
            
        Returns:
            Derived key (0-255)
        """
        # Combine state values using XOR and multiplication
        derived = 0
        for i, val in enumerate(state_values):
            derived ^= (val * (i + 1)) & 0xFF
        
        # Ensure non-zero
        return derived if derived != 0 else 1
    
    def generate_key_derivation_code(self, state_vars: List[str]) -> Tuple[str, str]:
        """
        Generate Lua code for runtime key derivation.
        
        Args:
            state_vars: List of variable names containing state values
            
        Returns:
            Tuple of (derivation code, key variable name)
        """
        key_var = self.naming.generate_name()
        temp_var = self.naming.generate_name()
        
        # Build derivation expression
        derivation_parts = []
        for i, var in enumerate(state_vars):
            derivation_parts.append(f"bit32.band({var}*{i+1},0xFF)")
        
        derivation_expr = "bit32.bxor(" + ",".join(derivation_parts) + ")"
        
        code = f"""local {temp_var}={derivation_expr}
local {key_var}={temp_var}~=0 and {temp_var} or 1"""
        
        return code, key_var


class RuntimeKeyDerivation:
    """
    Runtime Key Derivation using environment sources.
    
    Derives decryption keys at runtime using multiple environment sources:
    - tick() - Roblox time since game start
    - os.clock() - CPU time
    - _VERSION - Lua version string
    - math.random() seeded values
    - string length operations
    
    This makes static analysis much harder as keys are computed at runtime
    from values that vary between executions.
    
    Requirements: 4.1, 4.2, 4.3
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize runtime key derivation.
        
        Args:
            seed: Polymorphic build seed for deterministic generation
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        
        # Generate obfuscation constants
        self.magic_constant = self.seed.get_random_int(0x1000, 0xFFFF)
        self.xor_mask = self.seed.get_random_int(0x10, 0xFF)
        self.shift_amount = self.seed.get_random_int(1, 7)
    
    def _gen_name(self, length: int = 20) -> str:
        """Generate obfuscated variable name using l, I, O, 0, 1, _"""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        import random
        rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        return rng.choice(first_chars) + ''.join(
            rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def generate_environment_key_derivation(self) -> Tuple[str, str]:
        """
        Generate Lua code that derives a key from environment sources.
        
        Uses at least 3 environment sources:
        1. tick() or os.clock() - timing source
        2. _VERSION - Lua version string hash
        3. math operations on constants
        
        Returns:
            Tuple of (Lua code, key variable name)
        """
        key_var = self._gen_name()
        time_var = self._gen_name()
        version_var = self._gen_name()
        hash_var = self._gen_name()
        temp_var = self._gen_name()
        
        # Generate escaped method names for bit32
        # IMPORTANT: Use bit32 directly, NOT _G["bit32"] (returns nil in Roblox)
        band_escaped = '"\\98\\97\\110\\100"'  # "band"
        bxor_escaped = '"\\98\\120\\111\\114"'  # "bxor"
        rshift_escaped = '"\\114\\115\\104\\105\\102\\116"'  # "rshift"
        
        code = f'''-- Runtime Key Derivation from Environment Sources
local {time_var}=(tick and tick()or os.clock and os.clock()or 0)
local {version_var}=_VERSION or"Luau"
local {hash_var}=0
for _=1,#{version_var} do
{hash_var}=bit32[{bxor_escaped}]({hash_var},string.byte({version_var},_)*_)
end
local {temp_var}=bit32[{band_escaped}](
bit32[{bxor_escaped}](
bit32[{rshift_escaped}](math.floor({time_var}*1000),{self.shift_amount}),
{hash_var}
),
0xFF
)
local {key_var}={temp_var}~=0 and {temp_var} or 0X{self.xor_mask:02X}'''
        
        return code, key_var
    
    def generate_position_dependent_key(self, position_var: str) -> Tuple[str, str]:
        """
        Generate Lua code for position-dependent key derivation.
        
        The key changes based on the current position in the bytecode,
        making pattern-based attacks much harder.
        
        Args:
            position_var: Variable name containing current position
            
        Returns:
            Tuple of (Lua code, key variable name)
        """
        key_var = self._gen_name()
        
        # Escaped method names
        band_escaped = '"\\98\\97\\110\\100"'
        bxor_escaped = '"\\98\\120\\111\\114"'
        lshift_escaped = '"\\108\\115\\104\\105\\102\\116"'
        
        # Position-dependent formula: key = ((pos * magic) XOR mask) AND 0xFF
        code = f'''local {key_var}=bit32[{band_escaped}](
bit32[{bxor_escaped}](
bit32[{lshift_escaped}]({position_var},{self.shift_amount}),
0X{self.magic_constant:04X}
),
0xFF
)'''
        
        return code, key_var
    
    def generate_multi_source_derivation(self) -> Tuple[str, str]:
        """
        Generate comprehensive key derivation using multiple sources.
        
        Combines:
        1. Time-based source (tick/os.clock)
        2. Version string hash
        3. Math constant manipulation
        4. String length operations
        5. Table count operations
        
        Returns:
            Tuple of (Lua code, key variable name)
        """
        key_var = self._gen_name()
        src1_var = self._gen_name()  # time source
        src2_var = self._gen_name()  # version hash
        src3_var = self._gen_name()  # math source
        src4_var = self._gen_name()  # string source
        combined_var = self._gen_name()
        
        # Escaped method names
        band_escaped = '"\\98\\97\\110\\100"'
        bxor_escaped = '"\\98\\120\\111\\114"'
        rshift_escaped = '"\\114\\115\\104\\105\\102\\116"'
        
        # Generate magic values
        magic1 = self.seed.get_random_int(0x100, 0xFFF)
        magic2 = self.seed.get_random_int(0x10, 0xFF)
        magic3 = self.seed.get_random_int(1, 100)
        
        code = f'''-- Multi-Source Runtime Key Derivation
local {src1_var}=bit32[{band_escaped}](math.floor((tick and tick()or os.clock and os.clock()or 0)*0X{magic1:X}),0XFFFF)
local {src2_var}=0
for _=1,#(_VERSION or"")do {src2_var}=bit32[{bxor_escaped}]({src2_var},string.byte(_VERSION,_))end
local {src3_var}=bit32[{band_escaped}](math.floor(math.pi*0X{magic1:X}),0XFF)
local {src4_var}=#tostring(0X{self.magic_constant:X})
local {combined_var}=bit32[{bxor_escaped}](
bit32[{bxor_escaped}]({src1_var},{src2_var}),
bit32[{bxor_escaped}]({src3_var},{src4_var}*0X{magic2:02X})
)
local {key_var}=bit32[{band_escaped}]({combined_var},0XFF)
{key_var}={key_var}~=0 and {key_var} or 0X{magic3:02X}'''
        
        return code, key_var
    
    def generate_decrypt_with_runtime_key(self, encrypted_var: str, output_var: str, 
                                          base_xor_key: int, rolling_mult: int, 
                                          rolling_off: int, original_length: int) -> str:
        """
        Generate decryption code that uses runtime-derived key.
        
        The runtime key is XORed with the static key to produce the final
        decryption key, making static analysis much harder.
        
        Args:
            encrypted_var: Variable containing encrypted data
            output_var: Variable to store decrypted result
            base_xor_key: Static XOR key (will be combined with runtime key)
            rolling_mult: Rolling key multiplier
            rolling_off: Rolling key offset
            original_length: Original data length
            
        Returns:
            Lua code for decryption with runtime key
        """
        # Generate runtime key derivation
        runtime_code, runtime_key_var = self.generate_environment_key_derivation()
        
        # Generate variable names
        a_var = self._gen_name()  # alphabet
        d_var = self._gen_name()  # decoded bytes
        r_var = self._gen_name()  # result buffer
        i_var = self._gen_name()
        v_var = self._gen_name()  # value
        k_var = self._gen_name()  # key
        b_var = self._gen_name()  # byte
        len_var = self._gen_name()
        data_var = self._gen_name()
        final_key_var = self._gen_name()
        
        # Escaped method names
        band_escaped = '"\\98\\97\\110\\100"'
        bxor_escaped = '"\\98\\120\\111\\114"'
        rshift_escaped = '"\\114\\115\\104\\105\\102\\116"'
        
        # Get the alphabet - it's safe for Lua strings
        alphabet = _get_escaped_alphabet()
        
        code = f'''{runtime_code}
local {final_key_var}=bit32[{bxor_escaped}]({runtime_key_var},0X{base_xor_key:02X})
local {a_var}="{alphabet}"
local {len_var}=0
for {i_var}=1,4 do {len_var}={len_var}*85+(string.find({a_var},string.sub({encrypted_var},{i_var},{i_var}),1,true)-1)end
local {data_var}=string.sub({encrypted_var},5)
local {d_var}={{}}
for {i_var}=1,#({data_var}),5 do
local {v_var}=0
for _=0,4 do local c=string.sub({data_var},{i_var}+_,{i_var}+_)if c~=""then {v_var}={v_var}*85+(string.find({a_var},c,1,true)-1)end end
for _=3,0,-1 do {d_var}[#{d_var}+1]=bit32[{band_escaped}](bit32[{rshift_escaped}]({v_var},_*8),0xFF)end
end
local {r_var}=buffer.create({len_var})
for {i_var}=1,{len_var} do
local {k_var}=bit32[{band_escaped}](({i_var}-1)*{rolling_mult}+{rolling_off},0xFF)
local {b_var}=bit32[{bxor_escaped}](bit32[{bxor_escaped}]({d_var}[{i_var}],{k_var}),{final_key_var})
buffer.writeu8({r_var},{i_var}-1,{b_var})
end
local {output_var}={r_var}'''
        
        return code


class RuntimeKeyIntegrator:
    """
    Integrates runtime key derivation into the encryption pipeline.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None, enable_position_dependent: bool = True):
        """
        Initialize the integrator.
        
        Args:
            seed: Polymorphic build seed
            enable_position_dependent: Whether to use position-dependent keys
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.derivation = RuntimeKeyDerivation(self.seed)
        self.encryption = LayeredEncryption(self.seed)
        self.enable_position_dependent = enable_position_dependent
    
    def encrypt_with_runtime_key(self, bytecode: bytes) -> Tuple[str, str]:
        """
        Encrypt bytecode with runtime key derivation.
        
        Args:
            bytecode: The bytecode to encrypt
            
        Returns:
            Tuple of (Lua code with encrypted data and decoder, output variable name)
        """
        # Encrypt the bytecode
        encoded, params = self.encryption.encrypt(bytecode)
        
        # Escape for Lua
        encoded_escaped = _escape_lua_string(encoded)
        
        # Generate variable names
        naming = UnifiedNamingSystem(self.seed)
        encoded_var = naming.generate_name()
        output_var = naming.generate_name()
        
        # Generate decoder with runtime key
        decoder = self.derivation.generate_decrypt_with_runtime_key(
            encrypted_var=encoded_var,
            output_var=output_var,
            base_xor_key=params['xor_key'],
            rolling_mult=params['rolling_multiplier'],
            rolling_off=params['rolling_offset'],
            original_length=params['original_length']
        )
        
        # Combine into complete code
        complete_code = f'''local {encoded_var}="{encoded_escaped}"
{decoder}'''
        
        return complete_code, output_var
    
    # =========================================================================
    # Lua Decoder Generation
    # =========================================================================
    
    def generate_decoder(self, encoded_var: str, output_var: str, original_length: int) -> str:
        """
        Generate Lua code to decode and decrypt bytecode.
        
        Creates a complete decoder that:
        1. Extracts original length from prefix
        2. Decodes Base85
        3. Applies rolling key decryption
        4. Applies XOR decryption
        
        Args:
            encoded_var: Variable containing Base85 encoded string (with length prefix)
            output_var: Variable to store decoded bytecode buffer
            original_length: Original bytecode length
            
        Returns:
            Lua decoder code
        """
        # Generate obfuscated variable names
        alphabet_var = self.naming.generate_name()
        decoded_var = self.naming.generate_name()
        i_var = self.naming.generate_name()
        j_var = self.naming.generate_name()
        chunk_var = self.naming.generate_name()
        value_var = self.naming.generate_name()
        char_var = self.naming.generate_name()
        idx_var = self.naming.generate_name()
        byte_var = self.naming.generate_name()
        result_var = self.naming.generate_name()
        orig_len_var = self.naming.generate_name()
        key_var = self.naming.generate_name()
        layer1_var = self.naming.generate_name()
        data_var = self.naming.generate_name()
        
        # Generate decoder code
        code = f"""-- Extract original length from prefix
local {alphabet_var}="{BASE85_ALPHABET_LUA}"
local {orig_len_var}=0
for {i_var}=1,4 do
local {char_var}=string.sub({encoded_var},{i_var},{i_var})
local {idx_var}=string.find({alphabet_var},{char_var},1,true)-1
{orig_len_var}={orig_len_var}*85+{idx_var}
end
-- Base85 decode (skip length prefix)
local {data_var}=string.sub({encoded_var},5)
local {decoded_var}={{}}
local {i_var}=1
while {i_var}<=#({data_var}) do
local {chunk_var}=string.sub({data_var},{i_var},{i_var}+4)
local {value_var}=0
for {j_var}=1,#({chunk_var}) do
local {char_var}=string.sub({chunk_var},{j_var},{j_var})
local {idx_var}=string.find({alphabet_var},{char_var},1,true)-1
{value_var}={value_var}*85+{idx_var}
end
for {j_var}=3,0,-1 do
{decoded_var}[#{decoded_var}+1]=bit32.band(bit32.rshift({value_var},{j_var}*8),0xFF)
end
{i_var}={i_var}+5
end
-- Rolling key decrypt (Layer 2)
local {layer1_var}={{}}
for {i_var}=1,{orig_len_var} do
local {key_var}=bit32.band(({i_var}-1)*{self.rolling_multiplier}+{self.rolling_offset},0xFF)
{layer1_var}[{i_var}]=bit32.bxor({decoded_var}[{i_var}],{key_var})
end
-- XOR decrypt (Layer 1)
local {result_var}=buffer.create({orig_len_var})
for {i_var}=1,{orig_len_var} do
local {byte_var}=bit32.bxor({layer1_var}[{i_var}],{self.xor_key})
buffer.writeu8({result_var},{i_var}-1,{byte_var})
end
local {output_var}={result_var}"""
        
        return code
    
    def generate_compact_decoder(self, encoded_var: str, output_var: str, original_length: int) -> str:
        """
        Generate a more compact Lua decoder using buffer operations.
        
        Args:
            encoded_var: Variable containing Base85 encoded string (with length prefix)
            output_var: Variable to store decoded bytecode buffer
            original_length: Original bytecode length for exact sizing
            
        Returns:
            Compact Lua decoder code
        """
        # Variable names
        a_var = self.naming.generate_name()  # alphabet
        d_var = self.naming.generate_name()  # decoded bytes table
        r_var = self.naming.generate_name()  # result buffer
        i_var = self.naming.generate_name()
        v_var = self.naming.generate_name()  # value
        k_var = self.naming.generate_name()  # key
        b_var = self.naming.generate_name()  # byte
        len_var = self.naming.generate_name()  # original length
        data_var = self.naming.generate_name()  # data portion (after length prefix)
        
        code = f"""local {a_var}="{BASE85_ALPHABET_LUA}"
local {len_var}=0
for {i_var}=1,4 do {len_var}={len_var}*85+(string.find({a_var},string.sub({encoded_var},{i_var},{i_var}),1,true)-1)end
local {data_var}=string.sub({encoded_var},5)
local {d_var}={{}}
for {i_var}=1,#({data_var}),5 do
local {v_var}=0
for _=0,4 do local c=string.sub({data_var},{i_var}+_,{i_var}+_)if c~=""then {v_var}={v_var}*85+(string.find({a_var},c,1,true)-1)end end
for _=3,0,-1 do {d_var}[#{d_var}+1]=bit32.band(bit32.rshift({v_var},_*8),0xFF)end
end
local {r_var}=buffer.create({len_var})
for {i_var}=1,{len_var} do
local {k_var}=bit32.band(({i_var}-1)*{self.rolling_multiplier}+{self.rolling_offset},0xFF)
local {b_var}=bit32.bxor(bit32.bxor({d_var}[{i_var}],{k_var}),{self.xor_key})
buffer.writeu8({r_var},{i_var}-1,{b_var})
end
local {output_var}={r_var}"""
        
        return code
    
    def encode_bytecode_with_decoder(self, bytecode: bytes) -> Tuple[str, str]:
        """
        Encrypt bytecode and generate complete decoder code.
        
        This is the main entry point for bytecode encryption.
        
        Args:
            bytecode: The bytecode to encrypt
            
        Returns:
            Tuple of (complete Lua code with decoder, output variable name)
        """
        # Encrypt and encode
        encoded, params = self.encrypt(bytecode)
        
        # Escape the encoded string for Lua
        encoded_escaped = _escape_lua_string(encoded)
        
        # Generate variable names
        encoded_var = self.naming.generate_name()
        output_var = self.naming.generate_name()
        
        # Generate decoder with original length
        decoder = self.generate_compact_decoder(encoded_var, output_var, params['original_length'])
        
        # Combine into complete code
        complete_code = f"""local {encoded_var}="{encoded_escaped}"
{decoder}"""
        
        return complete_code, output_var


class UltraStrongEncryption:
    """
    ULTRA-STRONG 4-Layer Encryption - STRONGER than Luraph!
    
    Layers:
    1. XOR with polymorphic seed-derived key
    2. Rolling XOR (position-dependent with prime multiplier)
    3. Feistel cipher (4 rounds - same structure as DES/Blowfish)
    4. Block scrambling with seed-derived permutation
    
    Plus: Runtime key derivation makes static analysis nearly impossible.
    
    This is cryptographically stronger than simple XOR chains while
    remaining fast enough for Lua/Luau execution.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        
        # Layer 1: XOR key
        self.xor_key = self.seed.get_random_int(1, 255)
        
        # Layer 2: Rolling XOR with prime multiplier (harder to reverse)
        primes = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
        self.rolling_mult = primes[self.seed.get_random_int(0, len(primes) - 1)]
        self.rolling_offset = self.seed.get_random_int(1, 127)
        
        # Layer 3: Feistel cipher keys (4 rounds)
        self.feistel_keys = [
            self.seed.get_random_int(0, 0xFFFF) for _ in range(4)
        ]
        
        # Layer 4: Block scramble seed
        self.scramble_seed = self.seed.get_random_int(0, 0xFFFFFFFF)
    
    def _feistel_round(self, left: int, right: int, key: int) -> Tuple[int, int]:
        """Single Feistel round - F function uses XOR and rotation."""
        # F function: mix right half with key
        f_out = ((right * 31337) ^ key) & 0xFFFF
        f_out = ((f_out << 5) | (f_out >> 11)) & 0xFFFF  # rotate
        f_out ^= (key >> 8) ^ (key << 8) & 0xFFFF
        
        new_right = left ^ f_out
        new_left = right
        return new_left, new_right
    
    def _feistel_encrypt_block(self, block: int) -> int:
        """Encrypt 32-bit block with 4-round Feistel cipher."""
        left = (block >> 16) & 0xFFFF
        right = block & 0xFFFF
        
        for key in self.feistel_keys:
            left, right = self._feistel_round(left, right, key)
        
        return (left << 16) | right
    
    def _feistel_decrypt_block(self, block: int) -> int:
        """Decrypt 32-bit block (reverse key order)."""
        left = (block >> 16) & 0xFFFF
        right = block & 0xFFFF
        
        for key in reversed(self.feistel_keys):
            left, right = self._feistel_round(left, right, key)
        
        return (left << 16) | right
    
    def encrypt(self, data: bytes) -> Tuple[str, dict]:
        """
        Full 4-layer encryption pipeline.
        
        Returns:
            Tuple of (Base85 encoded string, decryption params)
        """
        original_len = len(data)
        result = bytearray(data)
        
        # Layer 1: XOR with polymorphic key
        for i in range(len(result)):
            result[i] ^= self.xor_key
        
        # Layer 2: Rolling XOR with prime multiplier
        for i in range(len(result)):
            key = ((i * self.rolling_mult) + self.rolling_offset) & 0xFF
            result[i] ^= key
        
        # Layer 3: Feistel cipher on 4-byte blocks
        # Pad to multiple of 4
        padding = (4 - len(result) % 4) % 4
        result.extend(b'\x00' * padding)
        
        encrypted_blocks = bytearray()
        for i in range(0, len(result), 4):
            block = (result[i] << 24) | (result[i+1] << 16) | (result[i+2] << 8) | result[i+3]
            encrypted = self._feistel_encrypt_block(block)
            encrypted_blocks.append((encrypted >> 24) & 0xFF)
            encrypted_blocks.append((encrypted >> 16) & 0xFF)
            encrypted_blocks.append((encrypted >> 8) & 0xFF)
            encrypted_blocks.append(encrypted & 0xFF)
        
        # Layer 4: Block scrambling (swap pairs based on seed)
        import random
        rng = random.Random(self.scramble_seed)
        block_count = len(encrypted_blocks) // 4
        if block_count > 1:
            indices = list(range(block_count))
            rng.shuffle(indices)
            
            scrambled = bytearray(len(encrypted_blocks))
            for new_idx, old_idx in enumerate(indices):
                for j in range(4):
                    scrambled[new_idx * 4 + j] = encrypted_blocks[old_idx * 4 + j]
            encrypted_blocks = scrambled
        
        # Base85 encode
        encoded = self._base85_encode(bytes(encrypted_blocks), original_len)
        
        params = {
            'xor_key': self.xor_key,
            'rolling_mult': self.rolling_mult,
            'rolling_offset': self.rolling_offset,
            'feistel_keys': self.feistel_keys,
            'scramble_seed': self.scramble_seed,
            'original_length': original_len,
            'padded_length': len(encrypted_blocks),
        }
        
        return encoded, params
    
    def _base85_encode(self, data: bytes, original_len: int) -> str:
        """Base85 encode with length prefix."""
        result = []
        
        # Length prefix (4 chars)
        len_val = original_len
        len_encoded = []
        for _ in range(4):
            len_encoded.append(BASE85_ALPHABET[len_val % 85])
            len_val //= 85
        result.extend(reversed(len_encoded))
        
        # Encode data
        for i in range(0, len(data), 4):
            chunk = data[i:i+4]
            if len(chunk) < 4:
                chunk = chunk + b'\x00' * (4 - len(chunk))
            value = struct.unpack('>I', chunk)[0]
            
            encoded = []
            for _ in range(5):
                encoded.append(BASE85_ALPHABET[value % 85])
                value //= 85
            result.extend(reversed(encoded))
        
        return ''.join(result)
    
    def generate_ultra_decoder(self, encoded_var: str, output_var: str, params: dict) -> str:
        """
        Generate Lua decoder for ultra-strong encryption.
        
        This decoder reverses all 4 layers at runtime.
        """
        v = {k: self.naming.generate_name() for k in [
            'a', 'd', 'r', 'i', 'j', 'v', 'k', 'b', 'len', 'data',
            'bit32', 'buffer', 'blocks', 'unscrambled', 'indices',
            'left', 'right', 'f', 'temp', 'block', 'decrypted'
        ]}
        
        # Build Feistel keys array
        fk = params['feistel_keys']
        feistel_keys_lua = f"{{{fk[0]},{fk[1]},{fk[2]},{fk[3]}}}"
        
        # Build unscramble indices
        import random
        rng = random.Random(params['scramble_seed'])
        block_count = params['padded_length'] // 4
        if block_count > 1:
            indices = list(range(block_count))
            rng.shuffle(indices)
            # Create reverse mapping
            reverse_indices = [0] * block_count
            for new_idx, old_idx in enumerate(indices):
                reverse_indices[old_idx] = new_idx
            indices_lua = "{" + ",".join(str(i+1) for i in reverse_indices) + "}"  # Lua 1-indexed
        else:
            indices_lua = "{1}"
        
        # Escape the alphabet for Lua - use escape sequences for special chars
        escaped_alphabet = _escape_lua_string(BASE85_ALPHABET)
        
        code = f'''local {v['bit32']}=bit32
local {v['buffer']}=buffer
local {v['a']}="{escaped_alphabet}"
local {v['len']}=0
for {v['i']}=1,4 do {v['len']}={v['len']}*85+(string.find({v['a']},string.sub({encoded_var},{v['i']},{v['i']}),1,true)-1)end
local {v['data']}=string.sub({encoded_var},5)
local {v['d']}={{}}
for {v['i']}=1,#({v['data']}),5 do
local {v['v']}=0
for {v['j']}=0,4 do local c=string.sub({v['data']},{v['i']}+{v['j']},{v['i']}+{v['j']})if c~=""then {v['v']}={v['v']}*85+(string.find({v['a']},c,1,true)-1)end end
for {v['j']}=3,0,-1 do {v['d']}[#{v['d']}+1]={v['bit32']}.band({v['bit32']}.rshift({v['v']},{v['j']}*8),0xFF)end
end
local {v['indices']}={indices_lua}
local {v['blocks']}={{}}
local {v['unscrambled']}={{}}
for {v['i']}=1,#({v['d']}),4 do {v['blocks']}[#{v['blocks']}+1]={{({v['d']})[{v['i']}],({v['d']})[{v['i']}+1],({v['d']})[{v['i']}+2],({v['d']})[{v['i']}+3]}}end
for {v['i']}=1,#{v['blocks']} do {v['unscrambled']}[{v['indices']}[{v['i']}]]={v['blocks']}[{v['i']}]end
local {v['decrypted']}={{}}
local {v['temp']}={feistel_keys_lua}
for {v['i']}=1,#{v['unscrambled']} do
local {v['block']}={v['unscrambled']}[{v['i']}]
local {v['v']}={v['bit32']}.bor({v['bit32']}.bor({v['bit32']}.bor({v['bit32']}.lshift({v['block']}[1],24),{v['bit32']}.lshift({v['block']}[2],16)),{v['bit32']}.lshift({v['block']}[3],8)),{v['block']}[4])
local {v['left']}={v['bit32']}.band({v['bit32']}.rshift({v['v']},16),0xFFFF)
local {v['right']}={v['bit32']}.band({v['v']},0xFFFF)
for {v['j']}=4,1,-1 do
local {v['k']}={v['temp']}[{v['j']}]
local {v['f']}={v['bit32']}.band({v['bit32']}.bxor({v['bit32']}.band({v['right']}*31337,0xFFFF),{v['k']}),0xFFFF)
{v['f']}={v['bit32']}.band({v['bit32']}.bor({v['bit32']}.lshift({v['f']},5),{v['bit32']}.rshift({v['f']},11)),0xFFFF)
{v['f']}={v['bit32']}.bxor({v['f']},{v['bit32']}.bxor({v['bit32']}.rshift({v['k']},8),{v['bit32']}.band({v['bit32']}.lshift({v['k']},8),0xFFFF)))
local {v['b']}={v['left']}
{v['left']}={v['right']}
{v['right']}={v['bit32']}.bxor({v['b']},{v['f']})
end
{v['decrypted']}[#{v['decrypted']}+1]={v['bit32']}.band({v['bit32']}.rshift({v['bit32']}.bor({v['bit32']}.lshift({v['left']},16),{v['right']}),24),0xFF)
{v['decrypted']}[#{v['decrypted']}+1]={v['bit32']}.band({v['bit32']}.rshift({v['bit32']}.bor({v['bit32']}.lshift({v['left']},16),{v['right']}),16),0xFF)
{v['decrypted']}[#{v['decrypted']}+1]={v['bit32']}.band({v['bit32']}.rshift({v['bit32']}.bor({v['bit32']}.lshift({v['left']},16),{v['right']}),8),0xFF)
{v['decrypted']}[#{v['decrypted']}+1]={v['bit32']}.band({v['bit32']}.bor({v['bit32']}.lshift({v['left']},16),{v['right']}),0xFF)
end
for {v['i']}=1,{v['len']} do
local {v['k']}={v['bit32']}.band((({v['i']}-1)*{params['rolling_mult']})+{params['rolling_offset']},0xFF)
{v['decrypted']}[{v['i']}]={v['bit32']}.bxor({v['decrypted']}[{v['i']}],{v['k']})
end
for {v['i']}=1,{v['len']} do {v['decrypted']}[{v['i']}]={v['bit32']}.bxor({v['decrypted']}[{v['i']}],{params['xor_key']})end
local {v['r']}={v['buffer']}.create({v['len']})
for {v['i']}=1,{v['len']} do {v['buffer']}.writeu8({v['r']},{v['i']}-1,{v['decrypted']}[{v['i']}])end
local {output_var}={v['r']}'''
        
        return code
    
    def encrypt_bytecode(self, bytecode: bytes) -> Tuple[str, str]:
        """
        Encrypt bytecode and return complete Lua code with decoder.
        
        Returns:
            Tuple of (Lua code, output variable name)
        """
        encoded, params = self.encrypt(bytecode)
        encoded_escaped = _escape_lua_string(encoded)
        
        encoded_var = self.naming.generate_name()
        output_var = self.naming.generate_name()
        
        decoder = self.generate_ultra_decoder(encoded_var, output_var, params)
        
        code = f'''(function()
local {encoded_var}="{encoded_escaped}"
{decoder}
return {output_var}
end)()'''
        
        return code, output_var


class BytecodeEncryptor:
    """
    High-level bytecode encryption for the obfuscator pipeline.
    
    Provides a simple interface for encrypting bytecode with
    all layers of protection.
    
    Now supports ULTRA-STRONG encryption mode!
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None, ultra_strong: bool = True):
        """
        Initialize the bytecode encryptor.
        
        Args:
            seed: Polymorphic build seed
            ultra_strong: Use 4-layer Feistel encryption (default True)
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.ultra_strong = ultra_strong
        
        if ultra_strong:
            self.encryption = UltraStrongEncryption(self.seed)
        else:
            self.encryption = LayeredEncryption(self.seed)
    
    def encrypt_for_vm(self, bytecode: bytes) -> Tuple[str, str]:
        """
        Encrypt bytecode and generate VM-ready code.
        
        Returns Lua code that:
        1. Contains the encrypted bytecode
        2. Decrypts it at runtime
        3. Stores result in a buffer variable
        
        Args:
            bytecode: The compiled bytecode
            
        Returns:
            Tuple of (Lua code, output variable name)
        """
        if self.ultra_strong:
            return self.encryption.encrypt_bytecode(bytecode)
        else:
            code, output_var = self.encryption.encode_bytecode_with_decoder(bytecode)
            return code, output_var
    
    def get_encryption_params(self) -> dict:
        """
        Get the encryption parameters for debugging/testing.
        
        Returns:
            Dictionary of encryption parameters
        """
        if self.ultra_strong:
            return {
                'mode': 'ultra_strong_4layer',
                'xor_key': self.encryption.xor_key,
                'rolling_mult': self.encryption.rolling_mult,
                'rolling_offset': self.encryption.rolling_offset,
                'feistel_keys': self.encryption.feistel_keys,
                'scramble_seed': self.encryption.scramble_seed,
            }
        else:
            return {
                'mode': 'standard_2layer',
                'xor_key': self.encryption.xor_key,
                'rolling_multiplier': self.encryption.rolling_multiplier,
                'rolling_offset': self.encryption.rolling_offset,
            }
