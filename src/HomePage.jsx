// src/HomePage.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

// ✅ Import logo properly from assets
import terraLogo from "./assets/Terra Logo.png";

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="home-container">
      {/* ✅ Dropdown Vertical Navigation Menu (upper-left) */}
      <div style={{ position: "fixed", top: 16, left: 16, zIndex: 1000 }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="true"
          aria-expanded={menuOpen}
          className="menu-toggle-button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#ffffffaa",
            backdropFilter: "blur(6px)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>☰</span>
          <span>Menu</span>
        </button>

        {menuOpen && (
          <nav
            className="dropdown-vertical-nav"
            style={{
              marginTop: 8,
              width: 240,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              boxShadow: "0 12px 24px rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}
          >
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <li>
                <Link
                  to="/purchase-agreement"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "12px 14px",
                    textDecoration: "none",
                    color: "#111827",
                    fontWeight: 600,
                  }}
                  className="dropdown-item"
                >
                  Land Purchase Agreement
                </Link>
              </li>
              <li>
                <Link
                  to="/TexasDeed"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "12px 14px",
                    textDecoration: "none",
                    color: "#111827",
                    fontWeight: 600,
                  }}
                  className="dropdown-item"
                >
                  Create Deed
                </Link>
              </li>
              <li>
                <Link
                  to="/DeployLandSale"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "12px 14px",
                    textDecoration: "none",
                    color: "#111827",
                    fontWeight: 600,
                  }}
                  className="dropdown-item"
                >
                  Sell Land
                </Link>
              </li>
              <li>
                <Link
                  to="/ExecuteLandSale"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "12px 14px",
                    textDecoration: "none",
                    color: "#111827",
                    fontWeight: 600,
                  }}
                  className="dropdown-item"
                >
                  Buy Land
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </div>

      {/* ✅ Logo placeholder area */}
      <div className="logo-wrapper">
        <img
          src={terraLogo}
          alt="Terra Logo"
          className="terra-logo"
        />
      </div>

      {/* Vision */}
      <section className="home-section">
        <h2>Vision</h2>
        <p>
          Terra is a peer-to-peer platform for seamless land transactions leveraging blockchain
          technology. We provide the infrastructure that allows buyers and sellers to connect and
          easily execute land transactions. Blockchain allows for trustless transactions,
          efficiency, speed, immutability, and immediate settlement in a secure and transparent
          environment. Smart contracts are utilized for facilitating, executing, and enforcing the
          negotiation of a land sale contract with an entirely automated legal process.
        </p>
      </section>

      {/* Mission */}
      <section className="home-section">
        <h2>Mission</h2>
        <p>
          Our mission is to lower costs and increase efficiency for land transactions between
          buyers and sellers.
        </p>
      </section>

      {/* Objectives */}
      <section className="home-section">
        <h2>Objectives</h2>
        <ul>
          <li>Create a user-friendly technology platform where buyers and sellers can easily transact land.</li>
          <li>Provide low cost services to encourage a large ecosystem of users to maximize liquidity for buyers and sellers on the platform.</li>
          <li>Reduce or entirely eliminate the need for intermediaries in order to streamline the sale process.</li>
        </ul>
      </section>

      {/* Strategies */}
      <section className="home-section">
        <h2>Strategies</h2>
        <ul>
          <li>Simplify the land transaction process for buyers and sellers in a secure environment.</li>
          <li>Lower costs and increase efficiency for land contracts using blockchain technology and smart contracts.</li>
          <li>Deliver a transparent and immutable land sale experience with immediate settlement.</li>
        </ul>
      </section>

      {/* Action Plan */}
      <section className="home-section">
        <h2>Action Plan</h2>
        <ul>
          <li>Build a state-of-the-art technology platform that allows buying and selling of land properties utilizing blockchain technology.</li>
          <li>Leverage smart contracts for an efficient legal contract that is enforceable.</li>
          <li>Provide a secure environment for transactions and immediate settlement.</li>
        </ul>
      </section>

      {/* How It Works */}
      <section className="home-section">
        <h2>How It Works</h2>
        <ul>
          <li>Buyers and sellers of undeveloped land agree to a transaction and complete a purchase agreement.</li>
          <li>The seller prepares the deed and has the document notarized in advance of closing.</li>
          <li>Upon closing, the seller deploys a smart contract and the buyer executes the contract.</li>
          <li>The buyer delivers the agreed amount to the seller via digital assets and receives an NFT of the notarized deed.</li>
        </ul>
      </section>

         {/* FAQ */}
      <section className="home-section">
        <h2>FAQ</h2>
        <ul>
          <li>1.  How can I sell or buy land?</li>
          <li>    A:  The buyer and seller sign an agreement, and upon closing the buyer sends payment and receives the deed.</li>
          
          <li>2.  What documents are required to transact?</li>
          <li>    A:  Required documents are the land purchase agreement and execution of the final contract.</li>
          
          <li>3.  How do I pay for the transaction?</li>
          <li>    A:  The seller sends a contract to the buyer requesting payment via digital assets.</li>
          
          <li>4.  How do I receive the deed for the property?</li>
          <li>    A:  Upon execution of the closing contract, payment is submitted and the buyer receives an NFT of the deed.</li>
          
          <li>5.  Is title insurance available?</li>
          <li>    A:  Title insurance is optional and a 3rd party can be utilized for that service.</li>
          
          <li>6.  How are documents notarized?</li>
          <li>    A:  The seller is required to notarize the deed prior to closing so that the deed can be delivered upon payment.</li>
          
          <li>7.  How long does it take to close a deal?</li>
          <li>    A:  Theoretically a deal can happen in a single day, and just depends on the buyer and seller completing their tasks.</li>
          
          <li>8.  What is the cost of using the service?</li>
          <li>    A:  There is a one-time registration fee of $19.99 and a 3rd party notary charges a fee.  In addition, transactions of digital assets have a small variable fee.  If title insurance is elected, that service will also carry a fee.</li>
          
          <li>9.  Are brokers or other 3rd parties involved?</li>
          <li>    A:  The only 3rd party involved is a notary public, but if title insurance is elected that would be through a 3rd party.</li>
          
          <li>10. What types of digital assets are allowed?</li>
          <li>    A:  Currently, the digital assets that are allowed for transactions include Tether, USD Coin, Bitcoin, Ethereum, and Polygon.</li>
        </ul>
      </section>

    </div>
  );
}
