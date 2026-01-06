"""
String Obfuscation System for the Luraph-style obfuscator.

This module provides comprehensive string obfuscation including:
- String Encryption Helper (_SC function)
- String Fragmentation (delayed assembly)
- String Table Encryption
- Type String Encoding (ttisXXX)
- Field Name Obfuscation
- Bytecode String Splitting
- Unicode Escape Sequences

Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7
"""

import re
from typing import List, Tuple, Optional
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from core import PolymorphicBuildSeed, UnifiedNamingSystem


class StringEncryptionHelper:
    """
    String Encryption Helper for Luraph-style string obfuscation.
    
    Implements the _SC() function pattern used by Luraph to convert
    readable strings into string.char() calls with hex bytes.
    
    Example:
        "hello" -> _SC(0x68,0x65,0x6C,0x6C,0x6F)
    
    Requirements: 26.7
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the String Encryption Helper.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        self._sc_func_name = None
        self._char_func_name = None

    def get_sc_function_name(self) -> str:
        """Get or generate the _SC function name."""
        if self._sc_func_name is None:
            self._sc_func_name = self.naming.generate_name()
        return self._sc_func_name
    
    def get_char_function_name(self) -> str:
        """Get or generate the string.char alias name."""
        if self._char_func_name is None:
            self._char_func_name = self.naming.generate_name()
        return self._char_func_name
    
    def generate_sc_function(self) -> str:
        """
        Generate the _SC() string decryption helper function.
        
        Creates a function that converts hex byte arguments to a string
        using string.char. Uses obfuscated access to string.char.
        
        Returns:
            Lua code defining the _SC function
        
        Example output:
            local _O0O = string["\99\104\97\114"]  -- string.char
            local _SC = function(...)
                local _t = {}
                for _, _v in ipairs({...}) do
                    _t[#_t + 1] = _O0O(_v)
                end
                return table.concat(_t)
            end
        """
        sc_name = self.get_sc_function_name()
        char_name = self.get_char_function_name()
        
        # Generate obfuscated variable names
        t_var = self.naming.generate_name()
        v_var = self.naming.generate_name()
        k_var = self.naming.generate_name()
        
        # Obfuscate "char" using escape sequences
        # "char" = \99\104\97\114
        # "string" = \115\116\114\105\110\103
        # "table" = \116\97\98\108\101
        # "concat" = \99\111\110\99\97\116
        char_escaped = self._string_to_escape_sequence("char")
        
        # Generate the _SC function
        # In Roblox, _G["string"] returns nil, so we use string/table directly with escaped method names
        code = f'''local {char_name}=string["{char_escaped}"]
local {sc_name}=function(...)
local {t_var}={{}}
for {k_var},{v_var} in ipairs({{...}}) do
{t_var}[#({t_var})+1]={char_name}({v_var})
end
return table["\\99\\111\\110\\99\\97\\116"]({t_var})
end'''
        
        return code
    
    def _string_to_escape_sequence(self, s: str) -> str:
        """
        Convert a string to Lua escape sequence format.
        
        Args:
            s: The string to convert
            
        Returns:
            String with each character as \\XXX escape
        
        Example:
            "char" -> "\\99\\104\\97\\114"
        """
        return ''.join(f'\\{ord(c):03d}' for c in s)
    
    def encrypt_string(self, s: str) -> str:
        """
        Convert a string to _SC(0x48,0x65,...) format.
        
        Args:
            s: The string to encrypt
            
        Returns:
            _SC() call with hex byte arguments
        
        Example:
            "hello" -> _SC(0x68,0x65,0x6C,0x6C,0x6F)
        """
        sc_name = self.get_sc_function_name()
        
        if not s:
            return f'{sc_name}()'
        
        # Convert each character to hex format
        hex_bytes = []
        for c in s:
            byte_val = ord(c)
            # Randomly choose format
            fmt = self.seed.get_random_int(0, 2)
            if fmt == 0:
                hex_bytes.append(f'0x{byte_val:02X}')
            elif fmt == 1:
                hex_bytes.append(f'0x{byte_val:02x}')
            else:
                hex_bytes.append(f'0X{byte_val:02X}')
        
        return f'{sc_name}({",".join(hex_bytes)})'

    def encrypt_string_inline(self, s: str) -> str:
        """
        Convert a string to inline string.char() call without _SC.
        
        Useful when _SC function is not available.
        
        Args:
            s: The string to encrypt
            
        Returns:
            string.char() call with byte arguments
        
        Example:
            "hi" -> string.char(0x68,0x69)
        """
        if not s:
            return '""'
        
        hex_bytes = [f'0x{ord(c):02X}' for c in s]
        return f'string.char({",".join(hex_bytes)})'
    
    def encrypt_string_concat(self, s: str) -> str:
        """
        Convert a string using concatenation of string.char calls.
        
        More obfuscated than single call.
        
        Args:
            s: The string to encrypt
            
        Returns:
            Concatenated string.char() calls
        
        Example:
            "hi" -> string.char(0x68)..string.char(0x69)
        """
        if not s:
            return '""'
        
        parts = [f'string.char(0x{ord(c):02X})' for c in s]
        return '..'.join(parts)


class StringFragmenter:
    """
    String Fragmentation for delayed string assembly.
    
    Splits strings into fragments that are assembled at runtime,
    making static analysis harder.
    
    Requirements: 26.1
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the String Fragmenter.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
    
    def fragment_string(self, s: str, min_parts: int = 2, max_parts: int = 5) -> Tuple[List[str], str]:
        """
        Fragment a string into multiple parts for delayed assembly.
        
        Args:
            s: The string to fragment
            min_parts: Minimum number of fragments
            max_parts: Maximum number of fragments
            
        Returns:
            Tuple of (list of fragment variable assignments, assembly expression)
        
        Example:
            "hello" -> (["local _a='he'", "local _b='llo'"], "_a.._b")
        """
        if len(s) < 2:
            var = self.naming.generate_name()
            return ([f'local {var}="{self._escape_string(s)}"'], var)
        
        # Determine number of parts
        num_parts = min(self.seed.get_random_int(min_parts, max_parts), len(s))
        
        # Calculate split points
        part_size = len(s) // num_parts
        parts = []
        start = 0
        
        for i in range(num_parts - 1):
            # Add some randomness to split points
            end = start + part_size + self.seed.get_random_int(-1, 1)
            end = max(start + 1, min(end, len(s) - (num_parts - i - 1)))
            parts.append(s[start:end])
            start = end
        
        # Last part gets the remainder
        parts.append(s[start:])
        
        # Generate variable names and assignments
        var_names = [self.naming.generate_name() for _ in parts]
        assignments = []
        
        for var, part in zip(var_names, parts):
            escaped = self._escape_string(part)
            assignments.append(f'local {var}="{escaped}"')
        
        # Generate assembly expression
        assembly = '..'.join(var_names)
        
        return assignments, assembly
    
    def _escape_string(self, s: str) -> str:
        """Escape a string for Lua string literal."""
        result = []
        for c in s:
            if c == '\\':
                result.append('\\\\')
            elif c == '"':
                result.append('\\"')
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


class StringTableEncryptor:
    """
    String Table Encryption for encrypting all string table entries.
    
    Encrypts strings in the constant pool/string table so they
    cannot be read statically.
    
    Requirements: 26.2
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the String Table Encryptor.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        self.xor_key = self.seed.get_random_int(1, 255)
    
    def encrypt_string_xor(self, s: str) -> Tuple[bytes, int]:
        """
        XOR encrypt a string.
        
        Args:
            s: The string to encrypt
            
        Returns:
            Tuple of (encrypted bytes, XOR key)
        """
        key = self.xor_key
        encrypted = bytes(ord(c) ^ key for c in s)
        return encrypted, key
    
    def generate_encrypted_string_table(self, strings: List[str]) -> Tuple[str, str]:
        """
        Generate an encrypted string table with decoder.
        
        Args:
            strings: List of strings to encrypt
            
        Returns:
            Tuple of (table definition code, table variable name)
        """
        table_var = self.naming.generate_name()
        decoder_var = self.naming.generate_name()
        key_var = self.naming.generate_name()
        
        # Encrypt all strings
        encrypted_entries = []
        for s in strings:
            encrypted, _ = self.encrypt_string_xor(s)
            # Convert to escape sequence
            escaped = ''.join(f'\\{b:03d}' for b in encrypted)
            encrypted_entries.append(f'"{escaped}"')
        
        # Generate table and decoder
        code = f'''local {key_var}={self.xor_key}
local {table_var}={{{",".join(encrypted_entries)}}}
local {decoder_var}=function(s)
local r={{}}
for i=1,#s do r[i]=string.char(bit32.bxor(string.byte(s,i),{key_var}))end
return table.concat(r)
end'''
        
        return code, table_var, decoder_var


class TypeStringEncoder:
    """
    Type String Encoding for ttisXXX function strings.
    
    Encodes type checking function names like "ttisstring", "ttisnumber"
    to prevent pattern matching.
    
    Requirements: 26.3
    """
    
    # Common type strings in Luau VM
    TYPE_STRINGS = [
        'ttisnil', 'ttisboolean', 'ttisnumber', 'ttisstring',
        'ttistable', 'ttisfunction', 'ttisuserdata', 'ttisthread',
        'ttisvector', 'ttisbuffer'
    ]
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Type String Encoder.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
    
    def encode_type_string(self, type_str: str) -> str:
        """
        Encode a type string using escape sequences.
        
        Args:
            type_str: The type string (e.g., "ttisstring")
            
        Returns:
            Encoded string using escape sequences
        """
        return ''.join(f'\\{ord(c):03d}' for c in type_str)
    
    def generate_type_string_table(self) -> Tuple[str, dict]:
        """
        Generate a table of encoded type strings.
        
        Returns:
            Tuple of (table definition code, mapping of original to variable names)
        """
        table_var = self.naming.generate_name()
        mapping = {}
        entries = []
        
        for type_str in self.TYPE_STRINGS:
            var_name = self.naming.generate_name()
            encoded = self.encode_type_string(type_str)
            entries.append(f'{var_name}="{encoded}"')
            mapping[type_str] = var_name
        
        code = f'local {table_var}={{{",".join(entries)}}}'
        return code, mapping


class FieldNameObfuscator:
    """
    Field Name Obfuscation using string.char encoding.
    
    Converts field names like "index", "value" to string.char
    encoded versions for table access.
    
    Requirements: 26.4
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Field Name Obfuscator.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        self._char_alias = None
    
    def get_char_alias(self) -> str:
        """Get or generate the string.char alias."""
        if self._char_alias is None:
            self._char_alias = self.naming.generate_name()
        return self._char_alias
    
    def generate_char_alias(self) -> str:
        """
        Generate the string.char alias definition.
        
        Uses _G["escaped"] to completely hide the 'string' library name.
        
        Returns:
            Lua code defining the alias
        """
        alias = self.get_char_alias()
        # In Roblox, _G["string"] returns nil, so we use string directly with escaped method name
        return f'local {alias}=string["\\099\\104\\097\\114"]'
    
    def obfuscate_field_name(self, field_name: str) -> str:
        """
        Obfuscate a field name using string.char.
        
        Args:
            field_name: The field name to obfuscate
            
        Returns:
            Obfuscated field access expression
        
        Example:
            "index" -> _C(0x69,0x6E,0x64,0x65,0x78)
        """
        alias = self.get_char_alias()
        hex_bytes = [f'0x{ord(c):02X}' for c in field_name]
        return f'{alias}({",".join(hex_bytes)})'
    
    def obfuscate_table_access(self, table_expr: str, field_name: str) -> str:
        """
        Obfuscate a table field access.
        
        Args:
            table_expr: The table expression
            field_name: The field name
            
        Returns:
            Obfuscated table access
        
        Example:
            table.index -> table[_C(0x69,0x6E,0x64,0x65,0x78)]
        """
        obfuscated_field = self.obfuscate_field_name(field_name)
        return f'{table_expr}[{obfuscated_field}]'


class BytecodeStringSplitter:
    """
    Bytecode String Splitting using 4-part concatenation.
    
    Splits bytecode strings into 4 parts that are concatenated
    at runtime, making pattern matching harder.
    
    Requirements: 26.5
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Bytecode String Splitter.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
    
    def split_string_4parts(self, s: str) -> Tuple[List[str], str]:
        """
        Split a string into 4 parts for concatenation.
        
        Args:
            s: The string to split
            
        Returns:
            Tuple of (list of part variable assignments, concatenation expression)
        """
        if len(s) < 4:
            var = self.naming.generate_name()
            escaped = self._escape_string(s)
            return ([f'local {var}="{escaped}"'], var)
        
        # Calculate split points for 4 parts
        part_size = len(s) // 4
        parts = [
            s[0:part_size],
            s[part_size:part_size*2],
            s[part_size*2:part_size*3],
            s[part_size*3:]
        ]
        
        # Generate variable names
        var_names = [self.naming.generate_name() for _ in range(4)]
        assignments = []
        
        for var, part in zip(var_names, parts):
            escaped = self._escape_string(part)
            assignments.append(f'local {var}="{escaped}"')
        
        # Generate concatenation expression
        concat_expr = '..'.join(var_names)
        
        return assignments, concat_expr
    
    def _escape_string(self, s: str) -> str:
        """Escape a string for Lua string literal."""
        result = []
        for c in s:
            if c == '\\':
                result.append('\\\\')
            elif c == '"':
                result.append('\\"')
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


class UnicodeEscapeGenerator:
    """
    Unicode Escape Sequence Generator.
    
    Adds unicode escape sequences to strings for additional obfuscation.
    Luau supports \\u{XXXX} escape sequences.
    
    Requirements: 26.6
    """
    
    # 14 unicode sequences to add (as per requirements)
    UNICODE_SEQUENCES = [
        ('!', '\\u{021}'),   # Exclamation mark
        ('.', '\\u{02E}'),   # Period
        (',', '\\u{02C}'),   # Comma
        (':', '\\u{03A}'),   # Colon
        (';', '\\u{03B}'),   # Semicolon
        ('?', '\\u{03F}'),   # Question mark
        ('@', '\\u{040}'),   # At sign
        ('#', '\\u{023}'),   # Hash
        ('$', '\\u{024}'),   # Dollar
        ('%', '\\u{025}'),   # Percent
        ('&', '\\u{026}'),   # Ampersand
        ('*', '\\u{02A}'),   # Asterisk
        ('+', '\\u{02B}'),   # Plus
        ('-', '\\u{02D}'),   # Minus/hyphen
    ]
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the Unicode Escape Generator.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
    
    def add_unicode_escapes(self, s: str, probability: float = 0.3) -> str:
        """
        Add unicode escape sequences to a string.
        
        Randomly replaces characters with their unicode escape equivalents.
        
        Args:
            s: The string to process
            probability: Probability of replacing each eligible character
            
        Returns:
            String with some characters replaced by unicode escapes
        """
        # Build replacement map
        char_to_unicode = {char: escape for char, escape in self.UNICODE_SEQUENCES}
        
        result = []
        for c in s:
            if c in char_to_unicode and self.seed.random_bool(probability):
                result.append(char_to_unicode[c])
            else:
                result.append(c)
        
        return ''.join(result)
    
    def char_to_unicode_escape(self, c: str) -> str:
        """
        Convert a single character to unicode escape.
        
        Args:
            c: Single character
            
        Returns:
            Unicode escape sequence
        """
        return f'\\u{{{ord(c):03X}}}'
    
    def string_to_unicode_escapes(self, s: str) -> str:
        """
        Convert entire string to unicode escapes.
        
        Args:
            s: The string to convert
            
        Returns:
            String with all characters as unicode escapes
        """
        return ''.join(self.char_to_unicode_escape(c) for c in s)


class StringObfuscationTransformer:
    """
    Main String Obfuscation Transformer that combines all string obfuscation techniques.
    
    This is the primary interface for string obfuscation in the obfuscator pipeline.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        """
        Initialize the String Obfuscation Transformer.
        
        Args:
            seed: Polymorphic build seed for randomization
        """
        self.seed = seed or PolymorphicBuildSeed()
        self.encryption_helper = StringEncryptionHelper(self.seed)
        self.fragmenter = StringFragmenter(self.seed)
        self.table_encryptor = StringTableEncryptor(self.seed)
        self.type_encoder = TypeStringEncoder(self.seed)
        self.field_obfuscator = FieldNameObfuscator(self.seed)
        self.splitter = BytecodeStringSplitter(self.seed)
        self.unicode_generator = UnicodeEscapeGenerator(self.seed)
        self.naming = UnifiedNamingSystem(self.seed)
    
    def generate_string_helpers(self) -> str:
        """
        Generate all string helper functions.
        
        Returns:
            Lua code with all string helper definitions
        """
        parts = []
        
        # _SC function
        parts.append(self.encryption_helper.generate_sc_function())
        
        # string.char alias for field obfuscation
        parts.append(self.field_obfuscator.generate_char_alias())
        
        return '\n'.join(parts)
    
    def obfuscate_string_literal(self, s: str, method: str = None) -> str:
        """
        Obfuscate a string literal using the specified method.
        
        Args:
            s: The string to obfuscate
            method: Obfuscation method ('sc', 'fragment', 'escape', 'unicode', 'inline')
                   If None, randomly selects a method.
            
        Returns:
            Obfuscated string expression
        """
        if method is None:
            method = self.seed.choice(['sc', 'escape', 'inline'])
        
        if method == 'sc':
            return self.encryption_helper.encrypt_string(s)
        elif method == 'escape':
            return f'"{self._string_to_escape_sequence(s)}"'
        elif method == 'unicode':
            return f'"{self.unicode_generator.add_unicode_escapes(s, 0.5)}"'
        elif method == 'inline':
            return self.encryption_helper.encrypt_string_inline(s)
        else:
            return self.encryption_helper.encrypt_string(s)
    
    def _string_to_escape_sequence(self, s: str) -> str:
        """Convert string to escape sequence format."""
        return ''.join(f'\\{ord(c):03d}' for c in s)

    def transform_strings_in_code(self, code: str) -> str:
        """
        Transform all string literals in Lua code.
        
        Finds and replaces string literals with obfuscated versions.
        CRITICAL: Properly handles existing escape sequences to avoid double-escaping.
        
        Args:
            code: Lua source code
            
        Returns:
            Code with obfuscated strings
        """
        result = []
        i = 0
        
        while i < len(code):
            char = code[i]
            
            # Check for string start
            if char == '"' or char == "'":
                quote = char
                start = i
                i += 1
                
                # Collect the ENTIRE string including escape sequences
                # We need to preserve the original string exactly
                string_chars = []
                has_escape_sequences = False
                
                while i < len(code):
                    if code[i] == '\\' and i + 1 < len(code):
                        has_escape_sequences = True
                        # Handle escape sequences properly
                        next_char = code[i + 1]
                        
                        if next_char.isdigit():
                            # Decimal escape: \0 to \255 (1-3 digits)
                            # Collect up to 3 digits
                            escape_start = i
                            i += 1  # Skip backslash
                            digits = ''
                            while i < len(code) and code[i].isdigit() and len(digits) < 3:
                                digits += code[i]
                                i += 1
                            # Keep the entire escape sequence as-is
                            string_chars.append('\\' + digits)
                        elif next_char == 'x' and i + 3 < len(code):
                            # Hex escape: \xNN
                            string_chars.append(code[i:i+4])
                            i += 4
                        elif next_char == 'u' and i + 2 < len(code) and code[i+2] == '{':
                            # Unicode escape: \u{NNNN}
                            end = code.find('}', i + 3)
                            if end != -1:
                                string_chars.append(code[i:end+1])
                                i = end + 1
                            else:
                                string_chars.append(code[i:i+2])
                                i += 2
                        else:
                            # Simple escape: \n, \t, \\, \", etc.
                            string_chars.append(code[i:i+2])
                            i += 2
                    elif code[i] == quote:
                        i += 1
                        break
                    else:
                        string_chars.append(code[i])
                        i += 1
                
                original = ''.join(string_chars)
                
                # CRITICAL: If the string already has escape sequences, DON'T transform it!
                # This prevents double-escaping of already-obfuscated strings
                if has_escape_sequences:
                    result.append(f'{quote}{original}{quote}')
                # Skip short strings and strings that look like patterns
                elif len(original) >= 3 and not self._is_pattern_string(original):
                    # Obfuscate using escape sequences (safest)
                    escaped = self._string_to_escape_sequence(original)
                    result.append(f'"{escaped}"')
                else:
                    # Keep original
                    result.append(f'{quote}{original}{quote}')
            
            elif char == '[' and i + 1 < len(code) and code[i+1] == '[':
                # Long string [[...]] - keep as-is for now
                end = code.find(']]', i + 2)
                if end != -1:
                    result.append(code[i:end+2])
                    i = end + 2
                else:
                    result.append(char)
                    i += 1
            else:
                result.append(char)
                i += 1
        
        return ''.join(result)
    
    def _is_pattern_string(self, s: str) -> bool:
        """
        Check if a string looks like a Lua pattern.
        
        Patterns should not be obfuscated as they have special meaning.
        """
        pattern_chars = ['%', '^', '$', '*', '+', '?', '[', ']', '(', ')']
        return any(c in s for c in pattern_chars)
    
    def obfuscate_field_access(self, code: str) -> str:
        """
        Obfuscate dot notation field access to bracket notation with encrypted names.
        
        Args:
            code: Lua source code
            
        Returns:
            Code with obfuscated field access
        
        Example:
            table.field -> table[_C(0x66,0x69,0x65,0x6C,0x64)]
        """
        # Pattern to match dot notation: identifier.identifier
        # This is simplified - a full implementation would use proper parsing
        import re
        
        # List of Roblox globals that should not have their methods obfuscated
        roblox_globals = {
            'game', 'workspace', 'script', 'Enum', 'Instance',
            'Vector3', 'CFrame', 'Color3', 'UDim2', 'UDim',
            'TweenInfo', 'NumberRange', 'NumberSequence',
            'ColorSequence', 'Ray', 'Region3', 'Rect',
            'string', 'table', 'math', 'bit32', 'buffer',
            'coroutine', 'os', 'debug', 'utf8'
        }
        
        def replace_field(match):
            table_name = match.group(1)
            field_name = match.group(2)
            
            # Don't obfuscate Roblox globals or standard library
            if table_name in roblox_globals:
                return match.group(0)
            
            # Don't obfuscate common method names
            common_methods = {'new', 'Create', 'clone', 'Destroy'}
            if field_name in common_methods:
                return match.group(0)
            
            # Obfuscate the field access
            obfuscated = self.field_obfuscator.obfuscate_field_name(field_name)
            return f'{table_name}[{obfuscated}]'
        
        # Match: identifier.identifier (not followed by another dot for method chains)
        pattern = r'\b([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\b'
        
        return re.sub(pattern, replace_field, code)


# Export all classes
__all__ = [
    'StringEncryptionHelper',
    'StringFragmenter',
    'StringTableEncryptor',
    'TypeStringEncoder',
    'FieldNameObfuscator',
    'BytecodeStringSplitter',
    'UnicodeEscapeGenerator',
    'StringObfuscationTransformer',
]
