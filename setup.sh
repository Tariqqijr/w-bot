#!/bin/bash

# Advanced WhatsApp Bot Setup Script
# This script helps set up the project for the first time

set -e

echo "🤖 Advanced WhatsApp Bot Setup"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        echo -e "${YELLOW}Please install Node.js 18+ from https://nodejs.org${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ $MAJOR_VERSION -lt 18 ]; then
        echo -e "${RED}❌ Node.js version $NODE_VERSION is too old${NC}"
        echo -e "${YELLOW}Please upgrade to Node.js 18+ from https://nodejs.org${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js $NODE_VERSION detected${NC}"
}

# Install dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    
    npm install
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Setup environment file
setup_environment() {
    if [ ! -f .env ]; then
        echo -e "${BLUE}📝 Setting up environment file...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created from template${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env with your actual API keys${NC}"
    else
        echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    fi
}

# Create logs directory
setup_logs() {
    if [ ! -d "logs" ]; then
        echo -e "${BLUE}📁 Creating logs directory...${NC}"
        mkdir -p logs
        echo -e "${GREEN}✅ Logs directory created${NC}"
    else
        echo -e "${GREEN}✅ Logs directory already exists${NC}"
    fi
}

# Display setup instructions
show_instructions() {
    echo -e "${BLUE}📋 Setup Instructions:${NC}"
    echo ""
    echo "1. 🔑 Get your API keys:"
    echo "   • SendPulse: https://sendpulse.com → Settings → API"
    echo "   • Stability AI: https://platform.stability.ai/ → API Keys"
    echo "   • Mistral AI: https://console.mistral.ai/ → API Keys"
    echo ""
    echo "2. ✏️  Edit the .env file with your API keys:"
    echo "   nano .env"
    echo ""
    echo "3. 🚀 Start development server:"
    echo "   npm run dev"
    echo ""
    echo "4. 📦 Deploy to Vercel:"
    echo "   ./deploy.sh --production"
    echo ""
    echo -e "${GREEN}🎉 Setup completed! Happy coding!${NC}"
}

# Show API key requirements
show_api_requirements() {
    echo -e "${BLUE}🔑 Required API Keys:${NC}"
    echo ""
    echo "📤 SendPulse (WhatsApp):"
    echo "   • User ID"
    echo "   • Secret"
    echo "   • WhatsApp Service ID"
    echo ""
    echo "🎨 Stability AI (Image Generation):"
    echo "   • API Key"
    echo ""
    echo "🧠 Mistral AI (Text Generation):"
    echo "   • API Key"
    echo ""
}

# Main setup function
main() {
    # Parse command line arguments
    SHOW_HELP=false
    SKIP_INSTALL=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                SHOW_HELP=true
                shift
                ;;
            --skip-install|-s)
                SKIP_INSTALL=true
                shift
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                exit 1
                ;;
        esac
    done
    
    if [ "$SHOW_HELP" = true ]; then
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --skip-install, -s    Skip npm install"
        echo "  --help, -h           Show this help message"
        echo ""
        show_api_requirements
        exit 0
    fi
    
    # Run setup steps
    check_node
    
    if [ "$SKIP_INSTALL" = false ]; then
        install_dependencies
    fi
    
    setup_environment
    setup_logs
    show_instructions
}

# Run main function
main "$@"