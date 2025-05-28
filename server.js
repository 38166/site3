const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;

// Подключение к базе данных
const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'Bkmzkt[f228', 
  database: 'весь_мир_един'
});

connection.connect((err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных: ' + err.stack);
    return;
  }
  console.log('✅ Подключено к базе данных');
});

// Секретный ключ для JWT
const secretKey = 'your-secret-key';

// Middleware
app.use(express.json()); // нужно для чтения JSON в POST-запросах
app.use(express.static(path.join(__dirname, 'public'))); // отдача HTML/CSS/JS

// Получение списка пользователей
app.get('/users', (req, res) => {
  connection.query('SELECT id, username, email FROM users', (err, results) => {
    if (err) {
      console.error('Ошибка при получении пользователей:', err);
      return res.status(500).send('Ошибка при получении пользователей');
    }
    res.json(results);
  });
});

// =======================
// 🔹 Главная (GET /)
// =======================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =======================
// 🔹 Получить события (GET)
// =======================
app.get('/getEvents', (req, res) => {
  connection.query('SELECT * FROM events ORDER BY date DESC', (err, results) => {
    if (err) {
      console.error('Ошибка при получении событий:', err);
      return res.status(500).send('Ошибка при получении событий');
    }
    res.json(results);
  });
});

// =======================
// 🔹 Добавить событие (POST)
// =======================
app.post('/addEvent', (req, res) => {
  const { title, date, description } = req.body;

  if (!title || !date || !description) {
    return res.status(400).send('Все поля обязательны');
  }

  connection.query(
    'INSERT INTO events (title, date, description) VALUES (?, ?, ?)',
    [title, date, description],
    (err) => {
      if (err) {
        console.error('Ошибка при добавлении события:', err);
        return res.status(500).send('Ошибка при добавлении события');
      }
      res.json({ success: true });
    }
  );
});

// =======================
// 🔹 Регистрация пользователя (POST)
// =======================
app.post('/registerParticipant', (req, res) => {
  const { fullName, email, password, age, city, interests, role } = req.body;

  if (!fullName || !email || !password || !age || !city || !interests || !role) {
    return res.status(400).send('Все поля обязательны');
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return res.status(500).send('Ошибка при хешировании пароля');

    connection.query(
      'INSERT INTO participants (fullName, email, password, age, city, interests, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [fullName, email, hashedPassword, age, city, interests, role],
      (err) => {
        if (err) {
          console.error('Ошибка при регистрации участника:', err);
          return res.status(500).send('Ошибка при сохранении участника');
        }

        res.json({ success: true });
      }
    );
  });
});



// =======================
// 🔹 Вход пользователя (POST)
// =======================
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Email и пароль обязательны');
  }

  // Подключение к таблице participants
  connection.query('SELECT * FROM participants WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Ошибка при логине:', err);
      return res.status(500).send('Ошибка при логине.');
    }

    const user = results[0];
    if (!user) return res.status(400).send('Пользователь не найден.');

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).send('Ошибка при проверке пароля.');

      if (!isMatch) return res.status(400).send('Неверный пароль.');

      const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: '1h' });

      res.json({ token });
    });
  });
});


// Личный кабент пользователя 
// 
app.get('/me', (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send('Нет токена');

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) return res.status(403).send('Неверный токен');

    const userId = decoded.id;
    connection.query('SELECT fullName, email FROM participants WHERE id = ?', [userId], (err, results) => {
      if (err || results.length === 0) return res.status(404).send('Пользователь не найден');
      res.json(results[0]);
    });
  });
});

//Обновление данных пользователя
app.post('/updateProfile', (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send('Нет токена');

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) return res.status(403).send('Неверный токен');

    const userId = decoded.id;
   const { fullName, email } = req.body;
    connection.query('UPDATE participants SET fullName = ?, email = ? WHERE id = ?', [fullName, email, userId], 
 (err) => {
      if (err) return res.status(500).send('Ошибка при обновлении данных');
      res.json({ success: true });
    });
  });
});

//Запись на мероприятие
app.post('/registerToEvent', (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send('Нет токена');

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) return res.status(403).send('Неверный токен');

    const userId = decoded.id;
    const { eventId } = req.body;

    connection.query(
      'INSERT INTO event_registrations (user_id, event_id) VALUES (?, ?)',
      [userId, eventId],
      (err) => {
        if (err) return res.status(500).send('Ошибка при записи');
        res.json({ success: true });
      }
    );
  });
});

// =======================
// 🔹 Защищённый маршрут (GET)
// =======================
app.get('/protected', (req, res) => {
  const token = req.headers['authorization'];

  if (!token) return res.status(403).send('Токен не предоставлен.');

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) return res.status(500).send('Ошибка при верификации токена.');

    res.json({ message: 'Доступ разрешён', userId: decoded.id });
  });
});

// =======================
// 🔹 Запуск сервера
// =======================
app.listen(port, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${port}`);
});
