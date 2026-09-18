import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Trips from "./pages/Trips";
import CreateTrip from "./pages/CreateTrip";
import TripDetail from "./pages/TripDetail";
import EditTrip from "./pages/EditTrip";
import Profile from "./pages/Profile";
import Landing from "./pages/Landing";
import { useAuth } from "./context/AuthContext";

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/trips"
          element={
            <PrivateRoute>
              <Trips />
            </PrivateRoute>
          }
        />
        <Route
          path="/trips/new"
          element={
            <PrivateRoute>
              <CreateTrip />
            </PrivateRoute>
          }
        />
        <Route
          path="/trips/:id"
          element={
            <PrivateRoute>
              <TripDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/trips/:id/edit"
          element={
            <PrivateRoute>
              <EditTrip />
            </PrivateRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

export default App;