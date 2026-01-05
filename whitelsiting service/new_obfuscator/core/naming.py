"""
Unified Naming System (UNS) for the Luraph-style obfuscator.

This module generates 31-character Luraph-style variable names using
confusing character patterns (l, I, O, 0, 1, _) to make reverse
engineering extremely difficult.

Requirements: 2.1, 2.2, 2.3
"""

from typing import Optional, Set

from .seed import PolymorphicBuildSeed


# Roblox globals that must NEVER be renamed
ROBLOX_GLOBALS = frozenset({
    # Core globals
    'game', 'workspace', 'script', 'Enum', 'Instance',
    # Math types
    'Vector3', 'Vector2', 'CFrame', 'Color3', 'UDim', 'UDim2',
    'Rect', 'Region3', 'Ray', 'NumberRange', 'NumberSequence',
    'ColorSequence', 'NumberSequenceKeypoint', 'ColorSequenceKeypoint',
    'BrickColor', 'TweenInfo', 'Faces', 'Axes', 'PhysicalProperties',
    # Services (commonly accessed)
    'Players', 'ReplicatedStorage', 'ServerStorage', 'ServerScriptService',
    'StarterGui', 'StarterPack', 'StarterPlayer', 'Lighting',
    'SoundService', 'TweenService', 'RunService', 'UserInputService',
    'ContextActionService', 'HttpService', 'MarketplaceService',
    'GroupService', 'Debris', 'PathfindingService', 'PhysicsService',
    'CollectionService', 'Chat', 'Teams', 'BadgeService',
    'InsertService', 'GamePassService', 'AssetService',
    'DataStoreService', 'MessagingService', 'MemoryStoreService',
    'LocalizationService', 'PolicyService', 'SocialService',
    'TextService', 'VoiceChatService', 'ProximityPromptService',
    # Lua globals
    'print', 'warn', 'error', 'assert', 'type', 'typeof', 'tostring',
    'tonumber', 'pairs', 'ipairs', 'next', 'select', 'unpack',
    'pcall', 'xpcall', 'rawget', 'rawset', 'rawequal', 'rawlen',
    'setmetatable', 'getmetatable', 'newproxy',
    # Libraries
    'math', 'string', 'table', 'coroutine', 'os', 'debug', 'utf8',
    'bit32', 'buffer', 'task',
    # Special
    '_G', '_VERSION', 'shared', 'require', 'spawn', 'delay', 'wait',
    'tick', 'time', 'elapsedTime', 'gcinfo', 'collectgarbage',
})


