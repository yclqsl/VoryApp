import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import LandingPage from "./pages/LandingPage";
import { socket } from "./services/socket";

function App() {
  const [authUser, setAuthUser] = useState(() => {
    const savedUser = localStorage.getItem("vory_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [screen, setScreen] = useState(() => {
    return authUser ? "home" : "landing";
  });

  useEffect(() => {
    if (!authUser) return;

    socket.emit("user-online", {
      userId: authUser.id || authUser._id,
      username: authUser.username,
    });
  }, [authUser]);

  function handleLogin(user, token) {
    localStorage.setItem("vory_user", JSON.stringify(user));
    localStorage.setItem("vory_token", token);
    setAuthUser(user);
    setScreen("home");
  }

  function handleLogout() {
    localStorage.removeItem("vory_user");
    localStorage.removeItem("vory_token");
    setAuthUser(null);
    setScreen("landing");
  }

  if (!authUser && screen === "landing") {
    return (
      <LandingPage
        onEnterApp={() => setScreen("auth")}
        onLogin={() => setScreen("auth")}
        onRegister={() => setScreen("auth")}
      />
    );
  }

  if (!authUser) {
    return <Auth onLogin={handleLogin} onBack={() => setScreen("landing")} />;
  }

  return <Home authUser={authUser} onLogout={handleLogout} />;
}

export default App;
