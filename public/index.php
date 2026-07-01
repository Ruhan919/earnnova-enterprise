<?php
// EARNNOVA Enterprise - Standalone entry
echo '<!DOCTYPE html>
<html>
<head><title>EARNNOVA Enterprise</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#080B15;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
.container{text-align:center;padding:2rem}
.logo{font-size:4rem;font-weight:800;background:linear-gradient(135deg,#10B981,#34D399);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.5rem}
.subtitle{color:rgba(255,255,255,.5);font-size:1.1rem;margin-bottom:2rem}
.badge{display:inline-block;padding:.4rem 1rem;border-radius:100px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);color:#10B981;font-size:.8rem;margin-bottom:1.5rem}
.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;max-width:400px;margin:2rem auto}
.stat{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:1.2rem}
.stat-val{font-size:1.5rem;font-weight:700;color:#10B981}
.stat-lbl{font-size:.75rem;color:rgba(255,255,255,.4);margin-top:.3rem}
.footer{color:rgba(255,255,255,.2);font-size:.8rem;margin-top:3rem}
.status{color:#d4af37;font-size:.85rem}
.status span{display:inline-block;width:8px;height:8px;border-radius:50%;background:#10B981;margin-right:6px;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
</style>
</head>
<body>
<div class="container">
<div class="badge">🚀 DEPLOYED ON RENDER</div>
<div class="logo">EARNNOVA</div>
<div class="subtitle">Enterprise Earning Platform</div>
<div class="status"><span></span> PHP ' . PHP_VERSION . ' | Server is running</div>
<div class="stats">
<div class="stat"><div class="stat-val">✅</div><div class="stat-lbl">Build</div></div>
<div class="stat"><div class="stat-val">🐳</div><div class="stat-lbl">Docker</div></div>
<div class="stat"><div class="stat-val">⚡</div><div class="stat-lbl">PHP ' . PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION . '</div></div>
<div class="stat"><div class="stat-val">🔄</div><div class="stat-lbl">Auto-Deploy</div></div>
</div>
<div class="footer">EARNNOVA Enterprise &copy; 2026</div>
</div>
</body>
</html>';
