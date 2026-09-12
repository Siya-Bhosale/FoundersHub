const dotenv = require('dotenv');
// Load environment variables
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const startupRoutes = require('./routes/startupRoutes');
const aiRoutes = require('./routes/aiRoutes');
const developerRoutes = require('./routes/developerRoutes');
const joinRequestRoutes = require('./routes/joinRequestRoutes');
const executionRoutes = require('./routes/executionRoutes');
const taskRoutes = require('./routes/taskRoutes');
const financeRoutes = require('./routes/financeRoutes');
const investorRoutes = require('./routes/investorRoutes');
const fundingInterestRoutes = require('./routes/fundingInterestRoutes');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/developers', developerRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/execution', executionRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/investors', investorRoutes);
app.use('/api/funding-interest', fundingInterestRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
