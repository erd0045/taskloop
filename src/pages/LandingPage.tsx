
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
} from "@/components/ui/navigation-menu";
import { Trophy } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/login');
  };
  
  const handleStartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/signup');
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full z-0">
        <img 
          src="/lovable-uploads/c6597f0c-b261-4ae1-b452-a1879fbec2ec.png" 
          alt="Background" 
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Navigation Bar */}
      <header className="border-b bg-background/80 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold">
              TaskLoop
            </Link>
          </div>
          
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link to="/leaderboard">
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Trophy size={20} />
                    Leaderboard
                  </Button>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Button variant="ghost" onClick={handleLoginClick}>
                  Login
                </Button>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </header>
      
      {/* Hero Section */}
      <main className="flex-grow flex items-center justify-center relative z-10">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-primary">
            Welcome to Task Loop
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-muted-foreground">
            Connect with people who need your skills or find someone to help you with your tasks
          </p>
          
          <Button 
            size="lg" 
            className="relative overflow-hidden rounded-full px-8 py-2 h-10 transition-all duration-300 transform hover:scale-105 group"
            onClick={handleStartClick}
          >
            <span className="relative z-10">Let's Start</span>
            <span className="absolute left-0 top-0 w-full h-full bg-primary opacity-75 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-700 ease-in-out"></span>
          </Button>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t py-6 bg-background/80 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} Task Loop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
