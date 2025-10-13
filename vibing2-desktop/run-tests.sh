#!/bin/bash

# Vibing2 Desktop Test Runner
# This script runs the integration test suite with various options

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to src-tauri directory
cd "$(dirname "$0")/src-tauri"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Vibing2 Desktop Test Suite Runner${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Parse command line arguments
TEST_PATTERN=""
SHOW_OUTPUT=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -o|--output)
            SHOW_OUTPUT=true
            shift
            ;;
        -p|--pattern)
            TEST_PATTERN="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: ./run-tests.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -v, --verbose     Show detailed output including println! statements"
            echo "  -o, --output      Show test output as tests run"
            echo "  -p, --pattern     Run only tests matching pattern (e.g., 'save_project')"
            echo "  -h, --help        Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./run-tests.sh                           # Run all tests"
            echo "  ./run-tests.sh -v                        # Run with verbose output"
            echo "  ./run-tests.sh -p save_project           # Run only save_project tests"
            echo "  ./run-tests.sh -p test_greet_command -v  # Run specific test with verbose"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Build test command
TEST_CMD="cargo test"

if [ -n "$TEST_PATTERN" ]; then
    TEST_CMD="$TEST_CMD $TEST_PATTERN"
    echo -e "${YELLOW}Running tests matching pattern: ${TEST_PATTERN}${NC}"
else
    echo -e "${YELLOW}Running all tests...${NC}"
fi

# Add flags
if [ "$VERBOSE" = true ]; then
    TEST_CMD="$TEST_CMD -- --nocapture"
    echo -e "${YELLOW}Verbose mode enabled${NC}"
fi

if [ "$SHOW_OUTPUT" = true ]; then
    TEST_CMD="$TEST_CMD --show-output"
    echo -e "${YELLOW}Show output mode enabled${NC}"
fi

echo ""
echo -e "${BLUE}Executing: ${TEST_CMD}${NC}"
echo ""

# Run tests and capture exit code
if eval $TEST_CMD; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✅ All tests passed!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ❌ Some tests failed${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Tip: Run with -v or --verbose for detailed output${NC}"
    exit 1
fi
