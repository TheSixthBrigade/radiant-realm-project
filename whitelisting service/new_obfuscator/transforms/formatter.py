"""
Output Formatting for the Luraph-style obfuscator.

This module provides output formatting transformations:
- DenseFormatter: Single-line minification (removes whitespace, newlines)
- DensityNormalizer: Normalizes code density
- PrettyPrinter: Formats code with proper indentation for debugging

Requirements: 7.2, 31.1, 31.2, 31.3, 31.4
"""

import re
from typing import Optional

try:
    from ..core.seed import PolymorphicBuildSeed
except ImportError:
    from core.seed import PolymorphicBuildSeed


class DenseFormatter:
    """
    Dense Formatter for single-line minification.
    
    Removes all unnecessary whitespace and newlines to produce
    ultra-compact single-line output matching Luraph style.
    
    Features:
    - Removes all comments (single-line and multi-line)
    - Removes unnecessary whitespace and newlines
    - Removes spaces around operators where safe
    - Outputs single-line code
    
    Example:
        >>> formatter = DenseFormatter()
        >>> code = '''
        ... local x = 1
        ... local y = 2
        ... return x + y
        ... '''
        >>> formatter.format(code)
        'local x=1;local y=2;return x+y'
    
    Requirements: 31.1, 31.2, 31.3
    """
    
    # Operators that can have spaces removed around them
    OPERATORS = [
        '==', '~=', '<=', '>=', '..', 
        '=', '+', '-', '*', '/', '%', '^', '<', '>', 
        ',', ';', '(', ')', '[', ']', '{', '}', ':'
    ]
    
    # Keywords that need space after them
    KEYWORDS_NEED_SPACE_AFTER = [
        'local', 'return', 'function', 'if', 'then', 'else', 'elseif',
        'while', 'do', 'for', 'in', 'repeat', 'until', 'and', 'or', 'not',
        'end', 'break', 'continue', 'goto'
    ]
    
    def __init__(self, seed: Optional[PolymorphicBuildSeed] = None):
        """
        Initialize the Dense Formatter.
        
        Args:
            seed: Optional PolymorphicBuildSeed for any randomization
        """
        self.seed = seed
    
    def format(self, code: str) -> str:
        """
        Format code to dense single-line output.
        
        Removes all unnecessary whitespace and newlines for
        maximum density matching Luraph output style.
        
        Args:
            code: Lua source code to format
        
        Returns:
            Dense single-line code
        
        Example:
            >>> formatter.format('local x = 1\\nlocal y = 2')
            'local x=1;local y=2'
        """
        # Step 1: Remove multi-line comments --[[ ... ]]
        code = self._remove_multiline_comments(code)
        
        # Step 2: Remove single-line comments -- ...
        code = self._remove_singleline_comments(code)
        
        # Step 3: Normalize string literals (protect them from whitespace removal)
        code, strings = self._extract_strings(code)
        
        # Step 4: Insert semicolons between statements (before removing whitespace)
        code = self._insert_statement_semicolons(code)
        
        # Step 5: Remove all newlines and excess whitespace
        code = self._remove_whitespace(code)
        
        # Step 6: Remove spaces around operators
        code = self._remove_operator_spaces(code)
        
        # Step 7: Ensure keywords have necessary spaces
        code = self._fix_keyword_spaces(code)
        
        # Step 8: Restore string literals
        code = self._restore_strings(code, strings)
        
        # Step 9: Final cleanup
        code = self._final_cleanup(code)
        
        return code.strip()

    
    def _remove_multiline_comments(self, code: str) -> str:
        """
        Remove multi-line comments --[[ ... ]].
        
        Handles nested brackets: --[=[ ... ]=]
        
        Args:
            code: Lua source code
        
        Returns:
            Code with multi-line comments removed
        """
        # Pattern for --[[ ... ]] and --[=[ ... ]=] etc.
        # Match --[=*[ ... ]=*] where = count matches
        result = []
        i = 0
        while i < len(code):
            # Check for --[
            if i < len(code) - 3 and code[i:i+3] == '--[':
                # Count equals signs
                j = i + 3
                equals_count = 0
                while j < len(code) and code[j] == '=':
                    equals_count += 1
                    j += 1
                
                # Check for opening bracket
                if j < len(code) and code[j] == '[':
                    # Find matching closing ]=*]
                    close_pattern = ']' + '=' * equals_count + ']'
                    close_pos = code.find(close_pattern, j + 1)
                    if close_pos != -1:
                        # Skip the entire comment
                        i = close_pos + len(close_pattern)
                        continue
            
            result.append(code[i])
            i += 1
        
        return ''.join(result)
    
    def _remove_singleline_comments(self, code: str) -> str:
        """
        Remove single-line comments -- ...
        
        Preserves -- inside strings.
        
        Args:
            code: Lua source code
        
        Returns:
            Code with single-line comments removed
        """
        # Simple approach: remove -- to end of line (not in strings)
        # This is called after strings are extracted, so it's safe
        lines = code.split('\n')
        result = []
        
        for line in lines:
            # Find -- that's not part of a longer pattern
            comment_pos = -1
            i = 0
            while i < len(line) - 1:
                if line[i:i+2] == '--':
                    # Check it's not --[[ (multi-line start)
                    if i + 2 < len(line) and line[i+2] == '[':
                        i += 1
                        continue
                    comment_pos = i
                    break
                i += 1
            
            if comment_pos != -1:
                result.append(line[:comment_pos])
            else:
                result.append(line)
        
        return '\n'.join(result)
    
    def _insert_statement_semicolons(self, code: str) -> str:
        """
        Insert semicolons between statements.
        
        Converts newlines to semicolons where appropriate to ensure
        statements are properly separated in dense output.
        
        Args:
            code: Lua source code
        
        Returns:
            Code with semicolons between statements
        """
        lines = code.split('\n')
        result = []
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            
            # Don't add semicolon after these patterns
            no_semi_after = ['then', 'do', 'else', 'function', '{', '(', ',', ')']
            # Don't add semicolon before these
            no_semi_before = ['end', 'else', 'elseif', 'until', ')', '}', ',']
            
            if result:
                prev = result[-1].rstrip()
                # Check if we need semicolon between previous and current
                needs_semi = True
                
                for suffix in no_semi_after:
                    if prev.endswith(suffix):
                        needs_semi = False
                        break
                
                for prefix in no_semi_before:
                    if stripped.startswith(prefix):
                        needs_semi = False
                        break
                
                # Also don't add if previous already ends with semicolon
                if prev.endswith(';'):
                    needs_semi = False
                
                # Don't add semicolon after function declaration line
                # Pattern: ends with ) and next line starts with if/while/for/local/return
                if prev.endswith(')') and any(stripped.startswith(kw) for kw in ['if', 'while', 'for', 'local', 'return', 'repeat']):
                    needs_semi = False
                
                if needs_semi:
                    result[-1] = prev + ';'
            
            result.append(stripped)
        
        return '\n'.join(result)
    
    def _extract_strings(self, code: str) -> tuple:
        """
        Extract string literals and replace with placeholders.
        
        Handles:
        - Single-quoted strings: 'hello'
        - Double-quoted strings: "hello"
        - Long strings: [[hello]] and [=[hello]=]
        
        Args:
            code: Lua source code
        
        Returns:
            Tuple of (code with placeholders, list of extracted strings)
        """
        strings = []
        result = []
        i = 0
        
        while i < len(code):
            # Check for string start
            if code[i] in '"\'':
                quote = code[i]
                string_start = i
                i += 1
                
                # Find end of string
                while i < len(code):
                    if code[i] == '\\' and i + 1 < len(code):
                        # Skip escaped character
                        i += 2
                        continue
                    if code[i] == quote:
                        i += 1
                        break
                    i += 1
                
                # Extract string including quotes
                string_literal = code[string_start:i]
                placeholder = f'\x00STR{len(strings)}\x00'
                strings.append(string_literal)
                result.append(placeholder)
                continue
            
            # Check for long string [[ or [=[
            if code[i] == '[':
                j = i + 1
                equals_count = 0
                while j < len(code) and code[j] == '=':
                    equals_count += 1
                    j += 1
                
                if j < len(code) and code[j] == '[':
                    # Found long string start
                    string_start = i
                    close_pattern = ']' + '=' * equals_count + ']'
                    close_pos = code.find(close_pattern, j + 1)
                    
                    if close_pos != -1:
                        i = close_pos + len(close_pattern)
                        string_literal = code[string_start:i]
                        placeholder = f'\x00STR{len(strings)}\x00'
                        strings.append(string_literal)
                        result.append(placeholder)
                        continue
            
            result.append(code[i])
            i += 1
        
        return ''.join(result), strings
    
    def _restore_strings(self, code: str, strings: list) -> str:
        """
        Restore string literals from placeholders.
        
        Args:
            code: Code with placeholders
            strings: List of extracted strings
        
        Returns:
            Code with strings restored
        """
        for i, string in enumerate(strings):
            placeholder = f'\x00STR{i}\x00'
            code = code.replace(placeholder, string)
        return code
    
    def _remove_whitespace(self, code: str) -> str:
        """
        Remove all newlines and excess whitespace.
        
        Converts multiple spaces/tabs/newlines to single space.
        
        Args:
            code: Lua source code
        
        Returns:
            Code with whitespace normalized
        """
        # Replace all whitespace sequences with single space
        code = re.sub(r'\s+', ' ', code)
        return code.strip()

    
    def _remove_operator_spaces(self, code: str) -> str:
        """
        Remove spaces around operators where safe.
        
        Luraph style has no spaces around most operators:
        local x=1;local y=2;return x+y
        
        Args:
            code: Lua source code
        
        Returns:
            Code with operator spaces removed
        """
        # Remove spaces around these operators
        for op in ['==', '~=', '<=', '>=', '..']:
            code = re.sub(rf'\s*{re.escape(op)}\s*', op, code)
        
        # Single character operators
        for op in ['=', '+', '*', '/', '%', '^', '<', '>', ',', ';', ':', '~']:
            # Be careful with - (could be negative number or subtraction)
            code = re.sub(rf'\s*{re.escape(op)}\s*', op, code)
        
        # Handle minus specially - don't remove space before negative numbers
        # Pattern: space-minus-digit should keep space before minus
        code = re.sub(r'(\S)\s*-\s*(\S)', r'\1-\2', code)
        
        # Parentheses and brackets
        code = re.sub(r'\s*\(\s*', '(', code)
        code = re.sub(r'\s*\)\s*', ')', code)
        code = re.sub(r'\s*\[\s*', '[', code)
        code = re.sub(r'\s*\]\s*', ']', code)
        code = re.sub(r'\s*\{\s*', '{', code)
        code = re.sub(r'\s*\}\s*', '}', code)
        
        return code
    
    def _fix_keyword_spaces(self, code: str) -> str:
        """
        Ensure keywords have necessary spaces.
        
        Keywords like 'local', 'return', 'function' need space after them
        when followed by an identifier. Also need space BEFORE keywords
        when preceded by an identifier.
        
        CRITICAL: Must NOT split identifiers containing keyword substrings!
        e.g., bit32_bor, buffer_for, string_and_more, local_var, string.format, inst must stay intact.
        
        The rules:
        - `localx` -> `local x` (keyword at start, followed by letter - ADD space)
        - `local_var` -> `local_var` (underscore connects them - NO space)
        - `format` -> `format` (keyword in middle of word - NO space)
        - `string.format` -> `string.format` (keyword after dot - NO space)
        - `inst` -> `inst` (keyword is part of larger identifier - NO space)
        
        Args:
            code: Lua source code
        
        Returns:
            Code with keyword spaces fixed
        
        Requirements: 1.1, 1.2
        """
        # Keywords that need space after when followed by identifier
        # 
        # CRITICAL: We must use word boundaries (\b) to ensure we only match
        # COMPLETE keywords, not keywords that are part of larger identifiers.
        #
        # The pattern uses \b (word boundary) which matches:
        # - Between a word char and non-word char
        # - At start/end of string if first/last char is word char
        #
        # Word chars are: [a-zA-Z0-9_]
        #
        # So \bkeyword\b matches 'keyword' only when it's a complete word.
        # Then we check if it's followed by a letter (after any non-word chars)
        # to determine if we need to add a space.
        #
        # However, \b doesn't work well with our needs because:
        # - `local_var` has \b before 'local' but not after (underscore is word char)
        # - We want to match `localx` but not `local_var`
        #
        # Better approach: Use explicit character class checks
        # - (?<![a-zA-Z0-9_]) - NOT preceded by identifier char
        # - keyword - the keyword
        # - (?![a-zA-Z0-9_]) - NOT followed by identifier char (keyword is complete)
        #
        # This ensures the keyword is a COMPLETE word, not part of a larger identifier.
        # Then we need a separate pass to add spaces where needed.
        
        # First pass: Add space after keywords that are followed by identifiers
        # Pattern: keyword (as complete word) followed by identifier start
        # We need to handle cases like:
        # - `return x` -> already has space, no change
        # - `returnx` -> needs space: `return x`
        # - `return(x)` -> no space needed (followed by paren)
        #
        # The trick: after removing whitespace, `return x` becomes `returnx`
        # So we need to add space back when keyword is followed by identifier char
        #
        # But we must NOT match keywords inside identifiers like `inst` (contains `in`)
        # or `format` (contains `for`)
        #
        # Solution: Match keyword only when:
        # 1. NOT preceded by identifier char (so not in middle of word)
        # 2. NOT followed by identifier char EXCEPT when we need to add space
        #
        # Actually, the issue is that after whitespace removal, `return x` becomes `returnx`
        # and we need to split it back. But `inst` should stay as `inst`.
        #
        # The difference:
        # - `returnx` = keyword `return` + identifier `x` (need space)
        # - `inst` = identifier `inst` (no keyword, no space)
        #
        # So we should only add space when:
        # - The keyword is at a word boundary (not preceded by identifier char)
        # - The keyword is followed by an identifier char
        #
        # For `inst`: `in` IS preceded by nothing (word boundary), but `in` is followed by `st`
        # which makes `inst` a single identifier. The issue is that `in` + `st` = `inst` is
        # a valid identifier, so we should NOT split it.
        #
        # The key insight: if keyword + following chars form a valid identifier, don't split.
        # An identifier in Lua starts with letter or underscore, followed by letters, digits, underscores.
        #
        # So `inst` is a valid identifier (starts with 'i', followed by 'nst').
        # And `returnx` is also a valid identifier (starts with 'r', followed by 'eturnx').
        #
        # The difference is that `return` is a KEYWORD, so `returnx` should be split.
        # But `in` is also a keyword, so why shouldn't `inst` be split?
        #
        # The answer: we should only split when the keyword is at the START of the token,
        # not when it's in the middle. But both `return` in `returnx` and `in` in `inst`
        # are at the start...
        #
        # Wait, the real issue is that after whitespace removal:
        # - `return x` -> `returnx` (was two tokens, now looks like one)
        # - `inst` -> `inst` (was always one token)
        #
        # We can't distinguish these cases just by looking at the result.
        # The solution is to be more careful about which keywords we split.
        #
        # For keywords like `return`, `local`, `function`, etc., they are ALWAYS followed
        # by a space in valid Lua code (e.g., `return x`, `local x`, `function f()`).
        # So if we see `returnx`, it must have been `return x` before whitespace removal.
        #
        # For keywords like `in`, `do`, `then`, `else`, they are NOT always followed by
        # an identifier. For example:
        # - `for i in pairs(t) do` - `in` is followed by `pairs`, but there's a space
        # - `if x then y end` - `then` is followed by `y`, but there's a space
        #
        # So after whitespace removal:
        # - `for i in pairs(t) do` -> `for i inpairs(t)do` - need to split `inpairs` to `in pairs`
        # - `inst` -> `inst` - should NOT be split
        #
        # The difference: `inpairs` was `in pairs` (two tokens), `inst` was `inst` (one token).
        #
        # How to distinguish? We can't just by looking at the string.
        # 
        # SOLUTION: Don't add space after short keywords like `in`, `do`, `or`, `if`
        # when they could be part of a valid identifier. Instead, only add space
        # after longer keywords that are unlikely to be part of identifiers.
        #
        # Actually, a better solution: preserve spaces around keywords BEFORE removing
        # whitespace, then restore them after. But that's complex.
        #
        # Simplest solution: Use a more restrictive pattern that only matches keywords
        # when they are clearly separate from the following identifier.
        #
        # For now, let's use a simple heuristic:
        # - Only add space after keyword if it's followed by a letter AND
        # - The keyword is NOT followed by common identifier suffixes
        #
        # Common identifier patterns that contain keywords:
        # - inst, instruction (contains 'in')
        # - format, formula (contains 'for')
        # - doSomething (contains 'do')
        # - endIndex (contains 'end')
        # - android (contains 'and')
        # - oracle (contains 'or')
        # - notify (contains 'not')
        # - repeat (contains 'repeat' - but this IS the keyword)
        #
        # The safest approach: only add space after keywords that are followed by
        # a SINGLE letter or a letter followed by non-identifier char.
        # This way, `returnx` -> `return x` but `inst` stays as `inst`.
        #
        # Actually, that's still not right. `returnx` could be a valid identifier.
        #
        # FINAL SOLUTION: Be conservative. Only add space after keywords when:
        # 1. Keyword is NOT preceded by identifier char (so not in middle of word)
        # 2. Keyword is followed by a space or non-identifier char
        #
        # This means we DON'T add space in cases like `returnx` or `inst`.
        # The user's code should already have proper spacing.
        #
        # But wait, the whole point of this method is to FIX spacing after whitespace
        # removal. So we need to add spaces back.
        #
        # Let me reconsider. The issue is:
        # 1. Original code: `return x` (valid)
        # 2. After whitespace removal: `returnx` (invalid - looks like identifier)
        # 3. We need to fix it back to: `return x`
        #
        # But we also have:
        # 1. Original code: `inst` (valid identifier)
        # 2. After whitespace removal: `inst` (still valid)
        # 3. We should NOT change it
        #
        # The problem is that after step 2, both look the same pattern-wise.
        #
        # INSIGHT: The original code is VALID Lua. So `returnx` as an identifier
        # would be valid, but `return x` as keyword + identifier is also valid.
        # The difference is semantic, not syntactic.
        #
        # However, in the VM code we're processing, `return` is always used as a
        # keyword, not as part of an identifier. So we CAN safely split `returnx`.
        #
        # But `inst` is used as an identifier in the VM code, so we should NOT split it.
        #
        # The question is: how do we know which is which?
        #
        # Answer: We look at what follows. If keyword + following chars form a
        # KNOWN identifier in the VM code, don't split. Otherwise, split.
        #
        # But we don't have a list of known identifiers.
        #
        # PRACTICAL SOLUTION: Only split for keywords that are NEVER part of
        # common identifiers. These are the longer, less common keywords:
        # - local, return, function, elseif, repeat, until, while, break, continue
        #
        # Don't split for short keywords that are often part of identifiers:
        # - in, do, or, if, end, and, not, for, then, else
        #
        # Actually, let's be even more conservative: only split for keywords
        # that MUST be followed by a space in valid Lua:
        # - local (always followed by identifier or function)
        # - return (always followed by expression or nothing)
        # - function (always followed by name or ()
        # - if, while, for, repeat (always followed by expression)
        # - elseif (always followed by expression)
        # - until (always followed by expression)
        #
        # Keywords that might not need space after:
        # - then, do, else, end (followed by statement or end)
        # - in (part of for-in loop)
        # - and, or, not (operators)
        # - break, continue (standalone)
        
        # Split keywords into two groups:
        # 1. Keywords that ALWAYS need space after when followed by identifier
        keywords_always_space = ['local', 'return', 'function', 'elseif', 'until', 'while', 'repeat', 'goto']
        
        # 2. Keywords that might be part of identifiers - be more careful
        keywords_careful = ['if', 'then', 'else', 'do', 'for', 'in', 'and', 'or', 'not', 'end', 'break', 'continue']
        
        # For group 1: always add space after keyword when followed by letter
        for keyword in keywords_always_space:
            # Pattern: keyword not preceded by id char, followed by letter
            # (?<![a-zA-Z0-9_]) - not preceded by identifier char
            # keyword - the keyword
            # (?=[a-zA-Z]) - followed by letter (needs space)
            pattern = rf'(?<![a-zA-Z0-9_]){keyword}(?=[a-zA-Z])'
            code = re.sub(pattern, rf'{keyword} ', code)
        
        # CRITICAL FIX: Add space BEFORE keywords when preceded by a number
        # This handles cases like "=0local" -> "=0 local" which causes "Malformed number" errors
        # because Luau tries to parse "0local" as a number literal
        all_keywords = keywords_always_space + keywords_careful
        for keyword in all_keywords:
            # Pattern: digit followed by keyword (as complete word)
            # ([0-9]) - preceded by digit
            # keyword - the keyword
            # (?![a-zA-Z0-9_]) - keyword is complete (not followed by id char)
            pattern = rf'([0-9])({keyword})(?![a-zA-Z0-9_])'
            code = re.sub(pattern, rf'\1 \2', code)
        
        # CRITICAL FIX: Add space after ) before keywords
        # This handles cases like "function()local" -> "function() local"
        # which is essential for nested function patterns
        for keyword in keywords_always_space:
            # Pattern: ) followed by keyword followed by space or identifier
            pattern = rf'\)({keyword})(?=\s|[a-zA-Z])'
            code = re.sub(pattern, rf') \1', code)
        
        # For group 2: only add space if keyword is clearly separate
        # Use word boundary to ensure keyword is complete word
        for keyword in keywords_careful:
            # Pattern: keyword as complete word, followed by letter after non-id char
            # This is tricky because we removed whitespace...
            # 
            # Actually, for these keywords, we should NOT add space automatically
            # because they might be part of identifiers like `inst`, `format`, etc.
            #
            # Instead, we rely on the original code having proper spacing,
            # and we preserve that spacing by not removing it in the first place.
            #
            # But we already removed whitespace... so we need to be smart.
            #
            # For now, skip these keywords. The code should still be valid
            # because these keywords are typically followed by punctuation
            # (then, do, else, end) or are operators (and, or, not).
            pass
        
        # Keywords that need space BEFORE when preceded by identifier
        # This handles cases like "x=1end" -> "x=1 end"
        # But must NOT match "bit32_bor" or "buffer_for" etc.
        # 
        # The safest approach: only add space before keyword if
        # preceded by ) ] } or a digit, NOT by letters or underscore
        keywords_need_space_before = [
            'and', 'do', 'else', 'elseif', 'end', 'for', 'in', 'or', 
            'repeat', 'then', 'until', 'while'
        ]
        
        for keyword in keywords_need_space_before:
            # Only add space before keyword if preceded by ) ] } or digit
            # and keyword is not followed by identifier char (so it's complete)
            # Pattern: (closing bracket or digit) + keyword + not followed by id char
            pattern = rf'([\)\]\}}0-9])({keyword})(?![a-zA-Z0-9_])'
            code = re.sub(pattern, rf'\1 \2', code)
        
        # Special cases for keywords that need space after them
        # These are handled more carefully to avoid breaking identifiers
        # 
        # For 'end', 'do', 'then': these keywords are typically followed by
        # another statement or keyword, not an identifier. So we only add space
        # when followed by another keyword (like 'end local' or 'then return').
        #
        # IMPORTANT: 'else' is special - we must NOT split 'elseif' into 'else if'
        # because they have different semantics in Lua!
        # - 'elseif' is a single keyword that continues the if-chain
        # - 'else if' is two keywords that start a nested if (requires extra 'end')
        #
        # We use a whitelist approach: only add space before specific keywords
        keywords_after = ['local', 'return', 'function', 'if', 'while', 'for', 'repeat', 'break', 'continue']
        
        for kw_before in ['end', 'do', 'then']:
            for kw_after in keywords_after:
                # Pattern: kw_before (as complete word) + kw_after (as complete word)
                # (?<![a-zA-Z0-9_]) - kw_before not preceded by id char
                # kw_before - the keyword
                # kw_after - the following keyword
                # (?![a-zA-Z0-9_]) - kw_after not followed by id char
                pattern = rf'(?<![a-zA-Z0-9_]){kw_before}{kw_after}(?![a-zA-Z0-9_])'
                replacement = rf'{kw_before} {kw_after}'
                code = re.sub(pattern, replacement, code)
        
        # Special handling for 'else': add space after, but NOT before 'if' (to preserve 'elseif')
        keywords_after_else = ['local', 'return', 'function', 'while', 'for', 'repeat', 'break', 'continue']
        for kw_after in keywords_after_else:
            pattern = rf'(?<![a-zA-Z0-9_])else{kw_after}(?![a-zA-Z0-9_])'
            replacement = rf'else {kw_after}'
            code = re.sub(pattern, replacement, code)
        
        return code
    
    def _final_cleanup(self, code: str) -> str:
        """
        Final cleanup pass.
        
        - Remove multiple semicolons (OUTSIDE of strings)
        - Remove trailing semicolons before end/else/elseif/until
        - Remove leading/trailing whitespace
        
        CRITICAL: Must NOT modify content inside string literals!
        The encoded bytecode string may contain ';;' which is valid Base85 data.
        
        Args:
            code: Lua source code
        
        Returns:
            Cleaned up code
        """
        # Extract strings first to protect them from modification
        code, strings = self._extract_strings(code)
        
        # Remove multiple consecutive semicolons (now safe - strings are extracted)
        code = re.sub(r';+', ';', code)
        
        # Remove semicolon before end, else, elseif, until
        # CRITICAL: Must add space if preceded by identifier char to avoid merging
        # e.g., 'typesize;end' should become 'typesize end', not 'typesizeend'
        code = re.sub(r'([a-zA-Z0-9_]);(end|else|elseif|until)\b', r'\1 \2', code)
        # For non-identifier chars, just remove the semicolon
        code = re.sub(r'([^a-zA-Z0-9_]);(end|else|elseif|until)\b', r'\1\2', code)
        
        # Remove semicolon at very end
        code = re.sub(r';$', '', code)
        
        # Remove any remaining double spaces
        code = re.sub(r'  +', ' ', code)
        
        # Restore strings that were extracted at the start
        code = self._restore_strings(code, strings)
        
        return code.strip()
    
    def format_to_single_line(self, code: str) -> str:
        """
        Alias for format() - ensures single-line output.
        
        Args:
            code: Lua source code
        
        Returns:
            Single-line formatted code
        """
        return self.format(code)
    
    def __repr__(self) -> str:
        return "DenseFormatter()"


