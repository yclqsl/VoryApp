import { useState } from "react";
import Home from "./pages/Home";
import Auth from "./pages/Auth";

function App() {
  const [authUser, setAuthUser] = useState(() => {
    const savedUser = localStorage.getItem("vory_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  function handleLogin(user, token) {
    localStorage.setItem("vory_user", JSON.stringify(user));
    localStorage.setItem("vory_token", token);
    setAuthUser(user);
  }

  function handleLogout() {
    localStorage.removeItem("vory_user");
    localStorage.removeItem("vory_token");
    setAuthUser(null);
  }

  if (!authUser) {
    return <Auth onLogin={handleLogin} />;
  }

  return <Home authUser={authUser} onLogout={handleLogout} />;
}

export default App;