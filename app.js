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
        this.mouse = null;
        this.gui = null;
        
        this.sphereGroup = null;
        this.coreGeometry = null;
        this.coreMaterial = null;
        this.core = null;
        this.lines = [];
        this.nodes = [];
        this.nodeData = [];
        
        this.tooltip = null;
        this.hoveredNode = null;
        
        // Stock data
        this.stocks = [];
        this.filteredStocks = [];
        this.selectedSector = "All";
        
        // Default settings
        this.settings = {
            nodeCount: 50,
            sphereRadius: 15,
            lineThickness: 0.02,
            nodeSize: 0.3,
            animationSpeed: 0,
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
        
        this.animationId = null;
        this.init();
    }
    
    async init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupRaycaster();
        this.setupTooltip();
        
        // Fetch stock data and create dropdown after DOM is ready
        await this.fetchStockData();
        this.createSectorDropdown();
        
        this.createSphere();
        this.setupGUI();
        this.setupEventListeners();
        this.animate();
    }

    // Fetch stock data from backend
    async fetchStockData() {
        try {
            const response = await fetch("http://localhost:4000/stocks");
            this.stocks = await response.json();
            this.filteredStocks = this.stocks;
            console.log("Fetched stocks:", this.stocks);
        } catch (error) {
            console.error("Error fetching stock data:", error);
            // Fallback to dummy data if API fails
            this.stocks = this.generateDummyStockData();
            this.filteredStocks = this.stocks;
        }
    }

    // Generate dummy stock data as fallback
    generateDummyStockData() {
        const sectors = ["Technology", "Healthcare", "Finance", "Energy", "Consumer"];
        const companies = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "META", "NVDA", "JPM", "JNJ", "PFE"];
        
        return companies.map((symbol, index) => ({
            symbol,
            name: `${symbol} Inc.`,
            sector: sectors[index % sectors.length],
            price: Math.random() * 1000 + 50,
            change: (Math.random() - 0.5) * 20,
            marketCap: Math.random() * 1000000000000
        }));
    }

    // Create sector dropdown - Fixed version
    createSectorDropdown() {
        console.log("Creating sector dropdown..."); // Debug log
        
        const controlsPanel = document.querySelector('.controls-panel');
        if (!controlsPanel) {
            console.error("Controls panel not found!");
            return;
        }

        // Check if dropdown already exists
        if (document.getElementById('sector-dropdown-container')) {
            console.log("Dropdown already exists");
            return;
        }
        
        // Create dropdown container
        const dropdownContainer = document.createElement('div');
        dropdownContainer.id = 'sector-dropdown-container';
        dropdownContainer.style.cssText = `
            margin-bottom: 20px;
            padding: 16px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-base);
        `;
        
        dropdownContainer.innerHTML = `
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
        `;
        
        // Insert at the top of controls panel, before the panel header
        const panelHeader = controlsPanel.querySelector('.panel-header');
        if (panelHeader) {
            controlsPanel.insertBefore(dropdownContainer, panelHeader.nextSibling);
        } else {
            controlsPanel.insertBefore(dropdownContainer, controlsPanel.firstChild);
        }
        
        // Populate dropdown with sectors
        const select = document.getElementById('sector-select');
        if (this.stocks && this.stocks.length > 0) {
            const sectors = [...new Set(this.stocks.map(stock => stock.sector))];
            console.log("Available sectors:", sectors); // Debug log
            
            sectors.forEach(sector => {
                const option = document.createElement('option');
                option.value = sector;
                option.textContent = sector;
                select.appendChild(option);
            });
        }
        
        // Add event listener
        select.addEventListener('change', (e) => {
            console.log("Sector changed to:", e.target.value); // Debug log
            this.selectedSector = e.target.value;
            this.filterStocks();
            this.createSphere();
        });
        
        console.log("Dropdown created successfully");
    }

    // Filter stocks based on selected sector
    filterStocks() {
        if (this.selectedSector === "All") {
            this.filteredStocks = this.stocks;
        } else {
            this.filteredStocks = this.stocks.filter(stock => stock.sector === this.selectedSector);
        }
        
        // Update node count to match filtered stocks
        this.settings.nodeCount = Math.min(this.filteredStocks.length, 100);
    }

    // ... existing setupScene, setupCamera, setupRenderer, setupControls methods ...

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.settings.colors.background);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);
        
        // Add point light for better illumination
        const pointLight = new THREE.PointLight(0x4a9eff, 0.6, 100);
        pointLight.position.set(0, 0, 0);
        this.scene.add(pointLight);
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

    createSphere() {
        // Clear existing sphere
        if (this.sphereGroup) {
            this.scene.remove(this.sphereGroup);
        }
        
        this.sphereGroup = new THREE.Group();
        this.lines = [];
        this.nodes = [];
        this.nodeData = [];
        
        // Create core sphere
        this.coreGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        this.coreMaterial = new THREE.MeshPhongMaterial({
            color: this.settings.colors.core,
            emissive: this.settings.colors.core,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.8
        });
        this.core = new THREE.Mesh(this.coreGeometry, this.coreMaterial);
        this.sphereGroup.add(this.core);
        
        // Use filtered stocks for node generation
        const stocksToShow = this.filteredStocks.slice(0, this.settings.nodeCount);
        const points = this.fibonacciSphere(stocksToShow.length);
        
        points.forEach((point, index) => {
            const stock = stocksToShow[index];
            
            // Create line from center to point (but don't add to scene initially)
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                point
            ]);
            const lineMaterial = new THREE.LineBasicMaterial({
                color: this.settings.colors.lines,
                transparent: true,
                opacity: 0.6,
                linewidth: this.settings.lineThickness
            });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            this.lines.push(line);
            
            // Only add line if showLines is true
            if (this.settings.showLines) {
                this.sphereGroup.add(line);
            }
            
            // Color nodes based on stock performance
            const nodeColor = stock.change >= 0 ? '#00ff00' : '#ff0000';
            
            // Create node at endpoint
            const nodeGeometry = new THREE.SphereGeometry(this.settings.nodeSize, 8, 8);
            const nodeMaterial = new THREE.MeshPhongMaterial({
                color: nodeColor,
                emissive: nodeColor,
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: 0.9
            });
            const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
            node.position.copy(point);
            node.userData = {
                index: index,
                stock: stock,
                tooltip: `${stock.symbol} - ${stock.name}\nSector: ${stock.sector}\nPrice: $${stock.price.toFixed(2)}\nChange: ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}`
            };
            this.nodes.push(node);
            this.nodeData.push(node.userData);
            this.sphereGroup.add(node);
        });
        
        this.scene.add(this.sphereGroup);
        this.updateVisibility();
    }

    // ... rest of existing methods (fibonacciSphere, setupGUI, etc.) ...

    fibonacciSphere(samples) {
        const points = [];
        const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
        
        for (let i = 0; i < samples; i++) {
            const y = 1 - (i / (samples - 1)) * 2; // y goes from 1 to -1
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;
            
            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;
            
            points.push(new THREE.Vector3(
                x * this.settings.sphereRadius,
                y * this.settings.sphereRadius,
                z * this.settings.sphereRadius
            ));
        }
        
        return points;
    }

    setupGUI() {
        this.gui = new GUI({ container: document.getElementById('gui-container') });
        
        // Structure controls
        const structureFolder = this.gui.addFolder('Structure');
        structureFolder.add(this.settings, 'sphereRadius', 5, 30, 0.5).onChange(() => this.createSphere());
        structureFolder.add(this.settings, 'lineThickness', 0.01, 0.1, 0.01).onChange(() => this.updateLineThickness());
        structureFolder.add(this.settings, 'nodeSize', 0.1, 1, 0.05).onChange(() => this.updateNodeSize());
        
        // Animation controls
        const animationFolder = this.gui.addFolder('Animation');
        animationFolder.add(this.settings, 'animationSpeed', 0, 2, 0.1);
        animationFolder.add(this.settings, 'rotationEnabled');
        
        // Visibility controls
        const visibilityFolder = this.gui.addFolder('Visibility');
        visibilityFolder.add(this.settings, 'showCore').onChange(() => this.updateVisibility());
        visibilityFolder.add(this.settings, 'showLines').onChange(() => this.updateVisibility());
        visibilityFolder.add(this.settings, 'showNodes').onChange(() => this.updateVisibility());
        
        // Color controls
        const colorFolder = this.gui.addFolder('Colors');
        colorFolder.addColor(this.settings.colors, 'core').onChange(() => this.updateColors());
        colorFolder.addColor(this.settings.colors, 'lines').onChange(() => this.updateColors());
        colorFolder.addColor(this.settings.colors, 'background').onChange(() => this.updateBackground());
        
        // Action buttons
        this.gui.add({ reset: () => this.resetSettings() }, 'reset').name('Reset to Defaults');
        
        // Open folders by default
        structureFolder.open();
        animationFolder.open();
    }

    // ... rest of existing methods (setupEventListeners, onMouseMove, etc.) ...

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        
        // Toggle controls panel
        const toggleButton = document.getElementById('toggle-controls');
        const controlsPanel = document.querySelector('.controls-panel');
        
        toggleButton.addEventListener('click', () => {
            controlsPanel.classList.toggle('hidden');
            toggleButton.textContent = controlsPanel.classList.contains('hidden') ? 'Show' : 'Hide';
        });
    }

    onMouseMove(event) {
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

    updateColors() {
        this.coreMaterial.color.setHex(this.settings.colors.core.replace('#', '0x'));
        this.coreMaterial.emissive.setHex(this.settings.colors.core.replace('#', '0x'));
        
        this.lines.forEach(line => {
            line.material.color.setHex(this.settings.colors.lines.replace('#', '0x'));
        });
    }

    updateBackground() {
        this.scene.background.setHex(this.settings.colors.background.replace('#', '0x'));
    }

    updateLineThickness() {
        this.lines.forEach(line => {
            line.material.linewidth = this.settings.lineThickness;
        });
    }

    updateNodeSize() {
        this.createSphere();
    }

    resetSettings() {
        this.settings = {
            nodeCount: 50,
            sphereRadius: 15,
            lineThickness: 0.02,
            nodeSize: 0.3,
            animationSpeed: 0,
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
        
        // Rotate the sphere group if rotation is enabled and animation speed > 0
        if (this.settings.rotationEnabled && this.settings.animationSpeed > 0) {
            this.sphereGroup.rotation.y += 0.005 * this.settings.animationSpeed;
            this.sphereGroup.rotation.x += 0.002 * this.settings.animationSpeed;
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        // Cancel animation frame
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        document.removeEventListener('mousemove', this.onMouseMove.bind(this));
        
        // Dispose of Three.js objects
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
        
        // Dispose of renderer and controls
        this.renderer.dispose();
        this.controls.dispose();
        
        // Remove GUI
        if (this.gui) {
            this.gui.destroy();
        }
        
        // Clear DOM
        const container = document.getElementById('three-container');
        if (container && this.renderer.domElement) {
            container.removeChild(this.renderer.domElement);
        }
        
        console.log("SphereVisualization destroyed.");
    }
}

// Initialize the visualization after the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing visualization...");
    new SphereVisualization();
});