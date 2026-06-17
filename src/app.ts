import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.json';
import routes from './routes';

// Load environment variables
dotenv.config();

const app: Express = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Prevents CSP from blocking Swagger UI inline styles/scripts
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routes
app.use('/api', routes);

// Swagger UI Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Fallback route for base URL
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Engagement Invite API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

export default app;
