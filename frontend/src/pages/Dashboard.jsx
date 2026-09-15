import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}!</h1>
      <p className="text-gray-600">
        This is your dashboard. In Week 2, you'll create trips here.
      </p>
    </div>
  );
};

export default Dashboard;