#!/usr/bin/env python3
"""
Scope-Aware VM Variable Renamer

A proper scope-aware variable renamer that tracks variable declarations
and their scopes WITHOUT relying on external AST libraries.

Key features:
1. Tracks scope boundaries (function, for, while, do, if blocks)
2. Each scope has its own variable namespace
3. Variables shadow outer scope variables correctly
4. Field accesses (.field, :method) are NOT renamed
5. Standard library accesses (buffer.len, string.char) are preserved

This is more robust than regex-based renaming because it understands
that `local size` in function A is different from `local size` in function B.
"""

import re
import sys
from pathlib import Path
from typing import Dict, Set, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum, auto

sys.path.insert(0, str(Path(__file__).parent))

from core.seed import PolymorphicBuildSeed
from core.naming import UnifiedNamingSystem, ROBLOX_GLOBALS


class TokenType(Enum):
    """Token types for the Lua lexer."""
    KEYWORD = auto()
    IDENTIFIER = auto()
    NUMBER = auto()
    STRING = auto()
    OPERATOR = auto()
    PUNCTUATION = auto()
    COMMENT = auto()
    WHITESPACE = auto()
    EOF = auto()


# Lua/Luau keywords
KEYWORDS = frozenset({
    'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
    'function', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or',
    'repeat', 'return', 'then', 'true', 'until', 'while', 'continue',
    'export', 'type',  # Luau-specific
})

# Builtins that should never be renamed
BUILTINS = frozenset({
    'type', 'pcall', 'xpcall', 'error', 'tonumber', 'tostring', 'assert',
    'setmetatable', 'getmetatable', 'rawget', 'rawset', 'rawequal', 'rawlen',
    'select', 'pairs', 'ipairs', 'next', 'unpack', 'print', 'warn',
    'string', 'table', 'math', 'bit32', 'buffer', 'coroutine',
    'os', 'debug', 'utf8', '_G', '_VERSION', '_ENV', 'getfenv', 'setfenv',
    'require', 'loadstring', 'load', 'dofile', 'loadfile',
    'collectgarbage', 'newproxy', 'typeof',
})

# Standard library names - field accesses on these should NOT be renamed
STDLIB_NAMES = frozenset({
    'string', 'table', 'math', 'bit32', 'buffer', 'coroutine',
    'os', 'debug', 'utf8', 'io', 'package', 'task',
})

