require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

const upload = multer({ storage: multer.memoryStorage() });

// ─── MongoDB (cached connection for Vercel serverless) ─────────────────────────
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  isConnected = true;
  console.log('✅ MongoDB connected');
}
connectDB().catch(console.error);

// ─── Schemas & Models (guard against re-registration on hot reload) ────────────
const toolSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    category: String,
    link: String,
    rating: Number,
    pricing: String,
    official_link: String,
    availability: String,
    details: String,
    profession: [String],
    tags: [String],
    new_description: String,
    image_url: String,
    date: String,
    overviewimg: String,
    featured: { type: Boolean, default: false },
  },
  { collection: 'tools' }
);

const ebookSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: String,
    author: String,
    publisher: String,
    publish_date: String,
    category: String,
  },
  { collection: 'ebooks' }
);

const quizSchema = new mongoose.Schema({
  BasicQuiz: { type: Boolean, default: false },
  AdvanceQuiz: { type: Boolean, default: null },
  BasicQuizMarks: { type: Number, default: null },
  AdvanceQuizMarks: { type: Number, default: null },
  email: { type: String, required: true },
});

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  otp: Number,
  otpExpiry: Date,
});

// Guard pattern — prevents "Cannot overwrite model" error on Vercel warm restarts
const Tool   = mongoose.models.Tool   || mongoose.model('Tool',   toolSchema);
const Ebook  = mongoose.models.Ebook  || mongoose.model('Ebook',  ebookSchema);
const Quiz   = mongoose.models.Quiz   || mongoose.model('Quiz',   quizSchema);
const User   = mongoose.models.User   || mongoose.model('User',   userSchema);

const generateRandomRating = () => Math.floor(Math.random() * 5) + 1;

