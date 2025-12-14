// assets/js/messages.js
// Frontend cho hệ thống messaging với Socket.IO

document.addEventListener('DOMContentLoaded', () => {
  // ===== Elements =====
  const searchInput = document.getElementById('search-users');
  const clearSearchBtn = document.getElementById('clear-search');
  const searchResults = document.getElementById('search-results');
  const conversationsList = document.getElementById('conversations-list');
  const chatEmptyState = document.querySelector('.chat-empty-state');
  const chatContent = document.querySelector('.chat-content');
  const chatAvatar = document.getElementById('chat-avatar');
  const chatName = document.getElementById('chat-name');
  const chatMessages = document.getElementById('chat-messages');
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const attachBtn = document.getElementById('attach-btn');
  const fileInput = document.getElementById('file-input');
  const loadingOverlay = document.getElementById('loading-overlay');

  // ===== State =====
  let currentChatUser = null;
  let searchTimeout = null;
  let lastMessageId = null; // Track tin nhắn mới nhất (ID lớn nhất)

  // ===== SOCKET.IO SETUP =====
  let socket = null;
  
  // Initialize Socket.IO connection
  function initSocket() {
    if (socket && socket.connected) return; // Tránh duplicate connection
    
    socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      // Join user's personal room
      if (window.currentUserId) {
        socket.emit('user:join', window.currentUserId);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });
    
    // Listen for new messages
    socket.on('message:new', (data) => {
      console.log('🔔 Received new message:', data);
      handleNewMessage(data);
    });
    
    socket.on('user:online', (data) => {
      console.log('👤 User online:', data.userId);
      // TODO: Update UI to show online status
    });
    
    socket.on('user:offline', (data) => {
      console.log('👤 User offline:', data.userId);
      // TODO: Update UI to show offline status
    });
  }
  
  // Handle incoming real-time message
  function handleNewMessage(data) {
    const { message, senderId } = data;
    
    // Nếu đang chat với người gửi, hiển thị tin nhắn ngay
    if (currentChatUser && senderId === currentChatUser.other_user_id) {
      appendMessage(message);
      // Mark as read
      fetch(`/api/messages/read/${senderId}`, { method: 'PUT' }).catch(err => 
        console.error('Mark read error:', err)
      );
    }
    
    // Reload conversations để cập nhật preview và unread count
    loadConversations();
  }

// ===== EMOJI PICKER SIÊU XỊN – KHÔNG BỊ TẮT KHI CHUYỂN TAB (ĐÃ SỬA 100%) =====
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');

let pickerVisible = false;

// Mở/đóng picker khi nhấn nút cười
emojiBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // Ngăn click lan ra document
  pickerVisible = !pickerVisible;
  emojiPicker.classList.toggle('hidden', !pickerVisible);
});

// Click ra ngoài picker → mới tắt (KHÔNG tắt khi click bên trong picker)
document.addEventListener('click', (e) => {
  if (pickerVisible && !emojiPicker.contains(e.target) && e.target !== emojiBtn) {
    emojiPicker.classList.add('hidden');
    pickerVisible = false;
  }
});

// Khi chọn emoji → chèn vào ô nhập + giữ focus
emojiPicker.addEventListener('emoji-click', (event) => {
  event.stopPropagation(); // Quan trọng: ngăn tắt picker khi chọn emoji
  messageInput.value += event.detail.unicode;
  messageInput.focus();
  messageInput.dispatchEvent(new Event('input')); // Kích hoạt hiệu ứng nút gửi

  // Không đóng picker ngay, để người dùng chọn tiếp nếu muốn
  // Nếu bạn muốn đóng ngay → bỏ comment dòng dưới
  // emojiPicker.classList.add('hidden');
  // pickerVisible = false;
});

