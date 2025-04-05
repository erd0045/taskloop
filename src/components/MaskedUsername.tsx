
import React from 'react';

interface MaskedUsernameProps {
  username: string;
  className?: string;
  showChars?: number; // Added this property
}

const MaskedUsername: React.FC<MaskedUsernameProps> = ({ 
  username, 
  className = '',
  showChars = 3 // Default to 3 characters
}) => {
  // For privacy, we'll show the first N characters and the last 2 characters of username
  // If username is less than N+2 characters, just show it as is
  const maskUsername = (username: string) => {
    if (!username) return 'Unknown';
    if (username.length <= showChars + 2) return username;
    
    const firstChars = username.substring(0, showChars);
    const lastTwo = username.substring(username.length - 2);
    
    return `${firstChars}...${lastTwo}`;
  };
  
  return <span className={className}>{maskUsername(username)}</span>;
};

export default MaskedUsername;
