#!/usr/bin/env python3
"""
EARNNOVA Security Auditor — Automated penetration testing & hardening scanner.
Integrates with Laravel to audit configurations, dependencies, and runtime security.

Usage:
    python audit.py --path /path/to/laravel --report security_report.html
    python audit.py --ci                          # CI mode (exit 1 on critical)
"""

import os
import sys
import json
import subprocess
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
import hashlib
import ssl
import socket
import urllib.request
import urllib.error

try:
    import click
    from rich.console import Console
    from rich.table import Table
    from rich.progress import Progress
    from rich.panel import Panel
    from rich.markdown import Markdown
    from dotenv import dotenv_values
except ImportError:
    print("⚠️  Install dependencies: pip install -r requirements.txt")
    sys.exit(1)

console = Console()

# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class Finding:
    severity: str          # critical, high, medium, low, info
    category: str          # config, dependency, crypto, auth, headers, etc.
    title: str
    description: str
    recommendation: str
    file: Optional[str] = None
    line: Optional[int] = None
    cvss: Optional[float] = None
    cve: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class AuditReport:
    project: str
    scan_date: str
    findings: List[Finding] = field(default_factory=list)
    score: float = 100.0

    def add(self, finding: Finding) -> None:
        self.findings.append(finding)
        penalties = {"critical": 25, "high": 10, "medium": 5, "low": 2, "info": 0}
        self.score = max(0, self.score - penalties.get(finding.severity, 0))

    def summary(self) -> Dict[str, int]:
        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        for f in self.findings:
            counts[f.severity] = counts.get(f.severity, 0) + 1
        return counts

    def has_critical(self) -> bool:
        return any(f.severity in ("critical", "high") for f in self.findings)

    def to_dict(self) -> dict:
        return {
            "project": self.project,
            "scan_date": self.scan_date,
            "score": round(self.score, 1),
            "summary": self.summary(),
            "findings": [f.to_dict() for f in self.findings],
        }


# =============================================================================
# BASE SCANNER
# =============================================================================

class BaseScanner:
    """Base class for all security scanners."""

    def __init__(self, project_path: Path):
        self.path = project_path.resolve()
        self.report = AuditReport(
            project=self.path.name,
            scan_date=datetime.utcnow().isoformat(),
        )

    def run(self) -> AuditReport:
        raise NotImplementedError

    def _check_file(self, *parts: str) -> Optional[Path]:
        """Check if a file exists relative to project path."""
        p = self.path.joinpath(*parts)
        return p if p.exists() else None

    def _read_file(self, *parts: str) -> Optional[str]:
        """Read file content if it exists."""
        p = self._check_file(*parts)
        return p.read_text() if p else None

    def _warning(self, severity: str, title: str, desc: str, 
                 rec: str, file: Optional[str] = None, **kwargs) -> Finding:
        return Finding(
            severity=severity, category=self.__class__.__name__,
            title=title, description=desc, recommendation=rec,
            file=file, **kwargs
        )


# =============================================================================
# LARAVEL CONFIGURATION SCANNER
# =============================================================================

