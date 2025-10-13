#!/bin/bash

# Load Testing Script for Vibing2 Platform
# Requires k6 to be installed: brew install k6 (macOS) or https://k6.io/docs/getting-started/installation/

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_TYPE="${1:-standard}"
OUTPUT_DIR="./load-test-results"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}=== Vibing2 Load Testing ===${NC}"
echo -e "Base URL: ${YELLOW}$BASE_URL${NC}"
echo -e "Test Type: ${YELLOW}$TEST_TYPE${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Install k6 using:"
    echo "  macOS: brew install k6"
    echo "  Linux: sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69"
    echo "         echo 'deb https://dl.k6.io/deb stable main' | sudo tee /etc/apt/sources.list.d/k6.list"
    echo "         sudo apt-get update && sudo apt-get install k6"
    echo "  Or visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local output_file="$OUTPUT_DIR/${test_name}_${timestamp}.json"

    echo -e "${GREEN}Running $test_name test...${NC}"

    k6 run \
        -e BASE_URL="$BASE_URL" \
        --out json="$output_file" \
        "$test_file"

    echo -e "${GREEN}✓ $test_name test completed${NC}"
    echo -e "Results saved to: ${YELLOW}$output_file${NC}"
    echo ""
}

# Run tests based on type
case $TEST_TYPE in
    standard)
        run_test "standard" "scripts/load-tests/k6-config.js"
        ;;
    stress)
        run_test "stress" "scripts/load-tests/stress-test.js"
        ;;
    spike)
        run_test "spike" "scripts/load-tests/spike-test.js"
        ;;
    all)
        echo -e "${YELLOW}Running all test scenarios...${NC}"
        run_test "standard" "scripts/load-tests/k6-config.js"
        run_test "stress" "scripts/load-tests/stress-test.js"
        run_test "spike" "scripts/load-tests/spike-test.js"
        ;;
    smoke)
        echo -e "${YELLOW}Running smoke test (minimal load)...${NC}"
        k6 run \
            -e BASE_URL="$BASE_URL" \
            --vus 1 \
            --duration 30s \
            scripts/load-tests/k6-config.js
        ;;
    custom)
        # Allow custom parameters
        VUS="${VUS:-10}"
        DURATION="${DURATION:-1m}"
        echo -e "${YELLOW}Running custom test (VUs: $VUS, Duration: $DURATION)...${NC}"
        k6 run \
            -e BASE_URL="$BASE_URL" \
            --vus "$VUS" \
            --duration "$DURATION" \
            scripts/load-tests/k6-config.js
        ;;
    *)
        echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
        echo "Available test types:"
        echo "  standard - Normal load test with gradual ramp-up"
        echo "  stress   - High load stress test"
        echo "  spike    - Sudden traffic spike test"
        echo "  all      - Run all test scenarios"
        echo "  smoke    - Quick smoke test with minimal load"
        echo "  custom   - Custom test (set VUS and DURATION env vars)"
        echo ""
        echo "Usage: $0 [test-type]"
        echo "Example: $0 stress"
        echo "         BASE_URL=https://production.com $0 standard"
        echo "         VUS=50 DURATION=5m $0 custom"
        exit 1
        ;;
esac

# Generate summary report
if [ -d "$OUTPUT_DIR" ]; then
    echo -e "${GREEN}=== Test Summary ===${NC}"
    echo -e "Test results available in: ${YELLOW}$OUTPUT_DIR${NC}"
    echo ""
    echo "To analyze results, you can:"
    echo "1. Use k6 cloud: k6 cloud $OUTPUT_DIR/*.json"
    echo "2. Convert to HTML: k6 run --out html=report.html scripts/load-tests/k6-config.js"
    echo "3. Use Grafana with k6 output"
fi

echo -e "${GREEN}Load testing completed successfully!${NC}"