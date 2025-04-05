
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Trophy, Home, User, Menu, MessageSquare, Calendar, FileText, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  onSearch?: (term: string) => void;
}

const Navbar = ({ onSearch }: NavbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const isHomePage = location.pathname === '/home';
  const isLandingPage = location.pathname === '/';
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAuthenticated = !!user;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (onSearch) {
      onSearch(term);
    }
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Get user avatar URL or initials as fallback
  const getUserInitials = (): string => {
    if (profile && profile.full_name) {
      return profile.full_name.split(' ').map((n: string) => n[0]).join('');
    }
    if (user && user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Different menu items based on authentication status
  const MainNavLinks = () => {
    if (!isAuthenticated) {
      return (
        <>
          <NavigationMenuItem>
            <Link to="/leaderboard" className={navigationMenuTriggerStyle()}>
              <Trophy className="mr-2 h-4 w-4" />
              Leaderboard
            </Link>
          </NavigationMenuItem>
        </>
      );
    }
    
    return (
      <>
        <NavigationMenuItem>
          <Link to="/home" className={navigationMenuTriggerStyle()}>
            <Home className="mr-2 h-4 w-4" />
            Home
          </Link>
        </NavigationMenuItem>
        
        <NavigationMenuItem>
          <Link to="/task" className={navigationMenuTriggerStyle()}>
            <FileText className="mr-2 h-4 w-4" />
            Task
          </Link>
        </NavigationMenuItem>
        
        <NavigationMenuItem>
          <Link to="/chat" className={navigationMenuTriggerStyle()}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </Link>
        </NavigationMenuItem>
        
        <NavigationMenuItem>
          <Link to="/history" className={navigationMenuTriggerStyle()}>
            <Calendar className="mr-2 h-4 w-4" />
            History
          </Link>
        </NavigationMenuItem>
        
        <NavigationMenuItem>
          <Link to="/leaderboard" className={navigationMenuTriggerStyle()}>
            <Trophy className="mr-2 h-4 w-4" />
            Leaderboard
          </Link>
        </NavigationMenuItem>
      </>
    );
  };

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center">
        <Link to={isAuthenticated ? "/home" : "/"} className="text-xl font-bold mr-6">
          Task Loop
        </Link>
        
        {isHomePage && (
          <div className="relative mx-4 flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks by name, description or location..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        )}
        
        {/* Desktop Navigation Menu */}
        <div className="hidden md:flex ml-auto items-center">
          <NavigationMenu>
            <NavigationMenuList>
              <MainNavLinks />
            </NavigationMenuList>
          </NavigationMenu>
          
          <div className="ml-4">
            {!isAuthenticated ? (
              <Button onClick={handleLoginClick} variant="outline">
                Login
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="cursor-pointer hover:opacity-80">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleProfileClick}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {/* Mobile Menu */}
        <div className="md:hidden ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer hover:opacity-80">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-4 mt-6">
                {!isAuthenticated ? (
                  <>
                    <Link 
                      to="/leaderboard" 
                      className="flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-md"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Trophy className="h-5 w-5" />
                      Leaderboard
                    </Link>
                    <Button 
                      onClick={() => {
                        handleLoginClick();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full"
                    >
                      Login
                    </Button>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/home" 
                      className="flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-md"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Home className="h-5 w-5" />
                      Home
                    </Link>
                    
                    <Link 
                      to="/task" 
                      className="flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-md"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <FileText className="h-5 w-5" />
                      Task
                    </Link>
                    
                    <Link 
                      to="/chat" 
                      className="flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-md"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <MessageSquare className="h-5 w-5" />
                      Chat
                    </Link>
                    
                    <Link 
                      to="/history" 
                      className="flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-md"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Calendar className="h-5 w-5" />
                      History
                    </Link>
                    
                    <Link 
                      to="/leaderboard" 
                      className="flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-md"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Trophy className="h-5 w-5" />
                      Leaderboard
                    </Link>
                    
                    <Link 
                      to="/profile" 
                      className="flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-md"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      Profile
                    </Link>
                    
                    <Button 
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      variant="destructive"
                      className="w-full mt-4"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
