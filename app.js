
const ADMIN_PASSWORD = "Admin@123";

function signUp() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert('Account created successfully.');
      location.href = 'login.html';
    })
    .catch(e => alert(e.message));
}

function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  auth.signInWithEmailAndPassword(email, password)
    .then(() => location.href = 'test.html')
    .catch(e => alert(e.message));
}

function adminLogin() {
  const pwd = document.getElementById('adminPassword').value;
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem('isAdmin', 'true');
    location.reload();
  } else {
    alert('Wrong password');
  }
}

async function addQuestion() {
  const q = document.getElementById('question').value;
  const options = [
    document.getElementById('opt1').value,
    document.getElementById('opt2').value,
    document.getElementById('opt3').value,
    document.getElementById('opt4').value
  ];
  const answer = document.getElementById('answer').value;
  await db.collection('questions').add({ question: q, options, answer });
  alert('Question added.');
}

async function loadQuestions() {
  const container = document.getElementById('questions');
  if (!container) return;
  const snap = await db.collection('questions').get();
  let html = '';
  let idx = 0;
  snap.forEach(doc => {
    const data = doc.data();
    html += `<div class="option"><b>Q${++idx}.</b> ${data.question}<br>`;
    data.options.forEach(opt => {
      html += `<label><input type="radio" name="${doc.id}" value="${opt}"> ${opt}</label><br>`;
    });
    html += `</div>`;
  });
  container.innerHTML = html;
}

async function submitTest() {
  const snap = await db.collection('questions').get();
  let score = 0;
  let total = 0;
  snap.forEach(doc => {
    total++;
    const data = doc.data();
    const selected = document.querySelector(`input[name="${doc.id}"]:checked`);
    if (selected && selected.value === data.answer) score++;
  });

  const user = auth.currentUser;
  if (user) {
    await db.collection('results').add({
      uid: user.uid,
      email: user.email,
      score,
      total,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  alert(`Your Score: ${score}/${total}`);
}

auth.onAuthStateChanged(user => {
  const protectedPage = location.pathname.endsWith('test.html');
  if (protectedPage && !user) location.href = 'login.html';
});


async function loadResults() {
  const container = document.getElementById('results');
  if (!container) return;
  const snap = await db.collection('results').orderBy('createdAt', 'desc').get();
  let html = '<table border="1" cellpadding="8" style="width:100%; border-collapse:collapse;">';
  html += '<tr><th>Email</th><th>Score</th><th>Total</th><th>Date</th></tr>';
  snap.forEach(doc => {
    const d = doc.data();
    const date = d.createdAt && d.createdAt.toDate
      ? d.createdAt.toDate().toLocaleString()
      : '';
    html += `<tr>
      <td>${d.email || ''}</td>
      <td>${d.score ?? ''}</td>
      <td>${d.total ?? ''}</td>
      <td>${date}</td>
    </tr>`;
  });
  html += '</table>';
  container.innerHTML = html;
}


async async function uploadQuestionsJSON() {
  const fileInput = document.getElementById('jsonFile');
  if (!fileInput || !fileInput.files.length) {
    alert('Please select a JSON file.');
    return;
  }

  try {
    const text = await fileInput.files[0].text();
    const questions = JSON.parse(text);

    if (!Array.isArray(questions)) {
      throw new Error('JSON must be an array of questions.');
    }

    // Support both global db and window.db
    const firestore = typeof db !== 'undefined' ? db : window.db;
    if (!firestore) {
      throw new Error('db is not defined. Check firebase-config.js');
    }

    let count = 0;
    for (const q of questions) {
      let options = q.options;

      // Also support option1, option2, option3, option4 format
      if (!Array.isArray(options)) {
        options = [q.option1, q.option2, q.option3, q.option4].filter(Boolean);
      }

      if (!q.question || !Array.isArray(options) || options.length < 2 || !q.answer) {
        continue;
      }

      await firestore.collection('questions').add({
        question: q.question,
        options: options,
        answer: q.answer,
        subject: q.subject || q.section || ''
      });

      count++;
    }

    alert(`${count} questions uploaded successfully.`);
    fileInput.value = '';
  } catch (e) {
    alert('Upload failed: ' + e.message);
  }
}
