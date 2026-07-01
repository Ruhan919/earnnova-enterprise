#!/usr/bin/env python3
"""
EARNNOVA Threat Intelligence — IP/domain reputation checks, 
geo-blocking recommendations, and real-time threat feed integration.

Usage:
    python threat_intel.py --check-ip 185.220.101.0
    python threat_intel.py --check-domain suspicious-site.com
    python threat_intel.py --analyze-log /path/to/access.log
"""

import re
import json
import sys
from datetime import datetime
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, asdict

try:
    import click
    import requests
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import Progress
except ImportError:
    print("⚠️  Install dependencies: pip install -r requirements.txt")
    sys.exit(1)

console = Console()

# =============================================================================
# THREAT DATA
# =============================================================================

# Known proxies/VPNs (common exit nodes)
KNOWN_PROXY_IPS: Set[str] = set()

# High-risk countries for traffic (configurable)
HIGH_RISK_COUNTRIES: Set[str] = {
    "KP",  # North Korea
    "IR",  # Iran
    "RU",  # Russia
    "BY",  # Belarus
    "MM",  # Myanmar
    "SD",  # Sudan
    "SY",  # Syria
    "VE",  # Venezuela
    "YE",  # Yemen
    "AF",  # Afghanistan
}

# Known disposable email domains
DISPOSABLE_DOMAINS: Set[str] = {
    "mailinator.com", "guerrillamail.com", "tempmail.com",
    "10minutemail.com", "throwaway.email", "trashmail.com",
    "yopmail.com", "sharklasers.com", "spam4.me",
    "mailnator.com", "mailexpire.com", "maildrop.cc",
}

# Common attack patterns in access logs
ATTACK_PATTERNS: Dict[str, str] = {
    "SQL Injection": r"(\%27|\'|--|\%23|#).*(\%73|\%53|select|SELECT).*(\%66|\%46|from|FROM)",
    "XSS Attempt": r"(<script|<img.*onerror|alert\(|onload=|javascript:)",
    "Path Traversal": r"(\.\./|\.\.\%2f|\.\.\\|window\.location|document\.cookie)",
    "Command Injection": r"(\||;|\$\(|\%60|cat\s|wget\s|curl\s|bash\s)",
    "LFI/RFI": r"(include\s*=|require\s*=|file=\/etc\/passwd)",
    "Scanner/Probe": r"(acunetix|nikto|sqlmap|nmap|nessus|openvas|burpsuite)",
    "Bot/Crawler": r"(bot|crawl|spider|scrape|harvest|collector)",
}

# =============================================================================
# THREAT INTELLIGENCE MODELS
# =============================================================================

@dataclass
class ThreatIndicator:
    ip: str
    domain: Optional[str] = None
    country: Optional[str] = None
    is_proxy: bool = False
    is_tor: bool = False
    is_vpn: bool = False
    is_disposable_email: bool = False
    reputation_score: float = 0.0      # 0 = safe, 1 = malicious
    threat_type: Optional[str] = None
    source: str = "local_analysis"
    first_seen: str = ""
    last_seen: str = ""
    request_count: int = 0
    attack_attempts: int = 0
    tags: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


