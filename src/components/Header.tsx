import { Moon, Sun, LogOut, Shield } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-header-bg backdrop-blur-sm transition-theme">
      <div className="container flex h-16 items-center justify-between">
        <h1
          className="cursor-pointer text-xl font-bold tracking-tight text-foreground"
          onClick={() => navigate("/")}
        >
          Área de Membros
        </h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Shield className="mr-1 h-4 w-4" />
              Admin
            </Button>
          )}
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-theme"
            aria-label="Alternar tema"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          {user && (
            <button
              onClick={signOut}
              className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-theme"
              aria-label="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
