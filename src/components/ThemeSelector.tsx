import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette } from "lucide-react";

const themes = [
  { name: "Purple", value: "purple", primary: "hsl(263, 70%, 50%)", secondary: "hsl(338, 76%, 59%)" },
  { name: "Blue", value: "blue", primary: "hsl(221, 83%, 53%)", secondary: "hsl(199, 89%, 48%)" },
  { name: "Green", value: "green", primary: "hsl(142, 76%, 36%)", secondary: "hsl(120, 60%, 50%)" },
  { name: "Orange", value: "orange", primary: "hsl(25, 95%, 53%)", secondary: "hsl(45, 93%, 58%)" },
];

const ThemeSelector = () => {
  const [currentTheme, setCurrentTheme] = useState("purple");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "purple";
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (theme: string) => {
    if (theme === "purple") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    localStorage.setItem("theme", theme);
  };

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    applyTheme(theme);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent">
          <Palette className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Choose Theme</h4>
          <div className="grid grid-cols-2 gap-2">
            {themes.map((theme) => (
              <button
                key={theme.value}
                onClick={() => handleThemeChange(theme.value)}
                className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors ${
                  currentTheme === theme.value ? "bg-accent" : ""
                }`}
              >
                <div className="flex gap-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: theme.primary }}
                  />
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: theme.secondary }}
                  />
                </div>
                <span className="text-xs">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ThemeSelector;