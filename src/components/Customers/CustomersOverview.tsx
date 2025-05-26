import React from 'react';
import StatCard from './StatCard';
import CustomersList from './CustomersList';
import { Users, TrendingUp, ShoppingCart, DollarSign } from 'lucide-react';

const CustomersOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Customers"
          value="3,842"
          trend={{ value: "12.5%", positive: true }}
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Active Customers"
          value="2,945"
          trend={{ value: "8.2%", positive: true }}
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          title="Total Orders"
          value="12,594"
          trend={{ value: "5.8%", positive: true }}
          icon={<ShoppingCart className="h-5 w-5" />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Total Revenue"
          value="$842,154"
          trend={{ value: "10.2%", positive: true }}
          icon={<DollarSign className="h-5 w-5" />}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
        />
      </div>
      
      <CustomersList />
    </div>
  );
};

export default CustomersOverview;