interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner = ({ 
  fullScreen = true, 
  size = 'md',
  className = '' 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-4',
    lg: 'w-16 h-16 border-4'
  };

  const spinner = (
    <div className={`animate-spin ${sizeClasses[size]} border-primary border-t-transparent rounded-full ${className}`} />
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