class UnifiedNamingSystem:
    """
    Unified Naming System for generating Luraph-style variable names.
    
    Generates 31-character names using confusing character patterns
    (l, I, O, 0, 1, _) that are visually similar and hard to distinguish.
    Names are guaranteed to be unique within the same UNS instance.
    
    Attributes:
        NAME_LENGTH: Length of generated names (31 characters)
        CONFUSING_CHARS: Characters used for name generation
    
    Example:
        >>> uns = UnifiedNamingSystem(PolymorphicBuildSeed(seed=42))
        >>> uns.generate_name()
        '_Il1lI1lOO0O1_Il1lI1lOO0O1_Il1l'
        >>> uns.generate_name()  # Different name
        'lO0O1_Il1lI1lOO0O1_Il1lI1lOO0O'
    """
    
    # 31-character names as per Luraph style
    NAME_LENGTH = 31
    
    # Confusing characters that look similar
    # l (lowercase L), I (uppercase i), O (uppercase o), 0 (zero), 1 (one), _ (underscore)
    CONFUSING_CHARS = ['l', 'I', 'O', '0', '1', '_']
    
    # Characters that can start a valid Lua identifier
    VALID_START_CHARS = ['l', 'I', 'O', '_']
    
    def __init__(self, seed: PolymorphicBuildSeed):
        """
        Initialize the Unified Naming System.
        
        Args:
            seed: PolymorphicBuildSeed instance for deterministic generation
        """
        self.seed = seed
        self.used_names: Set[str] = set()
        self._name_counter = 0
    
    def generate_name(self) -> str:
        """
        Generate a unique 31-character confusing name.
        
        The name is guaranteed to:
        - Be exactly 31 characters long
        - Use only characters from {l, I, O, 0, 1, _}
        - Start with a letter or underscore (valid Lua identifier)
        - Be unique within this UNS instance
        
        Returns:
            A unique 31-character confusing name
        
        Example:
            >>> uns = UnifiedNamingSystem(PolymorphicBuildSeed(seed=42))
            >>> name = uns.generate_name()
            >>> len(name)
            31
            >>> name[0] in ['l', 'I', 'O', '_']
            True
        """
        max_attempts = 1000  # Prevent infinite loop
        
        for _ in range(max_attempts):
            # Generate first character (must be valid identifier start)
            first_char = self.seed.choice(self.VALID_START_CHARS)
            
            # Generate remaining characters
            remaining = self.seed.choices(self.CONFUSING_CHARS, self.NAME_LENGTH - 1)
            
            name = first_char + ''.join(remaining)
            
            if name not in self.used_names:
                self.used_names.add(name)
                self._name_counter += 1
                return name
        
        # Fallback: use counter-based name if random generation fails
        # This should never happen in practice
        fallback = self._generate_fallback_name()
        self.used_names.add(fallback)
        return fallback
    
    def _generate_fallback_name(self) -> str:
        """
        Generate a fallback name using counter (for edge cases).
        
        Returns:
            A unique name based on counter
        """
        # Convert counter to base-6 using confusing chars
        counter = self._name_counter
        chars = []
        
        while counter > 0 or len(chars) < self.NAME_LENGTH - 1:
            chars.append(self.CONFUSING_CHARS[counter % 6])
            counter //= 6
            if len(chars) >= self.NAME_LENGTH - 1:
                break
        
        # Pad to NAME_LENGTH - 1
        while len(chars) < self.NAME_LENGTH - 1:
            chars.append('_')
        
        # Ensure valid start character
        return '_' + ''.join(chars[:self.NAME_LENGTH - 1])
    
    def generate_short_name(self, length: int = 10) -> str:
        """
        Generate a shorter confusing name (for parameters, etc.).
        
        Args:
            length: Desired name length (default 10 for Luraph parameter style)
        
        Returns:
            A unique confusing name of the specified length
        """
        max_attempts = 1000
        
        for _ in range(max_attempts):
            first_char = self.seed.choice(self.VALID_START_CHARS)
            remaining = self.seed.choices(self.CONFUSING_CHARS, length - 1)
            name = first_char + ''.join(remaining)
            
            if name not in self.used_names:
                self.used_names.add(name)
                return name
        
        # Fallback
        return '_' + ''.join(self.seed.choices(self.CONFUSING_CHARS, length - 1))
    
    def generate_single_letter(self) -> str:
        """
        Generate a single-letter name (for function aliases like Luraph).
        
        Returns:
            A single letter from the confusing character set
        """
        # Use only letters for single-char names (Luraph style: O, e, C, F, S, etc.)
        return self.seed.choice(['l', 'I', 'O', 'e', 'C', 'F', 'S', 'P', 'q', 'w'])
    
    def generate_luraph_style_name(self) -> str:
        """
        Generate a Luraph-style name - mix of short and long confusing names.
        
        Luraph uses a mix of:
        - Single letters: O, e, C, F, S, P, q, w
        - Short names with underscore: _F, _S, _e, _C
        - Long confusing names: _Il1lI1lOO0O1...
        
        Returns:
            A Luraph-style variable name
        """
        style = self.seed.get_random_int(0, 10)
        
        if style < 3:
            # 30% chance: Single letter (Luraph style)
            letters = ['O', 'e', 'C', 'F', 'S', 'P', 'q', 'w', 'I', 'l']
            name = self.seed.choice(letters)
            if name not in self.used_names:
                self.used_names.add(name)
                return name
        elif style < 5:
            # 20% chance: Short underscore prefix (_F, _S, _e)
            letters = ['F', 'S', 'e', 'C', 'w', 'k', 'j', 'n', 'i']
            name = '_' + self.seed.choice(letters)
            if name not in self.used_names:
                self.used_names.add(name)
                return name
        elif style < 7:
            # 20% chance: Medium length (10-15 chars)
            length = self.seed.get_random_int(10, 15)
            return self.generate_short_name(length)
        
        # 30% chance: Full 31-char confusing name
        return self.generate_name()
    
    def generate_short_alias(self) -> str:
        """
        Generate a SHORT 1-3 character alias (Luraph function style).
        
        Luraph uses very short names for functions in hot paths:
        - Single letters: O, C, e, F, w, X, I
        - Two chars: I4, z4, W2, F4
        
        Returns:
            A short 1-3 character name
        """
        # Try single letters first
        single_letters = ['O', 'C', 'e', 'F', 'w', 'X', 'I', 'S', 'P', 'q', 'z', 'W', 'D', 'N', 'B', 'R', 'U', 'j', 'p', 'i', 'a', 'f', 'h', 'g', 's', 'n', 'k']
        for letter in single_letters:
            if letter not in self.used_names:
                self.used_names.add(letter)
                return letter
        
        # Try two-char combinations: letter + digit (I4, z4, W2)
        for letter in single_letters:
            for digit in '0123456789':
                name = f'{letter}{digit}'
                if name not in self.used_names:
                    self.used_names.add(name)
                    return name
        
        # Try underscore prefix (_j, _F, _S)
        for letter in single_letters:
            name = f'_{letter}'
            if name not in self.used_names:
                self.used_names.add(name)
                return name
        
        # Fallback to short confusing name
        return self.generate_short_name(3)
    
    def generate_method_name(self) -> str:
        """
        Generate a Luraph-style method name (e.g., F4, S2, e7).
        
        Luraph uses method-style calls like O:F4() where F4 is a method.
        
        Returns:
            A method name like 'F4', 'S2', 'e7'
        """
        letters = ['F', 'S', 'e', 'C', 'w', 'k', 'j', 'n', 'i', 'P', 'q']
        letter = self.seed.choice(letters)
        number = self.seed.get_random_int(1, 9)
        return f'{letter}{number}'
    
    def generate_table_with_methods(self) -> tuple:
        """
        Generate a table variable name and method names for Luraph-style calls.
        
        Returns:
            Tuple of (table_name, list of method_names)
        """
        # Table name is usually a single letter
        table_letters = ['O', 'e', 'C', 'F', 'S', 'w']
        table_name = self.seed.choice(table_letters)
        
        # Generate 3-5 method names
        num_methods = self.seed.get_random_int(3, 5)
        methods = [self.generate_method_name() for _ in range(num_methods)]
        
        return (table_name, methods)
    
    def is_roblox_global(self, name: str) -> bool:
        """
        Check if a name is a Roblox global that should not be renamed.
        
        Args:
            name: The variable name to check
        
        Returns:
            True if the name is a Roblox global, False otherwise
        """
        return name in ROBLOX_GLOBALS
    
    def should_rename(self, name: str) -> bool:
        """
        Check if a variable name should be renamed.
        
        Args:
            name: The variable name to check
        
        Returns:
            True if the name should be renamed, False if it's a protected global
        """
        return not self.is_roblox_global(name)
    
    def get_name_count(self) -> int:
        """
        Get the number of unique names generated.
        
        Returns:
            Count of unique names generated by this instance
        """
        return len(self.used_names)
    
    def reset(self) -> None:
        """
        Reset the used names set (for testing or new scope).
        """
        self.used_names.clear()
        self._name_counter = 0
    
    def __repr__(self) -> str:
        return f"UnifiedNamingSystem(names_generated={len(self.used_names)})"
