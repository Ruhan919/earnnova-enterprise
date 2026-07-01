#!/bin/bash
# 🛡️ EARNNOVA Security Toolkit — CLI Entry Point
# Usage: ./run_audit.sh [command]

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

case "${1:-help}" in
    audit)
        echo -e "${BLUE}🛡️  Running full security audit...${NC}"
        cd "$DIR/.."
        python3 "$DIR/audit.py" --path . --report security/audit_report.html "$@"
        ;;
    fast)
        echo -e "${GREEN}🔍 Quick security check...${NC}"
        cd "$DIR/.."
        python3 "$DIR/audit.py" --path . --quiet --ci "$@"
        ;;
    fraud)
        shift
        echo -e "${YELLOW}🎯 Running fraud detection...${NC}"
        python3 "$DIR/fraud_detection.py" "$@"
        ;;
    threat)
        shift
        echo -e "${RED}🌐 Running threat intelligence...${NC}"
        python3 "$DIR/threat_intel.py" "$@"
        ;;
    ci)
        echo -e "${BLUE}🔧 CI mode — full audit with exit code...${NC}"
        cd "$DIR/.."
        python3 "$DIR/audit.py" --path . --quiet --ci --json security/ci_result.json
        STATUS=$?
        if [ $STATUS -eq 0 ]; then
            echo -e "${GREEN}✅ CI Security Check PASSED${NC}"
        else
            echo -e "${RED}❌ CI Security Check FAILED — review findings${NC}"
        fi
        exit $STATUS
        ;;
    install)
        echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
        pip install -r "$DIR/requirements.txt" --quiet
        echo -e "${GREEN}✅ Dependencies installed${NC}"
        ;;
    help|*)
        echo "EARNNOVA Security Toolkit"
        echo ""
        echo "USAGE:"
        echo "  ./run_audit.sh audit       Full security audit (HTML report)"
        echo "  ./run_audit.sh fast        Quick security check"
        echo "  ./run_audit.sh ci          CI mode (exit 1 on critical)"
        echo "  ./run_audit.sh fraud       Run fraud detection"
        echo "  ./run_audit.sh threat      Run threat intelligence"
        echo "  ./run_audit.sh install     Install Python dependencies"
        echo ""
        echo "EXAMPLES:"
        echo "  ./run_audit.sh audit --url https://earnnova.com"
        echo "  ./run_audit.sh fraud analyze --user-id <id> --ads-per-hour 15"
        echo "  ./run_audit.sh threat check-ip 185.220.101.0"
        echo "  ./run_audit.sh threat analyze-log storage/logs/laravel.log"
        ;;
esac
