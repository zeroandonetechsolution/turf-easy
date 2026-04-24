// --- DATA & STATE ---
let selectedDate = new Date().toISOString().split('T')[0];
let selectedSlot = null;
let bookings = JSON.parse(localStorage.getItem('turfeasy_bookings') || '{}');
let html5QrCode = null;

// Slots setup (Demo)
const slotTimes = [
    "06:00 AM", "07:30 AM", "09:00 AM", "10:30 AM", 
    "02:00 PM", "03:30 PM", "05:00 PM", "06:30 PM", 
    "08:00 PM", "09:30 PM"
];

// --- INITIALIZATION ---
window.onload = () => {
    initApp();
};

function initApp() {
    lucide.createIcons();
    
    // Set default date to today
    const dateInput = document.getElementById('booking-date');
    dateInput.value = selectedDate;
    dateInput.min = selectedDate;
    
    renderSlots();

    // Event Listeners
    dateInput.addEventListener('change', (e) => {
        selectedDate = e.target.value;
        document.getElementById('display-date').innerText = new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        renderSlots();
    });

    document.getElementById('staff-portal-btn').onclick = () => switchView('staff');
    document.querySelector('.close-modal').onclick = closeAllModals;
    
    document.getElementById('booking-form').onsubmit = handleBookingSubmit;
    document.getElementById('pay-now-btn').onclick = handlePayment;
}

// --- VIEW MANAGEMENT ---
function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewName}-view`).classList.add('active');
    
    if (viewName === 'staff') {
        startScanner();
    } else {
        stopScanner();
    }
}

// --- CUSTOMER FLOW ---
function renderSlots() {
    const grid = document.getElementById('slots-grid');
    grid.innerHTML = '';

    slotTimes.forEach((time, index) => {
        const slotKey = `${selectedDate}_${time}`;
        const isBooked = bookings[slotKey];
        
        const card = document.createElement('div');
        card.className = `slot-card ${isBooked ? 'booked' : 'available'}`;
        card.innerHTML = `
            <span class="slot-time">${time}</span>
            <span class="slot-status">${isBooked ? 'Reserved' : 'Available'}</span>
        `;

        if (!isBooked) {
            card.onclick = () => openBooking(time);
        }

        grid.appendChild(card);
    });
}

function openBooking(time) {
    selectedSlot = time;
    document.getElementById('booking-modal').classList.add('active');
}

function handleBookingSubmit(e) {
    e.preventDefault();
    document.getElementById('booking-modal').classList.remove('active');
    
    // Fill payment info
    document.getElementById('pay-slot-time').innerText = selectedSlot;
    document.getElementById('payment-modal').classList.add('active');
}

async function handlePayment() {
    const btn = document.getElementById('pay-now-btn');
    const mockPay = document.querySelector('.mock-payment');
    const payDetails = document.querySelector('.payment-details');
    
    btn.style.display = 'none';
    payDetails.style.display = 'none';
    mockPay.style.display = 'block';

    // Simulate network delay
    setTimeout(() => {
        completeBooking();
    }, 2000);
}

function completeBooking() {
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const sport = document.getElementById('cust-sport').value;
    const bookingId = 'TE-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const bookingData = {
        id: bookingId,
        name: name,
        phone: phone,
        sport: sport,
        date: selectedDate,
        time: selectedSlot,
        timestamp: new Date().toISOString()
    };

    // Save to State & Storage
    const slotKey = `${selectedDate}_${selectedSlot}`;
    bookings[slotKey] = bookingId;
    localStorage.setItem('turfeasy_bookings', JSON.stringify(bookings));
    localStorage.setItem(`booking_${bookingId}`, JSON.stringify(bookingData));

    // Show Ticket
    generateTicket(bookingData);
    
    // Reset payment modal for next time
    document.getElementById('payment-modal').classList.remove('active');
    document.getElementById('pay-now-btn').style.display = 'block';
    document.querySelector('.payment-details').style.display = 'block';
    document.querySelector('.mock-payment').style.display = 'none';
    
    renderSlots();
}

function generateTicket(data) {
    const ticketName = document.getElementById('ticket-name');
    const ticketSlot = document.getElementById('ticket-slot');
    const qrContainer = document.getElementById('qrcode-container');
    
    ticketName.innerText = data.name;
    ticketSlot.innerText = `${new Date(data.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} | ${data.time}`;
    
    qrContainer.innerHTML = '';
    // Generate REAL QR Code using qrcode.js
    // We encode the Booking ID
    QRCode.toCanvas(document.createElement('canvas'), data.id, {
        width: 200,
        margin: 1,
        color: {
            dark: '#10b981',
            light: '#ffffff'
        }
    }, function (error, canvas) {
        if (error) console.error(error);
        qrContainer.appendChild(canvas);
    });

    document.getElementById('success-modal').classList.add('active');
}

// --- STAFF / INCHARGE FLOW ---
function startScanner() {
    const placeholder = document.querySelector('.scanner-placeholder');
    placeholder.classList.add('hidden');
    
    if (html5QrCode) {
        html5QrCode.stop();
    }

    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        onScanSuccess
    ).catch(err => {
        console.error("Scanning failed", err);
        placeholder.classList.remove('hidden');
        placeholder.innerHTML = `<i data-lucide="camera-off"></i><p>Camera access denied</p>`;
        lucide.createIcons();
    });
}

function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop();
    }
}

function onScanSuccess(decodedText) {
    // decodedText should be the Booking ID (e.g., TE-XXXXXX)
    const bookingJson = localStorage.getItem(`booking_${decodedText}`);
    
    if (bookingJson) {
        const data = JSON.parse(bookingJson);
        showScanResult(data);
        stopScanner();
    } else {
        alert("Invalid QR Code: Booking not found in system.");
    }
}

function showScanResult(data) {
    document.getElementById('res-name').innerText = data.name;
    document.getElementById('res-time').innerText = `${data.date} | ${data.time}`;
    document.getElementById('scan-result').classList.remove('hidden');
    document.getElementById('reader').classList.add('hidden');
}

function approvePlayer() {
    alert("Player Approved! Game on.");
    resetScanner();
}

function resetScanner() {
    document.getElementById('scan-result').classList.add('hidden');
    document.getElementById('reader').classList.remove('hidden');
    startScanner();
}

// --- UTILS ---
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

function switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${view}-view`).classList.add('active');
    if (view === 'staff') startScanner(); else stopScanner();
}
