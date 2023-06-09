const express = require('express');
const admin = require('firebase-admin');
const serviceAccount = require('./firebaseServiceAccount.json');
const nodemailer = require('nodemailer')


const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

// Inisialisasi Firebase App
if (!admin.apps.length) {
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://.firebaseio.com' // Ganti dengan URL Firebase Anda
});
}

const db = admin.firestore();
const app = express();
const port = 3000;

app.use(express.json());

// Endpoint untuk registrasi
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: username
    });

    // Simpan data pengguna ke Firestore
    await db.collection('').doc(userRecord.uid).set({
      email,
      username
    });

    res.status(200).json({ message: 'Registrasi berhasil' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Terjadi kesalahan saat registrasi' });
  }
});

// Endpoint untuk login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buat token akses kustom
    const token = await admin.auth().createCustomToken('userId');

    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Email atau password salah' });
  }
});

const transporter = nodemailer.createTransport({
  // Konfigurasi transporter email Anda
  service: 'Gmail', // Nama penyedia email, misalnya Gmail, Yahoo Mail, dll.
  auth: {
    user: '', // Alamat email pengirim
    pass: '' // Kata sandi email pengirim
  }
});


// Endpoint untuk lupa password
// Endpoint untuk mengirim email reset password
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Buat tautan reset password menggunakan SDK Admin Firebase
    const actionCodeSettings = {
      url: "http://localhost:3000/api/forgot-password", // Ganti dengan URL aplikasi Anda
      handleCodeInApp: true
    };
    const resetPasswordLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    // Kirim email reset password menggunakan Nodemailer
    const mailOptions = {
      from: 'noreply@example.com',
      to: email,
      subject: 'Reset Password',
      text: `Klik tautan berikut untuk mereset password Anda: ${resetPasswordLink}`
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Email reset password telah dikirim' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Terjadi kesalahan dalam mengirim email reset password' });
  }
});

// ...


// Middleware untuk memeriksa token akses
const authenticate = async (req, res, next) => {
  try {
    const { authorization } = req.headers;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Akses ditolak' });
    }

    const token = authorization.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;

    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Token akses tidak valid' });
  }
};

// Contoh endpoint yang dilindungi, hanya dapat diakses setelah autentikasi
app.get('/api/protected', authenticate, (req, res) => {
  res.status(200).json({ message: 'Endpoint yang dilindungi, hanya dapat diakses setelah autentikasi' });
});

app.listen(port, () => {
  console.log(`API berjalan di http://localhost:${port}`);
});