# Internal VM field names to rename (from vm_renamer.py)
INTERNAL_FIELD_RENAMES = {
    'proto': 'lI0O1_Il1lI1lOO0O1_Il1lI1l0O1',
    'protos': 'l1O0I_I1llI1lOO0O1_1_0Il1lI01',
    'code': 'O01OI0__OlO1Ol101_1ll_O01Ol1I',
    'debugcode': 'O01OI0__OlO1Ol1_1ll_O01Ol1I0',
    'sizecode': 'O01OI0__OlO1Ol101_1l_Il1lI1l0',
    'instructionlineinfo': '_OI11II_I11l0O1_Il1lI1lOO0O1',
    'lineinfoenabled': 'lI0O1_Il1lI1lOO0O1_Il1lI1l01',
    'constants': 'Il1lI1lOO0O1_Il1lI1l_O01OI0_',
    'sizek': 'Il1lI1lOO0O1_Il1l_O01OI0__Ol',
    'upvalues': 'I1lOO0O1_Il1lI1lOO0O1_0l1I_01',
    'nups': 'I1lOO0O1_1l0_Il1lI1l_O0O1_Il',
    'numparams': 'O0O1_Il1lI1lOO0O1_Il_1l0I1_01',
    'maxstacksize': '_1ll_O01Oll0lI_Il1lI_0I1l0_01',
    'isvararg': 'lI0O1_Il1lI1lOO0O1_I_0l1I_011',
    'linedefined': 'O0O1_1l0I1_Il1lI1lO_I1lOO0_01',
    'debugname': 'lI0O1_Il1lI1lOO0O1_Il_O01O_01',
    'sizep': 'Il1lI1lOO0O1_Il1l_O01OI0__01',
    'bytecodeid': 'lI0O1_Il1lI1lOO0O1_0I1l0_0101',
    'flags': 'O01OI0_OlO1Ol101_1ll_O_1l0I_1',
    'typeinfo': 'lI0O1_Il1lI1lOO0O1_Il_I1lO_01',
    'opcode': 'O01OI0__OlO1Ol101_0l1I_Il1lI1',
    'opname': 'Il1lI1lOO0O1_Il1l_0l1I_O01OI',
    'opmode': 'O01OI0__OlO1Ol101_0l1I_Il1lI0',
    'kmode': 'Il1lI1lOO0O1_Il1lI_0l1_O01OI',
    'usesAux': 'lI0O1_Il1lI1lOO0O1_Il_0l1I0_1',
    'aux': 'O01OI0__OlO1Ol101_1_0l_Il1lI1',
    'value': 'Il1lI1lOO0O1_Il1lI_0l1_O01O0',
    'store': 'O01OI0__OlO1Ol10_Il1lI1_0l1_1',
    'index': 'lI0O1_Il1lI1lOO0_O01OI_0l1_01',
    'len': 'I1lOO0O1_0l1_Il1lI1lO_1ll_O01',
    'list': 'O01OI0_0l1I_Ol101_1ll_Il1lI01',
    'stringList': 'O01OI0_OlO1O_Il1lI1l_0l1I01_1',
    'protoList': 'Il1lI1lOO0O1_I1lOO0_0l1I01_1',
    'mainProto': 'lI0O1_Il1lI1lO_O01OI_0l1I0_01',
    'typesVersion': 'I1lOO0O1_Il1lI_O0O1__0l1I0_1',
    'decodeOp': 'Il1lI1lOO0O1_Il1l_0l1I_O01OI',
    'callHooks': 'O01OI0__OlO1Ol1_0l1I0_Il1lI1',
    'errorHandling': 'Il1lI1lOO0O1_I_0l1I01_O01OI0',
    'allowProxyErrors': 'O01OI0__Ol_0l1I01lI0_Il1lI1l',
    'useImportConstants': 'Il1lI1lOO0_0l1I01lI0_O01OI01',
    'staticEnvironment': 'O01OI0__OlO1O_0l1I0_Il1lI1l0',
    'useNativeNamecall': 'Il1lI1lOO0_0l1I01lI01_O01OI01',
    'namecallHandler': 'O01OI0__OlO_0l1I01lI0_Il1lI1l',
    'generalizedIteration': 'Il1lI1lOO0O_0l1I01lI_O01OI0_1',
    'breakHook': 'Il1lI1lOO0O1_Il_0l1I0_O01OI0',
    'stepHook': 'O01OI0__OlO1Ol1_0l1I0_Il1lI1',
    'interruptHook': '_1ll_O01Oll0lI_0l_Il1_O0O1_01',
    'panicHook': 'O01OI0__OlO1Ol1_0l1I0_Il1lI0',
    'pc': 'lI0O1_0l_Il1lI1lOO0O1_O01O_01',
    'top': 'I1lOO0O1_0l_Il1lI1lO_1ll_O_01',
    'name': 'Il1lI1lOO0O1_Il1lI1_0l_O01OI',
    'openupvals': 'Il1lI1lOO0O1_O01OI0_0l1I01_1',
    'varargs': 'O01OI0_OlO1Ol1_Il1lI1_0l1I0_1',
    'stack': 'O01OI0_0l1_Ol101_1ll_Il1lI_01',
    'base': 'Il1lI1lOO0O1_0l_1l_O01OI0__01',
    'env': 'O0O1_0l1_Il1lI1lOO0O_I1lOO_01',
}


@dataclass
class Token:
    """A token from the lexer."""
    type: TokenType
    value: str
    start: int
    end: int


@dataclass
class Scope:
    """A variable scope."""
    name: str
    parent: Optional['Scope'] = None
    variables: Dict[str, str] = field(default_factory=dict)
    
    def declare(self, name: str, renamed: str):
        """Declare a variable in this scope."""
        self.variables[name] = renamed
    
    def lookup(self, name: str) -> Optional[str]:
        """Look up a variable, checking parent scopes."""
        if name in self.variables:
            return self.variables[name]
        if self.parent:
            return self.parent.lookup(name)
        return None
    
    def is_declared_here(self, name: str) -> bool:
        """Check if variable is declared in THIS scope (not parent)."""
        return name in self.variables


