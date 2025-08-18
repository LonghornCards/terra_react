// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

// ✅ Assets
import terraLogo from "./assets/Terra Logo.png";

// ✅ Pages (all directly under src/)
import HomePage from "./HomePage.jsx";
import DeployLandSale from "./DeployLandSale.jsx";
import ExecuteLandSale from "./ExecuteLandSale.jsx";
import LandPurchaseAgreementTX from "./LandPurchaseAgreementTX.jsx";
import TexasDeed from "./TexasDeed.jsx";

export default function App() {
  return (
    <BrowserRouter>
      {/* Top Nav removed (logo + links) */}

      {/* Routes */}
      <main style={{ padding: 16 }}>
        <Routes>
          {/* Pass the logo to HomePage (optional prop) */}
          <Route path="/" element={<HomePage logoSrc={terraLogo} />} />

          {/* ✅ Updated routes to match HomePage links */}
          <Route path="/DeployLandSale" element={<DeployLandSale />} />
          <Route path="/ExecuteLandSale" element={<ExecuteLandSale />} />
          <Route path="/purchase-agreement" element={<LandPurchaseAgreementTX />} />
          <Route path="/TexasDeed" element={<TexasDeed />} />

          {/* 404 */}
          <Route path="*" element={<h2>404 — Page Not Found</h2>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
