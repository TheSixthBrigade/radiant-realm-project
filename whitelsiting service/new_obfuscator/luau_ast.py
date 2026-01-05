#!/usr/bin/env python3
"""
Luau AST Parser - A proper AST parser for Luau/Roblox code.

This parser handles all Luau-specific syntax including:
- Binary literals (0b11111111, 0B1010)
- Underscore number separators (0x5_A, 0B1111__1111)
- continue statement
- Type annotations (basic support)
- Compound assignment operators (+=, -=, etc.)

The parser produces an AST that can be traversed and transformed
for control flow flattening and other obfuscation techniques.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Union, Any
from enum import Enum, auto
import re


class TokenType(Enum):
    """Token types for the Luau lexer."""
    # Literals
    NUMBER = auto()
    STRING = auto()
    NAME = auto()
    
    # Keywords
    AND = auto()
    BREAK = auto()
    CONTINUE = auto()  # Luau-specific
    DO = auto()
    ELSE = auto()
    ELSEIF = auto()
    END = auto()
    FALSE = auto()
    FOR = auto()
    FUNCTION = auto()
    IF = auto()
    IN = auto()
    LOCAL = auto()
    NIL = auto()
    NOT = auto()
    OR = auto()
    REPEAT = auto()
    RETURN = auto()
    THEN = auto()
    TRUE = auto()
    UNTIL = auto()
    WHILE = auto()

    # Operators
    PLUS = auto()
    MINUS = auto()
    STAR = auto()
    SLASH = auto()
    PERCENT = auto()
    CARET = auto()
    HASH = auto()
    EQ = auto()
    NE = auto()
    LT = auto()
    LE = auto()
    GT = auto()
    GE = auto()
    ASSIGN = auto()
    LPAREN = auto()
    RPAREN = auto()
    LBRACE = auto()
    RBRACE = auto()
    LBRACKET = auto()
    RBRACKET = auto()
    SEMICOLON = auto()
    COLON = auto()
    COMMA = auto()
    DOT = auto()
    DOTDOT = auto()
    DOTDOTDOT = auto()
    DOUBLECOLON = auto()  # ::
    
    # Luau-specific operators
    DOUBLESLASH = auto()  # // integer division
    
    # Compound assignment (Luau)
    PLUSEQ = auto()
    MINUSEQ = auto()
    STAREQ = auto()
    SLASHEQ = auto()
    DOUBLESLASHEQ = auto()  # //=
    PERCENTEQ = auto()
    CARETEQ = auto()
    DOTDOTEQ = auto()
    
    # Special
    EOF = auto()
    COMMENT = auto()
    NEWLINE = auto()


@dataclass
class Token:
    """A lexer token."""
    type: TokenType
    value: Any
    line: int
    column: int


# Keywords mapping
KEYWORDS = {
    'and': TokenType.AND,
    'break': TokenType.BREAK,
    'continue': TokenType.CONTINUE,
    'do': TokenType.DO,
    'else': TokenType.ELSE,
    'elseif': TokenType.ELSEIF,
    'end': TokenType.END,
    'false': TokenType.FALSE,
    'for': TokenType.FOR,
    'function': TokenType.FUNCTION,
    'if': TokenType.IF,
    'in': TokenType.IN,
    'local': TokenType.LOCAL,
    'nil': TokenType.NIL,
    'not': TokenType.NOT,
    'or': TokenType.OR,
    'repeat': TokenType.REPEAT,
    'return': TokenType.RETURN,
    'then': TokenType.THEN,
    'true': TokenType.TRUE,
    'until': TokenType.UNTIL,
    'while': TokenType.WHILE,
}


class LuauLexer:
    """Lexer for Luau code."""
    
    def __init__(self, source: str):
        self.source = source
        self.pos = 0
        self.line = 1
        self.column = 1
        self.tokens: List[Token] = []
    
    def peek(self, offset: int = 0) -> str:
        """Peek at character at current position + offset."""
        pos = self.pos + offset
        if pos >= len(self.source):
            return ''
        return self.source[pos]
    
    def advance(self) -> str:
        """Advance to next character."""
        char = self.peek()
        self.pos += 1
        if char == '\n':
            self.line += 1
            self.column = 1
        else:
            self.column += 1
        return char
    
    def skip_whitespace(self):
        """Skip whitespace characters."""
        while self.pos < len(self.source) and self.peek() in ' \t\r\n':
            self.advance()
    
    def skip_comment(self):
        """Skip a comment."""
        if self.peek() == '-' and self.peek(1) == '-':
            self.advance()  # -
            self.advance()  # -
            
            # Check for long comment --[[ ... ]]
            if self.peek() == '[' and self.peek(1) == '[':
                self.advance()  # [
                self.advance()  # [
                while self.pos < len(self.source):
                    if self.peek() == ']' and self.peek(1) == ']':
                        self.advance()  # ]
                        self.advance()  # ]
                        return
                    self.advance()
            else:
                # Single line comment
                while self.peek() and self.peek() != '\n':
                    self.advance()
    
    def read_string(self) -> str:
        """Read a string literal."""
        quote = self.advance()  # ' or "
        result = quote
        
        while self.peek() and self.peek() != quote:
            if self.peek() == '\\':
                result += self.advance()  # backslash
                if self.peek():
                    result += self.advance()  # escaped char
            else:
                result += self.advance()
        
        if self.peek() == quote:
            result += self.advance()
        
        return result

    
    def read_long_string(self) -> str:
        """Read a long string [[...]] or [=[...]=]."""
        result = '['
        self.advance()  # [
        
        # Count equals signs
        equals = 0
        while self.peek() == '=':
            result += self.advance()
            equals += 1
        
        if self.peek() != '[':
            return result  # Not a long string
        
        result += self.advance()  # [
        
        # Read until matching ]=*]
        while self.pos < len(self.source):
            if self.peek() == ']':
                # Check for matching close
                close_start = self.pos
                result += self.advance()  # ]
                eq_count = 0
                while self.peek() == '=' and eq_count < equals:
                    result += self.advance()
                    eq_count += 1
                if eq_count == equals and self.peek() == ']':
                    result += self.advance()  # ]
                    return result
            else:
                result += self.advance()
        
        return result
    
    def read_number(self) -> str:
        """Read a number literal (including Luau binary/hex with underscores)."""
        result = ''
        
        # Check for hex or binary prefix
        if self.peek() == '0' and self.peek(1) in 'xXbB':
            result += self.advance()  # 0
            result += self.advance()  # x/X/b/B
            
            # Read hex/binary digits with underscores
            while self.peek() in '0123456789abcdefABCDEF_':
                result += self.advance()
        else:
            # Decimal number
            while self.peek() in '0123456789_':
                result += self.advance()
            
            # Decimal point
            if self.peek() == '.' and self.peek(1) in '0123456789':
                result += self.advance()  # .
                while self.peek() in '0123456789_':
                    result += self.advance()
            
            # Exponent
            if self.peek() in 'eE':
                result += self.advance()
                if self.peek() in '+-':
                    result += self.advance()
                while self.peek() in '0123456789_':
                    result += self.advance()
        
        return result
    
    def read_name(self) -> str:
        """Read an identifier or keyword."""
        result = ''
        while self.peek() and (self.peek().isalnum() or self.peek() == '_'):
            result += self.advance()
        return result

    
    def tokenize(self) -> List[Token]:
        """Tokenize the source code."""
        while self.pos < len(self.source):
            self.skip_whitespace()
            if self.pos >= len(self.source):
                break
            
            # Skip comments
            if self.peek() == '-' and self.peek(1) == '-':
                self.skip_comment()
                continue
            
            line, col = self.line, self.column
            char = self.peek()
            
            # String literals
            if char in '"\'':
                value = self.read_string()
                self.tokens.append(Token(TokenType.STRING, value, line, col))
            
            # Long strings
            elif char == '[' and self.peek(1) in '[=':
                value = self.read_long_string()
                self.tokens.append(Token(TokenType.STRING, value, line, col))
            
            # Numbers
            elif char.isdigit():
                value = self.read_number()
                self.tokens.append(Token(TokenType.NUMBER, value, line, col))
            
            # Names/keywords
            elif char.isalpha() or char == '_':
                value = self.read_name()
                token_type = KEYWORDS.get(value, TokenType.NAME)
                self.tokens.append(Token(token_type, value, line, col))
            
            # Operators and punctuation
            elif char == '+':
                self.advance()
                if self.peek() == '=':
                    self.advance()
                    self.tokens.append(Token(TokenType.PLUSEQ, '+=', line, col))
                else:
                    self.tokens.append(Token(TokenType.PLUS, '+', line, col))
            
            elif char == '-':
                self.advance()
                if self.peek() == '=':
                    self.advance()
                    self.tokens.append(Token(TokenType.MINUSEQ, '-=', line, col))
                else:
                    self.tokens.append(Token(TokenType.MINUS, '-', line, col))
            
            elif char == '*':
                self.advance()
                if self.peek() == '=':
                    self.advance()
                    self.tokens.append(Token(TokenType.STAREQ, '*=', line, col))
                else:
                    self.tokens.append(Token(TokenType.STAR, '*', line, col))
            
            elif char == '/':
                self.advance()
                if self.peek() == '/':
                    self.advance()
                    if self.peek() == '=':
                        self.advance()
                        self.tokens.append(Token(TokenType.DOUBLESLASHEQ, '//=', line, col))
                    else:
                        self.tokens.append(Token(TokenType.DOUBLESLASH, '//', line, col))
                elif self.peek() == '=':
                    self.advance()
                    self.tokens.append(Token(TokenType.SLASHEQ, '/=', line, col))
                else:
                    self.tokens.append(Token(TokenType.SLASH, '/', line, col))

            
            elif char == '%':
                self.advance()
                if self.peek() == '=':
                    self.advance()
                    self.tokens.append(Token(TokenType.PERCENTEQ, '%=', line, col))
                else:
                    self.tokens.append(Token(TokenType.PERCENT, '%', line, col))
            
            elif char == '^':
                self.advance()
                if self.peek() == '=':
                    self.advance()
                    self.tokens.append(Token(TokenType.CARETEQ, '^=', line, col))
                else:
                    self.tokens.append(Token(TokenType.CARET, '^', line, col))
            
            elif char == '#':
                self.advance()
                self.tokens.append(Token(TokenType.HASH, '#', line, col))
            
            elif char == '=':
                self.advance()
                if self.peek() == '=':
                    self.advance()
                    self.tokens.append(Token(TokenType.EQ, '==', line, col))
                else:
                    self.tokens.append(Token(TokenType.ASSIGN, '=', line, col))
            
            elif char == '~':
                self.advance()
                if self.peek() == '=':
                    self.advance()
                    self.tokens.append(Token(TokenType.NE, '~=', line, col))
            
            elif char == '<':
                self.advance()
                if self.peek() == '=':
                    self.advance()
                    self.tokens.append(Token(TokenType.LE, '<=', line, col))
                else:
                    self.tokens.append(Token(TokenType.LT, '<', line, col))
            
            elif char == '>':
                self.advance()
                if self.peek() == '=':
                    self.advance()
                    self.tokens.append(Token(TokenType.GE, '>=', line, col))
                else:
                    self.tokens.append(Token(TokenType.GT, '>', line, col))
            
            elif char == '(':
                self.advance()
                self.tokens.append(Token(TokenType.LPAREN, '(', line, col))
            
            elif char == ')':
                self.advance()
                self.tokens.append(Token(TokenType.RPAREN, ')', line, col))
            
            elif char == '{':
                self.advance()
                self.tokens.append(Token(TokenType.LBRACE, '{', line, col))
            
            elif char == '}':
                self.advance()
                self.tokens.append(Token(TokenType.RBRACE, '}', line, col))
            
            elif char == '[':
                self.advance()
                self.tokens.append(Token(TokenType.LBRACKET, '[', line, col))
            
            elif char == ']':
                self.advance()
                self.tokens.append(Token(TokenType.RBRACKET, ']', line, col))

            
            elif char == ';':
                self.advance()
                self.tokens.append(Token(TokenType.SEMICOLON, ';', line, col))
            
            elif char == ':':
                self.advance()
                if self.peek() == ':':
                    self.advance()
                    self.tokens.append(Token(TokenType.DOUBLECOLON, '::', line, col))
                else:
                    self.tokens.append(Token(TokenType.COLON, ':', line, col))
            
            elif char == ',':
                self.advance()
                self.tokens.append(Token(TokenType.COMMA, ',', line, col))
            
            elif char == '.':
                self.advance()
                if self.peek() == '.':
                    self.advance()
                    if self.peek() == '.':
                        self.advance()
                        self.tokens.append(Token(TokenType.DOTDOTDOT, '...', line, col))
                    elif self.peek() == '=':
                        self.advance()
                        self.tokens.append(Token(TokenType.DOTDOTEQ, '..=', line, col))
                    else:
                        self.tokens.append(Token(TokenType.DOTDOT, '..', line, col))
                else:
                    self.tokens.append(Token(TokenType.DOT, '.', line, col))
            
            else:
                # Unknown character, skip it
                self.advance()
        
        self.tokens.append(Token(TokenType.EOF, '', self.line, self.column))
        return self.tokens


# AST Node classes
@dataclass
class ASTNode:
    """Base class for all AST nodes."""
    line: int = 0
    column: int = 0


@dataclass
class Block(ASTNode):
    """A block of statements."""
    statements: List[ASTNode] = field(default_factory=list)


@dataclass
class LocalAssign(ASTNode):
    """Local variable assignment: local x = 1"""
    names: List[str] = field(default_factory=list)
    values: List[ASTNode] = field(default_factory=list)


@dataclass
class Assign(ASTNode):
    """Assignment: x = 1"""
    targets: List[ASTNode] = field(default_factory=list)
    values: List[ASTNode] = field(default_factory=list)


@dataclass
class LocalFunction(ASTNode):
    """Local function: local function foo() end"""
    name: str = ''
    params: List[str] = field(default_factory=list)
    body: Block = None
    is_vararg: bool = False


@dataclass
class Function(ASTNode):
    """Function definition: function foo() end"""
    name: ASTNode = None  # Can be Name, Index, or Method
    params: List[str] = field(default_factory=list)
    body: Block = None
    is_vararg: bool = False


@dataclass
class AnonymousFunction(ASTNode):
    """Anonymous function: function() end"""
    params: List[str] = field(default_factory=list)
    body: Block = None
    is_vararg: bool = False


@dataclass
class If(ASTNode):
    """If statement."""
    condition: ASTNode = None
    then_block: Block = None
    elseif_blocks: List[tuple] = field(default_factory=list)  # [(condition, block), ...]
    else_block: Block = None


@dataclass
class While(ASTNode):
    """While loop."""
    condition: ASTNode = None
    body: Block = None


@dataclass
class Repeat(ASTNode):
    """Repeat-until loop."""
    body: Block = None
    condition: ASTNode = None


@dataclass
class ForNumeric(ASTNode):
    """Numeric for loop: for i = 1, 10 do end"""
    var: str = ''
    start: ASTNode = None
    stop: ASTNode = None
    step: ASTNode = None
    body: Block = None


@dataclass
class ForGeneric(ASTNode):
    """Generic for loop: for k, v in pairs(t) do end"""
    vars: List[str] = field(default_factory=list)
    iterators: List[ASTNode] = field(default_factory=list)
    body: Block = None


@dataclass
class Do(ASTNode):
    """Do block: do ... end"""
    body: Block = None


@dataclass
class Return(ASTNode):
    """Return statement."""
    values: List[ASTNode] = field(default_factory=list)


@dataclass
class Break(ASTNode):
    """Break statement."""
    pass


@dataclass
class Continue(ASTNode):
    """Continue statement (Luau-specific)."""
    pass


@dataclass
class IfExpr(ASTNode):
    """Luau if-expression: if cond then val1 else val2"""
    condition: ASTNode = None
    then_value: ASTNode = None
    elseif_parts: List[tuple] = field(default_factory=list)  # [(cond, value), ...]
    else_value: ASTNode = None


@dataclass
class Call(ASTNode):
    """Function call."""
    func: ASTNode = None
    args: List[ASTNode] = field(default_factory=list)


@dataclass
class MethodCall(ASTNode):
    """Method call: obj:method(args)"""
    obj: ASTNode = None
    method: str = ''
    args: List[ASTNode] = field(default_factory=list)


@dataclass
class Name(ASTNode):
    """Variable name."""
    name: str = ''


@dataclass
class Number(ASTNode):
    """Number literal."""
    value: str = ''  # Keep as string to preserve format


@dataclass
class String(ASTNode):
    """String literal."""
    value: str = ''


@dataclass
class Boolean(ASTNode):
    """Boolean literal."""
    value: bool = False


@dataclass
class Nil(ASTNode):
    """Nil literal."""
    pass


@dataclass
class Vararg(ASTNode):
    """Vararg expression: ..."""
    pass


@dataclass
class Table(ASTNode):
    """Table constructor: {a=1, b=2}"""
    fields: List[ASTNode] = field(default_factory=list)


@dataclass
class TableField(ASTNode):
    """Table field: key = value or [key] = value"""
    key: ASTNode = None  # None for array-style
    value: ASTNode = None


@dataclass
class Index(ASTNode):
    """Index expression: t[k] or t.k"""
    obj: ASTNode = None
    key: ASTNode = None


@dataclass
class BinaryOp(ASTNode):
    """Binary operation."""
    op: str = ''
    left: ASTNode = None
    right: ASTNode = None


@dataclass
class UnaryOp(ASTNode):
    """Unary operation."""
    op: str = ''
    operand: ASTNode = None


class LuauParser:
    """Parser for Luau code."""
    
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0
    
    def peek(self, offset: int = 0) -> Token:
        """Peek at token at current position + offset."""
        pos = self.pos + offset
        if pos >= len(self.tokens):
            return self.tokens[-1]  # EOF
        return self.tokens[pos]
    
    def advance(self) -> Token:
        """Advance to next token."""
        token = self.peek()
        self.pos += 1
        return token
    
    def match(self, *types: TokenType) -> bool:
        """Check if current token matches any of the given types."""
        return self.peek().type in types
    
    def expect(self, type: TokenType, msg: str = '') -> Token:
        """Expect current token to be of given type."""
        if not self.match(type):
            token = self.peek()
            raise SyntaxError(f"Expected {type.name} at line {token.line}, got {token.type.name}: {msg}")
        return self.advance()

    
    def parse(self) -> Block:
        """Parse the token stream into an AST."""
        return self.parse_block()
    
    def parse_block(self, end_tokens: tuple = (TokenType.EOF,)) -> Block:
        """Parse a block of statements."""
        block = Block(line=self.peek().line, column=self.peek().column)
        
        while not self.match(*end_tokens):
            stmt = self.parse_statement()
            if stmt:
                block.statements.append(stmt)
            
            # Optional semicolon
            if self.match(TokenType.SEMICOLON):
                self.advance()
        
        return block
    
    def parse_statement(self) -> Optional[ASTNode]:
        """Parse a single statement."""
        token = self.peek()
        
        if self.match(TokenType.LOCAL):
            return self.parse_local()
        elif self.match(TokenType.FUNCTION):
            return self.parse_function()
        elif self.match(TokenType.IF):
            return self.parse_if()
        elif self.match(TokenType.WHILE):
            return self.parse_while()
        elif self.match(TokenType.REPEAT):
            return self.parse_repeat()
        elif self.match(TokenType.FOR):
            return self.parse_for()
        elif self.match(TokenType.DO):
            return self.parse_do()
        elif self.match(TokenType.RETURN):
            return self.parse_return()
        elif self.match(TokenType.BREAK):
            self.advance()
            return Break(line=token.line, column=token.column)
        elif self.match(TokenType.CONTINUE):
            self.advance()
            return Continue(line=token.line, column=token.column)
        elif self.match(TokenType.DOUBLECOLON):
            # Label ::name::
            self.advance()
            self.expect(TokenType.NAME)
            self.expect(TokenType.DOUBLECOLON)
            return None  # Skip labels for now
        else:
            # Expression statement (assignment or function call)
            return self.parse_expr_statement()
    
    def parse_local(self) -> ASTNode:
        """Parse local statement."""
        token = self.advance()  # local
        
        if self.match(TokenType.FUNCTION):
            # local function
            self.advance()
            name_token = self.expect(TokenType.NAME)
            params, is_vararg = self.parse_params()
            body = self.parse_block((TokenType.END,))
            self.expect(TokenType.END)
            return LocalFunction(
                name=name_token.value,
                params=params,
                body=body,
                is_vararg=is_vararg,
                line=token.line,
                column=token.column
            )
        else:
            # local var = value
            names = [self.expect(TokenType.NAME).value]
            while self.match(TokenType.COMMA):
                self.advance()
                names.append(self.expect(TokenType.NAME).value)
            
            values = []
            if self.match(TokenType.ASSIGN):
                self.advance()
                values = self.parse_expr_list()
            
            return LocalAssign(names=names, values=values, line=token.line, column=token.column)

    
    def parse_function(self) -> Function:
        """Parse function definition."""
        token = self.advance()  # function
        name = self.parse_func_name()
        params, is_vararg = self.parse_params()
        body = self.parse_block((TokenType.END,))
        self.expect(TokenType.END)
        return Function(name=name, params=params, body=body, is_vararg=is_vararg,
                       line=token.line, column=token.column)
    
    def parse_func_name(self) -> ASTNode:
        """Parse function name (can be a.b.c or a.b:c)."""
        name = Name(name=self.expect(TokenType.NAME).value)
        
        while self.match(TokenType.DOT):
            self.advance()
            field = self.expect(TokenType.NAME).value
            name = Index(obj=name, key=String(value=f'"{field}"'))
        
        if self.match(TokenType.COLON):
            self.advance()
            method = self.expect(TokenType.NAME).value
            # Method syntax - add implicit self parameter
            return Index(obj=name, key=String(value=f'"{method}"'))
        
        return name
    
    def parse_params(self) -> tuple:
        """Parse function parameters. Returns (params, is_vararg)."""
        self.expect(TokenType.LPAREN)
        params = []
        is_vararg = False
        
        if not self.match(TokenType.RPAREN):
            if self.match(TokenType.DOTDOTDOT):
                self.advance()
                is_vararg = True
            else:
                params.append(self.expect(TokenType.NAME).value)
                
                while self.match(TokenType.COMMA):
                    self.advance()
                    if self.match(TokenType.DOTDOTDOT):
                        self.advance()
                        is_vararg = True
                        break
                    params.append(self.expect(TokenType.NAME).value)
        
        self.expect(TokenType.RPAREN)
        return params, is_vararg
    
    def parse_if(self) -> If:
        """Parse if statement."""
        token = self.advance()  # if
        condition = self.parse_expr()
        self.expect(TokenType.THEN)
        then_block = self.parse_block((TokenType.ELSEIF, TokenType.ELSE, TokenType.END))
        
        elseif_blocks = []
        while self.match(TokenType.ELSEIF):
            self.advance()
            elseif_cond = self.parse_expr()
            self.expect(TokenType.THEN)
            elseif_body = self.parse_block((TokenType.ELSEIF, TokenType.ELSE, TokenType.END))
            elseif_blocks.append((elseif_cond, elseif_body))
        
        else_block = None
        if self.match(TokenType.ELSE):
            self.advance()
            else_block = self.parse_block((TokenType.END,))
        
        self.expect(TokenType.END)
        return If(condition=condition, then_block=then_block,
                 elseif_blocks=elseif_blocks, else_block=else_block,
                 line=token.line, column=token.column)

    
    def parse_while(self) -> While:
        """Parse while loop."""
        token = self.advance()  # while
        condition = self.parse_expr()
        self.expect(TokenType.DO)
        body = self.parse_block((TokenType.END,))
        self.expect(TokenType.END)
        return While(condition=condition, body=body, line=token.line, column=token.column)
    
    def parse_repeat(self) -> Repeat:
        """Parse repeat-until loop."""
        token = self.advance()  # repeat
        body = self.parse_block((TokenType.UNTIL,))
        self.expect(TokenType.UNTIL)
        condition = self.parse_expr()
        return Repeat(body=body, condition=condition, line=token.line, column=token.column)
    
    def parse_for(self) -> ASTNode:
        """Parse for loop (numeric or generic)."""
        token = self.advance()  # for
        first_name = self.expect(TokenType.NAME).value
        
        if self.match(TokenType.ASSIGN):
            # Numeric for: for i = 1, 10 do
            self.advance()
            start = self.parse_expr()
            self.expect(TokenType.COMMA)
            stop = self.parse_expr()
            step = None
            if self.match(TokenType.COMMA):
                self.advance()
                step = self.parse_expr()
            self.expect(TokenType.DO)
            body = self.parse_block((TokenType.END,))
            self.expect(TokenType.END)
            return ForNumeric(var=first_name, start=start, stop=stop, step=step, body=body,
                            line=token.line, column=token.column)
        else:
            # Generic for: for k, v in pairs(t) do
            vars = [first_name]
            while self.match(TokenType.COMMA):
                self.advance()
                vars.append(self.expect(TokenType.NAME).value)
            self.expect(TokenType.IN)
            iterators = self.parse_expr_list()
            self.expect(TokenType.DO)
            body = self.parse_block((TokenType.END,))
            self.expect(TokenType.END)
            return ForGeneric(vars=vars, iterators=iterators, body=body,
                            line=token.line, column=token.column)
    
    def parse_do(self) -> Do:
        """Parse do block."""
        token = self.advance()  # do
        body = self.parse_block((TokenType.END,))
        self.expect(TokenType.END)
        return Do(body=body, line=token.line, column=token.column)
    
    def parse_return(self) -> Return:
        """Parse return statement."""
        token = self.advance()  # return
        values = []
        if not self.match(TokenType.END, TokenType.ELSE, TokenType.ELSEIF, 
                         TokenType.UNTIL, TokenType.EOF, TokenType.SEMICOLON):
            values = self.parse_expr_list()
        return Return(values=values, line=token.line, column=token.column)

    
    def parse_expr_statement(self) -> Optional[ASTNode]:
        """Parse expression statement (assignment or call)."""
        expr = self.parse_prefix_expr()
        
        if expr is None:
            return None
        
        # Check for assignment
        if self.match(TokenType.ASSIGN, TokenType.COMMA):
            targets = [expr]
            while self.match(TokenType.COMMA):
                self.advance()
                targets.append(self.parse_prefix_expr())
            
            self.expect(TokenType.ASSIGN)
            values = self.parse_expr_list()
            return Assign(targets=targets, values=values, line=expr.line, column=expr.column)
        
        # Check for compound assignment
        if self.match(TokenType.PLUSEQ, TokenType.MINUSEQ, TokenType.STAREQ,
                     TokenType.SLASHEQ, TokenType.PERCENTEQ, TokenType.CARETEQ,
                     TokenType.DOTDOTEQ):
            op_token = self.advance()
            op = op_token.value[0]  # Get the operator without =
            value = self.parse_expr()
            # Convert to regular assignment: x += 1 -> x = x + 1
            return Assign(
                targets=[expr],
                values=[BinaryOp(op=op, left=expr, right=value)],
                line=expr.line, column=expr.column
            )
        
        # Just a function call
        if isinstance(expr, (Call, MethodCall)):
            return expr
        
        return None  # Not a valid statement
    
    def parse_expr_list(self) -> List[ASTNode]:
        """Parse comma-separated expression list."""
        exprs = [self.parse_expr()]
        while self.match(TokenType.COMMA):
            self.advance()
            exprs.append(self.parse_expr())
        return exprs
    
    def parse_expr(self) -> ASTNode:
        """Parse expression."""
        return self.parse_or_expr()
    
    def parse_or_expr(self) -> ASTNode:
        """Parse or expression."""
        left = self.parse_and_expr()
        while self.match(TokenType.OR):
            op = self.advance().value
            right = self.parse_and_expr()
            left = BinaryOp(op=op, left=left, right=right, line=left.line, column=left.column)
        return left
    
    def parse_and_expr(self) -> ASTNode:
        """Parse and expression."""
        left = self.parse_compare_expr()
        while self.match(TokenType.AND):
            op = self.advance().value
            right = self.parse_compare_expr()
            left = BinaryOp(op=op, left=left, right=right, line=left.line, column=left.column)
        return left

    
    def parse_compare_expr(self) -> ASTNode:
        """Parse comparison expression."""
        left = self.parse_concat_expr()
        while self.match(TokenType.LT, TokenType.LE, TokenType.GT, TokenType.GE,
                        TokenType.EQ, TokenType.NE):
            op = self.advance().value
            right = self.parse_concat_expr()
            left = BinaryOp(op=op, left=left, right=right, line=left.line, column=left.column)
        return left
    
    def parse_concat_expr(self) -> ASTNode:
        """Parse concatenation expression (right associative)."""
        left = self.parse_add_expr()
        if self.match(TokenType.DOTDOT):
            op = self.advance().value
            right = self.parse_concat_expr()  # Right associative
            return BinaryOp(op=op, left=left, right=right, line=left.line, column=left.column)
        return left
    
    def parse_add_expr(self) -> ASTNode:
        """Parse addition/subtraction expression."""
        left = self.parse_mul_expr()
        while self.match(TokenType.PLUS, TokenType.MINUS):
            op = self.advance().value
            right = self.parse_mul_expr()
            left = BinaryOp(op=op, left=left, right=right, line=left.line, column=left.column)
        return left
    
    def parse_mul_expr(self) -> ASTNode:
        """Parse multiplication/division expression."""
        left = self.parse_unary_expr()
        while self.match(TokenType.STAR, TokenType.SLASH, TokenType.DOUBLESLASH, TokenType.PERCENT):
            op = self.advance().value
            right = self.parse_unary_expr()
            left = BinaryOp(op=op, left=left, right=right, line=left.line, column=left.column)
        return left
    
    def parse_unary_expr(self) -> ASTNode:
        """Parse unary expression."""
        if self.match(TokenType.NOT, TokenType.MINUS, TokenType.HASH):
            op_token = self.advance()
            operand = self.parse_unary_expr()
            return UnaryOp(op=op_token.value, operand=operand,
                          line=op_token.line, column=op_token.column)
        return self.parse_power_expr()
    
    def parse_power_expr(self) -> ASTNode:
        """Parse power expression (right associative)."""
        left = self.parse_primary_expr()
        if self.match(TokenType.CARET):
            op = self.advance().value
            right = self.parse_unary_expr()  # Right associative
            return BinaryOp(op=op, left=left, right=right, line=left.line, column=left.column)
        return left

    
    def parse_primary_expr(self) -> ASTNode:
        """Parse primary expression."""
        return self.parse_prefix_expr()
    
    def parse_prefix_expr(self) -> ASTNode:
        """Parse prefix expression (name, call, index)."""
        token = self.peek()
        
        if self.match(TokenType.NAME):
            expr = Name(name=self.advance().value, line=token.line, column=token.column)
        elif self.match(TokenType.LPAREN):
            self.advance()
            expr = self.parse_expr()
            self.expect(TokenType.RPAREN)
        else:
            # Try to parse a simple expression
            return self.parse_simple_expr()
        
        # Parse suffixes (calls, indexing)
        while True:
            if self.match(TokenType.DOT):
                self.advance()
                field = self.expect(TokenType.NAME).value
                expr = Index(obj=expr, key=String(value=f'"{field}"'),
                           line=expr.line, column=expr.column)
            elif self.match(TokenType.LBRACKET):
                self.advance()
                key = self.parse_expr()
                self.expect(TokenType.RBRACKET)
                expr = Index(obj=expr, key=key, line=expr.line, column=expr.column)
            elif self.match(TokenType.COLON):
                self.advance()
                method = self.expect(TokenType.NAME).value
                args = self.parse_args()
                expr = MethodCall(obj=expr, method=method, args=args,
                                line=expr.line, column=expr.column)
            elif self.match(TokenType.LPAREN, TokenType.STRING, TokenType.LBRACE):
                args = self.parse_args()
                expr = Call(func=expr, args=args, line=expr.line, column=expr.column)
            else:
                break
        
        return expr
    
    def parse_args(self) -> List[ASTNode]:
        """Parse function call arguments."""
        if self.match(TokenType.LPAREN):
            self.advance()
            args = []
            if not self.match(TokenType.RPAREN):
                args = self.parse_expr_list()
            self.expect(TokenType.RPAREN)
            return args
        elif self.match(TokenType.STRING):
            return [String(value=self.advance().value)]
        elif self.match(TokenType.LBRACE):
            return [self.parse_table()]
        return []

    
    def parse_simple_expr(self) -> ASTNode:
        """Parse simple expression (literal, table, function)."""
        token = self.peek()
        
        if self.match(TokenType.NUMBER):
            return Number(value=self.advance().value, line=token.line, column=token.column)
        elif self.match(TokenType.STRING):
            return String(value=self.advance().value, line=token.line, column=token.column)
        elif self.match(TokenType.TRUE):
            self.advance()
            return Boolean(value=True, line=token.line, column=token.column)
        elif self.match(TokenType.FALSE):
            self.advance()
            return Boolean(value=False, line=token.line, column=token.column)
        elif self.match(TokenType.NIL):
            self.advance()
            return Nil(line=token.line, column=token.column)
        elif self.match(TokenType.DOTDOTDOT):
            self.advance()
            return Vararg(line=token.line, column=token.column)
        elif self.match(TokenType.LBRACE):
            return self.parse_table()
        elif self.match(TokenType.FUNCTION):
            return self.parse_anon_function()
        elif self.match(TokenType.IF):
            # Luau if-expression: if cond then val1 else val2
            return self.parse_if_expr()
        else:
            raise SyntaxError(f"Unexpected token {token.type.name} at line {token.line}")
    
    def parse_if_expr(self) -> ASTNode:
        """Parse Luau if-expression: if cond then val1 else val2"""
        token = self.advance()  # if
        condition = self.parse_expr()
        self.expect(TokenType.THEN)
        then_value = self.parse_expr()
        
        elseif_parts = []
        while self.match(TokenType.ELSEIF):
            self.advance()
            elseif_cond = self.parse_expr()
            self.expect(TokenType.THEN)
            elseif_val = self.parse_expr()
            elseif_parts.append((elseif_cond, elseif_val))
        
        self.expect(TokenType.ELSE)
        else_value = self.parse_expr()
        
        # Build nested ternary using and/or pattern
        # if a then b else c => (a and b or c) - but this doesn't work for falsy b
        # So we use a special IfExpr node
        return IfExpr(
            condition=condition,
            then_value=then_value,
            elseif_parts=elseif_parts,
            else_value=else_value,
            line=token.line,
            column=token.column
        )
    
    def parse_table(self) -> Table:
        """Parse table constructor."""
        token = self.advance()  # {
        fields = []
        
        while not self.match(TokenType.RBRACE):
            field = self.parse_table_field()
            fields.append(field)
            
            if self.match(TokenType.COMMA, TokenType.SEMICOLON):
                self.advance()
            else:
                break
        
        self.expect(TokenType.RBRACE)
        return Table(fields=fields, line=token.line, column=token.column)
    
    def parse_table_field(self) -> TableField:
        """Parse table field."""
        token = self.peek()
        
        if self.match(TokenType.LBRACKET):
            # [key] = value
            self.advance()
            key = self.parse_expr()
            self.expect(TokenType.RBRACKET)
            self.expect(TokenType.ASSIGN)
            value = self.parse_expr()
            return TableField(key=key, value=value, line=token.line, column=token.column)
        elif self.match(TokenType.NAME) and self.peek(1).type == TokenType.ASSIGN:
            # name = value
            key = String(value=f'"{self.advance().value}"')
            self.advance()  # =
            value = self.parse_expr()
            return TableField(key=key, value=value, line=token.line, column=token.column)
        else:
            # array-style value
            value = self.parse_expr()
            return TableField(key=None, value=value, line=token.line, column=token.column)
    
    def parse_anon_function(self) -> AnonymousFunction:
        """Parse anonymous function."""
        token = self.advance()  # function
        params, is_vararg = self.parse_params()
        body = self.parse_block((TokenType.END,))
        self.expect(TokenType.END)
        return AnonymousFunction(params=params, body=body, is_vararg=is_vararg,
                                line=token.line, column=token.column)


def parse_luau(source: str) -> Block:
    """Parse Luau source code into an AST."""
    lexer = LuauLexer(source)
    tokens = lexer.tokenize()
    parser = LuauParser(tokens)
    return parser.parse()


def ast_to_code(node: ASTNode, indent: int = 0) -> str:
    """Convert AST back to Luau code."""
    ind = '    ' * indent
    
    if isinstance(node, Block):
        return '\n'.join(ast_to_code(stmt, indent) for stmt in node.statements)
    
    elif isinstance(node, LocalAssign):
        names = ', '.join(node.names)
        if node.values:
            values = ', '.join(ast_to_code(v) for v in node.values)
            return f'{ind}local {names} = {values}'
        return f'{ind}local {names}'
    
    elif isinstance(node, Assign):
        targets = ', '.join(ast_to_code(t) for t in node.targets)
        values = ', '.join(ast_to_code(v) for v in node.values)
        return f'{ind}{targets} = {values}'
    
    elif isinstance(node, LocalFunction):
        params = ', '.join(node.params)
        if node.is_vararg:
            params = params + ', ...' if params else '...'
        body = ast_to_code(node.body, indent + 1)
        return f'{ind}local function {node.name}({params})\n{body}\n{ind}end'
    
    elif isinstance(node, Function):
        name = ast_to_code(node.name)
        params = ', '.join(node.params)
        if node.is_vararg:
            params = params + ', ...' if params else '...'
        body = ast_to_code(node.body, indent + 1)
        return f'{ind}function {name}({params})\n{body}\n{ind}end'
    
    elif isinstance(node, AnonymousFunction):
        params = ', '.join(node.params)
        if node.is_vararg:
            params = params + ', ...' if params else '...'
        body = ast_to_code(node.body, indent + 1)
        return f'function({params})\n{body}\n{ind}end'
    
    elif isinstance(node, If):
        result = f'{ind}if {ast_to_code(node.condition)} then\n'
        result += ast_to_code(node.then_block, indent + 1) + '\n'
        for cond, block in node.elseif_blocks:
            result += f'{ind}elseif {ast_to_code(cond)} then\n'
            result += ast_to_code(block, indent + 1) + '\n'
        if node.else_block:
            result += f'{ind}else\n'
            result += ast_to_code(node.else_block, indent + 1) + '\n'
        result += f'{ind}end'
        return result

    
    elif isinstance(node, While):
        body = ast_to_code(node.body, indent + 1)
        return f'{ind}while {ast_to_code(node.condition)} do\n{body}\n{ind}end'
    
    elif isinstance(node, Repeat):
        body = ast_to_code(node.body, indent + 1)
        return f'{ind}repeat\n{body}\n{ind}until {ast_to_code(node.condition)}'
    
    elif isinstance(node, ForNumeric):
        step = f', {ast_to_code(node.step)}' if node.step else ''
        body = ast_to_code(node.body, indent + 1)
        return f'{ind}for {node.var} = {ast_to_code(node.start)}, {ast_to_code(node.stop)}{step} do\n{body}\n{ind}end'
    
    elif isinstance(node, ForGeneric):
        vars = ', '.join(node.vars)
        iters = ', '.join(ast_to_code(i) for i in node.iterators)
        body = ast_to_code(node.body, indent + 1)
        return f'{ind}for {vars} in {iters} do\n{body}\n{ind}end'
    
    elif isinstance(node, Do):
        body = ast_to_code(node.body, indent + 1)
        return f'{ind}do\n{body}\n{ind}end'
    
    elif isinstance(node, Return):
        if node.values:
            values = ', '.join(ast_to_code(v) for v in node.values)
            return f'{ind}return {values}'
        return f'{ind}return'
    
    elif isinstance(node, Break):
        return f'{ind}break'
    
    elif isinstance(node, Continue):
        return f'{ind}continue'
    
    elif isinstance(node, IfExpr):
        result = f'if {ast_to_code(node.condition)} then {ast_to_code(node.then_value)}'
        for cond, val in node.elseif_parts:
            result += f' elseif {ast_to_code(cond)} then {ast_to_code(val)}'
        result += f' else {ast_to_code(node.else_value)}'
        return result
    
    elif isinstance(node, Call):
        func = ast_to_code(node.func)
        args = ', '.join(ast_to_code(a) for a in node.args)
        return f'{ind}{func}({args})'
    
    elif isinstance(node, MethodCall):
        obj = ast_to_code(node.obj)
        args = ', '.join(ast_to_code(a) for a in node.args)
        return f'{ind}{obj}:{node.method}({args})'
    
    elif isinstance(node, Name):
        return node.name
    
    elif isinstance(node, Number):
        return node.value
    
    elif isinstance(node, String):
        return node.value
    
    elif isinstance(node, Boolean):
        return 'true' if node.value else 'false'
    
    elif isinstance(node, Nil):
        return 'nil'
    
    elif isinstance(node, Vararg):
        return '...'

    
    elif isinstance(node, Table):
        if not node.fields:
            return '{}'
        fields = ', '.join(ast_to_code(f) for f in node.fields)
        return '{' + fields + '}'
    
    elif isinstance(node, TableField):
        if node.key is None:
            return ast_to_code(node.value)
        elif isinstance(node.key, String) and node.key.value.startswith('"'):
            # name = value style
            name = node.key.value[1:-1]  # Remove quotes
            return f'{name} = {ast_to_code(node.value)}'
        else:
            return f'[{ast_to_code(node.key)}] = {ast_to_code(node.value)}'
    
    elif isinstance(node, Index):
        obj = ast_to_code(node.obj)
        if isinstance(node.key, String) and node.key.value.startswith('"'):
            # Dot notation
            name = node.key.value[1:-1]
            return f'{obj}.{name}'
        else:
            return f'{obj}[{ast_to_code(node.key)}]'
    
    elif isinstance(node, BinaryOp):
        left = ast_to_code(node.left)
        right = ast_to_code(node.right)
        return f'({left} {node.op} {right})'
    
    elif isinstance(node, UnaryOp):
        operand = ast_to_code(node.operand)
        if node.op == 'not':
            return f'not {operand}'
        return f'{node.op}{operand}'
    
    else:
        return f'-- Unknown node: {type(node).__name__}'


# Test the parser
if __name__ == '__main__':
    # Test with Luau code
    test_code = '''
local x = 1
local y = 0b11111111
local z = 0xFF

for i = 1, 10 do
    if i == 5 then
        continue
    end
    print(i)
end

local function foo(a, b)
    return a + b
end

print(foo(x, y))
'''
    
    print("=== Testing Luau AST Parser ===")
    try:
        ast = parse_luau(test_code)
        print(f"Parsed {len(ast.statements)} statements:")
        for stmt in ast.statements:
            print(f"  - {type(stmt).__name__}")
        
        print("\n=== Regenerated Code ===")
        print(ast_to_code(ast))
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
