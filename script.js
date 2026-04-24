// --- DATA & STATE ---
let selectedDate = new Date().toISOString().split('T')[0];
let selectedSlot = null;
let bookings = JSON.parse(localStorage.getItem('turfeasy_bookings') || '{}');
let html5QrCode = null;

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
    try {
        lucide.createIcons();
        
        const dateInput = document.getElementById('booking-date');
        dateInput.value = selectedDate;
        dateInput.min = selectedDate;
        
        renderSlots();

        // Event Listeners
        dateInput.addEventListener('change', (e) => {
            selectedDate = e.target.value;
            const displayDate = document.getElementById('display-date');
            if(displayDate) displayDate.innerText = new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            renderSlots();
        });

        const staffBtn = document.getElementById('staff-portal-btn');
        if(staffBtn) staffBtn.onclick = () => switchView('staff');
        
        const closeBtn = document.querySelector('.close-modal');
        if(closeBtn) closeBtn.onclick = closeAllModals;
        
        const bookingForm = document.getElementById('booking-form');
        if(bookingForm) bookingForm.onsubmit = handleBookingSubmit;
        
        const payBtn = document.getElementById('pay-now-btn');
        if(payBtn) payBtn.onclick = handlePayment;
    } catch (err) {
        console.error("App init failed", err);
    }
}

// --- VIEW MANAGEMENT ---
function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(`${viewName}-view`);
    if(viewEl) viewEl.classList.add('active');
    
    if (viewName === 'staff') {
        startScanner();
    } else {
        stopScanner();
    }
}

// --- CUSTOMER FLOW ---
function renderSlots() {
    const grid = document.getElementById('slots-grid');
    if(!grid) return;
    grid.innerHTML = '';

    slotTimes.forEach((time) => {
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
    const modal = document.getElementById('booking-modal');
    if(modal) modal.classList.add('active');
}

function handleBookingSubmit(e) {
    e.preventDefault();
    document.getElementById('booking-modal').classList.remove('active');
    
    const paySlotTime = document.getElementById('pay-slot-time');
    if(paySlotTime) paySlotTime.innerText = selectedSlot;
    
    const payModal = document.getElementById('payment-modal');
    if(payModal) payModal.classList.add('active');
}

function handlePayment() {
    const btn = document.getElementById('pay-now-btn');
    const mockPay = document.querySelector('.mock-payment');
    const payDetails = document.querySelector('.payment-details');
    
    if(btn) btn.style.display = 'none';
    if(payDetails) payDetails.style.display = 'none';
    if(mockPay) mockPay.style.display = 'block';

    setTimeout(() => {
        completeBooking();
    }, 2000);
}

function completeBooking() {
    try {
        const nameInput = document.getElementById('cust-name');
        const phoneInput = document.getElementById('cust-phone');
        const sportInput = document.getElementById('cust-sport');
        
        const name = nameInput ? nameInput.value : "Guest";
        const phone = phoneInput ? phoneInput.value : "";
        const sport = sportInput ? sportInput.value : "Unknown";
        
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

        const slotKey = `${selectedDate}_${selectedSlot}`;
        bookings[slotKey] = bookingId;
        localStorage.setItem('turfeasy_bookings', JSON.stringify(bookings));
        localStorage.setItem(`booking_${bookingId}`, JSON.stringify(bookingData));

        generateTicket(bookingData);
        
        // Reset payment modal
        const payModal = document.getElementById('payment-modal');
        if(payModal) payModal.classList.remove('active');
        const payBtn = document.getElementById('pay-now-btn');
        if(payBtn) payBtn.style.display = 'block';
        const payDetails = document.querySelector('.payment-details');
        if(payDetails) payDetails.style.display = 'block';
        const mockPay = document.querySelector('.mock-payment');
        if(mockPay) mockPay.style.display = 'none';
        
        renderSlots();
    } catch (err) {
        console.error("Booking failed", err);
        alert("Something went wrong with the booking.");
    }
}

function generateTicket(data) {
    const ticketName = document.getElementById('ticket-name');
    const ticketSlot = document.getElementById('ticket-slot');
    const qrContainer = document.getElementById('qrcode-container');
    
    if(ticketName) ticketName.innerText = data.name;
    if(ticketSlot) ticketSlot.innerText = `${new Date(data.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} | ${data.time}`;
    
    if(qrContainer) {
        qrContainer.innerHTML = '';
        const canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, data.id, {
            width: 200,
            margin: 1,
            color: { dark: '#10b981', light: '#ffffff' }
        }, function (error) {
            if (error) console.error(error);
            qrContainer.appendChild(canvas);
        });
    }

    const successModal = document.getElementById('success-modal');
    if(successModal) successModal.classList.add('active');
}

// --- STAFF / INCHARGE FLOW ---
function startScanner() {
    const placeholder = document.querySelector('.scanner-placeholder');
    if(placeholder) placeholder.classList.add('hidden');
    
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            initScanner();
        }).catch(() => {
            initScanner();
        });
    } else {
        initScanner();
    }
}

