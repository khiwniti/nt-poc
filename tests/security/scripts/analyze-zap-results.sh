#!/bin/bash
# Analyze ZAP scan results and generate summary

REPORTS_DIR="$1"
TIMESTAMP="$2"

if [ -z "$REPORTS_DIR" ] || [ -z "$TIMESTAMP" ]; then
    echo "Usage: $0 <reports_dir> <timestamp>"
    exit 1
fi

SUMMARY_FILE="${REPORTS_DIR}/summary-${TIMESTAMP}.txt"
JSON_FILES=$(find "$REPORTS_DIR" -name "*${TIMESTAMP}*.json" 2>/dev/null)

echo "OWASP ZAP Security Scan Summary" > "$SUMMARY_FILE"
echo "================================" >> "$SUMMARY_FILE"
echo "Scan Date: $(date)" >> "$SUMMARY_FILE"
echo "Timestamp: $TIMESTAMP" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

# Function to parse JSON and count vulnerabilities
parse_json_report() {
    local json_file="$1"
    if [ ! -f "$json_file" ]; then
        return
    fi
    
    echo "Processing: $(basename "$json_file")" >> "$SUMMARY_FILE"
    
    # Count by risk level using jq if available, otherwise grep
    if command -v jq &> /dev/null; then
        HIGH=$(jq '[.site[]?.alerts[]? | select(.riskcode=="3")] | length' "$json_file" 2>/dev/null || echo "0")
        MEDIUM=$(jq '[.site[]?.alerts[]? | select(.riskcode=="2")] | length' "$json_file" 2>/dev/null || echo "0")
        LOW=$(jq '[.site[]?.alerts[]? | select(.riskcode=="1")] | length' "$json_file" 2>/dev/null || echo "0")
        INFO=$(jq '[.site[]?.alerts[]? | select(.riskcode=="0")] | length' "$json_file" 2>/dev/null || echo "0")
    else
        HIGH=$(grep -o '"riskcode":"3"' "$json_file" 2>/dev/null | wc -l | tr -d ' ')
        MEDIUM=$(grep -o '"riskcode":"2"' "$json_file" 2>/dev/null | wc -l | tr -d ' ')
        LOW=$(grep -o '"riskcode":"1"' "$json_file" 2>/dev/null | wc -l | tr -d ' ')
        INFO=$(grep -o '"riskcode":"0"' "$json_file" 2>/dev/null | wc -l | tr -d ' ')
    fi
    
    echo "  High Risk: $HIGH" >> "$SUMMARY_FILE"
    echo "  Medium Risk: $MEDIUM" >> "$SUMMARY_FILE"
    echo "  Low Risk: $LOW" >> "$SUMMARY_FILE"
    echo "  Informational: $INFO" >> "$SUMMARY_FILE"
    echo "" >> "$SUMMARY_FILE"
}

# Parse all JSON reports
for json_file in $JSON_FILES; do
    parse_json_report "$json_file"
done

# Generate overall assessment
echo "Overall Assessment" >> "$SUMMARY_FILE"
echo "==================" >> "$SUMMARY_FILE"

TOTAL_HIGH=0
TOTAL_MEDIUM=0
TOTAL_LOW=0

for json_file in $JSON_FILES; do
    if [ -f "$json_file" ]; then
        if command -v jq &> /dev/null; then
            H=$(jq '[.site[]?.alerts[]? | select(.riskcode=="3")] | length' "$json_file" 2>/dev/null || echo "0")
            M=$(jq '[.site[]?.alerts[]? | select(.riskcode=="2")] | length' "$json_file" 2>/dev/null || echo "0")
            L=$(jq '[.site[]?.alerts[]? | select(.riskcode=="1")] | length' "$json_file" 2>/dev/null || echo "0")
        else
            H=$(grep -o '"riskcode":"3"' "$json_file" 2>/dev/null | wc -l | tr -d ' ')
            M=$(grep -o '"riskcode":"2"' "$json_file" 2>/dev/null | wc -l | tr -d ' ')
            L=$(grep -o '"riskcode":"1"' "$json_file" 2>/dev/null | wc -l | tr -d ' ')
        fi
        TOTAL_HIGH=$((TOTAL_HIGH + H))
        TOTAL_MEDIUM=$((TOTAL_MEDIUM + M))
        TOTAL_LOW=$((TOTAL_LOW + L))
    fi
done

echo "Total High Risk Issues: $TOTAL_HIGH" >> "$SUMMARY_FILE"
echo "Total Medium Risk Issues: $TOTAL_MEDIUM" >> "$SUMMARY_FILE"
echo "Total Low Risk Issues: $TOTAL_LOW" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

if [ "$TOTAL_HIGH" -gt 0 ]; then
    echo "❌ FAILED: High risk vulnerabilities detected!" >> "$SUMMARY_FILE"
    EXIT_CODE=1
elif [ "$TOTAL_MEDIUM" -gt 5 ]; then
    echo "⚠️  WARNING: Multiple medium risk vulnerabilities detected!" >> "$SUMMARY_FILE"
    EXIT_CODE=0
else
    echo "✅ PASSED: No critical security issues found" >> "$SUMMARY_FILE"
    EXIT_CODE=0
fi

# Output to console
cat "$SUMMARY_FILE"

exit $EXIT_CODE