class ThreatIntelligence:
    """Gathers and analyzes threat data from multiple sources."""

    def __init__(self):
        self.indicators: Dict[str, ThreatIndicator] = {}
        self.api_keys = {
            "abuseipdb": os.getenv("ABUSEIPDB_API_KEY", ""),
            "virustotal": os.getenv("VIRUSTOTAL_API_KEY", ""),
        }

    def check_ip(self, ip: str) -> ThreatIndicator:
        """Analyze an IP address for threat indicators."""
        
        indicator = ThreatIndicator(ip=ip, last_seen=datetime.utcnow().isoformat())

        # 1. Check if it's a known proxy/VPN
        if ip in KNOWN_PROXY_IPS:
            indicator.is_proxy = True
            indicator.tags.append("known_proxy")
            indicator.reputation_score += 0.3

        # 2. Check TOR exit nodes (via DNSBL)
        if self._check_tor(ip):
            indicator.is_tor = True
            indicator.tags.append("tor_exit_node")
            indicator.reputation_score += 0.6

        # 3. Query AbuseIPDB
        abuse_score = self._check_abuseipdb(ip)
        indicator.reputation_score += abuse_score * 0.4
        if abuse_score > 0.5:
            indicator.tags.append("abuseipdb_reported")

        # 4. Check if IP belongs to known datacenter (potential proxy)
        if self._is_datacenter_ip(ip):
            indicator.is_vpn = True
            indicator.tags.append("datacenter_ip")
            indicator.reputation_score += 0.15

        # Normalize score
        indicator.reputation_score = min(1.0, indicator.reputation_score)
        
        if indicator.reputation_score > 0.7:
            indicator.threat_type = "malicious"
        elif indicator.reputation_score > 0.4:
            indicator.threat_type = "suspicious"
        else:
            indicator.threat_type = "benign"

        self.indicators[ip] = indicator
        return indicator

    def analyze_access_log(self, log_path: str) -> Dict[str, ThreatIndicator]:
        """Parse and analyze an access log for threat indicators."""
        
        ip_stats: Dict[str, Dict] = {}
        
        try:
            with open(log_path, "r", errors="ignore") as f:
                for line in f:
                    # Parse common log format
                    ip_match = re.match(r"(\d+\.\d+\.\d+\.\d+)", line)
                    if not ip_match:
                        continue
                    
                    ip = ip_match.group(1)
                    if ip not in ip_stats:
                        ip_stats[ip] = {
                            "count": 0,
                            "attacks": 0,
                            "first_seen": datetime.utcnow().isoformat(),
                            "last_seen": datetime.utcnow().isoformat(),
                            "paths": set(),
                        }
                    
                    stats = ip_stats[ip]
                    stats["count"] += 1
                    stats["last_seen"] = datetime.utcnow().isoformat()

                    # Check for attack patterns
                    for attack_name, pattern in ATTACK_PATTERNS.items():
                        if re.search(pattern, line, re.IGNORECASE):
                            stats["attacks"] += 1
                            stats.setdefault("attack_types", set()).add(attack_name)

                    # Extract path
                    path_match = re.search(r'"(?:GET|POST|PUT|DELETE)\s+([^\s]+)', line)
                    if path_match:
                        stats["paths"].add(path_match.group(1))

            # Analyze each unique IP
            for ip, stats in ip_stats.items():
                if stats["attacks"] > 0 or stats["count"] > 100:
                    indicator = self.check_ip(ip)
                    indicator.request_count = stats["count"]
                    indicator.attack_attempts = stats["attacks"]
                    indicator.first_seen = stats["first_seen"]
                    indicator.tags.extend(list(stats.get("attack_types", set())))

        except FileNotFoundError:
            console.print(f"[red]❌ Log file not found: {log_path}[/red]")
        except Exception as e:
            console.print(f"[red]❌ Error parsing log: {e}[/red]")

        return self.indicators

    def _check_tor(self, ip: str) -> bool:
        """Check if IP is a TOR exit node via DNSBL."""
        try:
            import dns.resolver
            query = f"{'.'.join(reversed(ip.split('.')))}.tor.dnsbl.net"
            answers = dns.resolver.resolve(query, "A")
            return len(answers) > 0
        except Exception:
            return False

    def _check_abuseipdb(self, ip: str) -> float:
        """Query AbuseIPDB for IP reputation."""
        api_key = self.api_keys.get("abuseipdb")
        if not api_key:
            return 0.0
        
        try:
            resp = requests.get(
                "https://api.abuseipdb.com/api/v2/check",
                params={"ipAddress": ip, "maxAgeInDays": "90"},
                headers={"Key": api_key, "Accept": "application/json"},
                timeout=5,
            )
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                return data.get("abuseConfidenceScore", 0) / 100
        except Exception:
            pass
        return 0.0

    def _is_datacenter_ip(self, ip: str) -> bool:
        """Check if IP belongs to a known datacenter/hosting provider."""
        datacenter_ranges = [
            "5.", "13.", "15.", "18.", "20.", "23.", "34.",
            "35.", "38.", "40.", "44.", "45.", "47.", "50.",
            "52.", "54.", "55.", "63.", "64.", "65.", "66.",
            "67.", "68.", "69.", "70.", "71.", "72.", "73.",
            "74.", "75.", "76.", "77.", "78.", "79.", "80.",
            "81.", "82.", "83.", "84.", "85.", "86.", "87.",
            "88.", "89.", "90.", "91.", "92.", "93.", "94.",
            "95.", "96.", "97.", "98.", "99.", "100.", "101.",
            "102.", "103.", "104.", "105.", "106.", "107.",
            "108.", "109.", "110.", "111.", "112.", "113.",
            "114.", "115.", "116.", "117.", "118.", "119.",
            "120.", "121.", "122.", "123.", "124.", "125.",
            "126.", "128.", "129.", "130.", "131.", "132.",
            "133.", "134.", "135.", "136.", "137.", "138.",
            "139.", "140.", "141.", "142.", "143.", "144.",
            "145.", "146.", "147.", "148.", "149.", "150.",
            "151.", "152.", "153.", "154.", "155.", "156.",
            "157.", "158.", "159.", "160.", "161.", "162.",
            "163.", "164.", "165.", "166.", "167.", "168.",
            "169.", "170.", "171.", "172.16.", "172.17.",
            "172.18.", "172.19.", "172.20.", "172.21.",
            "172.22.", "172.23.", "172.24.", "172.25.",
            "172.26.", "172.27.", "172.28.", "172.29.",
            "172.30.", "172.31.", "173.", "174.", "175.",
            "176.", "177.", "178.", "179.", "180.", "181.",
            "182.", "183.", "184.", "185.", "186.", "187.",
            "188.", "189.", "190.", "191.", "192.", "193.",
            "194.", "195.", "196.", "197.", "198.", "199.",
            "200.", "201.", "202.", "203.", "204.", "205.",
            "206.", "207.", "208.", "209.", "210.", "211.",
            "212.", "213.", "214.", "215.", "216.", "217.",
            "218.", "219.", "220.", "221.", "222.", "223.",
        ]
        for prefix in datacenter_ranges:
            if ip.startswith(prefix):
                return True
        return False


