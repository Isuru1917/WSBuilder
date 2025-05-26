import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <img src="/aqua-logo.png" alt="WS Builder" className="h-6 w-6 object-contain" />
      <span className="text-lg font-semibold">WS Builder</span>
    </div>
  );
};

export default Logo;