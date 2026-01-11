/**
 * Vectabase API Server
 * Main entry point for the local API server replacing Supabase Edge Functions
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import middleware
import { requireAuth, optionalAuth, rateLimit } from './middleware/auth.js';

// Import route handlers
import authRoutes from './routes/auth.js';
import stripeRoutes from './routes/stripe.js';
import productsRoutes from './routes/products.js';
import whitelistRoutes from './routes/whitelist.js';
import developerRoutes from './routes/developer.js';

// Import database
import db from './lib/db.js';

const app = express();
const PORT = process.env.API_PORT || 3001;

// ============================================
// SECURITY & PERFORMANCE MIDDLEWARE
// ============================================

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  maxAge: 86400, // Cache preflight for 24 hours
}));

// Compression middleware (manual gzip for JSON responses)
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    // Add cache headers for GET requests
    if (req.method === 'GET' && !res.headersSent) {
      res.setHeader('Cache-Control', 'private, max-age=60'); // 1 minute cache
      res.setHeader('Vary', 'Authorization');
    }
    return originalJson(data);
  };
  next();
});

// Parse JSON bodies (except for Stripe webhooks which need raw body)
app.use((req, res, next) => {
  if (req.path === '/api/stripe/webhook') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Request logging middleware (optimized)
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Only log slow requests or errors in production
    if (process.env.NODE_ENV === 'production') {
      if (duration > 1000 || res.statusCode >= 400) {
        console.log(`[${res.statusCode}] ${req.method} ${req.path} - ${duration}ms`);
      }
    } else {
      console.log(`[${res.statusCode}] ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
});

// Global rate limiting
app.use(rateLimit({
  windowMs: 60000, // 1 minute
  max: 100 // 100 requests per minute
}));

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', async (req, res) => {
  const dbHealth = await db.healthCheck();
  
  res.json({
    status: dbHealth.healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/whitelist', whitelistRoutes);
app.use('/api/developer', developerRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', {
    requestId: req.requestId,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'An internal error occurred'
    : err.message;
  
  res.status(err.status || 500).json({
    error: err.code || 'INTERNAL_ERROR',
    message,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    const dbHealth = await db.healthCheck();
    
    if (!dbHealth.healthy) {
      console.error('❌ Database connection failed:', dbHealth.error);
      process.exit(1);
    }
    
    console.log(`✅ Database connected (${dbHealth.latency}ms)`);
    
    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 Vectabase API Server running on port ${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await db.closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await db.closePool();
  process.exit(0);
});

// Start the server
startServer();

export default app;
