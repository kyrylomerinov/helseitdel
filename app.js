import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, updateDoc, doc, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyDYt8ZXnlM9GVzsxS8q8d0L6N-pOHfsNJQ",
  authDomain: "bronnoyhelseitil.firebaseapp.com",
  projectId: "bronnoyhelseitil",
  storageBucket: "bronnoyhelseitil.firebasestorage.app",
  messagingSenderId: "302475397437",
  appId: "1:302475397437:web:bf5b5872701e13f42ddd54"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authScreen = document.getElementById('auth-screen');
const clientScreen = document.getElementById('client-screen');
const agentScreen = document.getElementById('agent-screen');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const userRoleSpan = document.getElementById('user-role');

let currentUser = null;
let userRole = 'ansatt';

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .catch(error => {
            document.getElementById('auth-error').innerText = "Feil e-post eller passord.";
        });
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        userEmailSpan.innerText = user.email;
        
        if (user.email.includes('it-support')) {
            userRole = 'agent';
            userRoleSpan.innerText = 'IT-støtte';
            showScreen('agent');
            loadAgentTickets();
        } else {
            userRole = 'ansatt';
            userRoleSpan.innerText = 'Ansatt';
            showScreen('client');
            loadClientTickets(user.uid);
        }
    } else {
        currentUser = null;
        showScreen('auth');
    }
});

function showScreen(screen) {
    authScreen.classList.add('hidden');
    clientScreen.classList.add('hidden');
    agentScreen.classList.add('hidden');
    userInfo.classList.add('hidden');

    if (screen === 'auth') authScreen.classList.remove('hidden');
    if (screen === 'client') { clientScreen.classList.remove('hidden'); userInfo.classList.remove('hidden'); }
    if (screen === 'agent') { agentScreen.classList.remove('hidden'); userInfo.classList.remove('hidden'); }
}

document.getElementById('ticket-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('ticket-title').value;
    const category = document.getElementById('ticket-category').value;
    const desc = document.getElementById('ticket-desc').value;

    try {
        await addDoc(collection(db, "tickets"), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            title: title,
            category: category,
            description: desc,
            status: "Ny",
            createdAt: new Date()
        });
        document.getElementById('ticket-form').reset();
        alert("Saken er registrert!");
    } catch (err) {
        console.error("Feil ved oppretting av sak: ", err);
    }
});

function loadClientTickets(uid) {
    const q = query(collection(db, "tickets"), where("userId", "==", uid));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('client-tickets-list');
        list.innerHTML = "";
        if(snapshot.empty) { list.innerHTML = "<p>Ingen registrerte saker.</p>"; return; }
        
        snapshot.forEach((doc) => {
            const ticket = doc.data();
            list.innerHTML += `
                <div class="ticket-item ${getStatusClass(ticket.status)}">
                    <h4>${ticket.title} <span style="font-size:12px; font-weight:normal;">(${ticket.category})</span></h4>
                    <p>${ticket.description}</p>
                    <p><strong>Status:</strong> ${ticket.status}</p>
                </div>
            `;
        });
    });
}

function loadAgentTickets() {
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('agent-tickets-list');
        list.innerHTML = "";
        
        snapshot.forEach((snapshotDoc) => {
            const ticket = snapshotDoc.data();
            const ticketId = snapshotDoc.id;
            
            const item = document.createElement('div');
            item.className = `ticket-item ${getStatusClass(ticket.status)}`;
            item.innerHTML = `
                <h4>${ticket.title} <span style="font-size:12px; font-weight:normal;">(${ticket.category})</span></h4>
                <p>${ticket.description}</p>
                <p><strong>Meldt av:</strong> ${ticket.userEmail}</p>
                <p><strong>Status:</strong> <span id="status-text-${ticketId}">${ticket.status}</span></p>
                <div class="ticket-actions">
                    <button onclick="updateStatus('${ticketId}', 'Under behandling')">Sett i arbeid</button>
                    <button onclick="updateStatus('${ticketId}', 'Løst')">Marker som løst</button>
                </div>
            `;
            list.appendChild(item);
        });
    });
}

window.updateStatus = async (ticketId, newStatus) => {
    const ticketRef = doc(db, "tickets", ticketId);
    try {
        await updateDoc(ticketRef, { status: newStatus });
    } catch (err) {
        console.error("Kunne ikke oppdatere status: ", err);
    }
};

function getStatusClass(status) {
    if (status === 'Ny') return 'status-ny';
    if (status === 'Under behandling') return 'status-arbeid';
    if (status === 'Løst') return 'status-løst';
    return '';
}