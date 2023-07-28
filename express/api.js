import express from 'express';
import serverless from 'serverless-http';
import webhookRoute from './webhookRoute.js';
import endpointRoutes from './endpointRoutes.js';

const app = express();

app.use('/.netlify/functions/web', webhookRoute);
app.use('/.netlify/functions/api', endpointRoutes);

export const handler = serverless(app);
