import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { ENV } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorMiddleware.js';

export const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      // In development, allow localhost variations
      if (ENV.NODE_ENV === 'development' || origin === ENV.CLIENT_URL) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Logging
if (ENV.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global API Rate Limiter (Protects against brute force / DoS)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

app.use('/api', apiLimiter);

// Mount API routes
app.use('/api', routes);

// Centralized error handler
app.use(errorHandler);
