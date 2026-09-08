import express, { type Express } from 'express';
import apiRoutes from './routes/api.routes.js';

const app: Express = express();
app.use(express.json());
app.get('/', (_req, res) => res.json({ mensaje: 'API OfflineAid funcionando' }));
app.use('/api', apiRoutes);

export default app;