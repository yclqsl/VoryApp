import { useState } from "react";
import { api } from "../services/api";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");

  async function submit() {
    try {
      const endpoint =
        mode === "login"
          ? "/auth/login"
          : "/auth/register";

      const payload =
        mode === "login"
          ? {
              emailOrUsername,
              password,
            }
          : {
              username,
              email,
              password,
            };

      const { data } = await api.post(
        endpoint,
        payload
      );

      onLogin(data.user, data.token);
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          "Bir hata oluştu"
      );
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b12",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "420px",
          background: "#151520",
          padding: "30px",
          borderRadius: "20px",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          🚀 VoryApp
        </h1>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <button
            style={{
              flex: 1,
              padding: "12px",
            }}
            onClick={() =>
              setMode("login")
            }
          >
            Giriş
          </button>

          <button
            style={{
              flex: 1,
              padding: "12px",
            }}
            onClick={() =>
              setMode("register")
            }
          >
            Kayıt
          </button>
        </div>

        {mode === "register" && (
          <>
            <input
              placeholder="Kullanıcı Adı"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "10px",
              }}
            />

            <input
              placeholder="E-posta"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "10px",
              }}
            />
          </>
        )}

        {mode === "login" && (
          <input
            placeholder="E-posta veya kullanıcı adı"
            value={emailOrUsername}
            onChange={(e) =>
              setEmailOrUsername(
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "10px",
            }}
          />
        )}

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
          }}
        />

        <button
          onClick={submit}
          style={{
            width: "100%",
            padding: "14px",
            background: "#7c3aed",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          {mode === "login"
            ? "Giriş Yap"
            : "Kayıt Ol"}
        </button>
      </div>
    </div>
  );
}