// App.jsx örnek entegrasyon
// Mevcut auth yapına göre uyarlayabilirsin.
//
// import { useState } from "react";
// import LandingPage from "./pages/LandingPage";
// import Home from "./pages/Home";
//
// export default function App() {
//   const [showLanding, setShowLanding] = useState(true);
//   const [authUser, setAuthUser] = useState(null);
//
//   if (showLanding && !authUser) {
//     return (
//       <LandingPage
//         onEnterApp={() => setShowLanding(false)}
//         onLogin={() => setShowLanding(false)}
//         onRegister={() => setShowLanding(false)}
//       />
//     );
//   }
//
//   return <Home authUser={authUser} onLogout={() => setAuthUser(null)} />;
// }
