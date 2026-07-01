#!/usr/bin/env python3
"""
EARNNOVA Fraud Detection Engine — ML-powered analysis of user behavior.
Detects suspicious patterns: account farming, bonus abuse, withdrawal fraud.

Usage:
    python fraud_detection.py --db-url postgresql://user:pass@localhost/earnnova
    python fraud_detection.py --analyze-user <user_id>
    python fraud_detection.py --batch                        # Batch analyze all users
"""

import json
import sys
import os
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from collections import defaultdict

try:
    import click
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.markdown import Markdown
except ImportError:
    print("⚠️  Install dependencies: pip install -r requirements.txt")
    sys.exit(1)

console = Console()

# =============================================================================
# RISK MODELS
# =============================================================================

@dataclass
class RiskFactor:
    name: str
    weight: float          # 0.0 to 1.0
    description: str
    score: float = 0.0

    def calculate(self, value: Any, threshold: Any) -> float:
        """Calculate risk score for this factor."""
        raise NotImplementedError


class SameIPMultiAccount(RiskFactor):
    """Detects multiple accounts from the same IP."""
    
    def __init__(self):
        super().__init__(
            name="same_ip_multi_account",
            weight=0.9,
            description="Multiple accounts registered from the same IP address"
        )

    def calculate(self, accounts_per_ip: int, threshold: int = 3) -> float:
        if accounts_per_ip >= threshold:
            return min(1.0, (accounts_per_ip - threshold + 1) / 10)
        return 0.0


class RapidWithdrawal(RiskFactor):
    """Detects users withdrawing immediately after registering."""
    
    def __init__(self):
        super().__init__(
            name="rapid_withdrawal",
            weight=0.7,
            description="Withdrawal requested within hours of registration"
        )

    def calculate(self, hours_since_reg: float, threshold: int = 24) -> float:
        if hours_since_reg < threshold:
            return 1.0 - (hours_since_reg / threshold)
        return 0.0


class BonusAbuse(RiskFactor):
    """Detects referral bonus farming patterns."""
    
    def __init__(self):
        super().__init__(
            name="bonus_abuse",
            weight=0.8,
            description="Suspicious referral patterns indicating bonus farming"
        )

    def calculate(self, referrals_count: int, same_ip_count: int, threshold: int = 5) -> float:
        if referrals_count >= threshold and same_ip_count >= 2:
            return min(1.0, (referrals_count / 20) + (same_ip_count / 5))
        return 0.0


class AdAutomation(RiskFactor):
    """Detects automated ad watching (bots/scripts)."""
    
    def __init__(self):
        super().__init__(
            name="ad_automation",
            weight=0.85,
            description="Suspicious ad watch patterns indicating automation"
        )

    def calculate(self, ads_per_hour: float, human_threshold: int = 3) -> float:
        if ads_per_hour > human_threshold:
            return min(1.0, (ads_per_hour - human_threshold) / 10)
        return 0.0


# =============================================================================
# FRAUD DETECTION ENGINE
# =============================================================================

class FraudDetectionEngine:
    """Main fraud detection engine with ML scoring."""

    def __init__(self):
        self.risk_factors: List[RiskFactor] = [
            SameIPMultiAccount(),
            RapidWithdrawal(),
            BonusAbuse(),
            AdAutomation(),
        ]

    def analyze_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a single user for fraud indicators."""
        
        scores = {}
        total_weight = 0
        weighted_score = 0

        for factor in self.risk_factors:
            score = 0.0
            
            if isinstance(factor, SameIPMultiAccount):
                score = factor.calculate(
                    user_data.get("accounts_per_ip", 1),
                    user_data.get("ip_threshold", 3)
                )
            elif isinstance(factor, RapidWithdrawal):
                score = factor.calculate(
                    user_data.get("hours_since_registration", 9999),
                    user_data.get("withdrawal_threshold_hours", 24)
                )
            elif isinstance(factor, BonusAbuse):
                score = factor.calculate(
                    user_data.get("referral_count", 0),
                    user_data.get("same_ip_referrals", 0),
                    user_data.get("abuse_threshold", 5)
                )
            elif isinstance(factor, AdAutomation):
                score = factor.calculate(
                    user_data.get("ads_per_hour", 0),
                    user_data.get("human_ad_threshold", 3)
                )

            scores[factor.name] = round(score, 3)
            weighted_score += score * factor.weight
            total_weight += factor.weight

        # Normalize to 0-1
        overall_risk = round(weighted_score / total_weight, 3) if total_weight > 0 else 0

        return {
            "user_id": user_data.get("user_id", "unknown"),
            "overall_risk_score": overall_risk,
            "risk_level": self._risk_level(overall_risk),
            "factors": scores,
            "flags": self._get_flags(scores),
            "recommendation": self._get_recommendation(overall_risk),
        }

    def _risk_level(self, score: float) -> str:
        if score >= 0.8:
            return "CRITICAL"
        if score >= 0.6:
            return "HIGH"
        if score >= 0.4:
            return "MEDIUM"
        if score >= 0.2:
            return "LOW"
        return "SAFE"

    def _get_flags(self, scores: Dict[str, float]) -> List[str]:
        flags = []
        if scores.get("same_ip_multi_account", 0) > 0.5:
            flags.append("Multiple accounts from same IP")
        if scores.get("rapid_withdrawal", 0) > 0.5:
            flags.append("Suspiciously rapid withdrawal request")
        if scores.get("bonus_abuse", 0) > 0.5:
            flags.append("Referral bonus abuse pattern detected")
        if scores.get("ad_automation", 0) > 0.5:
            flags.append("Automated ad watching detected")
        return flags

    def _get_recommendation(self, score: float) -> str:
        if score >= 0.8:
            return "🚨 Immediate account suspension and manual review required."
        if score >= 0.6:
            return "⚠️ Flag for manual review. Restrict withdrawals temporarily."
        if score >= 0.4:
            return "👀 Increase monitoring frequency. Send verification email."
        if score >= 0.2:
            return "📝 Log for observation. No immediate action needed."
        return "✅ No action required."

    def analyze_batch(self, users: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze multiple users and generate a batch report."""
        results = []
        for user in users:
            results.append(self.analyze_user(user))
        return results


