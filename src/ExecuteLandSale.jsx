// src/pages/ExecuteLandSale.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ethers } from "ethers";

/**
 * Land Sale — Execute Payment & Receive NFT (ETH · USDT · USDC · BTC)
 * Buyer selects payment and executes; NFT deed mints on success.
 * ABI + TokenURI can be admin/auto; they’re locked (grayed) by default and unlockable in Admin mode.
 */

// Minimal ERC-20 + ERC-721 bits
const ERC20_ABI = [
  "function approve(address spender, uint256 value) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function decimals() view returns (uint8)",
];
const ERC721_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

// Known token addresses (add your testnets as needed)
const TOKEN_ADDRESSES = {
  "1": {
    USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
    USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606EB48", decimals: 6 },
  },
};

export default function ExecuteLandSale() {
  const location = useLocation();

  // -------- Wallet / Network --------
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [status, setStatus] = useState("");

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask or a compatible wallet.");
        return;
      }
      const _provider = new ethers.BrowserProvider(window.ethereum);
      await _provider.send("eth_requestAccounts", []);
      const _signer = await _provider.getSigner();
      const _network = await _provider.getNetwork();

      setProvider(_provider);
      setSigner(_signer);
      const addr = await _signer.getAddress();
      setAccount(addr);
      setChainId(_network.chainId.toString());

      // Auto-fill buyer wallet if empty
      setForm((s) => (!s.buyerAddress ? { ...s, buyerAddress: addr } : s));
      setStatus("Wallet connected.");
    } catch (e) {
      setStatus(e?.message || "Failed to connect wallet.");
    }
  }

  // -------- Form (execution inputs only) --------
  const [form, setForm] = useState({
    contractAddress: "",
    artifactJSON: "",
    assetType: "ETH", // ETH | USDT | USDC | BTC
    priceEth: "",
    priceUsdt: "",
    priceUsdc: "",
    buyerAddress: "",
    tokenURI: "",
    streetAddress: "",
    county: "",
  });

  const [abi, setAbi] = useState(null);

  // What’s auto/admin-provided (locked & grayed when true)
  const [locks, setLocks] = useState({
    abi: true,
    tokenURI: true,
    contractAddress: false, // becomes true if passed from generator
    assetType: false,
    priceEth: false,
    priceUsdt: false,
    priceUsdc: false,
    streetAddress: false,
    county: false,
    buyerAddress: false,
  });

  // Admin mode toggle
  const [adminMode, setAdminMode] = useState(false);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }
  function toggleLock(key, val) {
    setLocks((s) => ({ ...s, [key]: val }));
  }

  // -------- Prefill from router state & localStorage --------
  useEffect(() => {
    const st = location.state || {};
    const stateUpdates = {};
    const newLocks = { ...locks };

    if (st.contractAddress) {
      stateUpdates.contractAddress = st.contractAddress;
      newLocks.contractAddress = true;
    }
    if (st.tokenURI) {
      stateUpdates.tokenURI = st.tokenURI;
      newLocks.tokenURI = true;
    }
    if (st.assetType) {
      stateUpdates.assetType = st.assetType;
      newLocks.assetType = true;
    }
    if (st.priceEth) {
      stateUpdates.priceEth = st.priceEth;
      newLocks.priceEth = true;
    }
    if (st.priceUsdt) {
      stateUpdates.priceUsdt = st.priceUsdt;
      newLocks.priceUsdt = true;
    }
    if (st.priceUsdc) {
      stateUpdates.priceUsdc = st.priceUsdc;
      newLocks.priceUsdc = true;
    }
    if (st.streetAddress) {
      stateUpdates.streetAddress = st.streetAddress;
      newLocks.streetAddress = true;
    }
    if (st.county) {
      stateUpdates.county = st.county;
      newLocks.county = true;
    }
    if (st.buyerAddress) {
      stateUpdates.buyerAddress = st.buyerAddress;
      newLocks.buyerAddress = true;
    }

    if (Object.keys(stateUpdates).length) {
      setForm((s) => ({ ...s, ...stateUpdates }));
      setLocks(newLocks);
    }

    if (st.abi && Array.isArray(st.abi)) {
      setAbi(st.abi);
      setForm((s) => ({ ...s, artifactJSON: JSON.stringify({ abi: st.abi }, null, 2) }));
      setLocks((l) => ({ ...l, abi: true }));
    }

    // LocalStorage continuity
    setForm((s) => {
      const next = { ...s };
      const get = (k) => localStorage.getItem(k);
      const maybe = (k, key) => {
        const v = get(k);
        if (v && !next[key]) next[key] = v;
      };
      maybe("landSale:contractAddress", "contractAddress");
      maybe("landSale:tokenURI", "tokenURI");
      const lsAssetType = get("landSale:assetType");
      if (lsAssetType && !st.assetType) next.assetType = lsAssetType;
      maybe("landSale:priceEth", "priceEth");
      maybe("landSale:priceUsdt", "priceUsdt");
      maybe("landSale:priceUsdc", "priceUsdc");
      maybe("landSale:streetAddress", "streetAddress");
      maybe("landSale:county", "county");
      maybe("landSale:buyerAddress", "buyerAddress");
      return next;
    });

    if (!st.abi) {
      const savedAbiRaw = localStorage.getItem("landSale:artifactABI");
      if (savedAbiRaw) {
        try {
          const savedAbi = JSON.parse(savedAbiRaw);
          if (Array.isArray(savedAbi)) {
            setAbi((prev) => prev || savedAbi);
            setForm((s) =>
              s.artifactJSON
                ? s
                : { ...s, artifactJSON: JSON.stringify({ abi: savedAbi }, null, 2) }
            );
            setLocks((l) => ({ ...l, abi: true }));
          }
        } catch {
          // ignore malformed
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (form.contractAddress && ethers.isAddress(form.contractAddress)) {
      localStorage.setItem("landSale:contractAddress", form.contractAddress);
    }
    localStorage.setItem("landSale:tokenURI", form.tokenURI || "");
    localStorage.setItem("landSale:assetType", form.assetType || "");
    localStorage.setItem("landSale:priceEth", form.priceEth || "");
    localStorage.setItem("landSale:priceUsdt", form.priceUsdt || "");
    localStorage.setItem("landSale:priceUsdc", form.priceUsdc || "");
    localStorage.setItem("landSale:streetAddress", form.streetAddress || "");
    localStorage.setItem("landSale:county", form.county || "");
    if (form.buyerAddress && ethers.isAddress(form.buyerAddress)) {
      localStorage.setItem("landSale:buyerAddress", form.buyerAddress);
    }
  }, [form]);

  useEffect(() => {
    if (abi && Array.isArray(abi)) {
      localStorage.setItem("landSale:artifactABI", JSON.stringify(abi));
    }
  }, [abi]);

  // -------- ABI handling --------
  function parseArtifact() {
    try {
      const obj = JSON.parse(form.artifactJSON);
      const _abi = obj.abi || obj.ABI || null;
      if (!_abi) throw new Error("Could not find `abi` in the JSON.");
      setAbi(_abi);
      localStorage.setItem("landSale:artifactABI", JSON.stringify(_abi));
      setStatus("ABI parsed. Ready to execute.");
    } catch (e) {
      setStatus(e?.message || "Invalid artifact JSON.");
    }
  }

  // -------- Helpers --------
  const planSummary = useMemo(() => {
    switch (form.assetType) {
      case "ETH":
        return "Pay in ETH (native) — payable call; NFT deed mints on success.";
      case "USDT":
        return "Pay in USDT (ERC-20) — approve then contract call; NFT deed mints on success.";
      case "USDC":
        return "Pay in USDC (ERC-20) — approve then contract call; NFT deed mints on success.";
      case "BTC":
        return "Pay with on-chain BTC; backend finalizes mint on Ethereum after confirmation.";
      default:
        return "";
    }
  }, [form.assetType]);

  function hasFn(iface, name) {
    try {
      iface.getFunction(name);
      return true;
    } catch {
      return false;
    }
  }

  // -------- Execute --------
  const [execTxHash, setExecTxHash] = useState("");
  const [mintedTokenId, setMintedTokenId] = useState("");
  const [ethTxFromBtc, setEthTxFromBtc] = useState(""); // <— declared ONCE

  async function executeSaleMint() {
    try {
      if (!signer) throw new Error("Connect wallet first.");
      if (!ethers.isAddress(form.contractAddress)) throw new Error("Enter a valid contract address.");
      if (!ethers.isAddress(form.buyerAddress)) throw new Error("Enter a valid buyer wallet address.");
      // Only require Token URI if you unlocked that field
      if (!locks.tokenURI && !form.tokenURI) throw new Error("Enter a Token URI or re-lock the field.");
      if (!abi) throw new Error("ABI is required (usually provided by admin).");

      const contract = new ethers.Contract(form.contractAddress, abi, signer);
      const iface = contract.interface;

      // Native ETH
      if (form.assetType === "ETH") {
        const price = Number(form.priceEth);
        if (!Number.isFinite(price) || price <= 0) throw new Error("Enter a positive ETH amount.");
        const valueWei = ethers.parseEther(String(price));

        let tx;
        if (hasFn(iface, "executeSale")) {
          tx = await contract.executeSale(form.buyerAddress, form.tokenURI || "", { value: valueWei });
        } else if (hasFn(iface, "mintDeed")) {
          tx = await contract.mintDeed(form.buyerAddress, form.tokenURI || "", { value: valueWei });
        } else {
          throw new Error("Contract missing executeSale/mintDeed for native payments.");
        }

        setStatus("Submitting ETH transaction…");
        const rcpt = await tx.wait();
        setExecTxHash(rcpt.hash);
        const id = tryParseMintedTokenId(rcpt, form.contractAddress, form.buyerAddress);
        if (id) setMintedTokenId(id);
        setStatus("Sale executed and deed NFT minted.");
        return;
      }

      // ERC-20 (USDT/USDC)
      if (form.assetType === "USDT" || form.assetType === "USDC") {
        if (!chainId) throw new Error("Unknown chainId; connect wallet first.");
        const tmap = TOKEN_ADDRESSES[chainId] || {};
        const tconf = tmap[form.assetType];
        if (!tconf?.address) throw new Error(`${form.assetType} not configured for chainId ${chainId}.`);

        const token = new ethers.Contract(tconf.address, ERC20_ABI, signer);
        // Resolve decimals safely
        let decimals = tconf.decimals;
        if (decimals == null) {
          try { decimals = await token.decimals(); } catch { decimals = 6; }
        }

        const amountStr = form.assetType === "USDT" ? form.priceUsdt : form.priceUsdc;
        const value = ethers.parseUnits(String(amountStr), decimals);
        if (value <= 0n) throw new Error(`Enter a positive ${form.assetType} amount.`);

        // Approve if needed
        setStatus(`Checking allowance for ${form.assetType}…`);
        const owner = await signer.getAddress();
        const current = await token.allowance(owner, form.contractAddress);
        if (current < value) {
          setStatus(`Approving ${form.assetType}…`);
          const approveTx = await token.approve(form.contractAddress, value);
          await approveTx.wait();
        }

        let tx;
        if (hasFn(iface, "executeSaleERC20")) {
          tx = await contract.executeSaleERC20(form.buyerAddress, form.tokenURI || "", tconf.address, value);
        } else if (hasFn(iface, "mintDeedERC20")) {
          tx = await contract.mintDeedERC20(form.buyerAddress, form.tokenURI || "", tconf.address, value);
        } else {
          throw new Error("Contract missing executeSaleERC20/mintDeedERC20 for token payments.");
        }

        setStatus(`Submitting ${form.assetType} transaction…`);
        const rcpt = await tx.wait();
        setExecTxHash(rcpt.hash);
        const id = tryParseMintedTokenId(rcpt, form.contractAddress, form.buyerAddress);
        if (id) setMintedTokenId(id);
        setStatus("Sale executed and deed NFT minted.");
        return;
      }

      if (form.assetType === "BTC") {
        setStatus("Use the BTC buttons below to create invoice and finalize mint after confirmation.");
        return;
      }

      throw new Error("Unsupported asset type.");
    } catch (e) {
      setStatus(e?.message || "Execution failed.");
    }
  }

  // Parse ERC-721 Transfer event to extract tokenId minted to buyer
  function tryParseMintedTokenId(receipt, expectedContract, buyer) {
    try {
      const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");
      const i721 = new ethers.Interface(ERC721_ABI);
      for (const log of receipt.logs || []) {
        if (log.topics?.[0] === TRANSFER_TOPIC && log.address?.toLowerCase() === expectedContract.toLowerCase()) {
          const parsed = i721.parseLog(log);
          const to = parsed.args?.to;
          if (to && to.toLowerCase() === buyer.toLowerCase()) {
            const tokenId = parsed.args?.tokenId;
            return tokenId ? tokenId.toString() : "";
          }
        }
      }
    } catch {
      // ignore
    }
    return "";
  }

  // -------- BTC rail (backend) --------
  const [btcInvoice, setBtcInvoice] = useState(null); // { id, address, amountBtc, uri }
  const [btcQr, setBtcQr] = useState("");
  const [btcPolling, setBtcPolling] = useState(false);

  async function createBtcInvoice() {
    try {
      if (!form.buyerAddress || !ethers.isAddress(form.buyerAddress)) throw new Error("Enter a valid buyer wallet (0x...).");

      const res = await fetch("/api/btc/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: undefined,
          amountBtc: undefined,
          buyerAddress: form.buyerAddress,
          memo: invoiceMemo,
        }),
      });
      if (!res.ok) throw new Error("Server refused BTC invoice creation.");
      const data = await res.json();
      setBtcInvoice(data);
      const uri = data.uri || `bitcoin:${data.address}`;
      setBtcQr(`https://api.qrserver.com/v1/create-qr-code/?qzone=1&size=440x440&data=${encodeURIComponent(uri)}`);
      setStatus("BTC invoice created. Awaiting confirmation…");
    } catch (e) {
      setStatus(e?.message || "Failed to create BTC invoice (backend missing?).");
    }
  }

  async function pollBtcAndFinalize() {
    try {
      if (!btcInvoice?.id) throw new Error("No BTC invoice to poll.");
      if (!form.buyerAddress) throw new Error("Buyer address is required.");
      if (!form.contractAddress) throw new Error("Enter the target contract address before finalizing.");

      setBtcPolling(true);
      let settled = false;
      for (let i = 0; i < 120; i++) { // ~10 minutes if 5s interval
        const st = await fetch(`/api/btc/status?id=${encodeURIComponent(btcInvoice.id)}`);
        const s = st.ok ? await st.json() : { settled: false };
        if (s.settled) {
          settled = true;
          const fin = await fetch("/api/btc/finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: btcInvoice.id,
              buyerAddress: form.buyerAddress,
              tokenURI: form.tokenURI || "",
              contractAddress: form.contractAddress,
            }),
          });
          if (!fin.ok) throw new Error("Finalize failed on backend.");
          const out = await fin.json(); // { ethTxHash }
          setEthTxFromBtc(out.ethTxHash || "");
          setStatus("BTC confirmed. Backend minted deed NFT on Ethereum.");
          break;
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
      if (!settled) setStatus("BTC not yet confirmed. Try again later.");
    } catch (e) {
      setStatus(e?.message || "BTC status check/finalize failed.");
    } finally {
      setBtcPolling(false);
    }
  }

  // -------- Derived --------
  const invoiceMemo = useMemo(() => {
    const addr = form.streetAddress || "—";
    const county = form.county || "—";
    let price =
      form.assetType === "ETH"   ? (form.priceEth   ? `${form.priceEth} ETH`   : "—") :
      form.assetType === "USDT"  ? (form.priceUsdt  ? `${form.priceUsdt} USDT` : "—") :
      form.assetType === "USDC"  ? (form.priceUsdc  ? `${form.priceUsdc} USDC` : "—") :
      "—";
    return `LandSale: ${addr}, ${county} County | Price: ${price}`;
  }, [form.streetAddress, form.county, form.assetType, form.priceEth, form.priceUsdt, form.priceUsdc]);

  const autoBuyer =
    account &&
    form.buyerAddress &&
    form.buyerAddress.toLowerCase() === account.toLowerCase();

  // -------- UI --------
  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to="/" style={{ ...styles.btn, ...styles.backBtn }}>← Back to Home</Link>
          <label style={styles.inlineCheck}>
            <input
              type="checkbox"
              checked={adminMode}
              onChange={(e) => setAdminMode(e.target.checked)}
            />
            <span>Admin mode</span>
          </label>
        </div>

        <div style={styles.toolRight}>
          <button style={styles.btn} onClick={connectWallet}>
            {account ? `Connected ✓ ${short(account)}` : "Connect Wallet"}
          </button>
          <div style={styles.walletMini}>
            <span><strong>Network:</strong> chainId {chainId || "?"}</span>
            <span><strong>Payment:</strong> {form.assetType}</span>
          </div>
        </div>
      </div>

      <h1 style={styles.h1}>Land Sale — Execute Payment & Receive NFT (Ethereum)</h1>
      <p style={styles.muted}>{planSummary}</p>

      <div style={styles.grid2}>
        {/* LEFT: Execution form */}
        <section style={styles.card}>
          <h2 style={styles.h2}>1) Enter Details & Execute</h2>
          <form onSubmit={(e) => e.preventDefault()} style={styles.form}>
            {/* Contract Address */}
            <label style={styles.label}>
              <span>
                Contract Address (deployed on Ethereum)
                {locks.contractAddress && <em style={styles.chipAuto}> auto</em>}
              </span>
              <input
                name="contractAddress"
                value={form.contractAddress}
                onChange={onChange}
                placeholder="0x..."
                style={{ ...styles.input, ...(locks.contractAddress && !adminMode ? styles.inputDisabled : null) }}
                disabled={locks.contractAddress && !adminMode}
              />
              {locks.contractAddress && !adminMode && (
                <div style={styles.fieldHint}>Auto-filled from the generation step.</div>
              )}
            </label>

            {/* ABI */}
            <label style={styles.label}>
              <span>
                Paste Contract ABI (from artifact JSON)
                {locks.abi && <em style={styles.chipAuto}> auto</em>}
              </span>
              <textarea
                rows={5}
                name="artifactJSON"
                value={form.artifactJSON}
                onChange={onChange}
                placeholder='{"abi":[...]}'
                style={{ ...styles.textarea, ...(locks.abi && !adminMode ? styles.inputDisabled : null) }}
                disabled={locks.abi && !adminMode}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={styles.btn}
                  onClick={parseArtifact}
                  disabled={locks.abi && !adminMode}
                >
                  Parse ABI
                </button>
                {adminMode && (
                  <button
                    type="button"
                    style={styles.btn}
                    onClick={() => toggleLock("abi", !locks.abi)}
                    title="Toggle lock"
                  >
                    {locks.abi ? "Unlock ABI" : "Lock ABI"}
                  </button>
                )}
              </div>
            </label>

            {/* Buyer + NFT */}
            <label style={styles.label}>
              <span>
                Buyer Wallet Address
                {(locks.buyerAddress || autoBuyer) && <em style={styles.chipAuto}> auto</em>}
              </span>
              <input
                name="buyerAddress"
                value={form.buyerAddress}
                onChange={onChange}
                placeholder="0x..."
                style={{
                  ...styles.input,
                  ...((locks.buyerAddress && !adminMode) || autoBuyer ? styles.inputDisabled : null),
                }}
                disabled={(locks.buyerAddress && !adminMode) || autoBuyer}
              />
              {(locks.buyerAddress || autoBuyer) && !adminMode && (
                <div style={styles.fieldHint}>
                  Auto-filled {autoBuyer ? "from connected wallet" : "by generator"}.
                </div>
              )}
            </label>

            <label style={styles.label}>
              <span>
                NFT Token URI (deed metadata)
                {locks.tokenURI && <em style={styles.chipAuto}> auto</em>}
              </span>
              <input
                name="tokenURI"
                value={form.tokenURI}
                onChange={onChange}
                placeholder="ipfs://... or https://..."
                style={{ ...styles.input, ...(locks.tokenURI && !adminMode ? styles.inputDisabled : null) }}
                disabled={locks.tokenURI && !adminMode}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {locks.tokenURI && !adminMode && (
                  <div style={styles.fieldHint}>
                    This field is auto-generated by your contract/workflow (e.g., baseURI). Customers don’t need to edit it.
                  </div>
                )}
                {adminMode && (
                  <button
                    type="button"
                    style={styles.btn}
                    onClick={() => toggleLock("tokenURI", !locks.tokenURI)}
                  >
                    {locks.tokenURI ? "Unlock Token URI" : "Lock Token URI"}
                  </button>
                )}
              </div>
            </label>

            {/* Reference-only */}
            <div style={{ display: "grid", gap: 10 }}>
              <label style={styles.label}>
                <span>
                  Street Address (reference)
                  {locks.streetAddress && <em style={styles.chipAuto}> auto</em>}
                </span>
                <input
                  name="streetAddress"
                  value={form.streetAddress}
                  onChange={onChange}
                  style={{ ...styles.input, ...(locks.streetAddress && !adminMode ? styles.inputDisabled : null) }}
                  disabled={locks.streetAddress && !adminMode}
                />
              </label>
              <label style={styles.label}>
                <span>
                  County (reference)
                  {locks.county && <em style={styles.chipAuto}> auto</em>}
                </span>
                <input
                  name="county"
                  value={form.county}
                  onChange={onChange}
                  style={{ ...styles.input, ...(locks.county && !adminMode ? styles.inputDisabled : null) }}
                  disabled={locks.county && !adminMode}
                />
              </label>
            </div>

            {/* Payment Method */}
            <label style={styles.label}>
              <span>
                Payment Method
                {locks.assetType && <em style={styles.chipAuto}> auto</em>}
              </span>
              <select
                name="assetType"
                value={form.assetType}
                onChange={(e) => setForm((s) => ({ ...s, assetType: e.target.value }))}
                style={{ ...styles.input, ...(locks.assetType && !adminMode ? styles.inputDisabled : null) }}
                disabled={locks.assetType && !adminMode}
              >
                <option value="ETH">ETH (native)</option>
                <option value="USDT">USDT (ERC-20)</option>
                <option value="USDC">USDC (ERC-20)</option>
                <option value="BTC">BTC (on-chain via backend)</option>
              </select>
            </label>

            {/* Price Inputs by method */}
            {form.assetType === "ETH" && (
              <label style={styles.label}>
                <span>
                  Price (ETH)
                  {locks.priceEth && <em style={styles.chipAuto}> auto</em>}
                </span>
                <input
                  name="priceEth"
                  value={form.priceEth}
                  onChange={onChange}
                  inputMode="decimal"
                  placeholder="e.g., 1.25"
                  style={{ ...styles.input, ...(locks.priceEth && !adminMode ? styles.inputDisabled : null) }}
                  disabled={locks.priceEth && !adminMode}
                />
              </label>
            )}
            {form.assetType === "USDT" && (
              <label style={styles.label}>
                <span>
                  Price (USDT)
                  {locks.priceUsdt && <em style={styles.chipAuto}> auto</em>}
                </span>
                <input
                  name="priceUsdt"
                  value={form.priceUsdt}
                  onChange={onChange}
                  inputMode="decimal"
                  placeholder="e.g., 25000"
                  style={{ ...styles.input, ...(locks.priceUsdt && !adminMode ? styles.inputDisabled : null) }}
                  disabled={locks.priceUsdt && !adminMode}
                />
              </label>
            )}
            {form.assetType === "USDC" && (
              <label style={styles.label}>
                <span>
                  Price (USDC)
                  {locks.priceUsdc && <em style={styles.chipAuto}> auto</em>}
                </span>
                <input
                  name="priceUsdc"
                  value={form.priceUsdc}
                  onChange={onChange}
                  inputMode="decimal"
                  placeholder="e.g., 25000"
                  style={{ ...styles.input, ...(locks.priceUsdc && !adminMode ? styles.inputDisabled : null) }}
                  disabled={locks.priceUsdc && !adminMode}
                />
              </label>
            )}

            <div style={styles.helperRow}>
              <div style={{ fontSize: 13, color: "#57606a" }}>
                <strong>Current Plan:</strong> {planSummary}
              </div>
            </div>

            {/* Execute */}
            <div style={{ borderTop: "1px solid #e6e6e6", paddingTop: 10, marginTop: 8 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Execute Sale (Mint with Selected Method)</h3>

              {["ETH", "USDT", "USDC"].includes(form.assetType) ? (
                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  onClick={executeSaleMint}
                  disabled={!form.contractAddress || !abi || !signer}
                >
                  Execute & Mint with {form.assetType}
                </button>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={createBtcInvoice}>
                      Create BTC Invoice (backend)
                    </button>
                    <button type="button" style={styles.btn} onClick={pollBtcAndFinalize} disabled={!btcInvoice || btcPolling}>
                      {btcPolling ? "Checking…" : "Check BTC & Finalize Mint"}
                    </button>
                  </div>

                  {btcInvoice && (
                    <div style={styles.invoiceBox}>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>BTC Payment Details</div>
                      <div style={styles.monoSmall}>
                        Address: {btcInvoice.address || "—"}
                        <br />
                        Amount (BTC): {btcInvoice.amountBtc || "—"}
                      </div>
                      {btcQr && (
                        <div style={{ display: "grid", placeItems: "center", marginTop: 8 }}>
                          <img src={btcQr} alt="BTC Payment QR" style={{ width: 220, height: 220 }} />
                        </div>
                      )}
                    </div>
                  )}

                  {ethTxFromBtc && (
                    <div style={styles.noteBox}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>On-chain Tx (mint from BTC rail)</div>
                      <div style={styles.monoSmall}>{ethTxFromBtc}</div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Status & Results */}
            {(status || execTxHash || mintedTokenId) && (
              <div style={styles.noteBox}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Status</div>
                <div style={{ fontSize: 13, marginBottom: 8 }}>{status || "—"}</div>
                {execTxHash && (
                  <div style={{ fontSize: 12, wordBreak: "break-all" }}>
                    Tx Hash: <code>{execTxHash}</code>
                  </div>
                )}
                {mintedTokenId && (
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Minted Token ID: <strong>#{mintedTokenId}</strong>
                  </div>
                )}
              </div>
            )}
          </form>
        </section>

        {/* RIGHT: Quick explainer / reminder */}
        <section style={styles.card}>
          <h2 style={styles.h2}>2) What Happens When You Execute?</h2>
          <ol style={{ paddingLeft: 18, lineHeight: 1.5 }}>
            <li>
              <strong>Native (ETH):</strong> A payable function is called with the amount you enter. On success, the contract mints the deed NFT to the buyer.
            </li>
            <li>
              <strong>USDT/USDC:</strong> Your wallet approves the contract to spend the tokens, then calls the contract to execute the sale and mint the NFT.
            </li>
            <li>
              <strong>BTC Rail:</strong> A BTC invoice is created. After sufficient confirmations, your backend calls the contract on Ethereum to mint the NFT to the buyer.
            </li>
          </ol>
          <div style={styles.fineprint}>
            <strong>Note:</strong> This sample decodes the ERC-721 <code>Transfer</code> event to show the minted <code>tokenId</code>.
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
function short(addr) {
  return addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "";
}

/* ---------- styles ---------- */
const styles = {
  container: {
    maxWidth: 1180,
    margin: "32px auto 48px",
    padding: "0 20px",
    color: "#1f2328",
    fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
    textAlign: "left",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
    textAlign: "left",
  },
  toolRight: { display: "flex", alignItems: "center", gap: 10, textAlign: "left" },
  walletMini: { display: "flex", gap: 10, fontSize: 12, color: "#57606a", textAlign: "left" },
  h1: { margin: "8px 0 4px", fontSize: 26, textAlign: "left" },
  h2: { margin: "0 0 10px", fontSize: 18, textAlign: "left" },
  muted: { color: "#6a737d", marginBottom: 16, textAlign: "left" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, textAlign: "left" },
  card: { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16, textAlign: "left" },
  form: { display: "grid", gridTemplateColumns: "1fr", gap: 12, textAlign: "left" },
  label: { display: "grid", gap: 6, textAlign: "left" },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d0d7de",
    borderRadius: 8,
    fontSize: 14,
    textAlign: "left",
    background: "#fff",
    color: "#111",
  },
  inputDisabled: {
    background: "#f3f4f6",
    color: "#6a737d",
    cursor: "not-allowed",
  },
  inlineCheck: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 },
  chipAuto: { fontSize: 12, color: "#57606a", paddingLeft: 6 },
  fieldHint: { fontSize: 12, color: "#6a737d", marginTop: 2 },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d0d7de",
    borderRadius: 8,
    fontSize: 14,
    resize: "vertical",
    textAlign: "left",
    background: "#fff",
    color: "#111",
  },
  btn: {
    padding: "10px 14px",
    border: "1px solid #d0d7de",
    background: "#fff",
    borderRadius: 8,
    cursor: "pointer",
    textAlign: "left",
  },
  btnPrimary: { background: "#1f6feb", borderColor: "#1f6feb", color: "#fff", textAlign: "left" },
  backBtn: { textDecoration: "none", display: "inline-flex", alignItems: "center", textAlign: "left" },

  invoiceBox: {
    background: "#f6f8fa",
    border: "1px solid #d0d7de",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    textAlign: "left",
  },
  monoSmall: {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    fontSize: 12,
    wordBreak: "break-all",
    textAlign: "left",
  },

  noteBox: {
    background: "#fff8e6",
    border: "1px solid #ffe8a3",
    color: "#7a5b00",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    textAlign: "left",
  },
  helperRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    margin: "4px 0 8px",
    textAlign: "left",
  },
  fineprint: { marginTop: 16, fontSize: 12, color: "#555", textAlign: "left" },
};
