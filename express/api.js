import express from 'express';
import webhookRoute from './webhookRoute.js';
import endpointRoutes from './endpointRoutes.js';

const app = express();

app.use('/web', webhookRoute);
app.use('/api', endpointRoutes);

app.listen(4000, () => {
  console.log('Server listening on port 4000!');
});
