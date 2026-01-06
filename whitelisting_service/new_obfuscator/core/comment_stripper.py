"""
Comment Stripper Module

Removes all Lua comments from code while preserving string literals.
"""

import re


def strip_comments(code: str) -> str:
    """
    Remove all Lua comments from code.
    
    - Removes single-line comments: -- ...
    - Removes multi-line comments: --[[ ... ]]
    - Preserves -- inside string literals
    
    Args:
        code: Lua source code
        
    Returns:
        Code with all comments removed
    """
    result = []
    i = 0
    length = len(code)
    
    while i < length:
        # Check for string literals first (preserve them)
        if code[i] == '"':
            # Double-quoted string
            result.append(code[i])
            i += 1
            while i < length:
                if code[i] == '\\' and i + 1 < length:
                    # Escape sequence
                    result.append(code[i:i+2])
                    i += 2
                elif code[i] == '"':
                    result.append(code[i])
                    i += 1
                    break
                else:
                    result.append(code[i])
                    i += 1
        elif code[i] == "'":
            # Single-quoted string
            result.append(code[i])
            i += 1
            while i < length:
                if code[i] == '\\' and i + 1 < length:
                    # Escape sequence
                    result.append(code[i:i+2])
                    i += 2
                elif code[i] == "'":
                    result.append(code[i])
                    i += 1
                    break
                else:
                    result.append(code[i])
                    i += 1
        elif code[i] == '[' and i + 1 < length:
            # Check for long string [[ ... ]] or [=[ ... ]=]
            equals_count = 0
            j = i + 1
            while j < length and code[j] == '=':
                equals_count += 1
                j += 1
            if j < length and code[j] == '[':
                # Long string literal - preserve it
                result.append(code[i:j+1])
                i = j + 1
                # Find matching closing ]=*]
                close_pattern = ']' + '=' * equals_count + ']'
                while i < length:
                    if code[i:i+len(close_pattern)] == close_pattern:
                        result.append(close_pattern)
                        i += len(close_pattern)
                        break
                    else:
                        result.append(code[i])
                        i += 1
            else:
                result.append(code[i])
                i += 1
        elif code[i:i+4] == '--[[':
            # Multi-line comment --[[ ... ]]
            # Find the closing ]]
            j = i + 4
            while j < length:
                if code[j:j+2] == ']]':
                    j += 2
                    break
                j += 1
            i = j
        elif code[i:i+3] == '--[' and i + 3 < length and code[i+3] == '=':
            # Long comment --[=[ ... ]=]
            equals_count = 0
            j = i + 3
            while j < length and code[j] == '=':
                equals_count += 1
                j += 1
            if j < length and code[j] == '[':
                # Find matching closing ]=*]
                close_pattern = ']' + '=' * equals_count + ']'
                j += 1
                while j < length:
                    if code[j:j+len(close_pattern)] == close_pattern:
                        j += len(close_pattern)
                        break
                    j += 1
                i = j
            else:
                # Not a valid long comment, skip --
                j = i + 2
                while j < length and code[j] != '\n':
                    j += 1
                i = j
        elif code[i:i+2] == '--':
            # Single-line comment
            j = i + 2
            while j < length and code[j] != '\n':
                j += 1
            # Keep the newline if present
            i = j
        else:
            result.append(code[i])
            i += 1
    
    return ''.join(result)


def strip_comments_aggressive(code: str) -> str:
    """
    Aggressively strip comments and also remove empty lines.
    
    Args:
        code: Lua source code
        
    Returns:
        Code with all comments and empty lines removed
    """
    code = strip_comments(code)
    
    # Remove empty lines and lines with only whitespace
    lines = code.split('\n')
    non_empty_lines = [line for line in lines if line.strip()]
    
    return '\n'.join(non_empty_lines)
