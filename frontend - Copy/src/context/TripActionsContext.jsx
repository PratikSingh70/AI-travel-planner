import { createContext, useContext, useState } from "react";

const TripActionsContext = createContext({
  actions: null,
  setActions: () => {},
});

export function TripActionsProvider({ children }) {
  const [actions, setActions] = useState(null);

  return (
    <TripActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </TripActionsContext.Provider>
  );
}

export function useTripActions() {
  return useContext(TripActionsContext);
}