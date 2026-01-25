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
    const loginLink = document.getElementById('login-link');
    let isLoggedIn = false;
    let currentUser = null;

    // --- Login Elements ---
    const loginModal = $('#loginModal');
    const loginSubmitButton = document.getElementById('loginSubmit');
    const loginError = document.getElementById('login-error');

    // --- Guest Name Elements ---
    const guestNameModal = $('#guestNameModal');
    const saveGuestNameButton = document.getElementById('saveGuestName');
    const guestNameInput = document.getElementById('guestName');
    let pendingMessage = ''; 
    let shouldPromptForName = false;

    // --- Announcement Elements ---
    const addAnnouncementModal = $('#addAnnouncementModal');
    const submitAnnouncementButton = document.getElementById('submitAnnouncement');
    const uploadError = document.getElementById('upload-error');
    const uploadSuccess = document.getElementById('upload-success');
    const announcementForm = document.getElementById('announcementForm');
    const docList = document.getElementById('docList');
    const searchInput = document.getElementById('searchInput');
    let announcementsOffset = 0;
    const announcementsLimit = 10; // Tải 10 thông báo mỗi lần
    let totalAnnouncements = 0;
    let isLoadingAnnouncements = false;

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
            const msgContainer = document.createElement('div');
            msgContainer.classList.add('chat-message-container');

            const msgElement = document.createElement('div');
            msgElement.classList.add('chat-message');
            
            if (currentUser && msg.username === currentUser.username) {
                msgContainer.classList.add('my-message-container');
                msgElement.classList.add('my-message');
            }

            const authorSpan = document.createElement('span');
            authorSpan.classList.add('chat-author');
            authorSpan.textContent = msg.name || msg.username;

            const contentSpan = document.createElement('span');
            contentSpan.classList.add('chat-content');
            contentSpan.textContent = msg.message;
            
            const timeSpan = document.createElement('span');
            timeSpan.classList.add('chat-timestamp');
            timeSpan.textContent = new Date(msg.timestamp).toLocaleTimeString('vi-VN');

            msgElement.appendChild(contentSpan);
            msgElement.appendChild(timeSpan);
            
            msgContainer.appendChild(authorSpan);
            msgContainer.appendChild(msgElement);
            chatMessages.appendChild(msgContainer);
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

    async function sendMessage(message) {
        if (!message) return;
        try {
            const response = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message }),
            });

            if (response.ok) {
                chatInput.value = '';
                loadChatMessages();
            } else {
                const errorData = await response.json();
                alert(`Lỗi: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Không thể gửi tin nhắn. Vui lòng thử lại.');
        }
    }

    chatForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const message = chatInput.value.trim();
        if (message) {
            if (shouldPromptForName) {
                pendingMessage = message;
                guestNameModal.modal('show');
            } else {
                sendMessage(message);
            }
        }
    });

    saveGuestNameButton.addEventListener('click', async function() {
        const guestName = guestNameInput.value.trim();
        if (!guestName) {
            alert('Vui lòng nhập tên của bạn.');
            return;
        }

        try {
            const response = await fetch('/api/set_guest_name', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: guestName }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                shouldPromptForName = false;
                currentUser = data.user; // Cập nhật người dùng hiện tại
                updateUI(false, data.user);
                guestNameModal.modal('hide');
                sendMessage(pendingMessage); // Gửi tin nhắn đang chờ
                pendingMessage = '';
            } else {
                alert(data.message || 'Lưu tên thất bại.');
            }
        } catch (error) {
            alert('Đã xảy ra lỗi khi lưu tên.');
        }
    });


    // =================================================================
    // --- ANNOUNCEMENT FUNCTIONS ---
    // =================================================================

    function renderAnnouncements(announcements, append = false) {
        if (!append) {
            docList.innerHTML = '';
        }

        if (announcements.length === 0 && !append) {
            docList.innerHTML = '<p>Chưa có thông báo nào.</p>';
            return;
        }

        announcements.forEach(doc => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('doc-item');

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

            if (doc.content && doc.content.trim() !== '') {
                const contentP = document.createElement('p');
                contentP.classList.add('doc-content');
                contentP.textContent = doc.content;
                itemDiv.appendChild(contentP);
            }

            if (doc.files && doc.files.length > 0) {
                const attachmentContainer = document.createElement('div');
                attachmentContainer.classList.add('doc-attachment-container');
                
                const label = document.createElement('p');
                label.classList.add('doc-attachment-label');
                label.textContent = 'Đính kèm:';
                attachmentContainer.appendChild(label);

                doc.files.forEach(file => {
                    const attachmentItem = document.createElement('div');
                    attachmentItem.classList.add('doc-attachment-item');

                    const attachmentLink = document.createElement('a');
                    attachmentLink.href = `/api/nas/download/${file}`;
                    attachmentLink.rel = 'noopener noreferrer';
                    attachmentLink.textContent = file;

                    attachmentItem.appendChild(attachmentLink);
                    attachmentContainer.appendChild(attachmentItem);
                });

                itemDiv.appendChild(attachmentContainer);
            }

            docList.appendChild(itemDiv);
        });
    }

    async function loadAnnouncements(isInitialLoad = false) {
        if (isLoadingAnnouncements) return;
        if (!isInitialLoad && announcementsOffset >= totalAnnouncements && totalAnnouncements > 0) {
            return; 
        }

        isLoadingAnnouncements = true;
        if(isInitialLoad) {
            announcementsOffset = 0;
            docList.innerHTML = '<p>Đang tải danh sách thông báo...</p>';
        }

        try {
            const response = await fetch(`/api/get_announcements?offset=${announcementsOffset}&limit=${announcementsLimit}`);
            const data = await response.json();
            
            if (isInitialLoad) {
                totalAnnouncements = data.total;
                renderAnnouncements(data.announcements);
            } else {
                renderAnnouncements(data.announcements, true);
            }

            announcementsOffset += data.announcements.length;

        } catch (error) {
            console.error('Error loading announcements:', error);
            if (isInitialLoad) {
                docList.innerHTML = '<p>Lỗi khi tải danh sách thông báo.</p>';
            }
        } finally {
            isLoadingAnnouncements = false;
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
                loadAnnouncements(true); // Tải lại từ đầu
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

    docList.addEventListener('scroll', () => {
        // Gần đến cuối (ví dụ: 100px) thì tải thêm
        if (docList.scrollTop + docList.clientHeight >= docList.scrollHeight - 100) {
            loadAnnouncements();
        }
    });

    // =================================================================
    // --- AUTHENTICATION & CORE LOGIC ---
    // =================================================================
    
    function updateUI(loggedIn, user = null) {
        isLoggedIn = loggedIn;
        currentUser = user;
        
        const userStatusDiv = document.getElementById('user-status');
        const adminPanelLink = document.getElementById('admin-panel-link');
        const addNewButton = document.querySelector('.btn-add-new');

        // Reset all controls first
        logoutButton.style.display = 'none';
        loginLink.style.display = 'none';
        adminPanelLink.style.display = 'none';
        addNewButton.style.display = 'none';
        chatInput.disabled = false;

        if (loggedIn) {
            logoutButton.style.display = 'inline-block';
            chatInput.placeholder = `Nhập tin nhắn...`;
            if (userStatusDiv) {
                userStatusDiv.textContent = `Xin chào, ${user.name}`;
            }
            // Show admin controls if the user is an admin
            if (user && user.role === 'admin') {
                adminPanelLink.style.display = 'inline-block';
                addNewButton.style.display = 'inline-block';
            }
        } else { // Not logged in (guest)
            loginLink.style.display = 'inline-block';
            if (shouldPromptForName) {
                 chatInput.placeholder = 'Nhập tin nhắn và nhấn gửi để đặt tên...';
                 if (userStatusDiv) {
                    userStatusDiv.textContent = `Bạn là Khách (chưa đặt tên)`;
                }
            } else if (user) { // Guest with a name
                chatInput.placeholder = `Nhập tin nhắn (với tư cách ${user.name})...`;
                 if (userStatusDiv) {
                    userStatusDiv.textContent = `Bạn là Khách (${user.name})`;
                }
            }
        }
    }

    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/check_auth');
            const data = await response.json();
            
            shouldPromptForName = data.prompt_for_name || false;
            
            updateUI(data.logged_in, data.user);
        } catch (error) {
            console.error('Error checking auth status:', error);
            // Ensure UI is in a logged-out state on failure
            updateUI(false, { name: 'Guest', role: 'guest' });
        }
        
        // Load initial data and start polling
        loadAnnouncements(true); // Tải lần đầu
        loadChatMessages();
        if (chatPollInterval) clearInterval(chatPollInterval);
        chatPollInterval = setInterval(loadChatMessages, 5000); // Poll every 5 seconds
    }

    addNewButton.addEventListener('click', function() {
        // The button is only visible for admins, so we just need to check for login status
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
                await checkAuthStatus(); // Re-check auth status to update UI
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
                await checkAuthStatus(); // Re-check to update UI to guest state
            } else {
                console.error('Logout failed.');
            }
        } catch (error) {
            console.error('Logout request failed:', error);
        }
    });

    loginLink.addEventListener('click', function(event) {
        event.preventDefault();
        loginModal.modal('show');
    });

    // --- Initial Page Load ---
    checkAuthStatus();
});