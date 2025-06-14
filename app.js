import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import GUI from 'lil-gui';
import './style.css';

class SphereVisualization {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = null;
        this.mouse = new THREE.Vector2();
        this.tooltip = null;
        this.gui = null;
        this.animationId = null;
        
        this.sphereGroup = null;
        this.coreGeometry = null;
        this.coreMaterial = null;
        this.core = null;
        this.lines = [];
        this.nodes = [];
        this.nodeData = [];
        
        this.hoveredNode = null;
        
        // Stock data and filters
        this.stocks = [];
        this.filteredStocks = [];
        this.selectedSector = "All";
        this.selectedMarketCap = "All";
        this.show52WeekHigh = false;
        this.show1YReturns = false;
        
        // Store fixed positions to prevent recalculation
        this.stockPositions = new Map();
        this.stockSizes = new Map();
        
        // Default settings with INCREASED sphere radius
        this.settings = {
            nodeCount: 50,
            sphereRadius: 25,        // INCREASED from 15 to 25
            lineThickness: 0.02,
            nodeSize: 0.3,
            animationSpeed: 0.1, // CHANGED from 0 to 0.1
            rotationEnabled: true,
            showCore: true,
            showLines: false,
            showNodes: true,
            colors: {
                core: '#ffffff',
                lines: '#4a9eff',
                nodes: '#ff6b47',
                background: '#0a0a0a'
            }
        };
        
        // Add selection properties
        this.selectedNode = null;
        this.originalAnimationSpeed = 0;
        this.isNodeSelected = false;
        
        // Add texture properties
        this.textures = {
            concreteMoss: null,
            rubberizedTrack: null
        };
        
        // Add twinkling stars properties
        this.stars = [];
        this.starGroup = null;
        this.starTwinklePhases = []; // Store individual twinkle phases for each star
        
        // Add halo ring properties
        this.selectedNodeHalo = null;
        
