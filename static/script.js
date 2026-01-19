// Xử lý tìm kiếm tài liệu 
const searchInput = document.getElementById('searchInput'); 
const docList = document.getElementById('docList'); 
const docs = docList.getElementsByClassName('doc-link'); 
searchInput.addEventListener('keyup', function() { 
  const filter = searchInput.value.toLowerCase(); 
  for (let i = 0; i < docs.length; i++) { 
    const text = docs[i].textContent.toLowerCase(); 
    docs[i].style.display = text.includes(filter) ? '' : 'none'; 
  } 
});

// Hiển thị ngày giờ hiện tại
function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  let dateTimeString = now.toLocaleString('vi-VN', options);
    if (dateTimeString.startsWith('lúc ')) {
        dateTimeString = dateTimeString.substring(4);
    }
  document.getElementById('currentDateTime').textContent = dateTimeString;
}

setInterval(updateDateTime, 1000); // Cập nhật mỗi giây
updateDateTime(); // Gọi lần đầu để hiển thị ngay lập tức

// Bộ đếm lượt truy cập
function updateVisitCounter() {
  // Lấy ngày giờ hiện tại
  const now = new Date();
  const today = now.toDateString(); // Ví dụ: "Mon Jan 01 2024"
  const thisMonth = now.getFullYear() + '-' + now.getMonth(); // Ví dụ: "2024-0" cho tháng 1

  // Lấy dữ liệu từ localStorage, nếu không có thì mặc định là 0
  let dailyVisits = parseInt(localStorage.getItem('dailyVisits')) || 0;
  let monthlyVisits = parseInt(localStorage.getItem('monthlyVisits')) || 0;
  let totalVisits = parseInt(localStorage.getItem('totalVisits')) || 0;
  let lastVisitDate = localStorage.getItem('lastVisitDate');
  let lastVisitMonth = localStorage.getItem('lastVisitMonth');

  // Kiểm tra nếu là ngày mới, reset lượt truy cập trong ngày
  if (lastVisitDate !== today) {
    dailyVisits = 0;
    localStorage.setItem('lastVisitDate', today);
  }

  // Kiểm tra nếu là tháng mới, reset lượt truy cập trong tháng
  if (lastVisitMonth !== thisMonth) {
    monthlyVisits = 0;
    localStorage.setItem('lastVisitMonth', thisMonth);
  }

  // Tăng số lượt truy cập cho lần ghé thăm hiện tại
  dailyVisits++;
  monthlyVisits++;
  totalVisits++;

  // Lưu lại các giá trị đã cập nhật vào localStorage
  localStorage.setItem('dailyVisits', dailyVisits);
  localStorage.setItem('monthlyVisits', monthlyVisits);
  localStorage.setItem('totalVisits', totalVisits);

  // Hiển thị các số liệu lên trang
  document.getElementById('dailyCount').textContent = dailyVisits;
  document.getElementById('monthlyCount').textContent = monthlyVisits;
  document.getElementById('totalCount').textContent = totalVisits;
}

// Gọi hàm bộ đếm khi trang được tải
updateVisitCounter();

// Background slideshow
const backgroundImages = [
  '/static/img/background/1.jpg',
  '/static/img/background/3.jpg'
];

let currentImageIndex = 0;

function changeBackgroundImage() {
  currentImageIndex = (currentImageIndex + 1) % backgroundImages.length;
  const imageUrl = `url('${backgroundImages[currentImageIndex]}')`;
  document.body.style.backgroundImage = imageUrl;
}

setInterval(changeBackgroundImage, 10000); // Change image every 10 seconds

