// src/pages/DeployLandSale.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";

/**
 * Land Sale — Deploy & Execute (MATIC · ETH · USDT · USDC · BTC)
 *
 * Mint the NFT deed using the **selected Payment Method**:
 *  - MATIC (native)        → payable call (value:)
 *  - ETH (native)          → payable call (value:)
 *  - USDT / USDC (ERC-20)  → approve → contract call with token address + amount
 *  - BTC (on-chain rail)   → backend mints after BTC confirmation
 *
 * Assumed Solidity (rename if yours differs):
 *   // Native (MATIC/ETH):
 *   function executeSale(address buyer, string calldata tokenURI) external payable returns (uint256);
 *   // or fallback:
 *   function mintDeed(address to, string calldata tokenURI) external payable returns (uint256);
 *
 *   // ERC-20 (USDT/USDC):
 *   function executeSaleERC20(address buyer, string calldata tokenURI, address token, uint256 amount) external returns (uint256);
 *   // or fallback:
 *   function mintDeedERC20(address to, string calldata tokenURI, address token, uint256 amount) external returns (uint256);
 *
 * BTC backend endpoints (you implement):
 *   POST /api/btc/create-invoice  -> { amountUsd|amountBtc, buyerAddress, memo } => { id, address, amountBtc, uri }
 *   GET  /api/btc/status?id=...   -> { settled: boolean, btcTxId?: string }
 *   POST /api/btc/finalize        -> { id, buyerAddress, tokenURI, contractAddress? } => { polygonTxHash }
 */