class LaravelConfigScanner(BaseScanner):
    """Scans Laravel configuration files for security misconfigurations."""

    APP_KEY_PATTERN = re.compile(r"APP_KEY=([^\s]+)")
    APP_DEBUG_PATTERN = re.compile(r"APP_DEBUG=(true|false)", re.IGNORECASE)
    ENV_VAR_PATTERN = re.compile(r"^([A-Z_]+)=(.+)$", re.MULTILINE)

    def run(self) -> AuditReport:
        console.print("[bold blue]🔍 Scanning Laravel Configuration...[/bold blue]")

        env_path = self._check_file(".env")
        if not env_path:
            self.report.add(self._warning(
                "critical", ".env File Missing",
                "No .env file found. Laravel cannot operate securely without it.",
                "Copy .env.example to .env and generate APP_KEY: php artisan key:generate"
            ))
            return self.report

        env_content = env_path.read_text()
        env_vars = dict(self.ENV_VAR_PATTERN.findall(env_content))

        # 1. APP_KEY check
        app_key = env_vars.get("APP_KEY", "")
        if not app_key or app_key == "":
            self.report.add(self._warning(
                "critical", "APP_KEY is Empty",
                "Application encryption key is not set. All encrypted data is vulnerable.",
                "Run: php artisan key:generate",
                file=".env"
            ))
        elif len(app_key) < 16:
            self.report.add(self._warning(
                "high", "APP_KEY is Too Short",
                f"Current key length: {len(app_key)} chars. Minimum secure: 32 chars.",
                "Regenerate: php artisan key:generate --force",
                file=".env"
            ))

        # 2. APP_DEBUG check
        debug = env_vars.get("APP_DEBUG", "true").lower()
        if debug == "true":
            self.report.add(self._warning(
                "high", "APP_DEBUG Enabled in Production",
                "Debug mode exposes stack traces, environment variables, and sensitive data.",
                "Set APP_DEBUG=false in production .env",
                file=".env"
            ))

        # 3. APP_ENV check
        app_env = env_vars.get("APP_ENV", "local").lower()
        if app_env == "local" or app_env == "dev":
            self.report.add(self._warning(
                "medium", "APP_ENV Set to Development",
                f"Environment is '{app_env}'. Should be 'production' in production.",
                "Set APP_ENV=production in .env",
                file=".env"
            ))

        # 4. Session driver
        session_driver = env_vars.get("SESSION_DRIVER", "file")
        if session_driver == "file":
            self.report.add(self._warning(
                "medium", "File-Based Sessions",
                "File sessions don't scale across multiple servers and can leak on shared hosting.",
                "Use 'redis' or 'database' SESSION_DRIVER in production.",
                file=".env"
            ))

        # 5. DB password strength
        db_password = env_vars.get("DB_PASSWORD", "")
        if db_password and len(db_password) < 12:
            self.report.add(self._warning(
                "medium", "Weak Database Password",
                f"Database password is only {len(db_password)} characters.",
                "Use a password with 16+ chars including numbers and special characters.",
                file=".env"
            ))

        # 6. Check for exposed .env in public
        self._check_public_exposure()

        # 7. Check config/app.php for secure settings
        config_app = self._read_file("config", "app.php")
        if config_app:
            if "'url' => env('APP_URL', 'http://localhost')" in config_app:
                self.report.add(self._warning(
                    "low", "Default APP_URL",
                    "APP_URL is using the default localhost value.",
                    "Set APP_URL to your production domain.",
                    file="config/app.php"
                ))

        return self.report

    def _check_public_exposure(self) -> None:
        """Check if sensitive files are accessible from public."""
        sensitive = [
            (".env", "Environment Configuration"),
            ("composer.json", "Dependency Manifest"),
            (".git/config", "Git Repository Config"),
            ("storage/logs/laravel.log", "Application Logs"),
        ]
        public_path = self.path / "public"
        for rel_path, desc in sensitive:
            full_path = self.path / rel_path
            if full_path.exists():
                # Check if symlinked or stored in public
                if str(full_path).startswith(str(public_path)):
                    self.report.add(self._warning(
                        "critical", f"{desc} Exposed in Public",
                        f"{rel_path} is accessible from the web root.",
                        f"Move it outside public/ or add to .htaccess: <Files .env> deny from all </Files>",
                        file=rel_path
                    ))


# =============================================================================
# DEPENDENCY VULNERABILITY SCANNER
# =============================================================================