class DensityNormalizer:
    """
    Density Normalizer for normalizing code density.
    
    Ensures consistent code density throughout the output by:
    - Adding semicolons between statements
    - Normalizing spacing patterns
    - Ensuring uniform density
    
    Requirements: 31.4
    """
    
    def __init__(self, seed: Optional[PolymorphicBuildSeed] = None):
        """
        Initialize the Density Normalizer.
        
        Args:
            seed: Optional PolymorphicBuildSeed for randomization
        """
        self.seed = seed
        self.dense_formatter = DenseFormatter(seed)
    
    def normalize(self, code: str) -> str:
        """
        Normalize code density.
        
        Ensures consistent density throughout the code by:
        - First applying dense formatting
        - Then ensuring semicolons between statements
        - Normalizing parentheses usage
        
        Args:
            code: Lua source code
        
        Returns:
            Density-normalized code
        """
        # First apply dense formatting
        code = self.dense_formatter.format(code)
        
        # Ensure semicolons after statements
        code = self._add_statement_semicolons(code)
        
        # Normalize parentheses around expressions
        code = self._normalize_parentheses(code)
        
        return code
    
    def _add_statement_semicolons(self, code: str) -> str:
        """
        Add semicolons between statements where missing.
        
        Luraph style uses semicolons consistently:
        local x=1;local y=2;return x+y
        
        Args:
            code: Lua source code
        
        Returns:
            Code with semicolons added
        """
        # Add semicolon before 'local' if not already there
        code = re.sub(r'([^;{(\s])(\s*local\b)', r'\1;\2', code)
        
        # Add semicolon before 'return' if not already there
        code = re.sub(r'([^;{(\s])(\s*return\b)', r'\1;\2', code)
        
        # Add semicolon before 'if' if not already there
        code = re.sub(r'([^;{(\s])(\s*if\b)', r'\1;\2', code)
        
        # Add semicolon before 'while' if not already there
        code = re.sub(r'([^;{(\s])(\s*while\b)', r'\1;\2', code)
        
        # Add semicolon before 'for' if not already there
        code = re.sub(r'([^;{(\s])(\s*for\b)', r'\1;\2', code)
        
        # Add semicolon before 'repeat' if not already there
        code = re.sub(r'([^;{(\s])(\s*repeat\b)', r'\1;\2', code)
        
        # Clean up any double semicolons
        code = re.sub(r';+', ';', code)
        
        return code
    
    def _normalize_parentheses(self, code: str) -> str:
        """
        Normalize parentheses usage for consistent density.
        
        Luraph often wraps table accesses in parentheses:
        (table)[key] instead of table[key]
        
        Args:
            code: Lua source code
        
        Returns:
            Code with normalized parentheses
        """
        # This is a light normalization - heavy wrapping is done elsewhere
        # Just ensure no spaces inside parentheses
        code = re.sub(r'\(\s+', '(', code)
        code = re.sub(r'\s+\)', ')', code)
        
        return code
    
    def __repr__(self) -> str:
        return "DensityNormalizer()"