// Minimal ERC-20 interface
const ERC20_ABI = [
  "function approve(address spender, uint256 value) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// Known token addresses (edit for your networks)
// chainId: { USDT: {address, decimals}, USDC: {address, decimals} }
const TOKEN_ADDRESSES = {
  "137": {
    // Polygon mainnet
    USDT: { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
    USDC: { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
  },
  "1": {
    // Ethereum mainnet
    USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
    USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606EB48", decimals: 6 },
  },
  // Add testnets (e.g., Amoy 80002) with your token deployments if needed.
};

export default function DeployLandSale() {
  // ----------- FORM (off-chain references + execution config) -----------
  const [form, setForm] = useState({
    legalDescription: "",
    streetAddress: "",
    county: "",

    // Payment method & amounts — NFT will be minted using this selection
    assetType: "MATIC", // "MATIC" | "ETH" | "USDT" | "USDC" | "BTC"
    priceMatic: "",
    priceEth: "",
    priceUsdt: "",
    priceUsdc: "",

    buyerAddress: "",
    tokenURI: "",

    sellerName: "",
    sellerAddress: "",
    buyerName: "",
    buyerAddressPostal: "",
    effectiveDate: "",
    closingDate: "",
  });

  function onChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  function fmtDate(iso) {
    if (!iso) return "________";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "________";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  const planSummary = useMemo(() => {
    switch (form.assetType) {
      case "MATIC":
        return "Mint deed by paying in MATIC (native) — payable contract call.";
      case "ETH":
        return "Mint deed by paying in ETH (native) — payable contract call.";
      case "USDT":
        return "Mint deed by paying in USDT — approve then contract call (ERC-20).";
      case "USDC":
        return "Mint deed by paying in USDC — approve then contract call (ERC-20).";
      case "BTC":
        return "Mint deed after BTC on-chain confirmation — backend triggers the contract.";
      default:
        return "";
    }
  }, [form.assetType]);

  // ----------- WALLET / NETWORK -----------
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
      setAccount(await _signer.getAddress());
      setChainId(_network.chainId.toString());
      setStatus("Wallet connected.");
    } catch (e) {
      setStatus(e?.message || "Failed to connect wallet.");
    }
  }

  // ----------- ARTIFACT / CONTRACT STATE -----------
  const [artifactJSON, setArtifactJSON] = useState("");
  const [abi, setAbi] = useState(null);
  const [bytecode, setBytecode] = useState(null);

  const [existingAddress, setExistingAddress] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [deployTxHash, setDeployTxHash] = useState("");

  function parseArtifact() {
    try {
      const obj = JSON.parse(artifactJSON);
      const _abi = obj.abi || obj.ABI || null;
      const _bytecode = obj.bytecode || obj.data?.bytecode?.object || null;
      if (!_abi || !_bytecode) throw new Error("Could not find `abi` and `bytecode` in the JSON.");
      setAbi(_abi);
      setBytecode(_bytecode);
      setStatus("Artifact parsed. Ready to deploy.");
    } catch (e) {
      setStatus(e?.message || "Invalid artifact JSON.");
    }
  }

  async function deployContract() {
    try {
      if (!signer) throw new Error("Connect wallet first.");
      if (!abi || !bytecode) throw new Error("Paste and parse an artifact JSON first.");

      const factory = new ethers.ContractFactory(abi, bytecode, signer);
      const contract = await factory.deploy(); // add constructor args here if your contract needs them
      setStatus("Deploying…");
      const receipt = await contract.deploymentTransaction().wait();
      setContractAddress(contract.target);
      setDeployTxHash(receipt.hash);
      setStatus(`Deployed at ${contract.target}`);
    } catch (e) {
      setStatus(e?.message || "Deployment failed.");
    }
  }

  function useExisting() {
    try {
      if (!ethers.isAddress(existingAddress)) throw new Error("Enter a valid contract address.");
      setContractAddress(existingAddress);
      setStatus(`Attached to ${existingAddress}`);
    } catch (e) {
      setStatus(e?.message || "Failed to attach.");
    }
  }

  // ----------- EXECUTION (MINT USING SELECTED PAYMENT METHOD) -----------
  const [execTxHash, setExecTxHash] = useState("");

  async function executeSaleMint() {
    try {
      if (!signer) throw new Error("Connect wallet first.");
      if (!ethers.isAddress(contractAddress)) throw new Error("Set a valid contract address.");
      if (!ethers.isAddress(form.buyerAddress)) throw new Error("Enter a valid buyer wallet address.");
      if (!form.tokenURI) throw new Error("Enter a Token URI.");

      const contract = new ethers.Contract(contractAddress, abi || [], signer);

      // --- Native (MATIC / ETH) path ---
      if (form.assetType === "MATIC" || form.assetType === "ETH") {
        const amountStr = form.assetType === "MATIC" ? form.priceMatic : form.priceEth;
        const price = Number(amountStr);
        if (!Number.isFinite(price) || price <= 0) throw new Error(`Enter a positive ${form.assetType} amount.`);
        const valueWei = ethers.parseEther(String(price));

        let tx;
        if (typeof contract.executeSale === "function") {
          tx = await contract.executeSale(form.buyerAddress, form.tokenURI, { value: valueWei });
        } else if (typeof contract.mintDeed === "function") {
          tx = await contract.mintDeed(form.buyerAddress, form.tokenURI, { value: valueWei });
        } else {
          throw new Error("Contract missing executeSale/mintDeed for native payments.");
        }

        setStatus(`Submitting ${form.assetType} transaction…`);
        const rcpt = await tx.wait();
        setExecTxHash(rcpt.hash);
        setStatus("Sale executed and deed NFT minted.");
        return;
      }

      // --- ERC-20 (USDT / USDC) path ---
      if (form.assetType === "USDT" || form.assetType === "USDC") {
        const tmap = TOKEN_ADDRESSES[chainId] || {};
        const tconf = tmap[form.assetType];
        if (!tconf?.address) throw new Error(`${form.assetType} not configured for chainId ${chainId}.`);

        const token = new ethers.Contract(tconf.address, ERC20_ABI, signer);
        const decimals = tconf.decimals ?? (await token.decimals?.().catch(() => 6)) ?? 6;

        const amountStr = form.assetType === "USDT" ? form.priceUsdt : form.priceUsdc;
        const value = ethers.parseUnits(String(amountStr), decimals);
        if (value <= 0n) throw new Error(`Enter a positive ${form.assetType} amount.`);

        // 1) Approve the contract to spend tokens
        setStatus(`Approving ${form.assetType}…`);
        const approveTx = await token.approve(contractAddress, value);
        await approveTx.wait();

        // 2) Execute ERC-20 sale + mint
        let tx;
        if (typeof contract.executeSaleERC20 === "function") {
          tx = await contract.executeSaleERC20(form.buyerAddress, form.tokenURI, tconf.address, value);
        } else if (typeof contract.mintDeedERC20 === "function") {
          tx = await contract.mintDeedERC20(form.buyerAddress, form.tokenURI, tconf.address, value);
        } else {
          throw new Error("Contract missing executeSaleERC20/mintDeedERC20 for token payments.");
        }

        setStatus(`Submitting ${form.assetType} transaction…`);
        const rcpt = await tx.wait();
        setExecTxHash(rcpt.hash);
        setStatus("Sale executed and deed NFT minted.");
        return;
      }

      // --- BTC rail path ---
      if (form.assetType === "BTC") {
        setStatus("Use the BTC rail buttons below to create invoice and finalize mint after confirmation.");
        return;
      }

      throw new Error("Unsupported asset type.");
    } catch (e) {
      setStatus(e?.message || "Execution failed.");
    }
  }

  // ----------- BTC RAIL (ON-CHAIN BITCOIN, VIA YOUR BACKEND) -----------
  const [btcInvoice, setBtcInvoice] = useState(null); // { id, address, amountBtc, uri }
  const [btcQr, setBtcQr] = useState("");
  const [btcPolling, setBtcPolling] = useState(false);
  const [polygonTxFromBtc, setPolygonTxFromBtc] = useState("");

  async function createBtcInvoice() {
    try {
      if (!form.buyerAddress || !ethers.isAddress(form.buyerAddress)) throw new Error("Enter a valid buyer address (0x...).");
      if (!form.tokenURI) throw new Error("Enter a Token URI.");

      const res = await fetch("/api/btc/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: undefined,   // optionally set a fiat price
          amountBtc: undefined,   // or set a BTC amount string like "0.015"
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
      if (!form.buyerAddress || !form.tokenURI) throw new Error("Buyer address and Token URI are required.");

      setBtcPolling(true);
      let settled = false;
      for (let i = 0; i < 120; i++) { // ~10 minutes if 5s interval
        const st = await fetch(`/api/btc/status?id=${encodeURIComponent(btcInvoice.id)}`);
        const s = st.ok ? await st.json() : { settled: false };
        if (s.settled) {
          settled = true;
          // Ask backend to execute on-chain mint now that BTC is confirmed
          const fin = await fetch("/api/btc/finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: btcInvoice.id,
              buyerAddress: form.buyerAddress,
              tokenURI: form.tokenURI,
              contractAddress, // optional hint
            }),
          });
          if (!fin.ok) throw new Error("Finalize failed on backend.");
          const out = await fin.json(); // { polygonTxHash }
          setPolygonTxFromBtc(out.polygonTxHash || "");
          setStatus("BTC confirmed. Backend minted deed NFT on-chain.");
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

  // ----------- Derived display -----------
  const invoiceMemo = useMemo(() => {
    const addr = form.streetAddress || "—";
    const county = form.county || "—";
    let price =
      form.assetType === "MATIC" ? (form.priceMatic ? `${form.priceMatic} MATIC` : "—") :
      form.assetType === "ETH"   ? (form.priceEth   ? `${form.priceEth} ETH`     : "—") :
      form.assetType === "USDT"  ? (form.priceUsdt  ? `${form.priceUsdt} USDT`   : "—") :
      form.assetType === "USDC"  ? (form.priceUsdc  ? `${form.priceUsdc} USDC`   : "—") :
      "—";
    return `LandSale: ${addr}, ${county} County | Price: ${price}`;
  }, [form.streetAddress, form.county, form.assetType, form.priceMatic, form.priceEth, form.priceUsdt, form.priceUsdc]);

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <Link to="/" style={{ ...styles.btn, ...styles.backBtn }}>← Back to Home</Link>

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

      <h1 style={styles.h1}>Land Sale — Deploy & Execute (MATIC · ETH · USDT · USDC · BTC)</h1>
      <p style={styles.muted}>{planSummary}</p>

      <div style={styles.grid2}>
        {/* LEFT */}
        <section style={styles.card}>
          <h2 style={styles.h2}>1) Contract & Payment Details</h2>

          <form onSubmit={(e) => e.preventDefault()} style={styles.form}>
            {/* Property references */}
            <label style={styles.label}>
              <span>Legal Description (reference)</span>
              <textarea
                rows={3}
                name="legalDescription"
                value={form.legalDescription}
                onChange={onChange}
                placeholder="Abstract/lot/block, metes & bounds, subdivision, etc."
                style={styles.textarea}
              />
            </label>

            <label style={styles.label}>
              <span>Street Address (reference)</span>
              <input
                name="streetAddress"
                value={form.streetAddress}
                onChange={onChange}
                placeholder="123 Ranch Rd, Town, TX"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              <span>County (reference)</span>
              <input
                name="county"
                value={form.county}
                onChange={onChange}
                placeholder="e.g., Travis"
                style={styles.input}
              />
            </label>

            {/* Parties */}
            <div style={{ display: "grid", gap: 10 }}>
              <label style={styles.label}>
                <span>Seller Name</span>
                <input name="sellerName" value={form.sellerName} onChange={onChange} style={styles.input} />
              </label>
              <label style={styles.label}>
                <span>Seller Address (postal)</span>
                <input name="sellerAddress" value={form.sellerAddress} onChange={onChange} style={styles.input} />
              </label>
              <label style={styles.label}>
                <span>Buyer Name</span>
                <input name="buyerName" value={form.buyerName} onChange={onChange} style={styles.input} />
              </label>
              <label style={styles.label}>
                <span>Buyer Address (postal)</span>
                <input name="buyerAddressPostal" value={form.buyerAddressPostal} onChange={onChange} style={styles.input} />
              </label>
              <label style={styles.label}>
                <span>Buyer Address (wallet)</span>
                <input
                  name="buyerAddress"
                  value={form.buyerAddress}
                  onChange={onChange}
                  placeholder="0x..."
                  style={styles.input}
                />
              </label>
            </div>

            {/* Payment Method */}
            <label style={styles.label}>
              <span>Payment Method</span>
              <select
                name="assetType"
                value={form.assetType}
                onChange={(e) => setForm((s) => ({ ...s, assetType: e.target.value }))}
                style={styles.input}
              >
                <option value="MATIC">MATIC (native)</option>
                <option value="ETH">ETH (native)</option>
                <option value="USDT">USDT (ERC-20)</option>
                <option value="USDC">USDC (ERC-20)</option>
                <option value="BTC">BTC (on-chain via backend)</option>
              </select>
            </label>

            {/* Price Inputs */}
            {form.assetType === "MATIC" && (
              <label style={styles.label}>
                <span>Price (MATIC)</span>
                <input
                  name="priceMatic"
                  value={form.priceMatic}
                  onChange={onChange}
                  inputMode="decimal"
                  placeholder="e.g., 2500"
                  style={styles.input}
                />
              </label>
            )}
            {form.assetType === "ETH" && (
              <label style={styles.label}>
                <span>Price (ETH)</span>
                <input
                  name="priceEth"
                  value={form.priceEth}
                  onChange={onChange}
                  inputMode="decimal"
                  placeholder="e.g., 1.25"
                  style={styles.input}
                />
              </label>
            )}
            {form.assetType === "USDT" && (
              <label style={styles.label}>
                <span>Price (USDT)</span>
                <input
                  name="priceUsdt"
                  value={form.priceUsdt}
                  onChange={onChange}
                  inputMode="decimal"
                  placeholder="e.g., 25000"
                  style={styles.input}
                />
              </label>
            )}
            {form.assetType === "USDC" && (
              <label style={styles.label}>
                <span>Price (USDC)</span>
                <input
                  name="priceUsdc"
                  value={form.priceUsdc}
                  onChange={onChange}
                  inputMode="decimal"
                  placeholder="e.g., 25000"
                  style={styles.input}
                />
              </label>
            )}

            {/* NFT metadata */}
            <label style={styles.label}>
              <span>NFT Token URI (deed metadata)</span>
              <input
                name="tokenURI"
                value={form.tokenURI}
                onChange={onChange}
                placeholder="ipfs://... or https://..."
                style={styles.input}
              />
            </label>

            <div style={styles.helperRow}>
              <div style={{ fontSize: 13, color: "#57606a", textAlign: "left" }}>
                <strong>Current Plan:</strong> {planSummary}
              </div>
            </div>

            {/* ----------- CONTRACT ARTIFACT / DEPLOY / ATTACH ----------- */}
            <div style={{ borderTop: "1px solid #e6e6e6", paddingTop: 10, marginTop: 4 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, textAlign: "left" }}>Contract Controls</h3>

              <label style={styles.label}>
                <span>Paste Artifact JSON (from Hardhat/Foundry build)</span>
                <textarea
                  rows={5}
                  value={artifactJSON}
                  onChange={(e) => setArtifactJSON(e.target.value)}
                  placeholder='{"abi":[...],"bytecode":"0x..."}'
                  style={styles.textarea}
                />
              </label>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" style={styles.btn} onClick={parseArtifact}>Parse Artifact</button>
                <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={deployContract} disabled={!abi || !bytecode || !signer}>
                  Deploy Contract
                </button>
              </div>

              {contractAddress && (
                <div style={styles.noteBox}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Deployed / Attached Contract</div>
                  <div style={{ fontSize: 13, wordBreak: "break-all" }}>
                    Address: <code>{contractAddress}</code>
                    {deployTxHash && (
                      <>
                        <br />
                        Deploy Tx: <code>{deployTxHash}</code>
                      </>
                    )}
                  </div>
                </div>
              )}

              {!contractAddress && (
                <label style={{ ...styles.label, marginTop: 8 }}>
                  <span>Or use existing contract address</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={existingAddress}
                      onChange={(e) => setExistingAddress(e.target.value)}
                      placeholder="0x..."
                      style={{ ...styles.input, flex: 1 }}
                    />
                    <button type="button" style={styles.btn} onClick={useExisting}>Use Address</button>
                  </div>
                </label>
              )}
            </div>

            {/* ----------- EXECUTION ACTIONS ----------- */}
            <div style={{ borderTop: "1px solid #e6e6e6", paddingTop: 10, marginTop: 8 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, textAlign: "left" }}>Execute Sale (Mint with Selected Method)</h3>

              {["MATIC", "ETH", "USDT", "USDC"].includes(form.assetType) ? (
                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  onClick={executeSaleMint}
                  disabled={!contractAddress || !abi || !signer}
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

                  {polygonTxFromBtc && (
                    <div style={styles.noteBox}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>On-chain Tx (mint from BTC rail)</div>
                      <div style={styles.monoSmall}>{polygonTxFromBtc}</div>
                    </div>
                  )}
                </>
              )}
            </div>

            {status && (
              <div style={styles.noteBox}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Status</div>
                <div style={{ fontSize: 13 }}>{status}</div>
              </div>
            )}
          </form>
        </section>

        {/* RIGHT: Legal-style preview */}
        <section style={styles.card}>
          <h2 style={styles.h2}>2) Legal Contract Preview</h2>
          <div style={styles.legalPage} id="printArea">
            <div style={{ textAlign: "left", marginBottom: 12 }}>
              <div style={styles.docTitle}>LAND PURCHASE AGREEMENT</div>
              <div style={styles.docSubtitle}>
                No Escrow · On-chain Execution {form.assetType === "BTC" ? "· BTC Rail" : ""}
              </div>
            </div>

            <p style={styles.para}>
              This Land Purchase Agreement (“Agreement”) is made effective as of {fmtDate(form.effectiveDate)} (“Effective Date”) by and between{" "}
              <span style={styles.smallCaps}>{form.sellerName || "________"}</span>, with a mailing address of {form.sellerAddress || "________"}, as “Seller,” and{" "}
              <span style={styles.smallCaps}>{form.buyerName || "________"}</span>, with a mailing address of {form.buyerAddressPostal || "________"}, as “Buyer.”
            </p>

            <ol style={styles.clauses}>
              <li>
                <span style={styles.clauseTitle}>Property.</span> Seller agrees to sell and Buyer agrees to purchase the real property commonly known as{" "}
                {form.streetAddress || "________"}, located in {form.county || "________"} County, together with the following legal description:{" "}
                {form.legalDescription || "________"} (the “Property”).
              </li>
              <li>
                <span style={styles.clauseTitle}>Purchase Price & Payment.</span>{" "}
                {form.assetType === "MATIC" && (
                  <>Price: {form.priceMatic || "________"} MATIC. Buyer pays in MATIC; the smart contract mints an NFT deed upon execution.</>
                )}
                {form.assetType === "ETH" && (
                  <>Price: {form.priceEth || "________"} ETH. Buyer pays in ETH; the smart contract mints an NFT deed upon execution.</>
                )}
                {form.assetType === "USDT" && (
                  <>Price: {form.priceUsdt || "________"} USDT. Buyer approves USDT to the contract and executes the sale; the contract mints an NFT deed.</>
                )}
                {form.assetType === "USDC" && (
                  <>Price: {form.priceUsdc || "________"} USDC. Buyer approves USDC to the contract and executes the sale; the contract mints an NFT deed.</>
                )}
                {form.assetType === "BTC" && (
                  <>Buyer pays in on-chain Bitcoin to a payment address designated by Seller’s service provider. After sufficient Bitcoin confirmations, the service triggers a smart contract call to mint the NFT deed to Buyer.</>
                )}
              </li>
              <li>
                <span style={styles.clauseTitle}>No Escrow; No Utilities.</span> There is no escrow, and no obligation relating to utilities or ongoing services is
                included within this Agreement.
              </li>
              <li>
                <span style={styles.clauseTitle}>Closing.</span> Closing shall occur on or before {fmtDate(form.closingDate)} or such other date as the parties may mutually
                agree in writing. Upon receipt of the Price by the designated method above, Buyer is deemed to have tendered payment in full.
              </li>
              <li>
                <span style={styles.clauseTitle}>Title & Deed.</span> Any county recording is handled off-chain by the parties. This sample is not legal advice.
              </li>
              <li>
                <span style={styles.clauseTitle}>As-Is; Risk of Loss.</span> The Property is sold “AS-IS.” Risk of loss passes to Buyer upon Closing.
              </li>
              <li>
                <span style={styles.clauseTitle}>Governing Law.</span> This Agreement is governed by the laws of the State of Texas.
              </li>
              <li>
                <span style={styles.clauseTitle}>Entire Agreement.</span> This Agreement constitutes the entire agreement between the parties.
              </li>
            </ol>

            <div style={styles.sigBlock}>
              <div style={styles.sigCol}>
                <div style={styles.sigLine} />
                <div style={styles.sigLabel}>SELLER: {form.sellerName || "________"}</div>
                <div style={styles.sigDate}>Date: {fmtDate(form.effectiveDate)}</div>
              </div>
              <div style={styles.sigCol}>
                <div style={styles.sigLine} />
                <div style={styles.sigLabel}>BUYER: {form.buyerName || "________"}</div>
                <div style={styles.sigDate}>Date: {fmtDate(form.effectiveDate)}</div>
              </div>
            </div>

            <div style={styles.fineprint}>
              <strong>Notice:</strong> This UI mints the NFT using the selected method (MATIC, ETH, USDT, USDC) or via BTC rail after confirmation.
              Integrate your own backend for BTC invoice creation and finalize calls. This is not legal advice.
            </div>
          </div>

          <div style={styles.docActions}>
            <button
              style={styles.btn}
              type="button"
              onClick={() => {
                const node = document.getElementById("printArea");
                const win = window.open("", "_blank", "width=800,height=1000");
                win.document.write(`<html><head><title>Land Purchase Agreement</title></head><body>${node.innerHTML}</body></html>`);
                win.document.close();
                win.focus();
                win.print();
                win.close();
              }}
            >
              Print Contract
            </button>
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

/* ---------- Inline styles ---------- */
const styles = {
  container: {
    maxWidth: 1180,
    margin: "32px auto 48px",
    padding: "0 20px",
    color: "#1f2328",
    fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
    textAlign: "left", // ← left-align everything by default
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  toolRight: { display: "flex", alignItems: "center", gap: 10 },
  walletMini: { display: "flex", gap: 10, fontSize: 12, color: "#57606a" },
  h1: { margin: "8px 0 4px", fontSize: 26, textAlign: "left" },
  h2: { margin: "0 0 10px", fontSize: 18, textAlign: "left" },
  muted: { color: "#6a737d", marginBottom: 16, textAlign: "left" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  card: { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16, textAlign: "left" },
  form: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },
  label: { display: "grid", gap: 6, textAlign: "left" },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d0d7de",
    borderRadius: 8,
    fontSize: 14,
    textAlign: "left",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d0d7de",
    borderRadius: 8,
    fontSize: 14,
    resize: "vertical",
    textAlign: "left",
  },
  btn: {
    padding: "10px 14px",
    border: "1px solid #d0d7de",
    background: "#fff",
    borderRadius: 8,
    cursor: "pointer",
    textAlign: "left",
  },
  btnPrimary: { background: "#1f6feb", borderColor: "#1f6feb", color: "#fff" },
  backBtn: { textDecoration: "none", display: "inline-flex", alignItems: "center" },

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
  },

  legalPage: {
    background: "#fff",
    border: "1px solid #e6e6e6",
    borderRadius: 10,
    padding: "26px 30px",
    marginTop: 8,
    fontFamily: 'Georgia,"Times New Roman",Times,serif',
    color: "#111",
    lineHeight: 1.45,
    textAlign: "left", // ← left-align the legal preview body
  },
  docTitle: { fontVariantCaps: "small-caps", letterSpacing: 0.5, fontSize: 22, textAlign: "left" },
  docSubtitle: { fontSize: 12, color: "#555", marginTop: 2, textAlign: "left" },
  para: { textAlign: "left", margin: "10px 0 12px" },
  clauses: { paddingLeft: 18, textAlign: "left" },
  clauseTitle: { fontVariantCaps: "small-caps", fontWeight: 600, paddingRight: 6 },
  smallCaps: { fontVariantCaps: "small-caps" },
  sigBlock: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 20, textAlign: "left" },
  sigCol: { display: "grid", gap: 6 },
  sigLine: { height: 1, background: "#333", marginTop: 24 },
  sigLabel: { fontSize: 14 },
  sigDate: { fontSize: 12, color: "#555" },
  fineprint: { marginTop: 16, fontSize: 12, color: "#555", textAlign: "left" },
  docActions: { marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-start" }, // ← align actions left
};
