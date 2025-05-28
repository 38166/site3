window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  (async () => {
    try {
      const res = await fetch('/me', {
        headers: { Authorization: token }
      });

      if (!res.ok) throw new Error('Ошибка запроса');

      const user = await res.json();

      const link = document.createElement('a');
      link.href = 'account.html';
      link.textContent = `👤 ${user.username}`;
      link.style = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #007BFF;
        color: white;
        padding: 10px 16px;
        border-radius: 10px;
        text-decoration: none;
        font-size: 16px;
        z-index: 999;
      `;
      document.body.appendChild(link);
    } catch (err) {
      console.error('Ошибка при загрузке профиля:', err);
    }
  })(); // 🔁 вызываем функцию сразу
});
