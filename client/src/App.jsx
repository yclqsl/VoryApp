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
  const [authMode, setAuthMode] = useState("login");

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
    const activeRoomCode = window.currentRoomCode || localStorage.getItem("vory-last-room") || "";

    if (activeRoomCode) {
      socket.emit("leave-room", { roomCode: activeRoomCode });
    }

    window.currentRoomCode = "";
    localStorage.removeItem("vory-last-room");
    localStorage.removeItem("vory_user");
    localStorage.removeItem("vory_token");
    setAuthUser(null);
    setScreen("landing");
  }

  if (!authUser && screen === "landing") {
    return (
      <LandingPage
        onEnterApp={() => {
          setAuthMode("register");
          setScreen("auth");
        }}
        onLogin={() => {
          setAuthMode("login");
          setScreen("auth");
        }}
        onRegister={() => {
          setAuthMode("register");
          setScreen("auth");
        }}
      />
    );
  }

  if (!authUser) {
    return <Auth initialMode={authMode} onLogin={handleLogin} onBack={() => setScreen("landing")} />;
  }

  return <Home authUser={authUser} onLogout={handleLogout} />;
}

export default App;
