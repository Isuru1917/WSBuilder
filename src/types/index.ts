export type Customer = {
  id: number;
  name: string;
  email: string;
  location: string;
  spent: number;
  lastOrder: string;
  status: 'Active' | 'Inactive' | 'Pending';
};