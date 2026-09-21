import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import SharedTrip from "./pages/SharedTrip";
import WeatherAwareItinerary from "./pages/WeatherAwareItinerary";
import WeatherTrips from "./pages/WeatherTrips";
import TripJournal from "./pages/TripJournal";
import JournalTrips from "./pages/JournalTrips";
import TripComparison from "./pages/TripComparison";
import NotFound from "./pages/NotFound";
import { useAuth } from "./context/AuthContext";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
};

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const App = () => {
  const location = useLocation();
  const hideNavbar = location.pathname === "/";

  return (
    <>
      <ScrollToTop />
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/share/:shareId" element={<SharedTrip />} />

        {/* Protected */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/trips" element={<PrivateRoute><Trips /></PrivateRoute>} />
        <Route path="/trips/new" element={<PrivateRoute><CreateTrip /></PrivateRoute>} />
        <Route path="/trips/:id" element={<PrivateRoute><TripDetail /></PrivateRoute>} />
        <Route path="/trips/:id/edit" element={<PrivateRoute><EditTrip /></PrivateRoute>} />
        <Route path="/trips/:id/journal" element={<PrivateRoute><TripJournal /></PrivateRoute>} />
        <Route path="/weather" element={<PrivateRoute><WeatherTrips /></PrivateRoute>} />
        <Route path="/weather-itinerary" element={<PrivateRoute><WeatherAwareItinerary /></PrivateRoute>} />
        <Route path="/trips/:id/weather-itinerary" element={<PrivateRoute><WeatherAwareItinerary /></PrivateRoute>} />
        <Route path="/journal" element={<PrivateRoute><JournalTrips /></PrivateRoute>} />
        <Route path="/journal/demo" element={<PrivateRoute><TripJournal /></PrivateRoute>} />
        <Route path="/compare" element={<PrivateRoute><TripComparison /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default App;