// (Tùy chọn) Click vào tab, nút tìm kiếm trong picker → không tắt
emojiPicker.addEventListener('click', (e) => {
  e.stopPropagation(); // Rất quan trọng: giữ picker mở khi thao tác bên trong
});

  // ===== Initialize =====
  console.log('💬 Messages JS loaded!');
  console.log('📋 Elements check:', {
    searchInput: !!searchInput,
    searchResults: !!searchResults,
    conversationsList: !!conversationsList
  });
  
  // Initialize Socket.IO first
  initSocket();
  
  loadConversations();

  // ===== Event Listeners =====
  searchInput.addEventListener('input', handleSearch);
  clearSearchBtn.addEventListener('click', clearSearch);
  sendBtn.addEventListener('click', sendMessage);
  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileUpload);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

    // Auto-resize textarea + Hiệu ứng nút gửi sáng lên (ĐÃ SỬA LỖI 100%)
  messageInput.addEventListener('input', () => {
    // Auto-resize
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';

    // Hiệu ứng nút gửi
    const hasText = messageInput.value.trim().length > 0;
    if (hasText) {
      sendBtn.style.background = '#6366f1';
      sendBtn.style.transform = 'scale(1.05)';
      sendBtn.style.boxShadow = '0 6px 20px rgba(99,102,241,0.45)';
      sendBtn.style.opacity = '1';
      sendBtn.disabled = false;
    } else {
      sendBtn.style.background = '#cbd5e1';
      sendBtn.style.transform = 'scale(1)';
      sendBtn.style.boxShadow = 'none';
      sendBtn.style.opacity = '0.6';
    }
  });

  // Kiểm tra lần đầu khi load trang (nếu có nội dung cũ)
  if (messageInput.value.trim()) {
    sendBtn.style.background = '#6366f1';
    sendBtn.style.transform = 'scale(1.05)';
    sendBtn.style.boxShadow = '0 6px 20px rgba(99,102,241,0.45)';
  }

  // ===== Search Users =====
  function handleSearch(e) {
    const query = e.target.value.trim();
    console.log('🔍 Search triggered:', query);
    
    if (query.length === 0) {
      searchResults.classList.add('hidden');
      clearSearchBtn.classList.add('hidden');
      return;
    }
    
    clearSearchBtn.classList.remove('hidden');
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(async () => {
      try {
        console.log('📡 Fetching search results...');
        showLoading();
        const res = await fetch(`/api/messages/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        console.log('✅ Search results:', data);
        
        if (data.success) {
          renderSearchResults(data.users);
        }
      } catch (error) {
        console.error('❌ Search error:', error);
      } finally {
        hideLoading();
      }
    }, 300);
  }

  function clearSearch() {
    searchInput.value = '';
    searchResults.classList.add('hidden');
    clearSearchBtn.classList.add('hidden');
  }

  function renderSearchResults(users) {
    if (users.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results">Không tìm thấy người dùng nào</div>';
      searchResults.classList.remove('hidden');
      return;
    }
    
    searchResults.innerHTML = users.map(user => `
      <div class="search-result-item" data-user-id="${user.user_id}">
        <img class="search-result-avatar" 
             src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random`}" 
             alt="${escapeHtml(user.full_name)}">
        <div class="search-result-info">
          <div class="search-result-name">${escapeHtml(user.full_name)}</div>
          <div class="search-result-email">${escapeHtml(user.email)}</div>
        </div>
      </div>
    `).join('');
    
    searchResults.classList.remove('hidden');
    
    // Add click handlers
    searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const userId = parseInt(item.dataset.userId);
        const userName = item.querySelector('.search-result-name').textContent;
        const userAvatar = item.querySelector('.search-result-avatar').src;
        openChat({ other_user_id: userId, other_user_name: userName, other_avatar: userAvatar });
        clearSearch();
      });
    });
  }

  // ===== Load Conversations =====
  async function loadConversations() {
    try {
      const res = await fetch('/api/messages/conversations');
      const data = await res.json();
      
      if (data.success) {
        renderConversations(data.conversations);
      }
    } catch (error) {
      console.error('Load conversations error:', error);
    }
  }

  function renderConversations(conversations) {
    if (conversations.length === 0) {
      conversationsList.innerHTML = `
        <li class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>Chưa có cuộc trò chuyện nào</p>
          <small>Tìm kiếm người dùng để bắt đầu chat</small>
        </li>
      `;
      return;
    }
    
    conversationsList.innerHTML = conversations.map(conv => `
      <li class="conversation-item ${conv.unread_count > 0 ? 'unread' : ''}" 
          data-user-id="${conv.other_user_id}">
        <img class="conversation-avatar" 
             src="${conv.other_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other_user_name)}`}" 
             alt="${escapeHtml(conv.other_user_name)}">
        <div class="conversation-info">
          <div class="conversation-header">
            <div class="conversation-name">${escapeHtml(conv.other_user_name)}</div>
            <div class="conversation-time">${formatTime(conv.last_message_at)}</div>
          </div>
          <div class="conversation-preview">
            <div class="conversation-last-message">
              ${conv.last_sender_id === window.currentUserId ? 'Bạn: ' : ''}
              ${conv.last_message_type === 'text' ? escapeHtml(conv.last_message || '') : getMessageTypeLabel(conv.last_message_type)}
            </div>
            ${conv.unread_count > 0 ? `<div class="conversation-unread-count">${conv.unread_count}</div>` : ''}
          </div>
        </div>
      </li>
    `).join('');
    
    // Add click handlers
    conversationsList.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const userId = parseInt(item.dataset.userId);
        const userName = item.querySelector('.conversation-name').textContent;
        const userAvatar = item.querySelector('.conversation-avatar').src;
        openChat({ other_user_id: userId, other_user_name: userName, other_avatar: userAvatar });
      });
    });
  }

  // ===== Open Chat =====
  async function openChat(user) {
    currentChatUser = user;
    lastMessageId = null; // Reset khi đổi chat
    
    // Update UI
    chatEmptyState.style.display = 'none';
    chatContent.classList.remove('hidden');
    chatAvatar.src = user.other_avatar;
    chatName.textContent = user.other_user_name;
    
    // Highlight active conversation
    conversationsList.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.toggle('active', parseInt(item.dataset.userId) === user.other_user_id);
    });
    
    // Load messages
    await loadMessages();

    // Mark as read
    await fetch(`/api/messages/read/${user.other_user_id}`, { method: 'PUT' });
  }

  // ===== Load Messages =====
  async function loadMessages(scrollToEnd = true) {
    if (!currentChatUser) return;
    
    try {
      const res = await fetch(`/api/messages/${currentChatUser.other_user_id}`);
      const data = await res.json();
      
      if (data.success) {
        renderMessages(data.messages, scrollToEnd);
        // Lưu ID tin nhắn mới nhất (tin nhắn cuối cùng vì sorted ASC)
        if (data.messages.length > 0) {
          lastMessageId = data.messages[data.messages.length - 1].message_id;
        }
        // Mark as read sau khi load
        await fetch(`/api/messages/read/${currentChatUser.other_user_id}`, { method: 'PUT' });
      }
    } catch (error) {
      console.error('Load messages error:', error);
    }
  }

  // ===== Render Messages =====
  function renderMessages(messages, scrollToEnd = true) {
    // Kiểm tra nếu có tin nhắn mới (so sánh ID cuối cùng)
    const hasNewMessages = messages.length > 0 && (!lastMessageId || messages[messages.length - 1].message_id > lastMessageId);
    
    // Luôn render lại để đảm bảo hiển thị tin nhắn mới
    chatMessages.innerHTML = messages.map(msg => {
      const isMe = msg.sender_id === window.currentUserId;
      const messageClass = isMe ? 'sent' : 'received';
      
      let content = '';
      if (msg.message_type === 'text') {
        content = `<div class="message-bubble">${escapeHtml(msg.message_content)}</div>`;
      } else if (msg.message_type === 'image') {
        content = `
          <div class="message-attachment">
            <img src="${msg.attachment_url}" alt="${escapeHtml(msg.file_name || '')}">
          </div>
          ${msg.message_content !== msg.file_name ? `<div class="message-bubble">${escapeHtml(msg.message_content)}</div>` : ''}
        `;
      } else {
        content = `
          <div class="message-file" onclick="window.open('${msg.attachment_url}', '_blank')">
            <div class="message-file-icon">
              <i class="fas fa-file"></i>
            </div>
            <div class="message-file-info">
              <div class="message-file-name">${escapeHtml(msg.file_name || 'File')}</div>
              <div class="message-file-size">${formatFileSize(msg.file_size)}</div>
            </div>
          </div>
        `;
      }
      
      return `
        <div class="message ${messageClass}">
          <img class="message-avatar" 
               src="${msg.sender_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender_name)}`}" 
               alt="${escapeHtml(msg.sender_name)}">
          <div class="message-content">
            ${content}
            <div class="message-time">${formatTime(msg.sent_at)}</div>
          </div>
        </div>
      `;
    }).join('');
    
    if (scrollToEnd || hasNewMessages) {
      scrollToBottom();
    }
  }

  // ===== Send Message =====
  async function sendMessage() {
    if (!currentChatUser) return;
    
    const content = messageInput.value.trim();
    if (content.length === 0) return;
    
    // Optimistic update: Append tin nhắn tạm thời
    const tempId = Date.now();
    const tempMessage = {
      message_id: tempId,
      sender_id: window.currentUserId,
      sender_name: window.currentUser.name,
      sender_avatar: window.currentUser.avatar,
      message_type: 'text',
      message_content: content,
      sent_at: new Date().toISOString()
    };
    appendMessage(tempMessage);

    messageInput.value = '';
    messageInput.style.height = 'auto';
    scrollToBottom();
    
    try {
      const res = await fetch(`/api/messages/${currentChatUser.other_user_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Replace temp message với real message từ server
        removeTempMessage(tempId);
        appendMessage(data.message);
        await loadConversations();
      } else {
        // Xóa temp nếu lỗi
        removeTempMessage(tempId);
      }
    } catch (error) {
      console.error('Send message error:', error);
      removeTempMessage(tempId);
      alert('Lỗi gửi tin nhắn');
    }
  }

  // ===== Upload File =====
  async function handleFileUpload(e) {
    if (!currentChatUser) return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    // Optimistic update: Append file tạm thời
    const tempId = Date.now();
    const tempMessage = {
      message_id: tempId,
      sender_id: window.currentUserId,
      sender_name: window.currentUser.name,
      sender_avatar: window.currentUser.avatar,
      message_type: file.type.startsWith('image/') ? 'image' : 'file',
      attachment_url: URL.createObjectURL(file),
      file_name: file.name,
      file_size: file.size,
      message_content: file.name,
      sent_at: new Date().toISOString()
    };
    appendMessage(tempMessage);
    scrollToBottom();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caption', '');
    
    try {
      showLoading();
      const res = await fetch(`/api/messages/upload/${currentChatUser.other_user_id}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      
      if (data.success) {
        removeTempMessage(tempId);
        appendMessage(data.message);
        await loadConversations();
      } else {
        removeTempMessage(tempId);
        alert('Lỗi upload file: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      removeTempMessage(tempId);
      console.error('Upload file error:', error);
      alert('Lỗi upload file');
    } finally {
      hideLoading();
      fileInput.value = '';
    }
  }

  // ===== Helper: Append single message to chat =====
  function appendMessage(msg) {
    const isMe = msg.sender_id === window.currentUserId;
    const messageClass = isMe ? 'sent' : 'received';
    
    let content = '';
    if (msg.message_type === 'text') {
      content = `<div class="message-bubble">${escapeHtml(msg.message_content)}</div>`;
    } else if (msg.message_type === 'image') {
      content = `
        <div class="message-attachment">
          <img src="${msg.attachment_url}" alt="${escapeHtml(msg.file_name || '')}">
        </div>
        ${msg.message_content !== msg.file_name ? `<div class="message-bubble">${escapeHtml(msg.message_content)}</div>` : ''}
      `;
    } else {
      content = `
        <div class="message-file" onclick="window.open('${msg.attachment_url}', '_blank')">
          <div class="message-file-icon">
            <i class="fas fa-file"></i>
          </div>
          <div class="message-file-info">
            <div class="message-file-name">${escapeHtml(msg.file_name || 'File')}</div>
            <div class="message-file-size">${formatFileSize(msg.file_size)}</div>
          </div>
        </div>
      `;
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${messageClass}`;
    messageElement.dataset.messageId = msg.message_id;
    messageElement.innerHTML = `
      <img class="message-avatar" 
           src="${msg.sender_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender_name)}`}" 
           alt="${escapeHtml(msg.sender_name)}">
      <div class="message-content">
        ${content}
        <div class="message-time">${formatTime(msg.sent_at)}</div>
      </div>
    `;
    
    chatMessages.appendChild(messageElement);
    scrollToBottom();
    
    // Update lastMessageId
    if (!lastMessageId || msg.message_id > lastMessageId) {
      lastMessageId = msg.message_id;
    }
  }

  // ===== Helper: Remove temp message =====
  function removeTempMessage(tempId) {
    const tempElement = chatMessages.querySelector(`[data-message-id="${tempId}"]`);
    if (tempElement) tempElement.remove();
  }

  // ===== Helpers =====
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showLoading() {
    loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    loadingOverlay.classList.add('hidden');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins}p`;
    if (diffHours < 24 && date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  }

  function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getMessageTypeLabel(type) {
    const labels = {
      image: '📷 Hình ảnh',
      video: '🎥 Video',
      file: '📄 File'
    };
    return labels[type] || '';
  }

  console.log('💬 Messages system loaded!');
});
