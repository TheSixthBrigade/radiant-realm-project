"""
Nested VM Generator (_NVM) - Creates VM inside VM with key rotation.

This module implements nested virtualization where the inner VM's bytecode
is encrypted with 8-key rotation, adding another layer of protection.

Requirements: 22.1, 22.2, 22.3
- Implement VM inside VM structure
- Use 8 rotating keys for decryption
- Maintain correct execution semantics
"""

from typing import List, Tuple, Optional
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from core import (
    PolymorphicBuildSeed,
    UnifiedNamingSystem,
    OpaquePredicateGenerator,
)


class NestedVMGenerator:
    """
    Generates nested VM structures with 8-key rotation encryption.
    
    The nested VM (_NVM) provides an additional layer of protection by:
    1. Encrypting the inner bytecode with 8 rotating keys
    2. Embedding a decryption routine in the outer VM
    3. Running the decrypted bytecode in an inner VM
    
    This makes static analysis much harder as the inner bytecode
    is not visible until runtime decryption.
    
    Requirements: 22.1, 22.2, 22.3
    """
    
    # Number of rotating keys
    KEY_COUNT = 8
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Nested VM Generator.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        self.predicates = OpaquePredicateGenerator(self.seed)
        
        # Generate 8 rotating keys
        self.keys = self._generate_keys()
    
    def _generate_keys(self) -> List[int]:
        """
        Generate 8 random encryption keys.
        
        Returns:
            List of 8 random bytes (0-255)
        """
        return [self.seed.get_random_int(1, 255) for _ in range(self.KEY_COUNT)]
    
    def encrypt_with_rotation(self, data: bytes) -> bytes:
        """
        Encrypt data using 8-key rotation.
        
        Each byte is XORed with a key that rotates based on position.
        key_index = position % 8
        
        Args:
            data: The data to encrypt
            
        Returns:
            Encrypted data
        """
        result = bytearray()
        for i, byte in enumerate(data):
            key_index = i % self.KEY_COUNT
            encrypted_byte = byte ^ self.keys[key_index]
            result.append(encrypted_byte)
        return bytes(result)
    
    def decrypt_with_rotation(self, data: bytes) -> bytes:
        """
        Decrypt data using 8-key rotation.
        
        XOR is symmetric, so decryption is the same as encryption.
        
        Args:
            data: The encrypted data
            
        Returns:
            Decrypted data
        """
        return self.encrypt_with_rotation(data)  # XOR is symmetric
    
    def generate_decryption_code(self, encrypted_var: str, output_var: str) -> str:
        """
        Generate Lua code to decrypt data with 8-key rotation.
        
        Args:
            encrypted_var: Variable name containing encrypted data
            output_var: Variable name to store decrypted result
            
        Returns:
            Lua code for decryption
        """
        # Generate obfuscated variable names
        keys_var = self.naming.generate_name()
        i_var = self.naming.generate_name()
        key_idx_var = self.naming.generate_name()
        byte_var = self.naming.generate_name()
        result_var = self.naming.generate_name()
        len_var = self.naming.generate_name()
        
        # Format keys as Lua table
        keys_str = ','.join(str(k) for k in self.keys)
        
        # Generate decryption code
        code = f"""local {keys_var}={{{keys_str}}}
local {len_var}=buffer.len({encrypted_var})
local {result_var}=buffer.create({len_var})
for {i_var}=0,{len_var}-1 do
local {key_idx_var}=({i_var}%8)+1
local {byte_var}=bit32.bxor(buffer.readu8({encrypted_var},{i_var}),{keys_var}[{key_idx_var}])
buffer.writeu8({result_var},{i_var},{byte_var})
end
local {output_var}={result_var}"""
        
        return code
    
    def generate_nested_vm(self, inner_bytecode: bytes) -> str:
        """
        Generate a nested VM structure with encrypted inner bytecode.
        
        Creates:
        1. Encrypted inner bytecode
        2. Decryption routine with 8-key rotation
        3. Inner VM to execute decrypted bytecode
        
        Requirements: 22.1, 22.2, 22.3
        
        Args:
            inner_bytecode: The bytecode to protect with nested VM
            
        Returns:
            Complete nested VM code
        """
        # Encrypt the inner bytecode
        encrypted = self.encrypt_with_rotation(inner_bytecode)
        
        # Generate variable names
        encrypted_var = self.naming.generate_name()
        decrypted_var = self.naming.generate_name()
        module_var = self.naming.generate_name()
        closure_var = self.naming.generate_name()
        env_var = self.naming.generate_name()
        
        # Encode encrypted bytecode as Lua string
        encoded_encrypted = self._encode_bytes_to_lua(encrypted)
        
        # Generate decryption code
        decrypt_code = self.generate_decryption_code(encrypted_var, decrypted_var)
        
        # Generate opaque predicates
        true_pred = self.predicates.get_true_predicate()
        false_pred = self.predicates.get_false_predicate()
        dead_var = self.naming.generate_name()
        
        # Build nested VM structure
        nested_vm = f"""do
-- Nested VM with 8-key rotation encryption
local {encrypted_var}=buffer.fromstring({encoded_encrypted})
{decrypt_code}
local {module_var}=luau_deserialize({decrypted_var})
local {env_var}=getfenv and getfenv()or _ENV
local {closure_var}=luau_load({module_var},{env_var})
if {false_pred} then local {dead_var}=0 end
if {true_pred} then return {closure_var}()end
end"""
        
        return nested_vm
    
    def _encode_bytes_to_lua(self, data: bytes) -> str:
        """
        Encode bytes as a Lua string literal.
        
        Uses escape sequences for non-printable characters.
        
        Args:
            data: The bytes to encode
            
        Returns:
            Lua string literal
        """
        parts = []
        for byte in data:
            # Use escape sequence for all bytes for consistency
            parts.append(f'\\{byte:03d}')
        
        return '"' + ''.join(parts) + '"'
    
    def generate_key_derivation_code(self, base_key_var: str) -> str:
        """
        Generate code for runtime key derivation.
        
        Derives the 8 keys from a base key at runtime, making
        static analysis harder.
        
        Args:
            base_key_var: Variable containing the base key
            
        Returns:
            Lua code that derives 8 keys from base key
        """
        keys_var = self.naming.generate_name()
        i_var = self.naming.generate_name()
        
        # Key derivation formula: key[i] = (base * (i+1) * 7 + 13) % 256
        code = f"""local {keys_var}={{}}
for {i_var}=1,8 do
{keys_var}[{i_var}]=bit32.band(({base_key_var}*{i_var}*7+13),0xFF)
end"""
        
        return code
    
    def generate_nested_vm_with_derivation(
        self,
        inner_bytecode: bytes,
        base_key: int = None
    ) -> str:
        """
        Generate nested VM with runtime key derivation.
        
        Instead of embedding the 8 keys directly, derives them from
        a single base key at runtime.
        
        Args:
            inner_bytecode: The bytecode to protect
            base_key: Base key for derivation (random if None)
            
        Returns:
            Nested VM code with key derivation
        """
        if base_key is None:
            base_key = self.seed.get_random_int(1, 255)
        
        # Derive keys from base key
        derived_keys = []
        for i in range(1, 9):
            key = (base_key * i * 7 + 13) % 256
            derived_keys.append(key)
        
        # Temporarily use derived keys for encryption
        original_keys = self.keys
        self.keys = derived_keys
        
        # Encrypt with derived keys
        encrypted = self.encrypt_with_rotation(inner_bytecode)
        
        # Restore original keys
        self.keys = original_keys
        
        # Generate variable names
        base_key_var = self.naming.generate_name()
        keys_var = self.naming.generate_name()
        encrypted_var = self.naming.generate_name()
        decrypted_var = self.naming.generate_name()
        module_var = self.naming.generate_name()
        closure_var = self.naming.generate_name()
        env_var = self.naming.generate_name()
        i_var = self.naming.generate_name()
        len_var = self.naming.generate_name()
        key_idx_var = self.naming.generate_name()
        byte_var = self.naming.generate_name()
        result_var = self.naming.generate_name()
        
        # Encode encrypted bytecode
        encoded_encrypted = self._encode_bytes_to_lua(encrypted)
        
        # Generate opaque predicates
        true_pred = self.predicates.get_true_predicate()
        false_pred = self.predicates.get_false_predicate()
        dead_var = self.naming.generate_name()
        
        # Build nested VM with key derivation
        nested_vm = f"""do
-- Nested VM with runtime key derivation
local {base_key_var}={base_key}
local {keys_var}={{}}
for {i_var}=1,8 do
{keys_var}[{i_var}]=bit32.band(({base_key_var}*{i_var}*7+13),0xFF)
end
local {encrypted_var}=buffer.fromstring({encoded_encrypted})
local {len_var}=buffer.len({encrypted_var})
local {result_var}=buffer.create({len_var})
for {i_var}=0,{len_var}-1 do
local {key_idx_var}=({i_var}%8)+1
local {byte_var}=bit32.bxor(buffer.readu8({encrypted_var},{i_var}),{keys_var}[{key_idx_var}])
buffer.writeu8({result_var},{i_var},{byte_var})
end
local {decrypted_var}={result_var}
local {module_var}=luau_deserialize({decrypted_var})
local {env_var}=getfenv and getfenv()or _ENV
local {closure_var}=luau_load({module_var},{env_var})
if {false_pred} then local {dead_var}=0 end
if {true_pred} then return {closure_var}()end
end"""
        
        return nested_vm
    
    def wrap_vm_in_nested_layer(self, vm_code: str, bytecode: bytes) -> str:
        """
        Wrap existing VM code in a nested layer.
        
        Takes the outer VM code and adds a nested VM layer for
        additional protection.
        
        Args:
            vm_code: The outer VM code
            bytecode: The bytecode to execute
            
        Returns:
            VM code with nested layer
        """
        # Generate nested VM for the bytecode
        nested = self.generate_nested_vm_with_derivation(bytecode)
        
        # Insert nested VM into outer VM
        # Find the bytecode loading section and replace it
        return f"""{vm_code}
-- Begin nested VM layer
{nested}
-- End nested VM layer"""
