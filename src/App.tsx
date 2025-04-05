
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import LandingPage from "./pages/LandingPage";
import Leaderboard from "./pages/Leaderboard";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Task from "./pages/Task";
import Chat from "./pages/Chat";
import History from "./pages/History";
import ForgotPassword from "./pages/ForgotPassword";

// Create a client
const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/home" element={<Index />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/task" element={<Task />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/history" element={<History />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