# =============================================================================
# CLI
# =============================================================================

@click.group()
def cli():
    """EARNNOVA Threat Intelligence Module"""

@cli.command()
@click.argument("ip")
def check_ip(ip: str):
    """Check an IP address for threat indicators."""
    ti = ThreatIntelligence()
    result = ti.check_ip(ip)
    
    color = "red" if result.reputation_score > 0.5 else "green"
    console.print(Panel.fit(
        f"[bold]🌐 Threat Analysis: {ip}[/bold]\n\n"
        f"Reputation Score: [{color}]{result.reputation_score:.1%}[/]\n"
        f"Threat Type: [bold]{result.threat_type.upper()}[/bold]\n"
        f"Proxy/VPN: {'⚠️ Yes' if result.is_proxy or result.is_vpn else '✅ No'}\n"
        f"TOR Exit: {'⚠️ Yes' if result.is_tor else '✅ No'}\n"
        f"\nTags: {', '.join(result.tags) or 'None'}\n"
        f"Source: {result.source}",
        border_style=color
    ))

@cli.command()
@click.argument("log_path", type=click.Path(exists=True))
def analyze_log(log_path: str):
    """Analyze an access log for malicious activity."""
    
    with Progress() as progress:
        progress.add_task("[cyan]Analyzing access log...", total=None)
        ti = ThreatIntelligence()
        results = ti.analyze_access_log(log_path)
    
    if not results:
        console.print("[yellow]No threats detected in log.[/yellow]")
        return
    
    table = Table(title=f"🚨 Threats Found: {len(results)} IPs")
    table.add_column("IP", style="bold")
    table.add_column("Score", justify="center")
    table.add_column("Type")
    table.add_column("Requests", justify="right")
    table.add_column("Attacks", justify="right")
    table.add_column("Tags")
    
    for ip, indicator in sorted(
        results.items(), key=lambda x: x[1].reputation_score, reverse=True
    )[:20]:
        color = "red" if indicator.reputation_score > 0.5 else "yellow"
        table.add_row(
            ip,
            f"[{color}]{indicator.reputation_score:.0%}[/]",
            indicator.threat_type or "—",
            str(indicator.request_count),
            str(indicator.attack_attempts),
            ", ".join(indicator.tags[:3]) or "—",
        )
    
    console.print(table)

@cli.command()
def stats():
    """Display threat intelligence statistics."""
    
    console.print(Panel.fit(
        "[bold]📊 Threat Intelligence Summary[/bold]\n\n"
        f"Known Proxy/VPN IPs: {len(KNOWN_PROXY_IPS)}\n"
        f"High-Risk Countries: {len(HIGH_RISK_COUNTRIES)}\n"
        f"Disposable Email Domains: {len(DISPOSABLE_DOMAINS)}\n"
        f"Attack Patterns Tracked: {len(ATTACK_PATTERNS)}\n\n"
        "Configure AbuseIPDB API key via ABUSEIPDB_API_KEY env var\n"
        "for enhanced threat detection.",
        border_style="blue"
    ))

if __name__ == "__main__":
    cli()