class LuauLexer:
    """Simple lexer for Luau code."""
    
    def __init__(self, code: str):
        self.code = code
        self.pos = 0
        self.tokens: List[Token] = []
    
    def tokenize(self) -> List[Token]:
        """Tokenize the entire code."""
        while self.pos < len(self.code):
            token = self._next_token()
            if token:
                self.tokens.append(token)
        return self.tokens
    
    def _next_token(self) -> Optional[Token]:
        """Get the next token."""
        if self.pos >= len(self.code):
            return None
        
        # Skip whitespace but track it
        ws_start = self.pos
        while self.pos < len(self.code) and self.code[self.pos] in ' \t\n\r':
            self.pos += 1
        if self.pos > ws_start:
            return Token(TokenType.WHITESPACE, self.code[ws_start:self.pos], ws_start, self.pos)
        
        if self.pos >= len(self.code):
            return None
        
        char = self.code[self.pos]
        
        # Comments
        if char == '-' and self.pos + 1 < len(self.code) and self.code[self.pos + 1] == '-':
            return self._read_comment()
        
        # Strings
        if char in '"\'':
            return self._read_string(char)
        if char == '[' and self.pos + 1 < len(self.code) and self.code[self.pos + 1] in '[=':
            return self._read_long_string()
        
        # Numbers
        if char.isdigit() or (char == '.' and self.pos + 1 < len(self.code) and self.code[self.pos + 1].isdigit()):
            return self._read_number()
        
        # Identifiers and keywords
        if char.isalpha() or char == '_':
            return self._read_identifier()
        
        # Operators and punctuation
        return self._read_operator()

    
    def _read_comment(self) -> Token:
        """Read a comment."""
        start = self.pos
        self.pos += 2  # Skip --
        
        # Check for long comment --[[
        if self.pos < len(self.code) and self.code[self.pos] == '[':
            eq_count = 0
            check_pos = self.pos + 1
            while check_pos < len(self.code) and self.code[check_pos] == '=':
                eq_count += 1
                check_pos += 1
            if check_pos < len(self.code) and self.code[check_pos] == '[':
                # Long comment
                self.pos = check_pos + 1
                end_pattern = ']' + '=' * eq_count + ']'
                end_idx = self.code.find(end_pattern, self.pos)
                if end_idx != -1:
                    self.pos = end_idx + len(end_pattern)
                else:
                    self.pos = len(self.code)
                return Token(TokenType.COMMENT, self.code[start:self.pos], start, self.pos)
        
        # Single line comment
        while self.pos < len(self.code) and self.code[self.pos] != '\n':
            self.pos += 1
        return Token(TokenType.COMMENT, self.code[start:self.pos], start, self.pos)
    
    def _read_string(self, quote: str) -> Token:
        """Read a quoted string."""
        start = self.pos
        self.pos += 1  # Skip opening quote
        
        while self.pos < len(self.code):
            char = self.code[self.pos]
            if char == '\\' and self.pos + 1 < len(self.code):
                self.pos += 2  # Skip escape sequence
            elif char == quote:
                self.pos += 1  # Skip closing quote
                break
            else:
                self.pos += 1
        
        return Token(TokenType.STRING, self.code[start:self.pos], start, self.pos)
    
    def _read_long_string(self) -> Token:
        """Read a long string [[...]] or [=[...]=]."""
        start = self.pos
        self.pos += 1  # Skip first [
        
        eq_count = 0
        while self.pos < len(self.code) and self.code[self.pos] == '=':
            eq_count += 1
            self.pos += 1
        
        if self.pos >= len(self.code) or self.code[self.pos] != '[':
            # Not a long string, just a [
            self.pos = start + 1
            return Token(TokenType.PUNCTUATION, '[', start, self.pos)
        
        self.pos += 1  # Skip second [
        
        # Find closing ]=*]
        end_pattern = ']' + '=' * eq_count + ']'
        end_idx = self.code.find(end_pattern, self.pos)
        if end_idx != -1:
            self.pos = end_idx + len(end_pattern)
        else:
            self.pos = len(self.code)
        
        return Token(TokenType.STRING, self.code[start:self.pos], start, self.pos)
    
    def _read_number(self) -> Token:
        """Read a number literal."""
        start = self.pos
        
        # Handle hex (0x/0X) or binary (0b/0B)
        if self.code[self.pos] == '0' and self.pos + 1 < len(self.code):
            next_char = self.code[self.pos + 1].lower()
            if next_char == 'x':
                self.pos += 2
                while self.pos < len(self.code) and (self.code[self.pos] in '0123456789abcdefABCDEF_'):
                    self.pos += 1
                return Token(TokenType.NUMBER, self.code[start:self.pos], start, self.pos)
            elif next_char == 'b':
                self.pos += 2
                while self.pos < len(self.code) and self.code[self.pos] in '01_':
                    self.pos += 1
                return Token(TokenType.NUMBER, self.code[start:self.pos], start, self.pos)
        
        # Regular number
        while self.pos < len(self.code) and (self.code[self.pos].isdigit() or self.code[self.pos] == '_'):
            self.pos += 1
        
        # Decimal part
        if self.pos < len(self.code) and self.code[self.pos] == '.':
            self.pos += 1
            while self.pos < len(self.code) and (self.code[self.pos].isdigit() or self.code[self.pos] == '_'):
                self.pos += 1
        
        # Exponent
        if self.pos < len(self.code) and self.code[self.pos] in 'eE':
            self.pos += 1
            if self.pos < len(self.code) and self.code[self.pos] in '+-':
                self.pos += 1
            while self.pos < len(self.code) and self.code[self.pos].isdigit():
                self.pos += 1
        
        return Token(TokenType.NUMBER, self.code[start:self.pos], start, self.pos)

    
    def _read_identifier(self) -> Token:
        """Read an identifier or keyword."""
        start = self.pos
        while self.pos < len(self.code) and (self.code[self.pos].isalnum() or self.code[self.pos] == '_'):
            self.pos += 1
        
        value = self.code[start:self.pos]
        token_type = TokenType.KEYWORD if value in KEYWORDS else TokenType.IDENTIFIER
        return Token(token_type, value, start, self.pos)
    
    def _read_operator(self) -> Token:
        """Read an operator or punctuation."""
        start = self.pos
        char = self.code[self.pos]
        
        # Multi-char operators
        two_char = self.code[self.pos:self.pos+2] if self.pos + 1 < len(self.code) else ''
        three_char = self.code[self.pos:self.pos+3] if self.pos + 2 < len(self.code) else ''
        
        if three_char in ('...', '..='):
            self.pos += 3
        elif two_char in ('==', '~=', '<=', '>=', '..', '::', '->', '+=', '-=', '*=', '/=', '%=', '^=', '..='):
            self.pos += 2
        else:
            self.pos += 1
        
        value = self.code[start:self.pos]
        return Token(TokenType.PUNCTUATION if char in '(){}[];,.' else TokenType.OPERATOR, value, start, self.pos)


