#!/bin/bash

# Advanced WhatsApp Bot Deployment Script
# This script automates the deployment process to Vercel

set -e

echo "🚀 Starting deployment of Advanced WhatsApp Bot..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required commands exist
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed. Please install it first.${NC}"
        exit 1
    fi
}

# Validate environment file
validate_env() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please edit .env with your actual API keys before deploying.${NC}"
        read -p "Press enter to continue after editing .env file..."
    fi
    
    # Check for required environment variables
    required_vars=("SENDPULSE_USER_ID" "SENDPULSE_SECRET" "STABILITY_API_KEY" "MISTRAL_API_KEY")
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" .env || grep -q "^$var=your_" .env; then
            echo -e "${RED}❌ $var is not properly set in .env file${NC}"
            echo -e "${YELLOW}Please set all required environment variables before deploying.${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ Environment variables validated${NC}"
}

# Run tests
run_tests() {
    echo -e "${BLUE}🧪 Running tests...${NC}"
    
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        npm test
        echo -e "${GREEN}✅ Tests passed${NC}"
    else
        echo -e "${YELLOW}⚠️  No tests found, skipping...${NC}"
    fi
}

# Build check
build_check() {
    echo -e "${BLUE}🔨 Checking build...${NC}"
    
    # Install dependencies
    npm install
    
    # Check if main entry point exists
    if [ ! -f "src/index.js" ]; then
        echo -e "${RED}❌ Main entry point src/index.js not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Build check passed${NC}"
}

# Deploy to Vercel
deploy_vercel() {
    echo -e "${BLUE}🚀 Deploying to Vercel...${NC}"
    
    # Check if logged into Vercel
    if ! vercel whoami &> /dev/null; then
        echo -e "${YELLOW}⚠️  Not logged into Vercel. Please login...${NC}"
        vercel login
    fi
    
    # Deploy
    if [ "$1" == "production" ]; then
        echo -e "${BLUE}📦 Deploying to production...${NC}"
        vercel --prod
    else
        echo -e "${BLUE}📦 Deploying to preview...${NC}"
        vercel
    fi
    
    echo -e "${GREEN}✅ Deployment completed!${NC}"
}

# Setup Vercel environment variables
setup_env_vars() {
    echo -e "${BLUE}⚙️  Setting up environment variables in Vercel...${NC}"
    
    # Read from .env file and set in Vercel
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        if [[ $key =~ ^[[:space:]]*# ]] || [[ -z $key ]]; then
            continue
        fi
        
        # Remove quotes from value if present
        value=$(echo $value | sed 's/^"\(.*\)"$/\1/')
        
        # Set environment variable in Vercel
        if [[ ! -z $key && ! -z $value ]]; then
            echo "Setting $key..."
            vercel env add $key production <<< $value
        fi
    done < .env
    
    echo -e "${GREEN}✅ Environment variables set up${NC}"
}

# Main deployment function
main() {
    echo -e "${BLUE}🤖 Advanced WhatsApp Bot Deployment${NC}"
    echo "=================================="
    
    # Parse command line arguments
    ENVIRONMENT="preview"
    SKIP_TESTS=false
    SETUP_ENV=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --production|-p)
                ENVIRONMENT="production"
                shift
                ;;
            --skip-tests|-s)
                SKIP_TESTS=true
                shift
                ;;
            --setup-env|-e)
                SETUP_ENV=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --production, -p    Deploy to production"
                echo "  --skip-tests, -s    Skip running tests"
                echo "  --setup-env, -e     Setup environment variables in Vercel"
                echo "  --help, -h          Show this help message"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                exit 1
                ;;
        esac
    done
    
    # Check required commands
    check_command "node"
    check_command "npm"
    check_command "vercel"
    
    # Validate environment
    validate_env
    
    # Build check
    build_check
    
    # Run tests (unless skipped)
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    fi
    
    # Setup environment variables if requested
    if [ "$SETUP_ENV" = true ]; then
        setup_env_vars
    fi
    
    # Deploy
    deploy_vercel $ENVIRONMENT
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📝 Next steps:${NC}"
    echo "1. Configure your SendPulse webhook URL in your SendPulse dashboard"
    echo "2. Test the bot by sending a message to your WhatsApp number"
    echo "3. Monitor logs using: vercel logs"
    echo ""
    echo -e "${BLUE}📚 Useful commands:${NC}"
    echo "• vercel logs                 - View deployment logs"
    echo "• vercel env ls              - List environment variables"
    echo "• vercel domains             - Manage custom domains"
    echo "• vercel --help              - Get help with Vercel CLI"
}

# Run main function
main "$@"