document.addEventListener('DOMContentLoaded', function() {
    // --- Common Elements ---
    const addNewButton = document.querySelector('.btn-add-new');
    const logoutButton = document.querySelector('.btn-logout');
    let isLoggedIn = false;
    let currentUser = null;

    // --- Login Elements ---
    const loginModal = $('#loginModal');
    const loginSubmitButton = document.getElementById('loginSubmit');
    const loginError = document.getElementById('login-error');

    // --- Announcement Elements ---
    const addAnnouncementModal = $('#addAnnouncementModal');
    const submitAnnouncementButton = document.getElementById('submitAnnouncement');
    const uploadError = document.getElementById('upload-error');
    const uploadSuccess = document.getElementById('upload-success');
    const announcementForm = document.getElementById('announcementForm');
    const docList = document.getElementById('docList');
    const searchInput = document.getElementById('searchInput'); 

    // --- Chat Elements ---
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chat-input-form');
    const chatInput = document.getElementById('chat-message-input');
    let chatPollInterval;


    // =================================================================
    // --- CHAT FUNCTIONS ---
    // =================================================================

    function renderChatMessages(messages) {
        chatMessages.innerHTML = ''; // Clear old messages
        if (messages.length === 0) {
            chatMessages.innerHTML = '<div class="chat-message-server">Chưa có tin nhắn nào.</div>';
            return;
        }

        messages.forEach(msg => {
            const msgElement = document.createElement('div');
            msgElement.classList.add('chat-message');
            
            // Highlight messages from the current user
            if (currentUser && msg.username === currentUser.username) {
                msgElement.classList.add('my-message');
            }

            const authorSpan = document.createElement('span');
            authorSpan.classList.add('chat-author');
            authorSpan.textContent = msg.name || msg.username; // Fallback to username if name doesn't exist

            const contentSpan = document.createElement('span');
            contentSpan.classList.add('chat-content');
            contentSpan.textContent = msg.message;
            
            const timeSpan = document.createElement('span');
            timeSpan.classList.add('chat-timestamp');
            timeSpan.textContent = new Date(msg.timestamp).toLocaleTimeString('vi-VN');

            msgElement.appendChild(authorSpan);
            msgElement.appendChild(contentSpan);
            msgElement.appendChild(timeSpan);
            chatMessages.appendChild(msgElement);
        });

        // Auto-scroll to the bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function loadChatMessages() {
        try {
            const response = await fetch('/api/chat/messages');
            const messages = await response.json();
            renderChatMessages(messages);
        } catch (error) {
            console.error('Error loading chat messages:', error);
        }
    }

    chatForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const message = chatInput.value.trim();

        if (!isLoggedIn) {
            alert('Bạn phải đăng nhập để gửi tin nhắn.');
            return;
        }

        if (message) {
            try {
                const response = await fetch('/api/chat/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message }),
                });

                if (response.ok) {
                    chatInput.value = ''; // Clear input
                    loadChatMessages(); // Reload messages immediately
                } else {
                    const errorData = await response.json();
                    alert(`Lỗi: ${errorData.message}`);
                }
            } catch (error) {
                console.error('Error sending message:', error);
                alert('Không thể gửi tin nhắn. Vui lòng thử lại.');
            }
        }
    });


    // =================================================================
    // --- ANNOUNCEMENT FUNCTIONS ---
    // =================================================================

    function renderAnnouncements(announcements) {
        docList.innerHTML = '';
        if (announcements.length === 0) {
            docList.innerHTML = '<p>Chưa có thông báo nào.</p>';
            return;
        }

        announcements.forEach(doc => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('doc-item');

            // Title is now just bold text, not a link
            const titleHeader = document.createElement('h5');
            titleHeader.classList.add('doc-title');
            titleHeader.innerHTML = `<strong>${doc.title}</strong>`;
            
            const metadata = document.createElement('p');
            metadata.classList.add('doc-metadata');
            const author = doc.author || 'N/A';
            const date = new Date(doc.timestamp).toLocaleString('vi-VN');
            metadata.textContent = `Người đăng: ${author} - ${date}`;

            itemDiv.appendChild(titleHeader);
            itemDiv.appendChild(metadata);

            // Add content if it exists
            if (doc.content && doc.content.trim() !== '') {
                const contentP = document.createElement('p');
                contentP.classList.add('doc-content');
                contentP.textContent = doc.content;
                itemDiv.appendChild(contentP);
            }

            // Add attachment link at the bottom if a file exists
            if (doc.file) {
                const attachmentP = document.createElement('p');
                attachmentP.classList.add('doc-attachment');

                const attachmentLink = document.createElement('a');
                attachmentLink.href = `/uploads/${doc.file}`;
                attachmentLink.target = '_blank';
                attachmentLink.rel = 'noopener noreferrer';
                attachmentLink.textContent = doc.file; // The filename is the link text

                attachmentP.append('Đính kèm: ');
                attachmentP.appendChild(attachmentLink);
                itemDiv.appendChild(attachmentP);
            }

            docList.appendChild(itemDiv);
        });
    }

    async function loadAnnouncements() {
        try {
            const response = await fetch('/api/get_announcements');
            const announcements = await response.json();
            renderAnnouncements(announcements);
        } catch (error) {
            console.error('Error loading announcements:', error);
            docList.innerHTML = '<p>Lỗi khi tải danh sách thông báo.</p>';
        }
    }
    
    searchInput.addEventListener('keyup', function() { 
      const filter = searchInput.value.toLowerCase();
      const docs = docList.getElementsByClassName('doc-link'); 
      for (let i = 0; i < docs.length; i++) { 
        const text = docs[i].textContent.toLowerCase(); 
        docs[i].style.display = text.includes(filter) ? '' : 'none'; 
      } 
    });
    
    submitAnnouncementButton.addEventListener('click', async function() {
        const formData = new FormData(announcementForm);
        uploadError.style.display = 'none';
        uploadSuccess.style.display = 'none';

        try {
            const response = await fetch('/api/announcements', { method: 'POST', body: formData });
            const data = await response.json();
            if (response.ok && data.success) {
                uploadSuccess.textContent = data.message || 'Tạo thông báo thành công!';
                uploadSuccess.style.display = 'block';
                loadAnnouncements(); // Reload the list
                setTimeout(() => addAnnouncementModal.modal('hide'), 1500);
            } else {
                uploadError.textContent = data.message || 'Tạo thông báo thất bại.';
                uploadError.style.display = 'block';
            }
        } catch (error) {
            console.error('Announcement submission failed:', error);
            uploadError.textContent = 'Đã xảy ra lỗi. Vui lòng thử lại.';
            uploadError.style.display = 'block';
        }
    });

    // =================================================================
    // --- AUTHENTICATION & CORE LOGIC ---
    // =================================================================
    
    function updateUI(loggedIn, user = null) {
        isLoggedIn = loggedIn;
        currentUser = user;
        if (loggedIn) {
            logoutButton.style.display = 'inline-block';
            chatInput.placeholder = 'Nhập tin nhắn...';
        } else {
            logoutButton.style.display = 'none';
            chatInput.placeholder = 'Đăng nhập để trò chuyện...';
        }
    }

    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/check_auth');
            const data = await response.json();
            updateUI(data.logged_in, data.user);
        } catch (error) {
            console.error('Error checking auth status:', error);
            updateUI(false);
        }
        
        // Load initial data and start polling
        loadAnnouncements();
        loadChatMessages();
        if (chatPollInterval) clearInterval(chatPollInterval);
        chatPollInterval = setInterval(loadChatMessages, 5000); // Poll every 5 seconds
    }

    addNewButton.addEventListener('click', function() {
        if (!isLoggedIn) {
            loginModal.modal('show');
        } else {
            uploadError.style.display = 'none';
            uploadSuccess.style.display = 'none';
            announcementForm.reset();
            addAnnouncementModal.modal('show');
        }
    });

    loginSubmitButton.addEventListener('click', async function() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        loginError.style.display = 'none';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                loginModal.modal('hide');
                document.getElementById('loginForm').reset();
                checkAuthStatus(); // Re-check auth status to update UI and load data
            } else {
                loginError.textContent = data.message || 'Đăng nhập không thành công.';
                loginError.style.display = 'block';
            }
        } catch (error) {
            console.error('Login request failed:', error);
            loginError.textContent = 'Đã xảy ra lỗi. Vui lòng thử lại.';
            loginError.style.display = 'block';
        }
    });

    logoutButton.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/logout');
            if (response.ok) {
                updateUI(false);
            } else {
                console.error('Logout failed.');
            }
        } catch (error) {
            console.error('Logout request failed:', error);
        }
    });

    // --- Initial Page Load ---
    checkAuthStatus();
});