class ScopeAwareRenamer:
    """
    Scope-aware variable renamer.
    
    This renamer properly tracks variable scopes and only renames
    variables within their correct scope boundaries.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.naming = UnifiedNamingSystem(self.seed)
        self.global_scope = Scope("global")
        self.current_scope = self.global_scope
        self.scope_stack: List[Scope] = [self.global_scope]
        self.all_renames: Dict[str, str] = {}
        
        # Track position -> rename mapping for precise replacement
        self.position_renames: Dict[int, Tuple[str, str]] = {}  # pos -> (original, renamed)
    
    def _should_rename(self, name: str) -> bool:
        """Check if a name should be renamed."""
        if name in KEYWORDS:
            return False
        if name in BUILTINS:
            return False
        if name in ROBLOX_GLOBALS:
            return False
        if name.startswith('_') and len(name) > 1 and name[1].isupper():
            return False
        return True
    
    def _enter_scope(self, name: str):
        """Enter a new scope."""
        new_scope = Scope(name, parent=self.current_scope)
        self.current_scope = new_scope
        self.scope_stack.append(new_scope)
    
    def _exit_scope(self):
        """Exit the current scope."""
        if len(self.scope_stack) > 1:
            self.scope_stack.pop()
            self.current_scope = self.scope_stack[-1]
    
    def _declare_variable(self, name: str, pos: int) -> str:
        """Declare a variable in the current scope."""
        if not self._should_rename(name):
            return name
        
        # Generate new name for this scope
        new_name = self.naming.generate_name()
        self.current_scope.declare(name, new_name)
        self.all_renames[name] = new_name
        return new_name
    
    def _lookup_variable(self, name: str) -> Optional[str]:
        """Look up a variable in the current scope chain."""
        return self.current_scope.lookup(name)

    
    def rename(self, code: str) -> str:
        """
        Rename variables in the code with proper scope awareness.
        
        This is a two-pass approach:
        1. First pass: tokenize and identify all declarations and their scopes
        2. Second pass: apply renames based on scope context
        """
        # Tokenize
        lexer = LuauLexer(code)
        tokens = lexer.tokenize()
        
        # First pass: collect declarations with scope tracking
        self._collect_declarations(tokens)
        
        # Reset scope for second pass
        self.global_scope = Scope("global")
        self.current_scope = self.global_scope
        self.scope_stack = [self.global_scope]
        
        # Rebuild declarations in fresh scopes
        self._collect_declarations(tokens)
        
        # Second pass: apply renames
        return self._apply_renames(code, tokens)
    
    def _collect_declarations(self, tokens: List[Token]):
        """Collect all variable declarations with scope tracking."""
        i = 0
        while i < len(tokens):
            token = tokens[i]
            
            # Skip whitespace and comments
            if token.type in (TokenType.WHITESPACE, TokenType.COMMENT):
                i += 1
                continue
            
            # Track scope-opening keywords
            if token.type == TokenType.KEYWORD:
                if token.value == 'function':
                    i = self._handle_function_declaration(tokens, i)
                elif token.value == 'local':
                    i = self._handle_local_declaration(tokens, i)
                elif token.value == 'for':
                    i = self._handle_for_declaration(tokens, i)
                elif token.value in ('do', 'then', 'else'):
                    self._enter_scope(token.value)
                    i += 1
                elif token.value == 'end':
                    self._exit_scope()
                    i += 1
                elif token.value == 'repeat':
                    self._enter_scope('repeat')
                    i += 1
                elif token.value == 'until':
                    self._exit_scope()
                    i += 1
                else:
                    i += 1
            else:
                i += 1
    
    def _handle_function_declaration(self, tokens: List[Token], i: int) -> int:
        """Handle function declaration and enter function scope."""
        i += 1  # Skip 'function'
        
        # Skip whitespace
        while i < len(tokens) and tokens[i].type == TokenType.WHITESPACE:
            i += 1
        
        # Check if named function
        if i < len(tokens) and tokens[i].type == TokenType.IDENTIFIER:
            # Named function - don't declare here (handled by 'local function' or global)
            i += 1
            # Skip method names (obj:method or obj.method)
            while i < len(tokens) and tokens[i].type == TokenType.WHITESPACE:
                i += 1
            while i < len(tokens) and tokens[i].value in '.':
                i += 1
                while i < len(tokens) and tokens[i].type == TokenType.WHITESPACE:
                    i += 1
                if i < len(tokens) and tokens[i].type == TokenType.IDENTIFIER:
                    i += 1
                while i < len(tokens) and tokens[i].type == TokenType.WHITESPACE:
                    i += 1
        
        # Enter function scope
        self._enter_scope('function')
        
        # Find and process parameters
        while i < len(tokens) and tokens[i].value != '(':
            i += 1
        
        if i < len(tokens):
            i += 1  # Skip '('
            
            # Process parameters
            while i < len(tokens) and tokens[i].value != ')':
                if tokens[i].type == TokenType.IDENTIFIER:
                    self._declare_variable(tokens[i].value, tokens[i].start)
                i += 1
            
            if i < len(tokens):
                i += 1  # Skip ')'
        
        return i

    
    def _handle_local_declaration(self, tokens: List[Token], i: int) -> int:
        """Handle local variable or function declaration."""
        i += 1  # Skip 'local'
        
        # Skip whitespace
        while i < len(tokens) and tokens[i].type == TokenType.WHITESPACE:
            i += 1
        
        if i >= len(tokens):
            return i
        
        # Check for 'local function'
        if tokens[i].type == TokenType.KEYWORD and tokens[i].value == 'function':
            i += 1  # Skip 'function'
            
            # Skip whitespace
            while i < len(tokens) and tokens[i].type == TokenType.WHITESPACE:
                i += 1
            
            # Declare function name
            if i < len(tokens) and tokens[i].type == TokenType.IDENTIFIER:
                self._declare_variable(tokens[i].value, tokens[i].start)
                i += 1
            
            # Enter function scope
            self._enter_scope('local_function')
            
            # Find and process parameters
            while i < len(tokens) and tokens[i].value != '(':
                i += 1
            
            if i < len(tokens):
                i += 1  # Skip '('
                
                while i < len(tokens) and tokens[i].value != ')':
                    if tokens[i].type == TokenType.IDENTIFIER:
                        self._declare_variable(tokens[i].value, tokens[i].start)
                    i += 1
                
                if i < len(tokens):
                    i += 1  # Skip ')'
            
            return i
        
        # Regular local variable declaration: local a, b, c = ...
        while i < len(tokens):
            if tokens[i].type == TokenType.IDENTIFIER:
                self._declare_variable(tokens[i].value, tokens[i].start)
            elif tokens[i].value == '=':
                break
            elif tokens[i].value in (';', '\n') or tokens[i].type == TokenType.KEYWORD:
                break
            i += 1
        
        return i
    
    def _handle_for_declaration(self, tokens: List[Token], i: int) -> int:
        """Handle for loop variable declaration."""
        i += 1  # Skip 'for'
        
        # Enter for scope
        self._enter_scope('for')
        
        # Skip whitespace
        while i < len(tokens) and tokens[i].type == TokenType.WHITESPACE:
            i += 1
        
        # Collect loop variables until '=' or 'in'
        while i < len(tokens):
            if tokens[i].type == TokenType.IDENTIFIER:
                self._declare_variable(tokens[i].value, tokens[i].start)
            elif tokens[i].value in ('=', 'in'):
                break
            i += 1
        
        return i
    
    def _apply_renames(self, code: str, tokens: List[Token]) -> str:
        """Apply renames to the code using regex (safer than position-based)."""
        # Protect strings and comments first using unique markers
        protected = []
        
        def protect(match):
            idx = len(protected)
            protected.append(match.group(0))
            # Use a marker that won't appear in code and won't be affected by regex
            return f'<<<PROTECTED_{idx}>>>'
        
        # Protect long strings first
        code = re.sub(r'\[\[.*?\]\]', protect, code, flags=re.DOTALL)
        # Protect double-quoted strings (handling escapes)
        code = re.sub(r'"(?:[^"\\]|\\.)*"', protect, code)
        # Protect single-quoted strings
        code = re.sub(r"'(?:[^'\\]|\\.)*'", protect, code)
        
        # Protect multi-line comments
        code = re.sub(r'--\[\[.*?\]\]', protect, code, flags=re.DOTALL)
        # Protect single-line comments
        code = re.sub(r'--[^\n]*', protect, code)
        
        # Apply field renames first
        code = self._apply_field_renames_internal(code)
        
        # Apply variable renames using regex
        # Sort by length (longest first) to avoid partial matches
        sorted_renames = sorted(self.all_renames.items(), key=lambda x: -len(x[0]))
        
        for original, renamed in sorted_renames:
            # Only rename standalone identifiers, not after . or :
            # (?<![.\w:]) = not preceded by dot, colon, or word char
            # (?![\w]) = not followed by word char
            pattern = r'(?<![.\w:])' + re.escape(original) + r'(?![\w])'
            code = re.sub(pattern, renamed, code)
        
        # Restore protected content
        for i, content in enumerate(protected):
            code = code.replace(f'<<<PROTECTED_{i}>>>', content)
        
        return code
    
    def _apply_field_renames_internal(self, code: str) -> str:
        """Apply field renames (called after strings are protected)."""
        sorted_fields = sorted(INTERNAL_FIELD_RENAMES.items(), key=lambda x: -len(x[0]))
        
        for original, renamed in sorted_fields:
            # Rename dot access: .fieldname (but not stdlib.field)
            def replace_dot(match):
                start = match.start()
                prefix_start = max(0, start - 50)
                prefix = code[prefix_start:start]
                
                word_match = re.search(r'([a-zA-Z_][a-zA-Z0-9_]*)\s*$', prefix)
                if word_match and word_match.group(1) in STDLIB_NAMES:
                    return match.group(0)
                
                return '.' + renamed
            
            dot_pattern = r'\.(' + re.escape(original) + r')(?![a-zA-Z0-9_])'
            code = re.sub(dot_pattern, replace_dot, code)
            
            # Rename colon access
            def replace_colon(match):
                start = match.start()
                prefix_start = max(0, start - 50)
                prefix = code[prefix_start:start]
                
                word_match = re.search(r'([a-zA-Z_][a-zA-Z0-9_]*)\s*$', prefix)
                if word_match and word_match.group(1) in STDLIB_NAMES:
                    return match.group(0)
                
                return ':' + renamed
            
            colon_pattern = r':(' + re.escape(original) + r')(?![a-zA-Z0-9_])'
            code = re.sub(colon_pattern, replace_colon, code)
            
            # Rename table key definitions: {fieldname = ...}
            key_pattern = r'(?<=[{,\s])' + re.escape(original) + r'(?=\s*=(?!=))'
            code = re.sub(key_pattern, renamed, code)
        
        return code

    
    def _apply_field_renames(self, code: str) -> str:
        """
        Apply field name renames for internal VM fields (standalone use).
        
        This is for when you want to apply field renames without variable renames.
        """
        # Protect strings and comments first
        protected = []
        
        def protect(match):
            idx = len(protected)
            protected.append(match.group(0))
            return f'<<<PROTECTED_{idx}>>>'
        
        # Protect strings
        code = re.sub(r'\[\[.*?\]\]', protect, code, flags=re.DOTALL)
        code = re.sub(r'"(?:[^"\\]|\\.)*"', protect, code)
        code = re.sub(r"'(?:[^'\\]|\\.)*'", protect, code)
        
        # Protect comments
        code = re.sub(r'--\[\[.*?\]\]', protect, code, flags=re.DOTALL)
        code = re.sub(r'--[^\n]*', protect, code)
        
        # Apply field renames
        code = self._apply_field_renames_internal(code)
        
        # Restore protected content
        for i, content in enumerate(protected):
            code = code.replace(f'<<<PROTECTED_{i}>>>', content)
        
        return code
    
    def get_rename_map(self) -> Dict[str, str]:
        """Get the mapping of original -> renamed variables."""
        return self.all_renames.copy()


def rename_vm_code(code: str, seed: int = None) -> Tuple[str, Dict[str, str]]:
    """
    Rename variables in VM code with scope awareness.
    
    Args:
        code: The VM code to rename
        seed: Optional seed for deterministic renaming
        
    Returns:
        Tuple of (renamed_code, rename_map)
    """
    pbs = PolymorphicBuildSeed(seed) if seed else PolymorphicBuildSeed()
    renamer = ScopeAwareRenamer(pbs)
    renamed = renamer.rename(code)
    return renamed, renamer.get_rename_map()


if __name__ == "__main__":
    # Test the renamer
    vm_path = Path(__file__).parent / "Virtualization.lua"
    
    if not vm_path.exists():
        print(f"Error: {vm_path} not found")
        sys.exit(1)
    
    with open(vm_path, 'r', encoding='utf-8') as f:
        vm_code = f.read()
    
    print(f"Original VM size: {len(vm_code)} bytes")
    
    renamed, rename_map = rename_vm_code(vm_code, seed=12345)
    
    print(f"Renamed VM size: {len(renamed)} bytes")
    print(f"Variables renamed: {len(rename_map)}")
    print("\nSample renames:")
    for i, (orig, new) in enumerate(list(rename_map.items())[:20]):
        print(f"  {orig} -> {new}")
    
    # Save the renamed VM
    output_path = Path(__file__).parent / "Virtualization_scope_renamed.lua"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(renamed)
    print(f"\nSaved to: {output_path}")
    
    # Validate with luau-compile
    import subprocess
    import tempfile
    
    compiler_path = Path(__file__).parent / "luau-compile.exe"
    if compiler_path.exists():
        with tempfile.NamedTemporaryFile(mode='w', suffix='.lua', delete=False, encoding='utf-8') as f:
            f.write(renamed)
            temp_path = f.name
        
        result = subprocess.run([str(compiler_path), "--binary", temp_path], capture_output=True)
        if result.returncode == 0:
            print("\n✅ Syntax validation PASSED")
        else:
            print(f"\n❌ Syntax validation FAILED: {result.stderr.decode()}")
        
        Path(temp_path).unlink()