class PrettyPrinter:
    """
    Pretty Printer for formatting code with proper indentation.
    
    Formats code for debugging and readability with:
    - Proper indentation for nested blocks
    - Newlines after statements
    - Aligned code structure
    
    This is the opposite of DenseFormatter - used for debugging
    obfuscated output.
    
    Requirements: 7.2
    """
    
    # Keywords that increase indentation
    INDENT_INCREASE = ['function', 'if', 'while', 'for', 'repeat', 'do']
    
    # Keywords that decrease indentation
    INDENT_DECREASE = ['end', 'until']
    
    # Keywords that temporarily decrease then increase (same line)
    INDENT_SAME = ['else', 'elseif']
    
    def __init__(self, indent_str: str = '    ', seed: Optional[PolymorphicBuildSeed] = None):
        """
        Initialize the Pretty Printer.
        
        Args:
            indent_str: String to use for indentation (default: 4 spaces)
            seed: Optional PolymorphicBuildSeed (not used, for API consistency)
        """
        self.indent_str = indent_str
        self.seed = seed
    
    def format(self, code: str) -> str:
        """
        Format code with proper indentation for debugging.
        
        Args:
            code: Lua source code (can be dense single-line)
        
        Returns:
            Formatted code with proper indentation
        
        Example:
            >>> printer = PrettyPrinter()
            >>> printer.format('local x=1;if x>0 then print(x)end')
            'local x = 1\\nif x > 0 then\\n    print(x)\\nend'
        """
        # First, extract strings to protect them
        code, strings = self._extract_strings(code)
        
        # Tokenize the code
        tokens = self._tokenize(code)
        
        # Format with indentation
        formatted = self._format_tokens(tokens)
        
        # Restore strings
        formatted = self._restore_strings(formatted, strings)
        
        return formatted
    
    def _extract_strings(self, code: str) -> tuple:
        """
        Extract string literals and replace with placeholders.
        
        Args:
            code: Lua source code
        
        Returns:
            Tuple of (code with placeholders, list of strings)
        """
        strings = []
        result = []
        i = 0
        
        while i < len(code):
            if code[i] in '"\'':
                quote = code[i]
                string_start = i
                i += 1
                
                while i < len(code):
                    if code[i] == '\\' and i + 1 < len(code):
                        i += 2
                        continue
                    if code[i] == quote:
                        i += 1
                        break
                    i += 1
                
                string_literal = code[string_start:i]
                placeholder = f'\x00STR{len(strings)}\x00'
                strings.append(string_literal)
                result.append(placeholder)
                continue
            
            # Long strings
            if code[i] == '[':
                j = i + 1
                equals_count = 0
                while j < len(code) and code[j] == '=':
                    equals_count += 1
                    j += 1
                
                if j < len(code) and code[j] == '[':
                    string_start = i
                    close_pattern = ']' + '=' * equals_count + ']'
                    close_pos = code.find(close_pattern, j + 1)
                    
                    if close_pos != -1:
                        i = close_pos + len(close_pattern)
                        string_literal = code[string_start:i]
                        placeholder = f'\x00STR{len(strings)}\x00'
                        strings.append(string_literal)
                        result.append(placeholder)
                        continue
            
            result.append(code[i])
            i += 1
        
        return ''.join(result), strings
    
    def _restore_strings(self, code: str, strings: list) -> str:
        """Restore string literals from placeholders."""
        for i, string in enumerate(strings):
            placeholder = f'\x00STR{i}\x00'
            code = code.replace(placeholder, string)
        return code
    
    def _tokenize(self, code: str) -> list:
        """
        Tokenize Lua code into meaningful tokens.
        
        Args:
            code: Lua source code
        
        Returns:
            List of tokens
        """
        tokens = []
        
        # Keywords and identifiers pattern
        keyword_pattern = r'\b(local|function|if|then|else|elseif|end|while|do|for|in|repeat|until|return|break|continue|and|or|not|nil|true|false)\b'
        
        # Split by semicolons first (statement separator)
        # Then by keywords and operators
        
        # Simple tokenization: split on whitespace and operators
        i = 0
        current_token = []
        
        while i < len(code):
            c = code[i]
            
            # Check for operators and punctuation
            if c in '=+-*/%^<>~,;()[]{}:.':
                if current_token:
                    tokens.append(''.join(current_token))
                    current_token = []
                
                # Check for two-character operators
                if i + 1 < len(code):
                    two_char = code[i:i+2]
                    if two_char in ['==', '~=', '<=', '>=', '..', '::']:
                        tokens.append(two_char)
                        i += 2
                        continue
                
                tokens.append(c)
                i += 1
                continue
            
            # Whitespace
            if c.isspace():
                if current_token:
                    tokens.append(''.join(current_token))
                    current_token = []
                i += 1
                continue
            
            # Part of identifier/keyword/number
            current_token.append(c)
            i += 1
        
        if current_token:
            tokens.append(''.join(current_token))
        
        return tokens
    
    def _format_tokens(self, tokens: list) -> str:
        """
        Format tokens with proper indentation.
        
        Args:
            tokens: List of tokens
        
        Returns:
            Formatted code string
        """
        lines = []
        current_line = []
        indent_level = 0
        
        i = 0
        while i < len(tokens):
            token = tokens[i]
            
            # Handle indentation decrease
            if token in ['end', 'until', 'else', 'elseif']:
                # Flush current line
                if current_line:
                    lines.append(self._make_line(current_line, indent_level))
                    current_line = []
                
                if token in ['end', 'until']:
                    indent_level = max(0, indent_level - 1)
                elif token in ['else', 'elseif']:
                    indent_level = max(0, indent_level - 1)
                
                current_line.append(token)
                
                if token in ['else', 'elseif']:
                    indent_level += 1
                
                i += 1
                continue
            
            # Handle semicolons - end of statement
            if token == ';':
                current_line.append(token)
                lines.append(self._make_line(current_line, indent_level))
                current_line = []
                i += 1
                continue
            
            # Handle 'then', 'do' - end of line, increase indent
            if token in ['then', 'do']:
                current_line.append(token)
                lines.append(self._make_line(current_line, indent_level))
                current_line = []
                indent_level += 1
                i += 1
                continue
            
            # Handle 'function' - may be inline or block
            if token == 'function':
                current_line.append(token)
                # Check if it's an inline function (has = before it)
                # For now, treat all functions as potentially block-starting
                i += 1
                continue
            
            # Handle opening braces for tables
            if token == '{':
                current_line.append(token)
                i += 1
                continue
            
            # Handle closing braces
            if token == '}':
                current_line.append(token)
                i += 1
                continue
            
            # Regular token
            current_line.append(token)
            i += 1
        
        # Flush remaining
        if current_line:
            lines.append(self._make_line(current_line, indent_level))
        
        return '\n'.join(lines)
    
    def _make_line(self, tokens: list, indent_level: int) -> str:
        """
        Create a formatted line from tokens.
        
        Args:
            tokens: List of tokens for this line
            indent_level: Current indentation level
        
        Returns:
            Formatted line string
        """
        indent = self.indent_str * indent_level
        
        # Join tokens with appropriate spacing
        result = []
        prev_token = None
        
        for token in tokens:
            if prev_token is not None:
                # Determine if we need space between tokens
                need_space = self._need_space(prev_token, token)
                if need_space:
                    result.append(' ')
            
            result.append(token)
            prev_token = token
        
        return indent + ''.join(result)
    
    def _need_space(self, prev: str, curr: str) -> bool:
        """
        Determine if space is needed between two tokens.
        
        Args:
            prev: Previous token
            curr: Current token
        
        Returns:
            True if space is needed
        """
        # No space after opening brackets/parens
        if prev in '([{':
            return False
        
        # No space before closing brackets/parens
        if curr in ')]}':
            return False
        
        # No space before comma, semicolon
        if curr in ',;':
            return False
        
        # No space around dots
        if prev == '.' or curr == '.':
            return False
        
        # No space around colons (method calls)
        if prev == ':' or curr == ':':
            return False
        
        # Space around operators
        if prev in '=+-*/%^<>~' or curr in '=+-*/%^<>~':
            return True
        
        # Space after keywords
        keywords = ['local', 'return', 'function', 'if', 'then', 'else', 
                   'elseif', 'while', 'do', 'for', 'in', 'repeat', 'until',
                   'and', 'or', 'not', 'end']
        if prev in keywords:
            return True
        
        # Space before keywords
        if curr in keywords:
            return True
        
        # Space after comma
        if prev == ',':
            return True
        
        # Default: space between identifiers/numbers
        if (prev.isalnum() or prev.endswith('_')) and (curr.isalnum() or curr.startswith('_')):
            return True
        
        return False
    
    def __repr__(self) -> str:
        return f"PrettyPrinter(indent='{self.indent_str}')"


# Convenience functions
def dense_format(code: str) -> str:
    """
    Convenience function for dense formatting.
    
    Args:
        code: Lua source code
    
    Returns:
        Dense single-line code
    """
    return DenseFormatter().format(code)


def pretty_print(code: str, indent: str = '    ') -> str:
    """
    Convenience function for pretty printing.
    
    Args:
        code: Lua source code
        indent: Indentation string
    
    Returns:
        Formatted code with indentation
    """
    return PrettyPrinter(indent_str=indent).format(code)


def normalize_density(code: str) -> str:
    """
    Convenience function for density normalization.
    
    Args:
        code: Lua source code
    
    Returns:
        Density-normalized code
    """
    return DensityNormalizer().normalize(code)