class DependencyScanner(BaseScanner):
    """Scans Composer & npm dependencies for known vulnerabilities."""

    def run(self) -> AuditReport:
        console.print("[bold blue]📦 Scanning Dependencies...[/bold blue]")

        # PHP / Composer
        composer_lock = self._check_file("composer.lock")
        if composer_lock:
            self._scan_composer(composer_lock)
        else:
            self.report.add(self._warning(
                "medium", "composer.lock Not Found",
                "Without a lock file, dependency versions are not pinned.",
                "Run: composer install or composer update to generate composer.lock"
            ))

        # Node / npm
        package_lock = self._check_file("package-lock.json")
        yarn_lock = self._check_file("yarn.lock")
        if package_lock or yarn_lock:
            self._scan_npm()

        return self.report

    def _scan_composer(self, lock_file: Path) -> None:
        """Parse composer.lock and check for outdated/vulnerable packages."""
        try:
            import json
            data = json.loads(lock_file.read_text())
            packages = data.get("packages", []) + data.get("packages-dev", [])

            for pkg in packages:
                name = pkg.get("name", "")
                version = pkg.get("version", "")

                # Check for abandoned or known insecure packages
                if name == "laravel/framework" and version:
                    self._check_laravel_version(name, version)

                # Check for packages with security notices
                notice = pkg.get("notice")
                if notice and ("security" in notice.lower() or "vulnerability" in notice.lower()):
                    self.report.add(self._warning(
                        "high", f"Security Notice: {name}",
                        f"Package has a security notice: {notice[:200]}",
                        f"Update {name} to the latest version.",
                        file="composer.lock"
                    ))

        except Exception as e:
            self.report.add(self._warning(
                "low", "Composer Lock Parse Error",
                f"Could not parse composer.lock: {e}",
                "Ensure composer.lock is valid JSON."
            ))

    def _check_laravel_version(self, name: str, version: str) -> None:
        """Check if Laravel version has known vulnerabilities."""
        try:
            major = int(version.split(".")[0])
            if major < 10:
                self.report.add(self._warning(
                    "high", f"Outdated Laravel Version: {version}",
                    f"Laravel {version} is no longer receiving security updates.",
                    "Upgrade to Laravel 11+ immediately.",
                    file="composer.lock"
                ))
        except (ValueError, IndexError):
            pass

    def _scan_npm(self) -> None:
        """Run npm audit if available."""
        try:
            result = subprocess.run(
                ["npm", "audit", "--json"],
                cwd=self.path,
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode != 0:
                try:
                    audit_data = json.loads(result.stdout)
                    vulnerabilities = audit_data.get("vulnerabilities", {})
                    for pkg_name, info in vulnerabilities.items():
                        sev = info.get("severity", "low")
                        severity_map = {
                            "critical": "critical",
                            "high": "high",
                            "moderate": "medium",
                            "low": "low",
                        }
                        self.report.add(self._warning(
                            severity_map.get(sev, "medium"),
                            f"npm Vulnerability: {pkg_name}",
                            f"{info.get('title', 'Vulnerability found')} — {info.get('via', 'Check advisory')}",
                            f"Run: npm audit fix",
                            file="package.json",
                        ))
                except json.JSONDecodeError:
                    pass
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass


# =============================================================================
# HTTP SECURITY HEADERS SCANNER
# =============================================================================

class SecurityHeadersScanner(BaseScanner):
    """Checks live HTTP response headers against security best practices."""

    REQUIRED_HEADERS = {
        "strict-transport-security": {
            "severity": "high",
            "message": "Missing HSTS header — visitors vulnerable to protocol downgrade attacks",
            "fix": "add_header Strict-Transport-Security 'max-age=31536000; includeSubDomains; preload';",
        },
        "x-content-type-options": {
            "severity": "medium",
            "message": "Missing X-Content-Type-Options — browsers may MIME-sniff responses",
            "fix": "add_header X-Content-Type-Options 'nosniff';",
        },
        "x-frame-options": {
            "severity": "medium",
            "message": "Missing X-Frame-Options — site could be embedded in clickjacking attacks",
            "fix": "add_header X-Frame-Options 'DENY';",
        },
        "content-security-policy": {
            "severity": "high",
            "message": "Missing Content-Security-Policy — XSS attacks have no mitigation",
            "fix": "Add a strict CSP header to control resource loading.",
        },
        "referrer-policy": {
            "severity": "low",
            "message": "Missing Referrer-Policy — referrer URLs may leak in external links",
            "fix": "add_header Referrer-Policy 'strict-origin-when-cross-origin';",
        },
        "permissions-policy": {
            "severity": "low",
            "message": "Missing Permissions-Policy — APIs like camera/mic are unconstrained",
            "fix": "add_header Permissions-Policy 'camera=(), microphone=(), geolocation=()';",
        },
    }

    def __init__(self, project_path: Path, target_url: Optional[str] = None):
        super().__init__(project_path)
        self.target_url = target_url

    def run(self) -> AuditReport:
        console.print("[bold blue]🌐 Scanning HTTP Security Headers...[/bold blue]")

        # Try to read URL from .env
        if not self.target_url:
            env = dotenv_values(self.path / ".env") if (self.path / ".env").exists() else {}
            self.target_url = env.get("APP_URL", "http://localhost")

        try:
            req = urllib.request.Request(self.target_url)
            req.add_header("User-Agent", "EARNNOVA-Security-Auditor/2.0")
            response = urllib.request.urlopen(req, timeout=10)
            headers = {k.lower(): v for k, v in response.getheaders()}

            for header, config in self.REQUIRED_HEADERS.items():
                if header not in headers:
                    self.report.add(self._warning(
                        config["severity"],
                        f"Missing Security Header: {header}",
                        config["message"],
                        config["fix"],
                    ))

            # Check for HSTS preload readiness
            if "strict-transport-security" in headers:
                hsts = headers["strict-transport-security"]
                if "max-age=" in hsts:
                    age_match = re.search(r"max-age=(\d+)", hsts)
                    if age_match and int(age_match.group(1)) < 31536000:
                        self.report.add(self._warning(
                            "medium", "HSTS max-age Too Short",
                            f"HSTS max-age is {age_match.group(1)}s. Should be at least 31536000s (1 year).",
                            "Set max-age=31536000 in the HSTS header."
                        ))

            # Check for security.txt
            well_known = f"{self.target_url.rstrip('/')}/.well-known/security.txt"
            try:
                sec_req = urllib.request.Request(well_known)
                sec_resp = urllib.request.urlopen(sec_req, timeout=5)
                if sec_resp.status != 200:
                    raise urllib.error.HTTPError(well_known, 404, "", {}, None)
            except (urllib.error.HTTPError, urllib.error.URLError):
                self.report.add(self._warning(
                    "low", "Missing security.txt",
                    "No security.txt found at .well-known/security.txt. Security researchers cannot report vulnerabilities.",
                    "Create public/.well-known/security.txt with contact information."
                ))

        except Exception as e:
            self.report.add(self._warning(
                "medium", f"Header Scan Failed: {self.target_url}",
                f"Could not connect: {e}",
                "Ensure the application is running and APP_URL is correct."
            ))

        return self.report


# =============================================================================
# SSL/TLS SCANNER
# =============================================================================

class TLSScanner(BaseScanner):
    """Checks SSL/TLS configuration for the target domain."""

    def __init__(self, project_path: Path, domain: Optional[str] = None):
        super().__init__(project_path)
        self.domain = domain

    def run(self) -> AuditReport:
        console.print("[bold blue]🔐 Scanning TLS Configuration...[/bold blue]")

        if not self.domain:
            env = dotenv_values(self.path / ".env") if (self.path / ".env").exists() else {}
            url = env.get("APP_URL", "")
            if url:
                from urllib.parse import urlparse
                self.domain = urlparse(url).hostname

        if not self.domain:
            self.report.add(self._warning(
                "low", "TLS Scan Skipped",
                "No domain configured to scan.",
                "Set APP_URL in .env or pass --domain example.com"
            ))
            return self.report

        try:
            context = ssl.create_default_context()
            with socket.create_connection((self.domain, 443), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=self.domain) as ssock:
                    cert = ssock.getpeercert()
                    cipher = ssock.cipher()

                    # Check certificate expiration
                    from datetime import datetime as dt
                    not_after = dt.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z")
                    days_left = (not_after - dt.utcnow()).days

                    if days_left < 0:
                        self.report.add(self._warning(
                            "critical", "SSL Certificate Expired",
                            f"Certificate expired {abs(days_left)} days ago.",
                            "Renew immediately!",
                        ))
                    elif days_left < 30:
                        self.report.add(self._warning(
                            "high", "SSL Certificate Expiring Soon",
                            f"Certificate expires in {days_left} days.",
                            "Renew within 2 weeks to avoid expiration.",
                        ))

                    # Check TLS version
                    tls_version = ssock.version()
                    if tls_version in ("TLSv1", "TLSv1.1"):
                        self.report.add(self._warning(
                            "high", f"Obsolete TLS Version: {tls_version}",
                            f"{tls_version} has known vulnerabilities (BEAST, POODLE).",
                            "Disable TLS 1.0/1.1 and use TLS 1.2+."
                        ))

        except Exception as e:
            self.report.add(self._warning(
                "medium", f"TLS Scan Failed: {self.domain}",
                f"Could not connect: {e}",
                "Ensure the domain is accessible on port 443."
            ))

        return self.report


# =============================================================================
# LARAVEL LOG ANALYZER
# =============================================================================

class LogAnalyzer(BaseScanner):
    """Analyzes Laravel logs for security events, errors, and attack patterns."""

    ATTACK_PATTERNS = {
        "SQL Injection": re.compile(r"SQLSTATE\[|syntax error.*SQL|division by zero.*SQL", re.IGNORECASE),
        "XSS Attempt": re.compile(r"<script|onerror=|alert\(|onload=", re.IGNORECASE),
        "Mass Assignment": re.compile(r"MassAssignmentException|fillable|guarded", re.IGNORECASE),
        "CSRF Mismatch": re.compile(r"CSRF token mismatch|TokenMismatchException", re.IGNORECASE),
        "Auth Brute Force": re.compile(r"TooManyLoginAttempts|throttle|RateLimiter", re.IGNORECASE),
        "File Upload Attack": re.compile(r"UnexpectedValueException.*upload|FileException", re.IGNORECASE),
        "404 Probe": re.compile(r"NotFoundHttpException|Route \[.*\] not defined", re.IGNORECASE),
        "Method Spoofing": re.compile(r"MethodNotAllowedHttpException", re.IGNORECASE),
    }

    def run(self) -> AuditReport:
        console.print("[bold blue]📋 Analyzing Laravel Logs...[/bold blue]")

        log_path = self.path / "storage" / "logs"
        if not log_path.exists():
            self.report.add(self._warning(
                "low", "No Log Directory",
                "storage/logs/ does not exist.",
                "Create it: mkdir -p storage/logs && chmod 775 storage/logs"
            ))
            return self.report

        log_files = list(log_path.glob("*.log"))
        if not log_files:
            self.report.add(self._warning(
                "info", "No Log Files Found",
                "No .log files in storage/logs/. The application may not have run yet.",
                "Normal if the app is new."
            ))
            return self.report

        total_lines = 0
        attack_counts = {name: 0 for name in self.ATTACK_PATTERNS}

        for log_file in log_files:
            try:
                content = log_file.read_text(errors="ignore")
                lines = content.split("\n")
                total_lines += len(lines)

                for line in lines:
                    for attack_name, pattern in self.ATTACK_PATTERNS.items():
                        if pattern.search(line):
                            attack_counts[attack_name] += 1

                            # Only report first occurrence of each type
                            if attack_counts[attack_name] == 1:
                                # Truncate line for report
                                truncated = line[:200] + "..." if len(line) > 200 else line
                                self.report.add(self._warning(
                                    "high" if attack_name in ("SQL Injection", "XSS Attempt") else "medium",
                                    f"Security Event Detected: {attack_name}",
                                    f"Found in {log_file.name}: {truncated}",
                                    "Investigate immediately. Check IP and user agent. Implement WAF rules.",
                                    file=str(log_file.relative_to(self.path))
                                ))
            except Exception as e:
                self.report.add(self._warning(
                    "low", f"Could Not Read Log: {log_file.name}",
                    f"Error: {e}",
                    "Check file permissions."
                ))

        # Summary
        total_attacks = sum(attack_counts.values())
        if total_attacks > 0:
            self.report.add(self._warning(
                "info", f"Log Analysis Complete: {total_attacks} Events",
                f"Scanned {total_lines} lines across {len(log_files)} files. "
                f"Found: {', '.join(f'{k}: {v}' for k, v in attack_counts.items() if v > 0)}",
                "Review each event and implement WAF rules if applicable."
            ))

        return self.report


# =============================================================================
# CODE QUALITY & STATIC ANALYSIS
# =============================================================================

class CodeQualityScanner(BaseScanner):
    """Runs static analysis tools on the codebase."""

    def run(self) -> AuditReport:
        console.print("[bold blue]🔬 Running Static Code Analysis...[/bold blue]")

        # Check for SQL injection patterns in PHP
        php_files = list(self.path.rglob("*.php"))
        php_files = [f for f in php_files if "vendor" not in str(f) and "storage" not in str(f)]

        dangerous_patterns = {
            "Raw SQL Query": re.compile(r"DB::(raw|select|statement)\(.*\$"),
            "Unescaped Command": re.compile(r"(shell_exec|exec|system|passthru|popen)\(.*\$"),
            "Unsafe unserialize": re.compile(r"unserialize\(\$"),
            "Extract Variable": re.compile(r"extract\(\$"),
            "Eval Usage": re.compile(r"eval\(\$"),
            "File Inclusion": re.compile(r"(include|require)(_once)?\s*\$"),
        }

        for php_file in php_files:
            try:
                content = php_file.read_text()
                for pattern_name, pattern in dangerous_patterns.items():
                    matches = pattern.findall(content)
                    if matches:
                        # Find line number
                        for i, line in enumerate(content.split("\n"), 1):
                            if pattern.search(line):
                                self.report.add(self._warning(
                                    "high", f"Dangerous Pattern: {pattern_name}",
                                    f"Found in {php_file.relative_to(self.path)}:{i}",
                                    f"Use Laravel's built-in security features instead. "
                                    f"Never pass user input to {pattern_name.lower()}.",
                                    file=str(php_file.relative_to(self.path)),
                                    line=i
                                ))
                                break
            except Exception:
                pass

        return self.report


# =============================================================================
# MAIN AUDITOR
# =============================================================================

class SecurityAuditor:
    """Orchestrates all security scanners and generates reports."""

    def __init__(self, project_path: str, target_url: Optional[str] = None):
        self.path = Path(project_path).resolve()
        self.target_url = target_url

    def run_all(self) -> AuditReport:
        console.clear()
        console.print(Panel.fit(
            "[bold emerald]🛡️  EARNNOVA SECURITY AUDITOR[/bold emerald]\n"
            f"[dim]Project: {self.path.name}[/dim]\n"
            f"[dim]Path: {self.path}[/dim]",
            border_style="emerald"
        ))
        console.print()

        scanners = [
            LaravelConfigScanner(self.path),
            DependencyScanner(self.path),
            SecurityHeadersScanner(self.path, self.target_url),
            TLSScanner(self.path),
            LogAnalyzer(self.path),
            CodeQualityScanner(self.path),
        ]

        report = AuditReport(
            project=self.path.name,
            scan_date=datetime.utcnow().isoformat(),
        )

        with Progress(transient=True) as progress:
            task = progress.add_task("[cyan]Scanning...", total=len(scanners))
            for scanner in scanners:
                scanner_result = scanner.run()
                for finding in scanner_result.findings:
                    report.add(finding)
                progress.update(task, advance=1)

        return report


# =============================================================================
# REPORT GENERATION
# =============================================================================

class ReportGenerator:
    """Generates HTML/Markdown security reports."""

    @staticmethod
    def to_markdown(report: AuditReport) -> str:
        lines = [
            "# 🛡️ EARNNOVA Security Audit Report",
            "",
            f"**Project:** {report.project}",
            f"**Date:** {report.scan_date}",
            f"**Security Score:** **{report.score}/100**",
            "",
            "## 📊 Summary",
            "",
            "| Severity | Count |",
            "|----------|-------|",
        ]
        summary = report.summary()
        for sev in ("critical", "high", "medium", "low", "info"):
            lines.append(f"| {sev.capitalize()} | {summary.get(sev, 0)} |")

        if report.findings:
            lines.extend(["", "## 🔍 Findings", ""])
            for i, finding in enumerate(report.findings, 1):
                emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🔵", "info": "ℹ️"}
                lines.extend([
                    f"### {emoji.get(finding.severity, '⚪')} {finding.title}",
                    "",
                    f"**Severity:** {finding.severity.upper()}",
                    f"**Category:** {finding.category}",
                    f"**Description:** {finding.description}",
                    f"**Recommendation:** {finding.recommendation}",
                    "" if not finding.file else f"**File:** `{finding.file}`" + (f":{finding.line}" if finding.line else ""),
                    "",
                    "---" if i < len(report.findings) else "",
                    "",
                ])

        return "\n".join(lines)

    @staticmethod
    def to_html(report: AuditReport) -> str:
        markdown = ReportGenerator.to_markdown(report)

        # Simple markdown to HTML conversion
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Audit — {report.project}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
               background: #0A0E1A; color: #E2E8F0; padding: 40px; line-height: 1.6; }}
        .container {{ max-width: 900px; margin: 0 auto; }}
        h1 {{ font-size: 28px; color: #10B981; margin-bottom: 4px; }}
        .score {{ font-size: 48px; font-weight: 800; margin: 20px 0; }}
        .score.good {{ color: #10B981; }} .score.fair {{ color: #F59E0B; }} .score.poor {{ color: #EF4444; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px 16px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }}
        th {{ font-size: 12px; text-transform: uppercase; color: #64748B; letter-spacing: 1px; }}
        .finding {{ background: rgba(255,255,255,0.02); border-radius: 12px; padding: 20px; margin: 16px 0; 
                    border: 1px solid rgba(255,255,255,0.04); }}
        .finding h3 {{ margin-bottom: 8px; }}
        .finding p {{ color: #94A3B8; font-size: 14px; margin-bottom: 4px; }}
        .sev-critical {{ border-left: 4px solid #EF4444; }}
        .sev-high {{ border-left: 4px solid #F97316; }}
        .sev-medium {{ border-left: 4px solid #F59E0B; }}
        .sev-low {{ border-left: 4px solid #3B82F6; }}
        .sev-info {{ border-left: 4px solid #64748B; }}
        .rec {{ background: rgba(16,185,129,0.06); border-radius: 8px; padding: 12px; margin-top: 8px; font-size: 13px; }}
        .tag {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }}
        .tag-critical {{ background: rgba(239,68,68,0.12); color: #FCA5A5; }}
        .tag-high {{ background: rgba(249,115,22,0.12); color: #FDBA74; }}
        .tag-medium {{ background: rgba(245,158,11,0.12); color: #FDE68A; }}
        .tag-low {{ background: rgba(59,130,246,0.12); color: #93C5FD; }}
        .meta {{ font-size: 13px; color: #64748B; margin-bottom: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🛡️ {report.project} — Security Audit</h1>
        <p class="meta">{report.scan_date}</p>
        
        <div class="score {'good' if report.score >= 80 else 'fair' if report.score >= 50 else 'poor'}">
            {report.score}/100
        </div>

        <table>
            <tr><th>Severity</th><th>Count</th></tr>
"""
        for sev in ("critical", "high", "medium", "low", "info"):
            html += f"<tr><td>{sev.capitalize()}</td><td>{report.summary().get(sev, 0)}</td></tr>\n"

        html += "</table><h2>🔍 Findings</h2>"
        for i, f in enumerate(report.findings, 1):
            emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🔵", "info": "ℹ️"}
            html += f"""
        <div class="finding sev-{f.severity}">
            <h3>{emoji.get(f.severity, '⚪')} {f.title}</h3>
            <p><span class="tag tag-{f.severity}">{f.severity.upper()}</span> {f.category}</p>
            <p>{f.description}</p>
            {f'<p style="font-size:12px;color:#475569">📄 {f.file}' + (f':{f.line}' if f.line else '') + '</p>' if f.file else ''}
            <div class="rec">💡 <strong>Fix:</strong> {f.recommendation}</div>
        </div>
"""

        html += """\n    </div>\n</body>\n</html>"""
        return html


# =============================================================================
# CLI ENTRY POINT
# =============================================================================

@click.command()
@click.option("--path", default=".", help="Path to Laravel project")
@click.option("--url", default=None, help="Target URL for header/TLS scan")
@click.option("--report", default=None, help="Save HTML report to file")
@click.option("--json", "json_out", default=None, help="Save JSON report to file")
@click.option("--ci", is_flag=True, help="CI mode: exit 1 on critical/high findings")
@click.option("--quiet", is_flag=True, help="Minimal output")
def main(path: str, url: Optional[str], report: Optional[str], 
         json_out: Optional[str], ci: bool, quiet: bool) -> None:
    """EARNNOVA Security Auditor — Automated penetration testing & hardening."""

    auditor = SecurityAuditor(path, url)
    audit_report = auditor.run_all()

    # Display summary
    summary = audit_report.summary()
    score_color = "green" if audit_report.score >= 80 else "yellow" if audit_report.score >= 50 else "red"

    if not quiet:
        console.print()
        table = Table(title=f"\n📊 Security Score: {audit_report.score}/100")
        table.add_column("Severity", style="bold")
        table.add_column("Count", justify="right")
        for sev in ("critical", "high", "medium", "low", "info"):
            style = {"critical": "red", "high": "orange1", "medium": "yellow", "low": "blue", "info": "dim"}
            table.add_row(sev.capitalize(), str(summary.get(sev, 0)), style=style.get(sev, ""))
        console.print(table)
        console.print()

    # Save reports
    if report:
        html = ReportGenerator.to_html(audit_report)
        Path(report).write_text(html)
        console.print(f"[green]✅ HTML report saved: {report}[/green]")

    if json_out:
        Path(json_out).write_text(json.dumps(audit_report.to_dict(), indent=2))
        console.print(f"[green]✅ JSON report saved: {json_out}[/green]")

    # CI mode
    if ci and audit_report.has_critical():
        console.print("[red]❌ CI FAILED: Critical or high-severity findings detected.[/red]")
        sys.exit(1)

    console.print("[bold green]✅ Security audit complete![/bold green]")


if __name__ == "__main__":
    main()
