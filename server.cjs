//not using this file rn

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 4000;

// Enable CORS with specific options
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Add JSON parsing middleware
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

try {
    const stockData = require('./stockData.cjs');
    console.log(`✅ Loaded ${stockData.length} stocks from stockData.cjs`);
    
    // Test endpoint
    app.get('/', (req, res) => {
        res.json({ 
            message: 'Stock API Server is running!', 
            endpoints: ['/stocks'],
            stockCount: stockData.length 
        });
    });
    
    app.get('/stocks', (req, res) => {
        console.log(`📊 Serving ${stockData.length} stocks to client`);
        res.json(stockData);
    });
    
} catch (error) {
    console.error('❌ Error loading stock data:', error);
    
    app.get('/stocks', (req, res) => {
        res.status(500).json({ 
            error: 'Stock data not available',
            details: error.message 
        });
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 Stock API server running on http://localhost:${PORT}`);
    console.log(`📈 Stocks endpoint: http://localhost:${PORT}/stocks`);
    console.log(`🔍 Test endpoint: http://localhost:${PORT}/`);
});
