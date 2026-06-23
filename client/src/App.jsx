import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import LandingPage from "./pages/LandingPage";
import AnimatedBackground from "./components/AnimatedBackground";
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
    function logoutBecauseOfDuplicate() {
      toast.error("Hesabınıza başka bir yerden giriş yapıldı.");
      handleLogout();
    }

    function handleDuplicateLogin() {
      logoutBecauseOfDuplicate();
    }

    function handleStorage(event) {
      if (event.key !== "vory_login_session" || !event.newValue) return;

      try {
        const payload = JSON.parse(event.newValue);
        const currentUser = JSON.parse(localStorage.getItem("vory_user") || "null");
        const currentUserId = String(currentUser?.id || currentUser?._id || "");
        const currentSessionId = localStorage.getItem("vory_session_id") || "";

        if (
          currentUserId &&
          String(payload.userId || "") === currentUserId &&
          String(payload.sessionId || "") !== currentSessionId
        ) {
          logoutBecauseOfDuplicate();
        }
      } catch {}
    }

    socket.on("auth-duplicate-login", handleDuplicateLogin);
    window.addEventListener("storage", handleStorage);

    return () => {
      socket.off("auth-duplicate-login", handleDuplicateLogin);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!authUser) return;

    socket.emit("user-online", {
      userId: authUser.id || authUser._id,
      username: authUser.username,
      avatar: authUser.avatar || "",
      sessionId: localStorage.getItem("vory_session_id") || "",
    });
  }, [authUser]);

  function handleLogin(user, token) {
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const userId = String(user?.id || user?._id || "");

    localStorage.setItem("vory_user", JSON.stringify(user));
    localStorage.setItem("vory_token", token);
    localStorage.setItem("vory_session_id", sessionId);
    localStorage.setItem(
      "vory_login_session",
      JSON.stringify({ userId, sessionId, at: Date.now() })
    );

    setAuthUser(user);
    setScreen("home");

    socket.emit("user-online", {
      userId,
      username: user?.username || "Kullanıcı",
      avatar: user?.avatar || "",
      sessionId,
    });
  }

  function handleLogout() {
    localStorage.removeItem("vory_user");
    localStorage.removeItem("vory_token");
    localStorage.removeItem("vory_session_id");
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

  return (
    <>
      <AnimatedBackground />
      <Home authUser={authUser} onLogout={handleLogout} />
    </>
  );
}

export default App;
