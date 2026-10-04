import mongoose from 'mongoose';
import { config, assertConfig } from './config.js';
import app from './app.js';

assertConfig();
await mongoose.connect(config.mongoUri);
app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