function initScanner() {
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        onScanSuccess
    ).catch(err => {
        console.error("Scanning failed", err);
        const placeholder = document.querySelector('.scanner-placeholder');
        if(placeholder) {
            placeholder.classList.remove('hidden');
            placeholder.innerHTML = `<i data-lucide="camera-off"></i><p>Camera access denied</p>`;
            lucide.createIcons();
        }
    });
}

function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop();
    }
}

function onScanSuccess(decodedText) {
    const bookingJson = localStorage.getItem(`booking_${decodedText}`);
    
    if (bookingJson) {
        const data = JSON.parse(bookingJson);
        showScanResult(data);
        stopScanner();
    } else {
        const resultEl = document.getElementById('scan-result');
        if(resultEl) {
            resultEl.classList.remove('hidden');
            const reader = document.getElementById('reader');
            if(reader) reader.classList.add('hidden');
            resultEl.innerHTML = `
                <div class="error-msg" style="text-align: center; color: #ef4444;">
                    <i data-lucide="shield-alert" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                    <h3>Invalid QR Code</h3>
                    <p>Booking not found in system.</p>
                    <button class="primary-btn full-width" onclick="resetScanner()" style="margin-top: 1.5rem;">Try Again</button>
                </div>
            `;
            lucide.createIcons();
        }
        stopScanner();
    }
}

function showScanResult(data) {
    const resName = document.getElementById('res-name');
    const resTime = document.getElementById('res-time');
    if(resName) resName.innerText = data.name;
    if(resTime) resTime.innerText = `${data.date} | ${data.time}`;
    
    const scanResult = document.getElementById('scan-result');
    if(scanResult) scanResult.classList.remove('hidden');
    const reader = document.getElementById('reader');
    if(reader) reader.classList.add('hidden');
}

function approvePlayer() {
    alert("Player Approved! Game on.");
    resetScanner();
}

function resetScanner() {
    const resultEl = document.getElementById('scan-result');
    if(resultEl) {
        resultEl.classList.add('hidden');
        resultEl.innerHTML = `
            <h3>Booking Found</h3>
            <div class="result-details">
                <div class="detail-row"><span>Name:</span> <strong id="res-name">---</strong></div>
                <div class="detail-row"><span>Time:</span> <strong id="res-time">---</strong></div>
                <div class="detail-row"><span>Status:</span> <span class="badge" id="res-status">Paid</span></div>
            </div>
            <button class="primary-btn full-width" onclick="approvePlayer()">Approve to Play</button>
            <button class="text-btn full-width" onclick="resetScanner()">Scan Another</button>
        `;
    }
    const reader = document.getElementById('reader');
    if(reader) reader.classList.remove('hidden');
    startScanner();
}

// --- UTILS ---
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}
