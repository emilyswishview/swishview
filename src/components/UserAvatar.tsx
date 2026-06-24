
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  user: any;
  size?: "sm" | "md" | "lg";
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = "md" }) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10", 
    lg: "h-12 w-12"
  };

  const getInitials = (email: string, fullName?: string) => {
    if (fullName) {
      return fullName.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-cyan-500'
    ];
    
    const index = email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <Avatar className={sizeClasses[size]}>
      <AvatarImage 
        src={user?.user_metadata?.avatar_url} 
        alt={user?.email || 'User'} 
      />
      <AvatarFallback className={`${getAvatarColor(user?.email || '')} text-white font-semibold`}>
        {getInitials(user?.email || '', user?.user_metadata?.full_name)}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
