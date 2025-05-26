import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    positive: boolean;
  };
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  icon,
  iconBg,
  iconColor,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-semibold mt-1">{value}</h3>
          
          {trend && (
            <div className="flex items-center mt-2">
              <span
                className={`text-xs font-medium ${
                  trend.positive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.positive ? '+' : ''}{trend.value}
              </span>
            </div>
          )}
        </div>
        
        <div
          className={`p-3 rounded-lg ${iconBg}`}
        >
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;