# =============================================================================
# REPORTING
# =============================================================================

def display_results(results: List[Dict[str, Any]]) -> None:
    """Display fraud analysis results in a formatted table."""
    
    table = Table(title="🎯 Fraud Detection Results")
    table.add_column("User ID", style="dim")
    table.add_column("Risk Score", justify="center")
    table.add_column("Level", style="bold")
    table.add_column("Flags")
    table.add_column("Recommendation")

    for r in results:
        level_style = {
            "CRITICAL": "red", "HIGH": "orange1",
            "MEDIUM": "yellow", "LOW": "blue", "SAFE": "green"
        }
        flags = "; ".join(r.get("flags", [])) or "—"
        table.add_row(
            r["user_id"][:12],
            f"{r['overall_risk_score']:.1%}",
            f"[{level_style.get(r['risk_level'], 'white')}]{r['risk_level']}[/]",
            flags[:50],
            r["recommendation"][:40],
            style="dim" if r["risk_level"] == "SAFE" else ""
        )
    
    console.print(table)


# =============================================================================
# CLI
# =============================================================================

@click.group()
def cli():
    """EARNNOVA Fraud Detection Engine"""

@cli.command()
@click.option("--user-id", required=True, help="User ID to analyze")
@click.option("--ads-per-hour", default=0, type=float)
@click.option("--accounts-per-ip", default=1, type=int)
@click.option("--hours-since-reg", default=9999, type=float)
@click.option("--referral-count", default=0, type=int)
@click.option("--same-ip-referrals", default=0, type=int)
def analyze(user_id: str, ads_per_hour: float, accounts_per_ip: int,
            hours_since_reg: float, referral_count: int, same_ip_referrals: int):
    """Analyze a single user for fraud indicators."""
    
    engine = FraudDetectionEngine()
    
    user_data = {
        "user_id": user_id,
        "ads_per_hour": ads_per_hour,
        "accounts_per_ip": accounts_per_ip,
        "hours_since_registration": hours_since_reg,
        "referral_count": referral_count,
        "same_ip_referrals": same_ip_referrals,
    }
    
    result = engine.analyze_user(user_data)
    
    console.print(Panel.fit(
        f"[bold]🎯 Fraud Analysis: {user_id[:12]}[/bold]\n\n"
        f"Risk Score: [{'red' if result['overall_risk_score'] > 0.5 else 'green'}]"
        f"{result['overall_risk_score']:.1%}[/]\n"
        f"Level: [{ 'red' if result['risk_level'] in ('CRITICAL','HIGH') else 'yellow' }]"
        f"{result['risk_level']}[/]\n\n"
        f"[bold]Factors:[/bold]\n" + "\n".join(
            f"  • {k}: {v:.1%}" for k, v in result['factors'].items()
        ) + "\n\n"
        f"[bold]Flags:[/bold] {', '.join(result['flags']) or 'None'}\n\n"
        f"{result['recommendation']}",
        border_style="red" if result['overall_risk_score'] > 0.5 else "green"
    ))


@cli.command()
def demo():
    """Run a demo analysis with sample data."""
    
    console.print("[bold]🎯 Running demo fraud analysis...[/bold]\n")
    
    sample_users = [
        {
            "user_id": "usr_legit_001",
            "ads_per_hour": 2,
            "accounts_per_ip": 1,
            "hours_since_registration": 720,
            "referral_count": 3,
            "same_ip_referrals": 0,
        },
        {
            "user_id": "usr_suspicious_042",
            "ads_per_hour": 12,
            "accounts_per_ip": 5,
            "hours_since_registration": 2,
            "referral_count": 15,
            "same_ip_referrals": 4,
        },
        {
            "user_id": "usr_farmer_099",
            "ads_per_hour": 30,
            "accounts_per_ip": 12,
            "hours_since_registration": 1,
            "referral_count": 50,
            "same_ip_referrals": 8,
        },
    ]
    
    engine = FraudDetectionEngine()
    results = engine.analyze_batch(sample_users)
    display_results(results)


if __name__ == "__main__":
    cli()
