const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path'); 

const app = express();
const PORT = 5000;
const JWT_SECRET = 'your_jwt_secret_here'; // Replace with strong secret in env var

app.use(express.json());

// ✅ Serve static frontend files from "frontend" folder
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/taskdb', {})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// --- Mongoose Schemas & Models ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: String,
  password: { type: String, required: true },
});

const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  status: { type: String, default: 'pending' }, // pending, done, etc
  startDate: Date,
  dueDate: Date,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

// --- Middleware for verifying JWT tokens ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  if (!token) return res.status(401).json({ message: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user; // { id, username }
    next();
  });
}

// --- Routes ---

// ✅ Optional: Serve index.html when accessing root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// User registration
app.post('/register', async (req, res) => {
  try {
    const { username, name, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, name, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// User login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: 'Username and password are required' });

    const user = await User.findOne({ username });

    if (!user)
      return res.status(404).json({ message: 'Username not registered' });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ message: 'Incorrect password' });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Create task
app.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const { name, description, status, startDate, dueDate } = req.body;
    if (!name) return res.status(400).json({ message: 'Task name required' });

    const task = new Task({
      name,
      description,
      status: status || 'pending',
      startDate,
      dueDate,
      user: req.user.id,
    });

    const newTask = await task.save();
    res.status(201).json(newTask);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all tasks for user
app.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update task
app.put('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    Object.assign(task, req.body);
    const updatedTask = await task.save();

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete task
app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.json({ message: 'Task deleted', task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