// ─── Auth Routes ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Select AI Tools Admin Panel</title>
  <script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js"></script>
  <link rel="icon" href="/assets/logo.png">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Poppins',sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#000;color:#fff;overflow:hidden}
    #particles-js{position:absolute;width:100%;height:100%;z-index:-1}
    .login-container{text-align:center;background:rgba(0,0,0,0.6);padding:50px 30px;border-radius:20px;box-shadow:0 10px 20px rgba(0,0,0,0.8);max-width:500px;width:95%;animation:slideIn 1s ease-out forwards;transition:transform 0.3s ease}
    .login-container:hover{transform:scale(1.05)}
    .logo{width:120px;height:120px;margin-bottom:20px;border-radius:50%;border:3px solid #fff;animation:pulse 1.5s infinite}
    h1{font-size:36px;font-weight:600;margin-bottom:20px;color:#fff;text-shadow:2px 2px 5px rgba(0,0,0,0.7)}
    input{width:85%;padding:12px 15px;margin:15px 0;border:2px solid #fff;border-radius:5px;background:rgba(255,255,255,0.2);color:#fff;font-size:16px;transition:all 0.3s ease}
    input:focus{border-color:#4CAF50;background:rgba(255,255,255,0.1);outline:none}
    button{width:90%;padding:12px 20px;border:none;border-radius:5px;background-color:#4CAF50;color:#fff;font-size:18px;cursor:pointer;margin-top:20px;transition:all 0.3s ease}
    button:hover{background-color:#45a049}
    @keyframes slideIn{from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
  </style>
</head>
<body>
  <script>if(localStorage.getItem('loggedIn')==='true'){window.location.href='/home'}</script>
  <div id="particles-js"></div>
  <div class="login-container">
    <img src="/assets/logo.png" alt="App Logo" class="logo">
    <h1>Admin Login</h1>
    <form action="/login" method="POST">
      <input type="text" name="username" placeholder="Username" required>
      <input type="password" name="password" placeholder="Password" required>
      <button type="submit">Login</button>
    </form>
  </div>
  <script>
    particlesJS("particles-js",{particles:{number:{value:150,density:{enable:true,value_area:800}},color:{value:"#ffffff"},shape:{type:"circle"},opacity:{value:0.5},size:{value:5,random:true},line_linked:{enable:true,distance:150,color:"#ffffff",opacity:0.4,width:1},move:{enable:true,speed:4,direction:"none",out_mode:"out"}},interactivity:{detect_on:"canvas",events:{onhover:{enable:true,mode:"repulse"},onclick:{enable:true,mode:"push"},resize:true}},retina_detect:true});
  </script>
</body>
</html>`);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    res.send(`<script>localStorage.setItem('loggedIn','true');localStorage.setItem('username','${username}');window.location.href='/home';</script>`);
  } else {
    res.send(`<script>alert('Invalid Username or Password');window.location.href='/';</script>`);
  }
});

app.get('/logout', (req, res) => {
  res.send(`<script>if(confirm('Are you sure you want to log out?')){localStorage.removeItem('loggedIn');localStorage.removeItem('username');window.location.href='/';}else{window.location.href='/home';}</script>`);
});

// ─── Home Dashboard ────────────────────────────────────────────────────────────
app.get('/home', async (req, res) => {
  try {
    await connectDB();
    const users = await User.find();
    const totalUsers = users.length;
    const basicQuizCount  = await Quiz.countDocuments({ BasicQuiz: true });
    const advanceQuizCount = await Quiz.countDocuments({ AdvanceQuiz: { $ne: null } });

    const chartData1 = {
      labels: ['Basic Quizzes', 'Advanced Quizzes', 'Total Users'],
      datasets: [{ label: 'Counts', data: [basicQuizCount, advanceQuizCount, totalUsers], backgroundColor: ['#ffe066','#80d4ff','#ff6666'], borderColor: ['#ffd11a','#33bbff','#ff3333'], borderWidth: 2 }]
    };
    const chartData2 = {
      labels: ['Basic Quizzes', 'Advanced Quizzes'],
      datasets: [{ label: 'Quiz Comparison', data: [basicQuizCount, advanceQuizCount], backgroundColor: ['#ff99ff','#66ffff'], borderColor: ['#ff33ff','#33ffff'], borderWidth: 2 }]
    };

    const usersTable = users.map((user, i) => `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>${user.username}</td>
        <td class="text-center">${user.email}</td>
        <td class="text-center">${user.password ? user.password.slice(0, Math.floor(user.password.length / 2)) + '.....' : 'N/A'}</td>
        <td class="text-center"><div class="badge badge-warning">Active</div></td>
        <td class="text-center">
          <form action="/delete-user/${user._id}" method="POST" onsubmit="return confirm('Delete this user?')">
            <button type="submit" class="btn btn-danger btn-sm">Delete</button>
          </form>
        </td>
      </tr>`).join('');

    res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no"/>
  <link rel="icon" href="/assets/logo.png">
  <title>Select AI Admin Dashboard</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link href="https://demo.dashboardpack.com/architectui-html-free/main.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Pacifico&display=swap" rel="stylesheet">
  <style>.script-font{font-family:'Pacifico',cursive;font-size:30px;color:black}</style>
</head>
<body>
<div class="app-container app-theme-white body-tabs-shadow fixed-sidebar fixed-header">
  <div class="app-header header-shadow">
    <div class="app-header__logo">
      <div class="script-font">Select AI</div>
      <div class="header__pane ml-auto">
        <button type="button" class="hamburger close-sidebar-btn hamburger--elastic" data-class="closed-sidebar">
          <span class="hamburger-box"><span class="hamburger-inner"></span></span>
        </button>
      </div>
    </div>
    <div class="app-header__content">
      <div class="app-header-right">
        <div class="header-btn-lg pr-0">
          <div class="widget-content p-0">
            <div class="widget-content-wrapper">
              <div class="widget-content-left">
                <div class="btn-group">
                  <a data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" class="p-0 btn">
                    <i class="fa fa-sign-out-alt ml-2" style="font-size:15px;background:linear-gradient(145deg,#ff4b5c,#ff1e41);border-radius:50%;padding:10px;color:white"></i>
                  </a>
                  <div tabindex="-1" role="menu" aria-hidden="true" class="dropdown-menu dropdown-menu-right">
                    <a href="/logout" class="dropdown-item">Logout</a>
                  </div>
                </div>
              </div>
              <div class="widget-content-left ml-3 header-user-info">
                <div class="widget-heading">ADMIN</div>
                <div class="widget-subheading">Select AI Admin</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="app-main">
    <div class="app-sidebar sidebar-shadow">
      <div class="scrollbar-sidebar">
        <div class="app-sidebar__inner">
          <ul class="vertical-nav-menu">
            <li class="app-sidebar__heading">Dashboard Options</li>
            <li><a href="/home" style="display:flex;align-items:center;background:linear-gradient(to right,#007bff,#a6c8ff);color:white;padding:10px 15px;border-radius:5px;text-decoration:none;font-weight:bold"><i class="fa fa-home" style="margin-right:10px"></i>Home</a></li>
            <br>
            <li><a href="/tools" style="display:flex;align-items:center;background:linear-gradient(to right,#28a745,#85e085);color:white;padding:10px 15px;border-radius:5px;text-decoration:none;font-weight:bold"><i class="fa fa-tools" style="margin-right:10px"></i>Tools Section</a></li>
            <br>
            <li><a href="/ebooks" style="display:flex;align-items:center;background:linear-gradient(to right,#ff7f50,#ffa07a);color:white;padding:10px 15px;border-radius:5px;text-decoration:none;font-weight:bold"><i class="fa fa-book" style="margin-right:10px"></i>Ebooks Section</a></li>
            <br><br><br><br><br><br><hr>
            <li><a href="/logout" style="display:flex;align-items:center;background:linear-gradient(to right,#ff0000,#ffcccc);color:white;padding:10px 15px;border-radius:5px;text-decoration:none;font-weight:bold"><i class="fa fa-sign-out-alt" style="margin-right:10px"></i>Logout</a></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="app-main__outer">
      <div class="app-main__inner">
        <div class="app-page-title">
          <div class="page-title-wrapper">
            <div class="page-title-heading">
              <div class="page-title-icon"><i class="fas fa-user-shield icon-gradient bg-mean-fruit"></i></div>
              <div>Select AI Admin Dashboard
                <div class="page-title-subheading">Select AI Tool — your ultimate AI tools directory.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-md-6 col-xl-4">
            <div class="card mb-3 widget-content bg-midnight-bloom">
              <div class="widget-content-wrapper text-white">
                <div class="widget-content-left"><div class="widget-heading">Total Users</div></div>
                <div class="widget-content-right"><div class="widget-numbers text-white"><span>${totalUsers}</span></div></div>
              </div>
            </div>
          </div>
          <div class="col-md-6 col-xl-4">
            <div class="card mb-3 widget-content bg-arielle-smile">
              <div class="widget-content-wrapper text-white">
                <div class="widget-content-left"><div class="widget-heading">Basic Quizzes</div></div>
                <div class="widget-content-right"><div class="widget-numbers text-white"><span>${basicQuizCount}</span></div></div>
              </div>
            </div>
          </div>
          <div class="col-md-6 col-xl-4">
            <div class="card mb-3 widget-content bg-grow-early">
              <div class="widget-content-wrapper text-white">
                <div class="widget-content-left"><div class="widget-heading">Advanced Quizzes</div></div>
                <div class="widget-content-right"><div class="widget-numbers text-white"><span>${advanceQuizCount}</span></div></div>
              </div>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-md-6">
            <div class="card mb-3"><div class="card-header">User Statistics</div>
              <div class="card-body"><canvas id="salesChart" height="300"></canvas></div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card mb-3"><div class="card-header">Quiz Comparison</div>
              <div class="card-body"><canvas id="comparisonChart" height="300"></canvas></div>
            </div>
          </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script>
          new Chart(document.getElementById('salesChart'),{type:'bar',data:${JSON.stringify(chartData1)},options:{responsive:true,scales:{y:{beginAtZero:true}}}});
          new Chart(document.getElementById('comparisonChart'),{type:'pie',data:${JSON.stringify(chartData2)},options:{responsive:true}});
        </script>
      </div>
    </div>
  </div>
</div>
<script src="https://demo.dashboardpack.com/architectui-html-free/assets/scripts/main.js"></script>
</body>
</html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading dashboard');
  }
});

app.post('/delete-user/:id', async (req, res) => {
  try {
    await connectDB();
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/home');
  } catch (err) {
    res.status(500).send('Failed to delete user');
  }
});

// ─── Tool CRUD API ─────────────────────────────────────────────────────────────
app.get('/api/tools', async (req, res) => {
  try {
    await connectDB();
    const tools = await Tool.find();
    res.json(tools.map(t => ({ ...t._doc, rating: generateRandomRating() })));
  } catch (err) { res.status(500).json({ error: 'Error fetching tools' }); }
});

app.get('/api/tools/:id', async (req, res) => {
  try {
    await connectDB();
    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    res.json(tool);
  } catch (err) { res.status(500).json({ error: 'Error fetching tool' }); }
});

app.post('/api/tools', async (req, res) => {
  try {
    await connectDB();
    const tool = new Tool({ ...req.body, featured: req.body.featured === 'on' || req.body.featured === true });
    await tool.save();
    // If posted from HTML form, redirect; if JSON API call, return JSON
    const isFormPost = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
    if (isFormPost) return res.redirect('/tools');
    res.status(201).json(tool);
  } catch (err) { res.status(500).json({ error: 'Error creating tool' }); }
});

app.put('/api/tools/:id', async (req, res) => {
  try {
    await connectDB();
    const tool = await Tool.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    res.json(tool);
  } catch (err) { res.status(500).json({ error: 'Error updating tool' }); }
});

app.delete('/api/tools/:id', async (req, res) => {
  try {
    await connectDB();
    const tool = await Tool.findByIdAndDelete(req.params.id);
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    // Redirect if coming from form (_method override), else JSON
    const isFormDelete = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
    if (isFormDelete) return res.redirect('/tools');
    res.json({ message: 'Tool deleted' });
  } catch (err) { res.status(500).json({ error: 'Error deleting tool' }); }
});

// ─── Tools Page ────────────────────────────────────────────────────────────────
app.get('/tools', async (req, res) => {
  try {
    await connectDB();
    const perPage = 40;
    const page = parseInt(req.query.page) || 1;
    const recordCount = await Tool.countDocuments();
    const tools = await Tool.find().skip((page - 1) * perPage).limit(perPage);
    const totalPages = Math.ceil(recordCount / perPage);

    const rows = tools.map(tool => `
      <tr class="border-t hover:bg-gray-50">
        <td class="px-3 py-2">${tool.name}</td>
        <td class="px-3 py-2">${tool.category || '-'}</td>
        <td class="px-3 py-2">${tool.featured ? '<span class="text-green-600 font-semibold">Yes</span>' : '<span class="text-gray-400">No</span>'}</td>
        <td class="px-3 py-2">${tool.pricing || '-'}</td>
        <td class="px-3 py-2">${tool.date || '-'}</td>
        <td class="px-3 py-2">
          <a href="${tool.official_link || '#'}" target="_blank" class="text-blue-600 hover:underline">Visit</a>
        </td>
        <td class="px-3 py-2">
          <form class="inline-block" method="POST" action="/api/tools/${tool._id}?_method=DELETE" onsubmit="return confirm('Delete ${tool.name.replace(/'/g,"\\'")}?')">
            <button type="submit" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Delete</button>
          </form>
        </td>
      </tr>`).join('');

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
      .map(i => `<a href="/tools?page=${i}" class="px-3 py-1 rounded ${i === page ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}">${i}</a>`)
      .join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tools CRUD</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen flex flex-col items-center p-4">
  <h1 class="text-4xl font-bold mb-6">Tools Management</h1>

  <div class="w-full max-w-5xl flex justify-end mb-4 gap-3">
    <a href="/tools/upload" class="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700">📤 Upload Excel</a>
    <a href="/home" class="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700">🏠 Dashboard</a>
  </div>

  <div class="w-full max-w-5xl bg-white rounded-lg shadow p-6 mb-8">
    <h2 class="text-2xl font-semibold mb-4">Add New Tool</h2>
    <form method="POST" action="/api/tools" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input name="name" placeholder="Name" required class="border px-4 py-2 rounded"/>
      <input name="category" placeholder="Category" class="border px-4 py-2 rounded"/>
      <input name="pricing" placeholder="Pricing (Free/Paid)" class="border px-4 py-2 rounded"/>
      <input name="official_link" placeholder="Official Link" class="border px-4 py-2 rounded"/>
      <input name="image_url" placeholder="Image URL" class="border px-4 py-2 rounded"/>
      <input name="date" type="date" class="border px-4 py-2 rounded"/>
      <input name="profession" placeholder="Professions (comma separated)" class="border px-4 py-2 rounded"/>
      <input name="tags" placeholder="Tags (comma separated)" class="border px-4 py-2 rounded"/>
      <div class="flex items-center gap-2">
        <input type="checkbox" name="featured" id="featured"/>
        <label for="featured">Mark as Featured</label>
      </div>
      <textarea name="description" placeholder="Description" class="border px-4 py-2 rounded col-span-2"></textarea>
      <textarea name="details" placeholder="Details" class="border px-4 py-2 rounded col-span-2"></textarea>
      <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded col-span-2 hover:bg-blue-700">Add Tool</button>
    </form>
  </div>

  <div class="w-full max-w-7xl bg-white rounded-lg shadow p-6 overflow-x-auto">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-semibold">All Tools</h2>
      <span class="text-gray-600">${recordCount} record(s)</span>
    </div>
    <table class="min-w-full border border-gray-200 text-sm">
      <thead class="bg-gray-100">
        <tr>
          <th class="px-3 py-2 text-left">Name</th>
          <th class="px-3 py-2 text-left">Category</th>
          <th class="px-3 py-2 text-left">Featured</th>
          <th class="px-3 py-2 text-left">Pricing</th>
          <th class="px-3 py-2 text-left">Date</th>
          <th class="px-3 py-2 text-left">Link</th>
          <th class="px-3 py-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="flex justify-center mt-6 space-x-2">${pages}</div>
  </div>
</body>
</html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading tools page');
  }
});

// ─── Excel Upload ──────────────────────────────────────────────────────────────
app.get('/tools/upload', (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><title>Upload Tools Excel</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="flex flex-col items-center p-8 bg-gray-50 min-h-screen">
  <h1 class="text-3xl font-bold mb-6">Upload Tools Excel</h1>
  <form action="/tools/upload" method="POST" enctype="multipart/form-data" class="flex flex-col gap-4">
    <input type="file" name="excelFile" accept=".xlsx,.xls" required class="border px-4 py-2 rounded"/>
    <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Upload</button>
  </form>
  <a href="/tools" class="mt-4 text-blue-600 hover:underline">← Back to Tools</a>
</body></html>`);
});

app.post('/tools/upload', upload.single('excelFile'), async (req, res) => {
  try {
    await connectDB();
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const tools = data.map(row => ({
      name: row.name || '',
      description: row.description || '',
      category: row.category || '',
      link: row.link || '',
      pricing: row.pricing || '',
      official_link: row.official_link || '',
      availability: row.availability || '',
      details: row.details || '',
      profession: row.profession ? row.profession.split(',').map(s => s.trim()) : [],
      tags: row.tags ? row.tags.split(',').map(s => s.trim()) : [],
      new_description: row.new_description || '',
      image_url: row.image_url || '',
      overviewimg: row.overviewimg || '',
      date: row.date || '',
      featured: row.featured === 'true' || row.featured === true,
    }));

    await Tool.insertMany(tools);
    res.send(`<h2 style="color:green;font-family:sans-serif;padding:20px">✅ Uploaded ${tools.length} tools successfully!</h2><a href="/tools">← Back to Tools</a>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing file: ' + err.message);
  }
});

// ─── Ebook CRUD API ────────────────────────────────────────────────────────────
app.get('/api/ebooks', async (req, res) => {
  try {
    await connectDB();
    res.json(await Ebook.find());
  } catch (err) { res.status(500).json({ error: 'Error fetching ebooks' }); }
});

app.get('/api/ebooks/:id', async (req, res) => {
  try {
    await connectDB();
    const ebook = await Ebook.findById(req.params.id);
    if (!ebook) return res.status(404).json({ error: 'Ebook not found' });
    res.json(ebook);
  } catch (err) { res.status(500).json({ error: 'Error fetching ebook' }); }
});

app.post('/api/ebooks', async (req, res) => {
  try {
    await connectDB();
    const ebook = new Ebook(req.body);
    await ebook.save();
    const isFormPost = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
    if (isFormPost) return res.redirect('/ebooks');
    res.status(201).json(ebook);
  } catch (err) { res.status(500).json({ error: 'Error creating ebook' }); }
});

app.put('/api/ebooks/:id', async (req, res) => {
  try {
    await connectDB();
    const ebook = await Ebook.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ebook) return res.status(404).json({ error: 'Ebook not found' });
    res.json(ebook);
  } catch (err) { res.status(500).json({ error: 'Error updating ebook' }); }
});

app.delete('/api/ebooks/:id', async (req, res) => {
  try {
    await connectDB();
    const ebook = await Ebook.findByIdAndDelete(req.params.id);
    if (!ebook) return res.status(404).json({ error: 'Ebook not found' });
    const isFormDelete = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
    if (isFormDelete) return res.redirect('/ebooks');
    res.json({ message: 'Ebook deleted' });
  } catch (err) { res.status(500).json({ error: 'Error deleting ebook' }); }
});

// ─── Ebooks Page ───────────────────────────────────────────────────────────────
app.get('/ebooks', async (req, res) => {
  try {
    await connectDB();
    const perPage = 40;
    const page = parseInt(req.query.page) || 1;
    const recordCount = await Ebook.countDocuments();
    const ebooks = await Ebook.find().skip((page - 1) * perPage).limit(perPage);
    const totalPages = Math.ceil(recordCount / perPage);

    const rows = ebooks.map(e => `
      <tr class="border-t hover:bg-gray-50">
        <td class="px-3 py-2">${e.name}</td>
        <td class="px-3 py-2">${e.author || '-'}</td>
        <td class="px-3 py-2">${e.publisher || '-'}</td>
        <td class="px-3 py-2">${e.publish_date || '-'}</td>
        <td class="px-3 py-2">${e.category || '-'}</td>
        <td class="px-3 py-2"><a href="${e.image || '#'}" target="_blank" class="text-blue-600 hover:underline">Image</a></td>
        <td class="px-3 py-2">
          <form class="inline-block" method="POST" action="/api/ebooks/${e._id}?_method=DELETE" onsubmit="return confirm('Delete?')">
            <button type="submit" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Delete</button>
          </form>
        </td>
      </tr>`).join('');

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
      .map(i => `<a href="/ebooks?page=${i}" class="px-3 py-1 rounded ${i === page ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}">${i}</a>`)
      .join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ebooks CRUD</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen flex flex-col items-center p-4">
  <h1 class="text-4xl font-bold mb-6">Ebooks Management</h1>
  <div class="w-full max-w-5xl flex justify-end mb-4 gap-3">
    <a href="/ebooks/upload" class="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700">📤 Upload Excel</a>
    <a href="/home" class="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700">🏠 Dashboard</a>
  </div>
  <div class="w-full max-w-5xl bg-white rounded-lg shadow p-6 mb-8">
    <h2 class="text-2xl font-semibold mb-4">Add New Ebook</h2>
    <form method="POST" action="/api/ebooks" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input name="name" placeholder="Ebook Name" required class="border px-4 py-2 rounded"/>
      <input name="author" placeholder="Author" class="border px-4 py-2 rounded"/>
      <input name="publisher" placeholder="Publisher" class="border px-4 py-2 rounded"/>
      <input name="publish_date" type="date" class="border px-4 py-2 rounded"/>
      <input name="category" placeholder="Category" class="border px-4 py-2 rounded"/>
      <input name="image" placeholder="Image URL" class="border px-4 py-2 rounded"/>
      <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded col-span-2 hover:bg-blue-700">Add Ebook</button>
    </form>
  </div>
  <div class="w-full max-w-7xl bg-white rounded-lg shadow p-6 overflow-x-auto">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-semibold">All Ebooks</h2>
      <span class="text-gray-600">${recordCount} record(s)</span>
    </div>
    <table class="min-w-full border border-gray-200 text-sm">
      <thead class="bg-gray-100">
        <tr>
          <th class="px-3 py-2 text-left">Name</th><th class="px-3 py-2 text-left">Author</th>
          <th class="px-3 py-2 text-left">Publisher</th><th class="px-3 py-2 text-left">Date</th>
          <th class="px-3 py-2 text-left">Category</th><th class="px-3 py-2 text-left">Image</th>
          <th class="px-3 py-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="flex justify-center mt-6 space-x-2">${pages}</div>
  </div>
</body>
</html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading ebooks page');
  }
});

app.get('/ebooks/upload', (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><title>Upload Ebooks Excel</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="flex flex-col items-center p-8 bg-gray-50 min-h-screen">
  <h1 class="text-3xl font-bold mb-6">Upload Ebooks Excel</h1>
  <form action="/ebooks/upload" method="POST" enctype="multipart/form-data" class="flex flex-col gap-4">
    <input type="file" name="excelFile" accept=".xlsx,.xls" required class="border px-4 py-2 rounded"/>
    <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Upload</button>
  </form>
  <a href="/ebooks" class="mt-4 text-blue-600 hover:underline">← Back to Ebooks</a>
</body></html>`);
});

app.post('/ebooks/upload', upload.single('excelFile'), async (req, res) => {
  try {
    await connectDB();
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    const ebooks = data.map(row => ({
      name: row.name || '',
      author: row.author || '',
      publisher: row.publisher || '',
      publish_date: row.publish_date || '',
      category: row.category || '',
      image: row.image || '',
    }));
    await Ebook.insertMany(ebooks);
    res.send(`<h2 style="color:green;font-family:sans-serif;padding:20px">✅ Uploaded ${ebooks.length} ebooks!</h2><a href="/ebooks">← Back</a>`);
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

// ─── Export for Vercel ─────────────────────────────────────────────────────────
module.exports = app;