        this.init();
    }
    
    async init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupRaycaster();
        this.setupTooltip();
        
        // Load textures before creating sphere
        await this.loadNodeTextures();
        
        // Fetch stock data and create dropdown after DOM is ready
        await this.fetchStockData();
        this.createControlPanel();
        
        this.createSphere();
        this.setupGUI();
        this.setupEventListeners();
        this.animate();
    }
    
    async fetchStockData() {
        try {
            console.log("🔄 Attempting to fetch stock data from server...");
            
            const response = await fetch("http://localhost:4000/stocks");
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            
            const rawStocks = await response.json();
            console.log(`📦 Received ${rawStocks.length} raw stocks from server`);
            
            // Transform server data to match client expectations
            this.stocks = this.transformStockData(rawStocks);
            this.filteredStocks = this.stocks;
            
            console.log(`✅ Successfully transformed ${this.stocks.length} stocks`);
            console.log("📊 Sample transformed stock:", this.stocks[0]);
            
        } catch (error) {
            console.error("❌ Error fetching stock data:", error);
            
            // Check if it's a CORS error
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                console.warn("🚨 CORS or network error detected. Make sure:");
                console.warn("   1. Server is running: node server.cjs");
                console.warn("   2. Server is accessible at http://localhost:4000/stocks");
                console.warn("   3. CORS is properly configured");
            }
            
            console.warn("🔄 Falling back to dummy data...");
            this.stocks = this.generateDummyStockData();
            this.filteredStocks = this.stocks;
            
            console.log(`📝 Using ${this.stocks.length} dummy stocks instead`);
        }
    }

    generateDummyStockData() {
        const stockData = [
            // Technology - Large Cap
            { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", price: 150, change: 2.5, returns: 15, returns1Y: 25, weekHigh52: 180, marketCap: 2500000000000, marketCapCategory: "Large Cap" },
            { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology", price: 280, change: 1.8, returns: 12, returns1Y: 18, weekHigh52: 290, marketCap: 2200000000000, marketCapCategory: "Large Cap" },
            { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology", price: 2800, change: -1.2, returns: 8, returns1Y: 12, weekHigh52: 3000, marketCap: 1800000000000, marketCapCategory: "Large Cap" },
            { symbol: "META", name: "Meta Platforms", sector: "Technology", price: 330, change: 3.2, returns: 20, returns1Y: 35, weekHigh52: 340, marketCap: 800000000000, marketCapCategory: "Large Cap" },
            
            // Technology - Mid Cap
            { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology", price: 450, change: 4.1, returns: 25, returns1Y: 45, weekHigh52: 460, marketCap: 50000000000, marketCapCategory: "Mid Cap" },
            { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology", price: 120, change: 2.8, returns: 18, returns1Y: 28, weekHigh52: 125, marketCap: 45000000000, marketCapCategory: "Mid Cap" },
            
            // Energy - Large Cap
            { symbol: "XOM", name: "Exxon Mobil", sector: "Energy", price: 110, change: -0.8, returns: -5, returns1Y: -8, weekHigh52: 125, marketCap: 450000000000, marketCapCategory: "Large Cap" },
            { symbol: "CVX", name: "Chevron Corp.", sector: "Energy", price: 160, change: -1.5, returns: -8, returns1Y: -12, weekHigh52: 175, marketCap: 300000000000, marketCapCategory: "Large Cap" },
            
            // Energy - Mid Cap
            { symbol: "COP", name: "ConocoPhillips", sector: "Energy", price: 120, change: 0.7, returns: 3, returns1Y: 5, weekHigh52: 122, marketCap: 80000000000, marketCapCategory: "Mid Cap" },
            
            // Energy - Small Cap
            { symbol: "SLB", name: "Schlumberger", sector: "Energy", price: 55, change: -2.1, returns: -12, returns1Y: -15, weekHigh52: 70, marketCap: 8000000000, marketCapCategory: "Small Cap" },
            
            // Finance - Large Cap
            { symbol: "JPM", name: "JPMorgan Chase", sector: "Finance", price: 140, change: 1.1, returns: 10, returns1Y: 15, weekHigh52: 145, marketCap: 420000000000, marketCapCategory: "Large Cap" },
            { symbol: "BAC", name: "Bank of America", sector: "Finance", price: 35, change: -0.5, returns: -2, returns1Y: 2, weekHigh52: 42, marketCap: 280000000000, marketCapCategory: "Large Cap" },
            
            // Finance - Mid Cap
            { symbol: "WFC", name: "Wells Fargo", sector: "Finance", price: 45, change: 0.3, returns: 5, returns1Y: 8, weekHigh52: 48, marketCap: 180000000000, marketCapCategory: "Mid Cap" },
            { symbol: "GS", name: "Goldman Sachs", sector: "Finance", price: 320, change: 2.2, returns: 14, returns1Y: 20, weekHigh52: 325, marketCap: 110000000000, marketCapCategory: "Mid Cap" },
            
            // Healthcare - Large Cap
            { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", price: 170, change: 0.9, returns: 7, returns1Y: 12, weekHigh52: 175, marketCap: 450000000000, marketCapCategory: "Large Cap" },
            { symbol: "UNH", name: "UnitedHealth", sector: "Healthcare", price: 480, change: 2.8, returns: 18, returns1Y: 25, weekHigh52: 485, marketCap: 450000000000, marketCapCategory: "Large Cap" },
            
            // Healthcare - Mid Cap
            { symbol: "PFE", name: "Pfizer Inc.", sector: "Healthcare", price: 40, change: -2.1, returns: -12, returns1Y: -18, weekHigh52: 55, marketCap: 220000000000, marketCapCategory: "Mid Cap" },
            { symbol: "ABBV", name: "AbbVie Inc.", sector: "Healthcare", price: 145, change: 1.5, returns: 9, returns1Y: 14, weekHigh52: 150, marketCap: 260000000000, marketCapCategory: "Mid Cap" },
            
            // Consumer - Large Cap
            { symbol: "AMZN", name: "Amazon.com", sector: "Consumer", price: 3200, change: 3.5, returns: 22, returns1Y: 30, weekHigh52: 3250, marketCap: 1600000000000, marketCapCategory: "Large Cap" },
            { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer", price: 145, change: 0.8, returns: 6, returns1Y: 9, weekHigh52: 148, marketCap: 400000000000, marketCapCategory: "Large Cap" },
            
            // Consumer - Large Cap
            { symbol: "TSLA", name: "Tesla Inc.", sector: "Consumer", price: 700, change: -5.2, returns: -15, returns1Y: -20, weekHigh52: 900, marketCap: 700000000000, marketCapCategory: "Large Cap" },
            { symbol: "HD", name: "Home Depot", sector: "Consumer", price: 310, change: 1.9, returns: 11, returns1Y: 16, weekHigh52: 315, marketCap: 320000000000, marketCapCategory: "Large Cap" }
        ];
        
        return stockData;
    }

    // Transform server data format to client format
    transformStockData(rawStocks) {
        return rawStocks.map(stock => {
            // Parse market cap string to number and determine category
            const marketCapValue = this.parseMarketCap(stock.marketCap);
            const marketCapCategory = this.determineMarketCapCategory(marketCapValue);
            
            // Parse percentage strings to numbers
            const change1D = this.parsePercentage(stock.change1D);
            const returns1Y = this.parsePercentage(stock.return1Y);
            
            return {
                symbol: stock.symbol,
                name: stock.name,
                sector: stock.sector,
                price: stock.price,
                change: change1D, // Map change1D to change
                returns: change1D, // Use change1D as current returns
                returns1Y: returns1Y, // Map return1Y to returns1Y
                weekHigh52: stock.high52W, // Map high52W to weekHigh52
                marketCap: marketCapValue,
                marketCapCategory: marketCapCategory
            };
        });
    }

    // Helper to parse market cap strings like "2.99T", "1.09B", etc.
    parseMarketCap(marketCapStr) {
        if (!marketCapStr) return 0;
        
        const numStr = marketCapStr.replace(/[^0-9.]/g, '');
        const num = parseFloat(numStr);
        
        if (marketCapStr.includes('T')) {
            return num * 1000000000000; // Trillion
        } else if (marketCapStr.includes('B')) {
            return num * 1000000000; // Billion
        } else if (marketCapStr.includes('M')) {
            return num * 1000000; // Million
        }
        
        return num;
    }

    // Helper to determine market cap category
    determineMarketCapCategory(marketCapValue) {
        const TRILLION = 1000000000000; // 1 trillion = 1,000,000,000,000
        
        if (marketCapValue >= 7 * TRILLION) { // >= 7T (Apple 8.99T, Microsoft 10.09T, GOOGL 8.97T, META 8.9T, NVDA 10.78T, etc.)
            return "Large Cap";
        } else if (marketCapValue >= 1.2 * TRILLION) { // >= 1.2T and < 7T (majority of stocks)
            return "Mid Cap";
        } else { // < 1.2T
            return "Small Cap";
        }
    }

    // Helper to parse percentage strings like "+1.05%", "-2.85%"
    parsePercentage(percentStr) {
        if (!percentStr) return 0;
        
        // Remove % sign and convert to number
        const numStr = percentStr.replace('%', '');
        return parseFloat(numStr);
    }

    createControlPanel() {
        console.log("Creating control panel...");
        
        const controlsPanel = document.querySelector('.controls-panel');
        if (!controlsPanel) {
            console.error("Controls panel not found!");
            return;
        }

        if (document.getElementById('control-panel-container')) {
            console.log("Control panel already exists");
            return;
        }
        
        const controlContainer = document.createElement('div');
        controlContainer.id = 'control-panel-container';
        controlContainer.style.cssText = `
            margin-bottom: 20px;
            padding: 16px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-base);
        `;
        
        controlContainer.innerHTML = `
            <!-- Sector Filter -->
            <div style="margin-bottom: 16px;">
                <label for="sector-select" style="
                    display: block; 
                    margin-bottom: 8px; 
                    color: var(--color-text); 
                    font-weight: 500;
                    font-size: 14px;
                ">
                    Filter by Sector:
                </label>
                <select id="sector-select" class="form-control" style="
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-sm);
                    background: var(--color-surface);
                    color: var(--color-text);
                    font-size: 14px;
                ">
                    <option value="All">All Sectors</option>
                </select>
            </div>
            
            <!-- Market Cap Filter -->
            <div style="margin-bottom: 16px;">
                <label for="marketcap-select" style="
                    display: block; 
                    margin-bottom: 8px; 
                    color: var(--color-text); 
                    font-weight: 500;
                    font-size: 14px;
                ">
                    Market Cap:
                </label>
                <select id="marketcap-select" class="form-control" style="
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-sm);
                    background: var(--color-surface);
                    color: var(--color-text);
                    font-size: 14px;
                ">
                    <option value="All">All Market Caps</option>
                    <option value="Small Cap">Small Cap</option>
                    <option value="Mid Cap">Mid Cap</option>
                    <option value="Large Cap">Large Cap</option>
                </select>
            </div>
            
            <!-- 52 Week High Checkbox -->
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <input type="checkbox" id="week-high-checkbox" style="
                    width: 16px;
                    height: 16px;
                    accent-color: #248FE1;
                ">
                <label for="week-high-checkbox" style="
                    color: var(--color-text);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                ">
                    52 week high
                </label>
            </div>
            
            <!-- 1Y Returns % Checkbox -->
            <div style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="returns-1y-checkbox" style="
                    width: 16px;
                    height: 16px;
                    accent-color: #5CF989;
                ">
                <label for="returns-1y-checkbox" style="
                    color: var(--color-text);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                ">
                    1Y Returns %
                </label>
            </div>
        `;
        
        const panelHeader = controlsPanel.querySelector('.panel-header');
        if (panelHeader) {
            controlsPanel.insertBefore(controlContainer, panelHeader.nextSibling);
        } else {
            controlsPanel.insertBefore(controlContainer, controlsPanel.firstChild);
        }
        
        // Setup sector dropdown
        const sectorSelect = document.getElementById('sector-select');
        if (this.stocks && this.stocks.length > 0) {
            const sectors = [...new Set(this.stocks.map(stock => stock.sector))];
            console.log("Available sectors:", sectors);
            
            sectors.forEach(sector => {
                const option = document.createElement('option');
                option.value = sector;
                option.textContent = sector;
                sectorSelect.appendChild(option);
            });
        }
        
        // Setup event listeners
        sectorSelect.addEventListener('change', (e) => {
            console.log("Sector changed to:", e.target.value);
            this.selectedSector = e.target.value;
            this.filterStocks();
            this.createSphere();
        });
        
        const marketCapSelect = document.getElementById('marketcap-select');
        marketCapSelect.addEventListener('change', (e) => {
            console.log("Market Cap changed to:", e.target.value);
            this.selectedMarketCap = e.target.value;
            this.filterStocks();
            this.createSphere();
        });
        
        const weekHighCheckbox = document.getElementById('week-high-checkbox');
        weekHighCheckbox.addEventListener('change', (e) => {
            console.log("52-week high filter:", e.target.checked);
            this.show52WeekHigh = e.target.checked;
            this.updateNodeColors();
        });
        
        const returns1YCheckbox = document.getElementById('returns-1y-checkbox');
        returns1YCheckbox.addEventListener('change', (e) => {
            console.log("1Y Returns filter:", e.target.checked);
            this.show1YReturns = e.target.checked;
            this.updateNodeColors();
        });
        
        console.log("Control panel created successfully");
    }

    filterStocks() {
        let filtered = this.stocks;
        
        // Filter by sector
        if (this.selectedSector !== "All") {
            filtered = filtered.filter(stock => stock.sector === this.selectedSector);
        }
        
        // Filter by market cap
        if (this.selectedMarketCap !== "All") {
            filtered = filtered.filter(stock => stock.marketCapCategory === this.selectedMarketCap);
        }
        
        this.filteredStocks = filtered;
        this.settings.nodeCount = Math.min(this.filteredStocks.length, 100);
        
        console.log(`Filtered stocks: ${this.filteredStocks.length} (Sector: ${this.selectedSector}, Market Cap: ${this.selectedMarketCap})`);
    }

    // Get node size based on market cap category
    getNodeSizeByMarketCap(marketCapCategory) {
        switch (marketCapCategory) {
            case "Small Cap":
                return 0.5 + Math.random() * 0.1; // 0.5-0.6
            case "Mid Cap":
                return 1.1 + Math.random() * 0.1; // 0.65-0.75
            case "Large Cap":
                return 2.4 + Math.random() * 0.3; // 1.2-1.5 (SIGNIFICANTLY LARGER)
            default:
                return 0.65;
        }
    }

    // Get node color based on priority system
    getNodeColor(stock) {
        // Priority 1: 52-week high filter is active (and 1Y returns is off)
        if (this.show52WeekHigh && !this.show1YReturns) {
            if (this.isAt52WeekHigh(stock)) {
                return '#248FE1'; // Blue for stocks at 52W high
            } else {
                return 'TEXTURE'; // Special flag to indicate texture should be used
            }
        }
        
        // Priority 2: 52-week high (when both filters are active)
        if (this.show52WeekHigh && this.isAt52WeekHigh(stock)) {
            return '#248FE1';
        }
        
        // Priority 3: 1Y Returns %
        if (this.show1YReturns) {
            const returns1Y = stock.returns1Y || 0;
            if (returns1Y > 10) {
                return '#5CF989'; // Bright green for >10%
            } else if (returns1Y >= 0) {
                return '#2D7B43'; // Dark green for 0-10%
            } else {
                return '#C83B3B'; // Red for <0%
            }
        }
        
        // Priority 4: Default (no filters active - use textures)
        return 'TEXTURE'; // Special flag to indicate texture should be used
    }

    // Helper function to create consistent hash from string
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    }

    // Helper function to calculate distance between two 3D points
    calculateDistance(pos1, pos2) {
        return Math.sqrt(
            Math.pow(pos1.x - pos2.x, 2) + 
            Math.pow(pos1.y - pos2.y, 2) + 
            Math.pow(pos1.z - pos2.z, 2)
        );
    }

    // Helper function to check if two spheres overlap
    checkSphereOverlap(pos1, radius1, pos2, radius2, minGap = 0.5) {
        const distance = this.calculateDistance(pos1, pos2);
        const requiredDistance = radius1 + radius2 + minGap;
        return distance < requiredDistance;
    }

    // Completely rewritten clustering method with MAXIMUM sector separation
    create3DSectorClusters(stocks) {
        const points = [];
        
        // Group stocks by sector
        const stocksBySector = {};
        stocks.forEach(stock => {
            if (!stocksBySector[stock.sector]) {
                stocksBySector[stock.sector] = [];
            }
            stocksBySector[stock.sector].push(stock);
        });
        
        const sectors = Object.keys(stocksBySector);
        
        // Define MAXIMALLY SEPARATED 3D regions for each sector on the sphere
        // Using MUCH LARGER separations and increased sphere radius
        const sectorRegions = [
            { 
                // TOP NORTH - Technology (ISOLATED at top)
                theta: 0,                       // 0°
                phi: Math.PI/12,               // 15° from top (very high, isolated)
                name: "Technology",
                thetaRange: Math.PI/5,         // 36° spread
                phiRange: Math.PI/8            // 22.5° spread
            },
            { 
                // SOUTH EQUATOR - Energy (MOVED to opposite side of sphere)
                theta: Math.PI,                 // 180° (south, opposite from Technology)
                phi: Math.PI/2,                // Equator (middle)
                name: "Energy",
                thetaRange: Math.PI/8,         // 22.5° spread (smaller)
                phiRange: Math.PI/10           // 18° spread (smaller)
            },
            { 
                // NORTHWEST EQUATOR - Finance
                theta: 5*Math.PI/3,             // 300° (northwest, far from Energy)
                phi: Math.PI/2,                // Equator (middle)
                name: "Finance",
                thetaRange: Math.PI/8,         // 22.5° spread (smaller)
                phiRange: Math.PI/10           // 18° spread (smaller)
            },
            { 
                // SOUTHEAST LOWER - Healthcare
                theta: 2*Math.PI/3,             // 120° (southeast)
                phi: 5*Math.PI/6,              // 150° from top (much lower)
                name: "Healthcare",
                thetaRange: Math.PI/8,         // 22.5° spread (smaller)
                phiRange: Math.PI/10           // 18° spread (smaller)
            },
            { 
                // SOUTHWEST LOWER - Consumer
                theta: 4*Math.PI/3,             // 240° (southwest, opposite Healthcare)
                phi: 5*Math.PI/6,              // 150° from top (much lower)
                name: "Consumer",
                thetaRange: Math.PI/8,         // 22.5° spread (smaller)
                phiRange: Math.PI/10           // 18° spread (smaller)
            }
        ];
        
        // Log sector region assignments for debugging
        console.log("🎯 Sector Region Assignments (MAXIMUM SEPARATION):");
        sectorRegions.forEach((region, index) => {
            console.log(`   ${index}: ${region.name} - θ=${(region.theta * 180/Math.PI).toFixed(0)}° φ=${(region.phi * 180/Math.PI).toFixed(0)}°`);
            console.log(`      Range: θ±${(region.thetaRange * 180/Math.PI).toFixed(0)}° φ±${(region.phiRange * 180/Math.PI).toFixed(0)}°`);
        });
        
        sectors.forEach((sector, sectorIndex) => {
            const sectorStocks = stocksBySector[sector];
            const region = sectorRegions[sectorIndex % sectorRegions.length];
            
            console.log(`🔄 Processing sector: ${sector} with ${sectorStocks.length} stocks`);
            console.log(`   📍 Region: θ=${(region.theta * 180/Math.PI).toFixed(0)}°, φ=${(region.phi * 180/Math.PI).toFixed(0)}°`);
            
            // Store positions for this sector to check for collisions
            const sectorPositions = [];
            
            // Calculate dynamic minimum distance based on sector stock count
            const baseSectorMinDistance = sector === "Technology" ? 2.5 : 1.5; // Extra spacing for Technology
            const dynamicMinDistance = Math.max(baseSectorMinDistance, Math.sqrt(sectorStocks.length) * 0.3);
            
            console.log(`   🎯 Using minimum intra-sector distance: ${dynamicMinDistance.toFixed(2)} for ${sector}`);
            
            sectorStocks.forEach((stock, stockIndex) => {
                const nodeSize = this.getNodeSizeByMarketCap(stock.marketCapCategory);
                let position = null;
                let attempts = 0;
                const maxAttempts = 200; // Increased attempts for better placement
                
                // Try to find a non-overlapping position
                while (!position && attempts < maxAttempts) {
                    attempts++;
                    
                    // Use different distribution strategies based on attempt count
                    let candidateTheta, candidatePhi;
                    
                    if (attempts <= 100) {
                        // First 100 attempts: Random within region with MODERATE 3D offset
                        const thetaOffset = (Math.random() - 0.5) * region.thetaRange;
                        const phiOffset = (Math.random() - 0.5) * region.phiRange;
                        
                        // Add random 3D offset with ±0.50 radians
                        const randomOffset3D = 1.0; // This gives ±0.50 radians when multiplied by (Math.random() - 0.5)
                        const additionalThetaOffset = (Math.random() - 0.5) * randomOffset3D;
                        const additionalPhiOffset = (Math.random() - 0.5) * randomOffset3D;
                        
                        candidateTheta = region.theta + thetaOffset + additionalThetaOffset;
                        candidatePhi = Math.max(0.1, Math.min(Math.PI - 0.1, region.phi + phiOffset + additionalPhiOffset));
                    } else {
                        // Last 100 attempts: Systematic grid-based approach with 3D variation
                        const gridAttempt = attempts - 100;
                        const gridSize = Math.ceil(Math.sqrt(sectorStocks.length * 2)); // Larger grid
                        const gridX = gridAttempt % gridSize;
                        const gridY = Math.floor(gridAttempt / gridSize);
                        
                        const thetaStep = region.thetaRange / gridSize;
                        const phiStep = region.phiRange / gridSize;
                        
                        candidateTheta = region.theta - region.thetaRange/2 + (gridX + 0.5) * thetaStep;
                        candidatePhi = Math.max(0.1, Math.min(Math.PI - 0.1, 
                            region.phi - region.phiRange/2 + (gridY + 0.5) * phiStep));
                        
                        // Add random offset with ±0.50 radians to avoid perfect grid and create 3D spread
                        const randomOffset3D = 1.0; // This gives ±0.50 radians when multiplied by (Math.random() - 0.5)
                        candidateTheta += (Math.random() - 0.5) * randomOffset3D;
                        candidatePhi += (Math.random() - 0.5) * randomOffset3D;
                        candidatePhi = Math.max(0.1, Math.min(Math.PI - 0.1, candidatePhi));
                    }
                    
                    // Convert to cartesian coordinates
                    const x = Math.sin(candidatePhi) * Math.cos(candidateTheta);
                    const y = Math.cos(candidatePhi);
                    const z = Math.sin(candidatePhi) * Math.sin(candidateTheta);
                    
                    const candidatePosition = new THREE.Vector3(
                        x * this.settings.sphereRadius,
                        y * this.settings.sphereRadius,
                        z * this.settings.sphereRadius
                    );
                    
                    // Check for collisions with existing nodes in this sector (STRICT)
                    let hasCollision = false;
                    for (let i = 0; i < sectorPositions.length; i++) {
                        const existingPos = sectorPositions[i].position;
                        const existingSize = sectorPositions[i].size;
                        
                        // Use dynamic minimum distance + node sizes + extra buffer
                        const requiredDistance = nodeSize + existingSize + dynamicMinDistance;
                        const actualDistance = this.calculateDistance(candidatePosition, existingPos);
                        
                        if (actualDistance < requiredDistance) {
                            hasCollision = true;
                            break;
                        }
                    }
                    
                    // Check for collisions with nodes from other sectors (MASSIVE inter-sector gap)
                    if (!hasCollision) {
                        for (let i = 0; i < points.length; i++) {
                            const existingPos = points[i].position;
                            const existingSize = points[i].size;
                            
                            // MASSIVE inter-sector gap to prevent any overlap (DOUBLED)
                            if (this.checkSphereOverlap(candidatePosition, nodeSize, existingPos, existingSize, 8.0)) {
                                hasCollision = true;
                                break;
                            }
                        }
                    }
                    
                    if (!hasCollision) {
                        position = candidatePosition;
                    }
                }
                
                // If we still couldn't find a collision-free position, use force-based fallback with 3D spread
                if (!position) {
                    console.warn(`⚠️  Could not find collision-free position for ${stock.symbol} after ${maxAttempts} attempts. Using force-based fallback.`);
                    
                    // Force-based fallback: Place at sector center and push outward with 3D variation
                    let fallbackTheta = region.theta;
                    let fallbackPhi = region.phi;
                    
                    // Add spiral offset based on stock index with 3D variation
                    const spiralRadius = Math.min(0.8, 0.2 + (stockIndex * 0.1));
                    const spiralAngle = stockIndex * 2.39996; // Golden angle
                    
                    fallbackTheta += Math.cos(spiralAngle) * spiralRadius * region.thetaRange;
                    fallbackPhi += Math.sin(spiralAngle) * spiralRadius * region.phiRange;
                    
                    // Add 3D random offset with ±0.50 radians for spatial distribution
                    const randomOffset3D = 1.0; // This gives ±0.50 radians when multiplied by (Math.random() - 0.5)
                    fallbackTheta += (Math.random() - 0.5) * randomOffset3D;
                    fallbackPhi += (Math.random() - 0.5) * randomOffset3D;
                    fallbackPhi = Math.max(0.1, Math.min(Math.PI - 0.1, fallbackPhi));
                    
                    const x = Math.sin(fallbackPhi) * Math.cos(fallbackTheta);
                    const y = Math.cos(fallbackPhi);
                    const z = Math.sin(fallbackPhi) * Math.sin(fallbackTheta);
                    
                    position = new THREE.Vector3(
                        x * this.settings.sphereRadius,
                        y * this.settings.sphereRadius,
                        z * this.settings.sphereRadius
                    );
                    
                    // Push away from nearby nodes with 3D consideration
                    for (let pushAttempt = 0; pushAttempt < 10; pushAttempt++) {
                        let needsPush = false;
                        const pushVector = new THREE.Vector3(0, 0, 0);
                        
                        for (let i = 0; i < sectorPositions.length; i++) {
                            const existingPos = sectorPositions[i].position;
                            const distance = this.calculateDistance(position, existingPos);
                            const minDistance = nodeSize + sectorPositions[i].size + dynamicMinDistance;
                            
                            if (distance < minDistance) {
                                needsPush = true;
                                const pushDirection = position.clone().sub(existingPos).normalize();
                                const pushStrength = (minDistance - distance) * 0.5;
                                pushVector.add(pushDirection.multiplyScalar(pushStrength));
                            }
                        }
                        
                        if (!needsPush) break;
                        
                        // Apply push and normalize to sphere surface
                        position.add(pushVector);
                        position.normalize().multiplyScalar(this.settings.sphereRadius);
                    }
                }
                
                // Store the position for this sector
                sectorPositions.push({
                    position: position,
                    size: nodeSize,
                    stock: stock
                });
                
                // Add to global points array
                points.push({
                    position: position,
                    size: nodeSize,
                    stock: stock
                });
                
                // Log placement for Technology sector
                if (sector === "Technology") {
                    console.log(`   📍 ${stock.symbol}: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}) size:${nodeSize.toFixed(2)}`);
                }
            });
            
            console.log(`✅ Placed ${sectorPositions.length} stocks for sector: ${sector}`);
            
            // Verify no overlaps within this sector
            let overlapCount = 0;
            for (let i = 0; i < sectorPositions.length; i++) {
                for (let j = i + 1; j < sectorPositions.length; j++) {
                    const distance = this.calculateDistance(sectorPositions[i].position, sectorPositions[j].position);
                    const minRequired = sectorPositions[i].size + sectorPositions[j].size + dynamicMinDistance;
                    if (distance < minRequired) {
                        overlapCount++;
                        console.warn(`   ⚠️  Overlap detected: ${sectorPositions[i].stock.symbol} ↔ ${sectorPositions[j].stock.symbol} (${distance.toFixed(2)} < ${minRequired.toFixed(2)})`);
                    }
                }
            }
            
            if (overlapCount === 0) {
                console.log(`   ✅ No overlaps detected in ${sector} sector`);
            } else {
                console.warn(`   ⚠️  ${overlapCount} overlaps detected in ${sector} sector`);
            }
            
            // Log the center position of this sector for verification
            if (sectorPositions.length > 0) {
                const avgX = sectorPositions.reduce((sum, p) => sum + p.position.x, 0) / sectorPositions.length;
                const avgY = sectorPositions.reduce((sum, p) => sum + p.position.y, 0) / sectorPositions.length;
                const avgZ = sectorPositions.reduce((sum, p) => sum + p.position.z, 0) / sectorPositions.length;
                console.log(`   📊 Sector center: (${avgX.toFixed(1)}, ${avgY.toFixed(1)}, ${avgZ.toFixed(1)})`);
            }
        });
        
        console.log(`🎯 Total points generated: ${points.length}`);
        
        // Verify sector separation by calculating distances between sector centers
        console.log("🔍 Verifying sector separation...");
        const sectorCenters = [];
        sectors.forEach((sector, sectorIndex) => {
            const sectorPoints = points.filter(p => p.stock.sector === sector);
            if (sectorPoints.length > 0) {
                const avgX = sectorPoints.reduce((sum, p) => sum + p.position.x, 0) / sectorPoints.length;
                const avgY = sectorPoints.reduce((sum, p) => sum + p.position.y, 0) / sectorPoints.length;
                const avgZ = sectorPoints.reduce((sum, p) => sum + p.position.z, 0) / sectorPoints.length;
                sectorCenters.push({ sector, center: new THREE.Vector3(avgX, avgY, avgZ) });
            }
        });
        
        // Check distances between all sector pairs
        for (let i = 0; i < sectorCenters.length; i++) {
            for (let j = i + 1; j < sectorCenters.length; j++) {
                const distance = this.calculateDistance(sectorCenters[i].center, sectorCenters[j].center);
                console.log(`   📏 Distance ${sectorCenters[i].sector} ↔ ${sectorCenters[j].sector}: ${distance.toFixed(1)} units`);
                
                // Warn if sectors are too close
                if (distance < 15) {
                    console.warn(`   ⚠️  Sectors may be too close: ${distance.toFixed(1)} units`);
                }
            }
        }
        
        return points;
    }

    // Updated initialization method to handle the new structure
    initializePositionsAndSizes() {
        if (this.stockPositions.size > 0) return; // Already initialized
        
        // Clear existing data to force recalculation
        this.stockPositions.clear();
        this.stockSizes.clear();
        
        console.log("🔄 Calculating collision-free positions for all stocks...");
        
        // Calculate all positions using improved 3D clustering with collision detection
        const allPoints = this.create3DSectorClusters(this.stocks);
        
        // Store positions and sizes
        allPoints.forEach(point => {
            this.stockPositions.set(point.stock.symbol, point.position);
            this.stockSizes.set(point.stock.symbol, point.size);
        });
        
        console.log(`✅ Initialized collision-free positions and sizes for ${this.stockPositions.size} stocks`);
    }
    
    createSphere() {
        if (this.sphereGroup) {
            this.scene.remove(this.sphereGroup);
        }
        
        this.sphereGroup = new THREE.Group();
        this.lines = [];
        this.nodes = [];
        this.nodeData = [];
        
        // Initialize positions and sizes if not done already
        this.initializePositionsAndSizes();
        
        // Create core sphere with radius = 3
        const coreRadius = 3;
        this.coreGeometry = new THREE.SphereGeometry(coreRadius, 64, 64);
        
        // Load US flag texture
        const textureLoader = new THREE.TextureLoader();
        
        // Create the flag texture using a data URL (base64 encoded US flag)
        const flagCanvas = document.createElement('canvas');
        flagCanvas.width = 1024;
        flagCanvas.height = 512;
        const ctx = flagCanvas.getContext('2d');
        
        this.drawUSFlag(ctx, flagCanvas.width, flagCanvas.height);
        
        const flagTexture = new THREE.CanvasTexture(flagCanvas);
        flagTexture.wrapS = THREE.RepeatWrapping;
        flagTexture.wrapT = THREE.RepeatWrapping;
        flagTexture.flipY = false;
        flagTexture.minFilter = THREE.LinearFilter;
        flagTexture.magFilter = THREE.LinearFilter;
        
        this.coreMaterial = new THREE.MeshPhongMaterial({
            map: flagTexture,
            color: '#FFFFFF',
            emissive: '#000000',
            emissiveIntensity: 0,
            transparent: false,
            opacity: 1.0,
            shininess: 100,
            specular: '#FFFFFF'
        });
        
        this.core = new THREE.Mesh(this.coreGeometry, this.coreMaterial);
        this.sphereGroup.add(this.core);
        
        // Use filtered stocks for rendering, but maintain original positions
        this.filteredStocks.forEach((stock, index) => {
            const position = this.stockPositions.get(stock.symbol);
            const nodeSize = this.stockSizes.get(stock.symbol);
            if (!position || !nodeSize) return;
            
            // Create line
            if (this.settings.showLines) {
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0, 0, 0),
                    position
                ]);
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: this.settings.colors.lines,
                    transparent: true,
                    opacity: 0.6,
                    linewidth: this.settings.lineThickness
                });
                const line = new THREE.Line(lineGeometry, lineMaterial);
                this.lines.push(line);
                this.sphereGroup.add(line);
            }
            
            // Determine if this stock is at 52W high
            const is52WeekHighStock = this.show52WeekHigh && this.isAt52WeekHigh(stock);
            
            // Get original default color (what it would be without any filters)
            const originalReturns = stock.returns || stock.change || 0;
            const originalDefaultColor = originalReturns >= 0 ? '#00ff00' : '#ff0000';
            const isOriginallyGreen = originalReturns >= 0;
            const isOriginallyRed = originalReturns < 0;
            
            const nodeGeometry = new THREE.SphereGeometry(nodeSize, 16, 16);
            let nodeMaterial;
            
            // Updated texture application logic
            if (!this.show52WeekHigh && !this.show1YReturns) {
                // Default state - apply textures based on original colors
                if (isOriginallyGreen && this.textures.concreteMoss) {
                    nodeMaterial = new THREE.MeshPhongMaterial({
                        map: this.textures.concreteMoss,
                        color: '#FFFFFF',
                        emissive: '#001100',
                        emissiveIntensity: 0.1,
                        transparent: false,
                        opacity: 1.0,
                        shininess: 30,
                        bumpMap: this.textures.concreteMoss,
                        bumpScale: 0.1
                    });
                    console.log(`🟢 Applied Green Metal Rust texture to ${stock.symbol}`);
                } else if (isOriginallyRed && this.textures.rubberizedTrack) {
                    nodeMaterial = new THREE.MeshPhongMaterial({
                        map: this.textures.rubberizedTrack,
                        color: '#FFFFFF',
                        emissive: '#110000',
                        emissiveIntensity: 0.1,
                        transparent: false,
                        opacity: 1.0,
                        shininess: 60,
                        bumpMap: this.textures.rubberizedTrack,
                        bumpScale: 0.05
                    });
                    console.log(`🔴 Applied Rust Coarse texture to ${stock.symbol}`);
                } else {
                    nodeMaterial = new THREE.MeshPhongMaterial({
                        color: originalDefaultColor,
                        emissive: originalDefaultColor,
                        emissiveIntensity: 0.2,
                        transparent: true,
                        opacity: 0.9
                    });
                }
            } else if (this.show52WeekHigh && !this.show1YReturns) {
                // 52W High filter active - only 52W high stocks get blue, others get neutral default color
                if (is52WeekHighStock) {
                    // This stock is at 52W high - use solid blue color
                    nodeMaterial = new THREE.MeshPhongMaterial({
                        color: '#248FE1', // 52W high blue color
                        emissive: '#248FE1',
                        emissiveIntensity: 0.2,
                        transparent: true,
                        opacity: 0.9
                    });
                    console.log(`🔵 Applied solid blue to 52W high stock: ${stock.symbol}`);
                } else {
                    // This stock is NOT at 52W high - use neutral default color (NO green/red)
                    nodeMaterial = new THREE.MeshPhongMaterial({
                        color: '#888888', // Neutral gray color
                        emissive: '#444444',
                        emissiveIntensity: 0.1,
                        transparent: true,
                        opacity: 0.7
                    });
                    console.log(`⚪ Applied neutral gray to non-52W high stock: ${stock.symbol}`);
                }
            } else {
                // Other filters active (1Y Returns or both) - use filter colors
                const nodeColor = this.getNodeColor(stock);
                nodeMaterial = new THREE.MeshPhongMaterial({
                    color: nodeColor,
                    emissive: nodeColor,
                    emissiveIntensity: 0.2,
                    transparent: true,
                    opacity: 0.9
                });
            }
            
            const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
            node.position.copy(position);
            
            // Enhanced tooltip with texture information
            const weekHighPercentage = ((stock.price / stock.weekHigh52) * 100).toFixed(1);
            const isAtHigh = this.isAt52WeekHigh(stock);
            const marketCapFormatted = this.formatMarketCap(stock.marketCap);
            
            // Determine if texture is applied
            const hasTexture = (!is52WeekHighStock && this.show52WeekHigh && !this.show1YReturns) || 
                              (!this.show52WeekHigh && !this.show1YReturns);
            const textureInfo = hasTexture ? 
                (isOriginallyGreen && this.textures.concreteMoss ? ' [Green Metal Rust]' : 
                 isOriginallyRed && this.textures.rubberizedTrack ? ' [Rust Coarse]' : '') : '';
            
            node.userData = {
                index: index,
                stock: stock,
                nodeSize: nodeSize,
                returns: stock.returns || stock.change || 0,
                tooltip: `${stock.symbol} - ${stock.name}${textureInfo}\nSector: ${stock.sector}\nMarket Cap: ${marketCapFormatted} (${stock.marketCapCategory})\nPrice: $${stock.price ? stock.price.toFixed(2) : 'N/A'}\nCurrent Returns: ${(stock.returns || stock.change || 0) >= 0 ? '+' : ''}${(stock.returns || stock.change || 0).toFixed(2)}%\n1Y Returns: ${stock.returns1Y >= 0 ? '+' : ''}${stock.returns1Y.toFixed(2)}%\n52W High: $${stock.weekHigh52} (${weekHighPercentage}%${isAtHigh ? ' ✓' : ''})\nNode Size: ${nodeSize.toFixed(2)}`
            };
            
            this.nodes.push(node);
            this.nodeData.push(node.userData);
            this.sphereGroup.add(node);
        });
        
        this.scene.add(this.sphereGroup);
        this.updateVisibility();
        
        console.log(`Created ${this.filteredStocks.length} nodes in 3D sector clusters with selective textures`);
    }

    // Helper method to draw US flag on canvas with VIBRANT colors
    drawUSFlag(ctx, width, height) {
        // Clear canvas with white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Flag dimensions
        const stripeHeight = height / 13;
        const unionWidth = width * 0.4;
        const unionHeight = stripeHeight * 7;
        
        // Draw red stripes with VIBRANT red (stripes 1, 3, 5, 7, 9, 11, 13)
        ctx.fillStyle = '#FF0000'; // Bright red instead of dull #B22234
        for (let i = 0; i < 13; i += 2) {
            ctx.fillRect(0, i * stripeHeight, width, stripeHeight);
        }
        
        // Draw white stripes (stripes 2, 4, 6, 8, 10, 12)
        ctx.fillStyle = '#FFFFFF'; // Pure white
        for (let i = 1; i < 13; i += 2) {
            ctx.fillRect(0, i * stripeHeight, width, stripeHeight);
        }
        
        // Draw blue union (canton) with VIBRANT blue
        ctx.fillStyle = '#0052CC'; // Bright blue instead of dull #3C3B6E
        ctx.fillRect(0, 0, unionWidth, unionHeight);
        
        // Draw stars with pure white and slight glow effect
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 2;
        
        const starRows = [
            { stars: 6, y: 0.5 }, { stars: 5, y: 1.5 }, { stars: 6, y: 2.5 }, 
            { stars: 5, y: 3.5 }, { stars: 6, y: 4.5 }, { stars: 5, y: 5.5 }, 
            { stars: 6, y: 6.5 }, { stars: 5, y: 7.5 }, { stars: 6, y: 8.5 }
        ];
        
        const starSize = Math.min(unionWidth, unionHeight) * 0.04; // Slightly larger stars
        
        starRows.forEach(row => {
            const starSpacing = unionWidth / (row.stars + 1);
            for (let i = 0; i < row.stars; i++) {
                const x = starSpacing * (i + 1);
                const y = (unionHeight / 10) * row.y;
                this.drawStar(ctx, x, y, starSize);
            }
        });
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }

    // Helper method to draw a 5-pointed star (enhanced)
    drawStar(ctx, x, y, radius) {
        const spikes = 5;
        const outerRadius = radius;
        const innerRadius = radius * 0.4;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 2); // Point star upward
        
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI) / spikes;
            const r = i % 2 === 0 ? outerRadius : innerRadius;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // Add a subtle stroke for better definition
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        
        ctx.restore();
    }

    // New method to update only node colors without changing positions
    updateNodeColors() {
        this.nodes.forEach(node => {
            const stock = node.userData.stock;
            const colorResult = this.getNodeColor(stock);
            
            // Determine original color for texture selection
            const currentReturns = stock.returns || stock.change || 0;
            const isOriginallyGreen = currentReturns >= 0;
            const isOriginallyRed = currentReturns < 0;
            
            if (colorResult === 'TEXTURE') {
                // Switch to textured material
                this.applyTexturedMaterial(node, stock, isOriginallyGreen, isOriginallyRed);
            } else {
                // Switch to solid color material
                this.applySolidColorMaterial(node, stock, colorResult);
            }
        });
        
        console.log("Updated node materials based on filter settings");
    }

    // New helper method to apply textured materials
    applyTexturedMaterial(node, stock, isOriginallyGreen, isOriginallyRed) {
        // Dispose old material if it exists
        if (node.material) {
            node.material.dispose();
        }
        
        if (isOriginallyGreen && this.textures.concreteMoss) {
            // Apply green texture (Concrete Moss)
            node.material = new THREE.MeshPhongMaterial({
                map: this.textures.concreteMoss,
                color: '#FFFFFF',
                emissive: '#001100',
                emissiveIntensity: 0.1,
                transparent: false,
                opacity: 1.0,
                shininess: 30,
                bumpMap: this.textures.concreteMoss,
                bumpScale: 0.1
            });
            console.log(`🟢 Applied Concrete Moss texture to ${stock.symbol}`);
        } else if (isOriginallyRed && this.textures.rubberizedTrack) {
            // Apply red texture (Rubberized Track)
            node.material = new THREE.MeshPhongMaterial({
                map: this.textures.rubberizedTrack,
                color: '#FFFFFF',
                emissive: '#110000',
                emissiveIntensity: 0.1,
                transparent: false,
                opacity: 1.0,
                shininess: 60,
                bumpMap: this.textures.rubberizedTrack,
                bumpScale: 0.05
            });
            console.log(`🔴 Applied Rubberized Track texture to ${stock.symbol}`);
        } else {
            // Fallback to default color if textures not available
            const defaultColor = isOriginallyGreen ? '#00ff00' : '#ff0000';
            node.material = new THREE.MeshPhongMaterial({
                color: defaultColor,
                emissive: defaultColor,
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: 0.9
            });
            console.log(`⚪ Applied default color to ${stock.symbol} (texture not available)`);
        }
    }

    // New helper method to apply solid color materials
    applySolidColorMaterial(node, stock, color) {
        // Dispose old material if it exists
        if (node.material) {
            node.material.dispose();
        }
        
        // Special handling for 52W high filter non-qualifying stocks
        const is52WHighActive = this.show52WeekHigh && !this.show1YReturns;
        const isNot52WHighStock = is52WHighActive && !this.isAt52WeekHigh(stock);
        
        node.material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: isNot52WHighStock ? 0.7 : 0.9
        });
        
        console.log(`🎨 Applied solid color ${color} to ${stock.symbol}`);
    }

    // Helper function to format market cap
    formatMarketCap(marketCap) {
        if (marketCap >= 1000000000000) {
            return `$${(marketCap / 1000000000000).toFixed(1)}T`;
        } else if (marketCap >= 1000000000) {
            return `$${(marketCap / 1000000000).toFixed(1)}B`;
        } else if (marketCap >= 1000000) {
            return `$${(marketCap / 1000000).toFixed(1)}M`;
        } else {
            return `$${marketCap.toLocaleString()}`;
        }
    }

    // Helper function to check if stock is at 52-week high
    isAt52WeekHigh(stock) {
        const threshold = 0.95; // Consider "at high" if within 95% of 52-week high
        return (stock.price / stock.weekHigh52) >= threshold;
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.settings.colors.background);
        
        // Enhanced lighting for better visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Increased from 0.4
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increased from 0.8
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);
        
        // Add second directional light for even illumination
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight2.position.set(-10, -10, -5);
        this.scene.add(directionalLight2);
        
        // Enhanced point light for core sphere illumination
        const pointLight = new THREE.PointLight(0xffffff, 1.2, 100); // Increased intensity
        pointLight.position.set(0, 0, 0);
        this.scene.add(pointLight);
        
        // Create twinkling stars
        this.createTwinklingStars();
    }

    setupCamera() {
        const container = document.getElementById('three-container');
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(25, 25, 25);
    }

    setupRenderer() {
        const container = document.getElementById('three-container');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 100;
        this.controls.minDistance = 10;
    }

    setupRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    setupTooltip() {
        this.tooltip = document.getElementById('tooltip');
    }
    
    setupGUI() {
        this.gui = new GUI({ container: document.getElementById('gui-container') });
        
        const structureFolder = this.gui.addFolder('Structure');
        // REMOVED: structureFolder.add(this.settings, 'sphereRadius', 5, 30, 0.5).onChange(() => this.createSphere());
        
        const infoText = { info: 'Node sizes based on Market Cap, clustered by sector' };
        structureFolder.add(infoText, 'info').name('ℹ️ Market Cap Sizing');
        
        const animationFolder = this.gui.addFolder('Animation');
        animationFolder.add(this.settings, 'animationSpeed', 0, 2, 0.1);
        animationFolder.add(this.settings, 'rotationEnabled');
        
        const visibilityFolder = this.gui.addFolder('Visibility');
        visibilityFolder.add(this.settings, 'showCore').onChange(() => this.updateVisibility());
        visibilityFolder.add(this.settings, 'showNodes').onChange(() => this.updateVisibility());
        
        this.gui.add({ reset: () => this.resetSettings() }, 'reset').name('Reset to Defaults');
        
        structureFolder.open();
        animationFolder.open();
    }
    
    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('click', this.onMouseClick.bind(this)); // Add click listener
        
        const toggleButton = document.getElementById('toggle-controls');
        const controlsPanel = document.querySelector('.controls-panel');
        
        if (toggleButton && controlsPanel) {
            toggleButton.addEventListener('click', () => {
                controlsPanel.classList.toggle('hidden');
                toggleButton.textContent = controlsPanel.classList.contains('hidden') ? 'Show' : 'Hide';
            });
        }
    }
    
    onMouseMove(event) {
        // Don't show hover tooltip if a node is selected
        if (this.isNodeSelected) {
            return;
        }
        
        const container = document.getElementById('three-container');
        const rect = container.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.nodes);
        
        if (intersects.length > 0) {
            const intersectedNode = intersects[0].object;
            if (this.hoveredNode !== intersectedNode) {
                this.hoveredNode = intersectedNode;
                this.showTooltip(event, intersectedNode.userData.tooltip);
            }
        } else {
            if (this.hoveredNode) {
                this.hoveredNode = null;
                this.hideTooltip();
            }
        }
    }
    
    showTooltip(event, text) {
        this.tooltip.innerHTML = text.replace(/\n/g, '<br>');
        this.tooltip.style.left = event.clientX + 10 + 'px';
        this.tooltip.style.top = event.clientY + 10 + 'px';
        this.tooltip.classList.add('visible');
    }
    
    hideTooltip() {
        this.tooltip.classList.remove('visible');
    }
    
    updateVisibility() {
        this.core.visible = this.settings.showCore;
        this.lines.forEach(line => line.visible = this.settings.showLines);
        this.nodes.forEach(node => node.visible = this.settings.showNodes);
    }
    
    updateLineThickness() {
        this.lines.forEach(line => {
            line.material.linewidth = this.settings.lineThickness;
        });
    }
    
    resetSettings() {
        this.settings = {
            nodeCount: 50,
            sphereRadius: 25,
            lineThickness: 0.02,
            nodeSize: 0.3,
            animationSpeed: 0.1, // CHANGED from 0 to 0.1
            rotationEnabled: true,
            showCore: true,
            showLines: false,
            showNodes: true,
            colors: {
                core: '#ffffff',
                lines: '#4a9eff',
                nodes: '#ff6b47',
                background: '#0a0a0a'
            }
        };
        
        this.gui.destroy();
        this.setupGUI();
        this.createSphere();
        this.createTwinklingStars();
        this.updateBackground();
    }
    
    onWindowResize() {
        const container = document.getElementById('three-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    animate() {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        
        // Update twinkling stars
        this.updateStarTwinkling();
        
        // Update halo ring orientation to always face camera
        if (this.selectedNodeHalo && this.camera) {
            this.selectedNodeHalo.lookAt(this.camera.position);
        }
        
        if (this.settings.rotationEnabled && this.settings.animationSpeed > 0) {
            this.sphereGroup.rotation.y += 0.005 * this.settings.animationSpeed;
            this.sphereGroup.rotation.x += 0.002 * this.settings.animationSpeed;
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        document.removeEventListener('mousemove', this.onMouseMove.bind(this));
        document.removeEventListener('click', this.onMouseClick.bind(this));
        
        // Clean up persistent tooltip
        const persistentTooltip = document.getElementById('persistent-tooltip');
        if (persistentTooltip) {
            persistentTooltip.remove();
        }
        
        // Clean up halo ring
        if (this.selectedNodeHalo) {
            if (this.selectedNodeHalo.geometry) this.selectedNodeHalo.geometry.dispose();
            if (this.selectedNodeHalo.material) this.selectedNodeHalo.material.dispose();
            this.selectedNodeHalo = null;
        }
        
        // Clean up stars
        if (this.starGroup) {
            this.scene.remove(this.starGroup);
            this.stars.forEach(star => {
                if (star.geometry) star.geometry.dispose();
                if (star.material) star.material.dispose();
            });
            this.stars = [];
            this.starTwinklePhases = [];
        }
        
        this.scene.traverse(object => {
            if (object.isMesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
        
        this.renderer.dispose();
        this.controls.dispose();
        
        if (this.gui) {
            this.gui.destroy();
        }
        
        const container = document.getElementById('three-container');
        if (container && this.renderer.domElement) {
            container.removeChild(this.renderer.domElement);
        }
        
        console.log("SphereVisualization destroyed.");
    }

    // Load textures for nodes
    async loadNodeTextures() {
        console.log("🎨 Loading node textures...");
        
        try {
            // Load Concrete Moss texture for green nodes
            this.textures.concreteMoss = this.createConcreteMossTexture();
            console.log("✅ Concrete Moss texture created");
            
            // Load Rubberized Track texture for red nodes
            this.textures.rubberizedTrack = this.createRubberizedTrackTexture();
            console.log("✅ Rubberized Track texture created");
            
        } catch (error) {
            console.error("❌ Error loading textures:", error);
            // Fallback to no textures
            this.textures.concreteMoss = null;
            this.textures.rubberizedTrack = null;
        }
    }

    // Create Green Metal Rust texture procedurally (inspired by Poly Haven's green_metal_rust)
    createConcreteMossTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base green metal color
        ctx.fillStyle = '#2A4A2A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add metal texture with rust patterns
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            
            // Create metal surface variation
            const metalNoise = (Math.random() - 0.5) * 40;
            
            // Add rust patches with green tint
            const rustX = Math.sin(x * 0.02) * Math.cos(y * 0.03);
            const rustY = Math.cos(x * 0.025) * Math.sin(y * 0.02);
            const rustPattern = (rustX + rustY) * 30;
            
            const variation = metalNoise + rustPattern;
            
            // Green metal with rust tones
            data[i] = Math.max(0, Math.min(255, 42 + variation));     // R - darker red component
            data[i + 1] = Math.max(0, Math.min(255, 74 + variation * 1.2)); // G - stronger green
            data[i + 2] = Math.max(0, Math.min(255, 42 + variation * 0.8)); // B - muted blue
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Add rust streaks and corrosion patterns
        ctx.globalCompositeOperation = 'overlay';
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 25 + 10;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, '#4A6B3A'); // Green rust center
            gradient.addColorStop(0.5, '#3A5A2A'); // Medium green rust
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add metal scratches and wear marks
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = '#1A3A1A';
        ctx.lineWidth = 1;
        for (let i = 0; i < 25; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.stroke();
        }
        
        // Add green oxidation spots
        ctx.globalCompositeOperation = 'normal';
        ctx.fillStyle = 'rgba(58, 90, 42, 0.3)';
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 8 + 3;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        return texture;
    }

    // Create Rust Coarse texture procedurally (inspired by Poly Haven's rust_coarse_01)
    createRubberizedTrackTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base rust red color
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add coarse rust texture
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            
            // Create coarse rust surface
            const rustNoise = (Math.random() - 0.5) * 60;
            
            // Add rough rust patterns
            const roughX = Math.sin(x * 0.03) * Math.cos(y * 0.04);
            const roughY = Math.cos(x * 0.035) * Math.sin(y * 0.03);
            const roughPattern = (roughX + roughY) * 40;
            
            // Add pitting and corrosion
            const pittingX = Math.sin(x * 0.1) * Math.cos(y * 0.12);
            const pittingY = Math.cos(x * 0.11) * Math.sin(y * 0.1);
            const pitting = (pittingX + pittingY) * 20;
            
            const variation = rustNoise + roughPattern + pitting;
            
            // Coarse rust colors - reddish brown
            data[i] = Math.max(0, Math.min(255, 139 + variation));     // R - strong red
            data[i + 1] = Math.max(0, Math.min(255, 69 + variation * 0.6)); // G - muted green
            data[i + 2] = Math.max(0, Math.min(255, 19 + variation * 0.3)); // B - minimal blue
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Add heavy rust patches
        ctx.globalCompositeOperation = 'overlay';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 30 + 15;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, '#A0522D'); // Heavy rust center
            gradient.addColorStop(0.5, '#8B4513'); // Medium rust
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add deep corrosion marks
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        for (let i = 0; i < 30; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.stroke();
        }
        
        // Add rust flakes and rough spots
        ctx.globalCompositeOperation = 'normal';
        ctx.fillStyle = 'rgba(160, 82, 45, 0.4)';
        for (let i = 0; i < 35; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const width = Math.random() * 12 + 4;
            const height = Math.random() * 8 + 3;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.random() * Math.PI);
            ctx.fillRect(-width/2, -height/2, width, height);
            ctx.restore();
        }
        
        // Add surface pitting
        ctx.fillStyle = 'rgba(101, 67, 33, 0.6)';
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 4 + 2;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        return texture;
    }

    // Add new click handler method
    onMouseClick(event) {
        const container = document.getElementById('three-container');
        const rect = container.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.nodes);
        
        if (intersects.length > 0) {
            const clickedNode = intersects[0].object;
            this.selectNode(clickedNode, event);
        } else {
            // Clicked on empty space - deselect
            this.deselectNode();
        }
    }

    // Add node selection method
    selectNode(node, event) {
        console.log(`🎯 Node selected: ${node.userData.stock.symbol}`);
        
        // Store original animation speed if not already stored
        if (!this.isNodeSelected) {
            this.originalAnimationSpeed = this.settings.animationSpeed;
        }
        
        // Set animation speed to 0
        this.settings.animationSpeed = 0;
        this.isNodeSelected = true;
        this.selectedNode = node;
        
        // Create halo ring around selected node
        this.createHaloRing(node);
        
        // Dim all other nodes to 50% opacity
        this.nodes.forEach(n => {
            if (n !== node) {
                n.material.opacity = 0.5;
                n.material.transparent = true;
            } else {
                // Keep selected node at full opacity
                n.material.opacity = n.material.map ? 1.0 : 0.9; // Full opacity for textured, 0.9 for solid
                n.material.transparent = n.material.map ? false : true;
            }
        });
        
        // Show persistent tooltip
        this.showPersistentTooltip(event, node.userData.tooltip);
        
        // Update GUI to reflect animation speed change
        if (this.gui) {
            this.gui.updateDisplay();
        }
    }

    // Add method to create halo ring around selected node
    createHaloRing(node) {
        // Remove existing halo if any
        if (this.selectedNodeHalo) {
            this.sphereGroup.remove(this.selectedNodeHalo);
            if (this.selectedNodeHalo.geometry) this.selectedNodeHalo.geometry.dispose();
            if (this.selectedNodeHalo.material) this.selectedNodeHalo.material.dispose();
        }
        
        // Get node size for proportional ring sizing
        const nodeSize = node.userData.nodeSize;
        const ringInnerRadius = nodeSize * 1.3; // REDUCED: Ring starts closer to node (was 2.5x)
        const ringOuterRadius = nodeSize * 1.5; // REDUCED: Thin strip (was 3.5x)
        
        // Create ring geometry
        const ringGeometry = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 32);
        
        // Create ring material with golden/orange glow like Saturn's rings
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFB366, // Golden orange color
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending // Additive blending for glow effect
        });
        
        // Create the ring mesh
        this.selectedNodeHalo = new THREE.Mesh(ringGeometry, ringMaterial);
        
        // Position the ring at the same location as the selected node
        this.selectedNodeHalo.position.copy(node.position);
        
        // Make the ring face the camera (billboard effect)
        this.selectedNodeHalo.lookAt(this.camera.position);
        
        // Add the ring to the sphere group
        this.sphereGroup.add(this.selectedNodeHalo);
        
        console.log(`✨ Created thin halo ring for ${node.userData.stock.symbol}`);
    }

    // Add node deselection method
    deselectNode() {
        if (!this.isNodeSelected) return;
        
        console.log(`🔄 Node deselected`);
        
        // Remove halo ring
        if (this.selectedNodeHalo) {
            this.sphereGroup.remove(this.selectedNodeHalo);
            if (this.selectedNodeHalo.geometry) this.selectedNodeHalo.geometry.dispose();
            if (this.selectedNodeHalo.material) this.selectedNodeHalo.material.dispose();
            this.selectedNodeHalo = null;
        }
        
        // Restore original animation speed
        this.settings.animationSpeed = this.originalAnimationSpeed;
        this.isNodeSelected = false;
        this.selectedNode = null;
        
        // Restore all nodes to full opacity
        this.nodes.forEach(node => {
            // Restore original opacity based on material type
            node.material.opacity = node.material.map ? 1.0 : 0.9; // Full opacity for textured, 0.9 for solid
            node.material.transparent = node.material.map ? false : true;
        });
        
        // Hide persistent tooltip
        this.hidePersistentTooltip();
        
        // Update GUI to reflect animation speed change
        if (this.gui) {
            this.gui.updateDisplay();
        }
    }

    // Add persistent tooltip method
    showPersistentTooltip(event, text) {
        // Hide regular tooltip first
        this.hideTooltip();
        
        // Create or update persistent tooltip
        let persistentTooltip = document.getElementById('persistent-tooltip');
        if (!persistentTooltip) {
            persistentTooltip = document.createElement('div');
            persistentTooltip.id = 'persistent-tooltip';
            persistentTooltip.style.cssText = `
                position: fixed;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                pointer-events: none;
                z-index: 10000;
                max-width: 300px;
                border: 2px solid #248FE1;
                box-shadow: 0 4px 12px rgba(36, 143, 225, 0.3);
                white-space: pre-line;
            `;
            document.body.appendChild(persistentTooltip);
        }
        
        persistentTooltip.innerHTML = text.replace(/\n/g, '<br>');
        persistentTooltip.style.left = event.clientX + 15 + 'px';
        persistentTooltip.style.top = event.clientY + 15 + 'px';
        persistentTooltip.style.display = 'block';
        
        console.log(`📌 Persistent tooltip shown for selected node`);
    }

    // Add method to hide persistent tooltip
    hidePersistentTooltip() {
        const persistentTooltip = document.getElementById('persistent-tooltip');
        if (persistentTooltip) {
            persistentTooltip.style.display = 'none';
        }
    }

    // Add method to create twinkling stars
    createTwinklingStars() {
        console.log("✨ Creating twinkling stars...");
        
        if (this.starGroup) {
            this.scene.remove(this.starGroup);
        }
        
        this.starGroup = new THREE.Group();
        this.stars = [];
        this.starTwinklePhases = [];
        
        const starCount = 1200; // INCREASED from 200 to 1200 stars
        const starRadius = 0.05; // Very small radius
        const spaceRadius = 80; // Radius of the space where stars are distributed
        
        // Create star geometry (reuse for performance)
        const starGeometry = new THREE.SphereGeometry(starRadius, 8, 8);
        
        for (let i = 0; i < starCount; i++) {
            // Create star material with white color
            const starMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: Math.random() * 0.8 + 0.2 // Random initial opacity between 0.2 and 1.0
            });
            
            const star = new THREE.Mesh(starGeometry, starMaterial);
            
            // Random position in 3D space (spherical distribution)
            const phi = Math.random() * Math.PI * 2; // 0 to 2π
            const costheta = Math.random() * 2 - 1; // -1 to 1
            const theta = Math.acos(costheta);
            const r = Math.random() * spaceRadius + 30; // Distance from center (30 to 110)
            
            star.position.x = r * Math.sin(theta) * Math.cos(phi);
            star.position.y = r * Math.sin(theta) * Math.sin(phi);
            star.position.z = r * Math.cos(theta);
            
            // Store individual twinkle phase for each star
            this.starTwinklePhases.push(Math.random() * Math.PI * 2);
            
            this.stars.push(star);
            this.starGroup.add(star);
        }
        
        this.scene.add(this.starGroup);
        console.log(`✨ Created ${starCount} twinkling stars`);
    }

    // Add method to update star twinkling
    updateStarTwinkling() {
        const time = Date.now() * 0.001; // Current time in seconds
        
        this.stars.forEach((star, index) => {
            // Each star has its own phase offset for varied twinkling
            const phase = this.starTwinklePhases[index];
            const twinkleSpeed = 2.0; // Speed of twinkling
            const minOpacity = 0.1;
            const maxOpacity = 1.0;
            
            // Calculate twinkling opacity using sine wave
            const twinkle = Math.sin(time * twinkleSpeed + phase);
            const opacity = minOpacity + (maxOpacity - minOpacity) * (twinkle * 0.5 + 0.5);
            
            star.material.opacity = opacity;
            
            // Occasionally change the twinkle phase for more randomness
            if (Math.random() < 0.001) { // 0.1% chance per frame
                this.starTwinklePhases[index] = Math.random() * Math.PI * 2;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing 3D sector clustering visualization...");
    new SphereVisualization();
});