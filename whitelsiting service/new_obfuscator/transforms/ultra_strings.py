"""
Ultra String Encryption System

This module provides Luraph-style string encryption that EXCEEDS Luraph v14.4.1:
- All strings encrypted and accessed via sR(index) function calls
- XOR-based decryption with seed-derived key
- Encrypted blob stored as escape sequences
- Runtime decryption for maximum obfuscation

Target output style:
    local sF="\212\97\104\26\168\35\250..."  -- encrypted blob
    local sR=function(Aa)...end  -- decryption function
    -- Usage: sR(17) returns the 17th string

Requirements: ultra-obfuscation spec 2.x
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
import re

try:
    from ..core.seed import PolymorphicBuildSeed
except ImportError:
    from core.seed import PolymorphicBuildSeed


@dataclass
class UltraStringConfig:
    """Configuration for ultra string encryption."""
    xor_key_base: int = 0x5A  # Base XOR key
    use_escape_sequences: bool = True  # Use \NNN format
    min_string_length: int = 1  # Minimum string length to encrypt
    encrypt_all: bool = True  # Encrypt all strings


@dataclass
class EncryptedString:
    """Represents an encrypted string."""
    original: str
    index: int
    encrypted_bytes: List[int]


class UltraStringEncryptor:
    """
    Ultra string encryption system.
    
    Encrypts all string constants and generates a lookup function.
    Output style matches Luraph v14.4.1:
    
    local sF="\\212\\97\\104..."  -- encrypted blob
    local sR=function(Aa)
        -- XOR decryption logic
        return decrypted_string
    end
    
    Usage: sR(0) returns first string, sR(1) returns second, etc.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed, config: UltraStringConfig = None):
        self.seed = seed
        self.config = config or UltraStringConfig()
        
        # Generate XOR key from seed
        self.xor_key = (seed.get_random_int(0, 0xFFFF) ^ self.config.xor_key_base) & 0xFF
        
        # String table
        self.strings: List[EncryptedString] = []
        self._string_to_index: Dict[str, int] = {}
        
        # Generate variable names
        self.blob_var = self._generate_var_name()
        self.func_var = self._generate_var_name()
        self.key_var = self._generate_var_name()
    
    def _generate_var_name(self) -> str:
        """Generate a confusing variable name that won't conflict."""
        # Use longer, more unique names to avoid conflicts
        prefixes = ['_sR', '_sF', '_sB', '_sK', '_sX']
        chars = 'lLaAoO01_'
        prefix = self.seed.choice(prefixes)
        suffix = ''.join(self.seed.choice(list(chars)) for _ in range(self.seed.get_random_int(4, 6)))
        return prefix + suffix
    
    def _encrypt_byte(self, byte: int, position: int) -> int:
        """Encrypt a single byte using XOR with position-based key."""
        key = (self.xor_key + position * 7) & 0xFF
        return byte ^ key
    
    def _encrypt_string(self, s: str) -> List[int]:
        """Encrypt a string to a list of bytes."""
        encrypted = []
        for i, char in enumerate(s):
            byte = ord(char) & 0xFF
            encrypted_byte = self._encrypt_byte(byte, i)
            encrypted.append(encrypted_byte)
        return encrypted
    
    def add_string(self, s: str) -> int:
        """Add a string to the table and return its index."""
        if s in self._string_to_index:
            return self._string_to_index[s]
        
        index = len(self.strings)
        encrypted = self._encrypt_string(s)
        
        self.strings.append(EncryptedString(
            original=s,
            index=index,
            encrypted_bytes=encrypted
        ))
        self._string_to_index[s] = index
        
        return index
    
    def get_lookup_call(self, index: int) -> str:
        """Get the function call to retrieve a string by index."""
        return f"{self.func_var}({index})"
    
    def generate_encrypted_blob(self) -> str:
        """Generate the encrypted string blob as escape sequences."""
        if not self.strings:
            return '""'
        
        # Build blob: [len1][encrypted1][len2][encrypted2]...
        blob_bytes = []
        for es in self.strings:
            # Add length byte (max 255)
            length = min(len(es.encrypted_bytes), 255)
            blob_bytes.append(length)
            # Add encrypted bytes
            blob_bytes.extend(es.encrypted_bytes[:length])
        
        # Convert to escape sequence string
        if self.config.use_escape_sequences:
            escaped = ''.join(f'\\{b}' for b in blob_bytes)
            return f'"{escaped}"'
        else:
            # Use raw bytes where possible
            result = []
            for b in blob_bytes:
                if 32 <= b <= 126 and chr(b) not in '"\\':
                    result.append(chr(b))
                else:
                    result.append(f'\\{b}')
            return f'"{"".join(result)}"'
    
    def generate_decryption_function(self) -> str:
        """Generate the sR() decryption function."""
        # Variable names for the function
        idx_var = self._generate_var_name()
        pos_var = self._generate_var_name()
        key_var = self._generate_var_name()
        len_var = self._generate_var_name()
        result_var = self._generate_var_name()
        byte_var = self._generate_var_name()
        
        # Generate the decryption function as a single line
        # Avoid newlines that get converted to ;; patterns
        func = (
            f"local {self.func_var}=function({idx_var})"
            f"local {pos_var}=1;"
            f"local {key_var}={self.xor_key};"
            f"for _i=0,{idx_var}-1 do "
            f"local {len_var}=string.byte({self.blob_var},{pos_var});"
            f"{pos_var}={pos_var}+1+{len_var} "
            f"end;"
            f"local {len_var}=string.byte({self.blob_var},{pos_var});"
            f"{pos_var}={pos_var}+1;"
            f"local {result_var}={{}};"
            f"for _j=0,{len_var}-1 do "
            f"local {byte_var}=string.byte({self.blob_var},{pos_var}+_j);"
            f"local _k=bit32.bxor({byte_var},bit32.band({key_var}+_j*7,0xFF));"
            f"{result_var}[_j+1]=string.char(_k) "
            f"end;"
            f"return table.concat({result_var}) "
            f"end"
        )
        
        return func
    
    def generate_definitions(self) -> str:
        """Generate all definitions (blob + function)."""
        blob = self.generate_encrypted_blob()
        func = self.generate_decryption_function()
        
        return f"local {self.blob_var}={blob};{func}"
    
    def transform_code(self, code: str) -> str:
        """Transform code by replacing string literals with sR() calls."""
        if not self.config.encrypt_all:
            return code
        
        result = []
        i = 0
        
        while i < len(code):
            char = code[i]
            
            # Check for string literal
            if char == '"' or char == "'":
                quote = char
                start = i
                i += 1
                string_content = []
                
                while i < len(code):
                    if code[i] == '\\' and i + 1 < len(code):
                        # Handle escape sequence
                        next_char = code[i + 1]
                        if next_char.isdigit():
                            # Numeric escape \NNN
                            num_str = ''
                            j = i + 1
                            while j < len(code) and j < i + 4 and code[j].isdigit():
                                num_str += code[j]
                                j += 1
                            string_content.append(chr(int(num_str)))
                            i = j
                        elif next_char == 'n':
                            string_content.append('\n')
                            i += 2
                        elif next_char == 't':
                            string_content.append('\t')
                            i += 2
                        elif next_char == 'r':
                            string_content.append('\r')
                            i += 2
                        elif next_char == '\\':
                            string_content.append('\\')
                            i += 2
                        elif next_char == quote:
                            string_content.append(quote)
                            i += 2
                        else:
                            string_content.append(code[i:i+2])
                            i += 2
                    elif code[i] == quote:
                        i += 1
                        break
                    else:
                        string_content.append(code[i])
                        i += 1
                
                # Get the string content
                s = ''.join(string_content)
                
                # Check if we should encrypt this string
                if len(s) >= self.config.min_string_length:
                    # Add to table and get index
                    index = self.add_string(s)
                    # Replace with function call
                    result.append(self.get_lookup_call(index))
                else:
                    # Keep original
                    result.append(code[start:i])
                
                continue
            
            # Check for long string [[...]]
            if char == '[' and i + 1 < len(code) and code[i+1] == '[':
                start = i
                end = code.find(']]', i + 2)
                if end != -1:
                    # Extract content
                    s = code[i+2:end]
                    if len(s) >= self.config.min_string_length:
                        index = self.add_string(s)
                        result.append(self.get_lookup_call(index))
                    else:
                        result.append(code[start:end+2])
                    i = end + 2
                else:
                    result.append(code[i])
                    i += 1
                continue
            
            result.append(char)
            i += 1
        
        return ''.join(result)
    
    def apply_to_code(self, code: str) -> str:
        """Apply string encryption to code and inject definitions."""
        # First pass: transform strings
        transformed = self.transform_code(code)
        
        # Only inject definitions if we encrypted any strings
        if not self.strings:
            return transformed
        
        # Generate definitions
        definitions = self.generate_definitions()
        
        # Inject definitions inside the wrapper function
        wrapper_start_vararg = 'return(function(...)'
        wrapper_start_no_vararg = 'return(function()'
        
        if wrapper_start_vararg in transformed:
            wrapper_idx = transformed.find(wrapper_start_vararg)
            insert_pos = wrapper_idx + len(wrapper_start_vararg)
            transformed = transformed[:insert_pos] + definitions + ';' + transformed[insert_pos:]
        elif wrapper_start_no_vararg in transformed:
            wrapper_idx = transformed.find(wrapper_start_no_vararg)
            insert_pos = wrapper_idx + len(wrapper_start_no_vararg)
            transformed = transformed[:insert_pos] + definitions + ';' + transformed[insert_pos:]
        else:
            # Fallback: prepend at start
            transformed = definitions + ';' + transformed
        
        return transformed


# Convenience function
def create_ultra_string_encryptor(seed: PolymorphicBuildSeed) -> UltraStringEncryptor:
    """Create an ultra string encryptor with default settings."""
    return UltraStringEncryptor(seed)
