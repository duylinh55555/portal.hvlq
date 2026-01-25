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

// Hiển thị ngày giờ hiện tại (đồng bộ với server, chạy real-time)
function startLiveClock() {
    const dateTimeElement = document.getElementById('currentDateTime');
    // Lấy thời gian ISO từ data attribute
    const initialTimeISO = dateTimeElement.getAttribute('data-initial-time');
    
    // Nếu không có thời gian từ server, không làm gì cả
    if (!initialTimeISO) return;

    // Tạo đối tượng Date từ chuỗi ISO
    let serverTime = new Date(initialTimeISO);

    // Mảng tên ngày bằng tiếng Việt
    const daysMap = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    function formatCurrentTime() {
        const dayOfWeek = daysMap[serverTime.getDay()];
        const day = String(serverTime.getDate()).padStart(2, '0');
        const month = String(serverTime.getMonth() + 1).padStart(2, '0');
        const year = serverTime.getFullYear();
        const hours = String(serverTime.getHours()).padStart(2, '0');
        const minutes = String(serverTime.getMinutes()).padStart(2, '0');
        const seconds = String(serverTime.getSeconds()).padStart(2, '0');
        
        // Cập nhật nội dung của element
        dateTimeElement.textContent = `${dayOfWeek}, ${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;
    }

    // Cập nhật đồng hồ mỗi giây
    setInterval(() => {
        // Tăng thời gian lên 1 giây
        serverTime.setSeconds(serverTime.getSeconds() + 1);
        formatCurrentTime();
    }, 1000);

    // Hiển thị thời gian ngay lần đầu
    formatCurrentTime();
}
startLiveClock(); // Bắt đầu chạy đồng hồ

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
  '/static/img/background/jpg/1.JPG',
  '/static/img/background/jpg/2.JPG',
  '/static/img/background/jpg/3.JPG',
  '/static/img/background/jpg/4.JPG',
  '/static/img/background/jpg/5.JPG',
  '/static/img/background/jpg/6.JPG',
  '/static/img/background/jpg/7.JPG',
  '/static/img/background/jpg/8.JPG',
  '/static/img/background/jpg/9.JPG',
  '/static/img/background/jpg/10.JPG',
  '/static/img/background/jpg/11.JPG',
  '/static/img/background/jpg/12.JPG',
  '/static/img/background/jpg/13.JPG',
  '/static/img/background/jpg/14.JPG',
  '/static/img/background/jpg/15.JPG',
  '/static/img/background/jpg/16.JPG',
  '/static/img/background/jpg/17.JPG',
  '/static/img/background/jpg/18.JPG'
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
    const logoutButton = document.querySelector('.logout-link');
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
    // --- CHAT FUNCTIONS (with Infinite Scroll) ---
    // =================================================================

    let chatOffset = 0;
    const chatLimit = 30; // Number of messages to load each time
    let totalChatMessages = 0;
    let isLoadingMoreMessages = false;
    let allChatMessagesLoaded = false;

    // --- Renders messages (either prepending for old, or resetting for new) ---
    function renderChatMessages(messages, prepend = false) {
        if (!prepend) {
            chatMessages.innerHTML = ''; // Clear for initial load
        }
        
        if (messages.length === 0 && !prepend) {
            chatMessages.innerHTML = '<div class="chat-message-server">Chưa có tin nhắn nào.</div>';
            return;
        }

        const fragment = document.createDocumentFragment();

        messages.forEach(msg => {
            const msgContainer = document.createElement('div');
            msgContainer.classList.add('chat-message-container');

            const msgElement = document.createElement('div');
            msgElement.classList.add('chat-message');
            
            // Check if the message is from the current user
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
            fragment.appendChild(msgContainer);
        });

        if (prepend) {
            const oldScrollHeight = chatMessages.scrollHeight;
            const oldScrollTop = chatMessages.scrollTop;
            chatMessages.insertBefore(fragment, chatMessages.firstChild);
            // Restore scroll position to prevent jumping
            chatMessages.scrollTop = oldScrollTop + (chatMessages.scrollHeight - oldScrollHeight);
        } else {
            chatMessages.appendChild(fragment);
            // Auto-scroll to the bottom on initial load
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // --- Loads more messages when scrolling up ---
    async function loadMoreChatMessages() {
        if (isLoadingMoreMessages || allChatMessagesLoaded) {
            return;
        }

        isLoadingMoreMessages = true;

        try {
            const response = await fetch(`/api/chat/messages?limit=${chatLimit}&offset=${chatOffset}`);
            const data = await response.json();
            
            if (data.messages && data.messages.length > 0) {
                // Prepend older messages to the top
                renderChatMessages(data.messages, true);
                chatOffset += data.messages.length;
            } else {
                allChatMessagesLoaded = true; // No more messages to load
                console.log("All chat messages loaded.");
            }
        } catch (error) {
            console.error('Error loading more chat messages:', error);
        } finally {
            isLoadingMoreMessages = false;
        }
    }

    // --- Initial load of chat messages ---
    async function initialLoadChatMessages() {
        // Reset state
        chatOffset = 0;
        allChatMessagesLoaded = false;
        isLoadingMoreMessages = false;
        chatMessages.innerHTML = '<div class="chat-message-server">Đang tải tin nhắn...</div>';
        
        try {
            const response = await fetch(`/api/chat/messages?limit=${chatLimit}&offset=0`);
            const data = await response.json();

            renderChatMessages(data.messages || []);
            totalChatMessages = data.total;
            chatOffset = data.messages.length;

            if (chatOffset >= totalChatMessages) {
                allChatMessagesLoaded = true;
            }

        } catch (error) {
            console.error('Error loading initial chat messages:', error);
            chatMessages.innerHTML = '<div class="chat-message-server">Lỗi khi tải tin nhắn.</div>';
        }
    }
    
    // --- Polls for NEW messages, only re-renders if user is at the bottom ---
    async function pollForNewMessages() {
        // Only poll if the user is at the bottom of the chat
        const isAtBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 50;
        if (!isAtBottom) {
            return; // User is scrolling through history, don't interrupt
        }

        try {
            const response = await fetch(`/api/chat/messages?limit=${chatLimit}&offset=0`);
            const data = await response.json();
            
            // If the total has changed, re-render
            if (data.total !== totalChatMessages) {
                renderChatMessages(data.messages || []);
                totalChatMessages = data.total;
                chatOffset = data.messages.length;
            }
        } catch (error) {
            console.error('Error polling for new messages:', error);
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
                // After sending, immediately refresh the chat to show the new message
                await pollForNewMessages();
            } else {
                const errorData = await response.json();
                alert(`Lỗi: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Không thể gửi tin nhắn. Vui lòng thử lại.');
        }
    }
    
    // --- Event Listeners ---
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

    chatMessages.addEventListener('scroll', () => {
        if (chatMessages.scrollTop === 0) {
            loadMoreChatMessages();
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
                currentUser = data.user;
                updateUI(false, data.user);
                guestNameModal.modal('hide');
                if (pendingMessage) {
                    sendMessage(pendingMessage);
                    pendingMessage = '';
                }
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
                    attachmentLink.href = `/api/public/download/${file}`;
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
        const userDropdown = document.getElementById('user-dropdown');
        const avatarInitials = document.getElementById('avatar-initials');

        // Reset all controls first
        loginLink.style.display = 'none';
        adminPanelLink.style.display = 'none';
        userDropdown.style.display = 'none';
        addNewButton.style.display = 'none';
        chatInput.disabled = false;
        userStatusDiv.textContent = '';


        if (loggedIn) {
            userDropdown.style.display = 'inline-block';
            chatInput.placeholder = `Nhập tin nhắn...`;
            
            if (userStatusDiv) {
                userStatusDiv.textContent = `Xin chào, ${user.name}`;
            }

            if(avatarInitials && user.name) {
                const nameParts = user.name.split(' ');
                const initials = nameParts.length > 1 
                    ? nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
                    : nameParts[0].substring(0, 2);
                avatarInitials.textContent = initials.toUpperCase();
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
                    userStatusDiv.textContent = `Bạn là Khách`;
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
        initialLoadChatMessages();
        if (chatPollInterval) clearInterval(chatPollInterval);
        chatPollInterval = setInterval(pollForNewMessages, 5000); // Poll every 5 seconds
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