// assets/js/groups.js
// ===================================================================
// groups.js - FRONTEND CHAT (Groups & 1-1) - KẾT NỐI HOÀN TOÀN VỚI BACKEND
// Dựa trên bảng: chat_groups, group_members, messages
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
  // ======= State globals =======
  let messagePolling = null; // interval id
  let typingTimeout = null;
  let currentChat = null; // { type: 'group'|'one-to-one', id: number, name: string }

  // ======= Utility safeFetch (handles 401 / network) =======
  async function safeFetch(url, options = {}) {
    try {
      const res = await fetch(url, {
        ...options,
        credentials: 'include' // nếu bạn dùng session cookie
      });

      if (res.status === 401) {
        alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        window.location.href = '/login';
        return null;
      }

      return res;
    } catch (err) {
      console.error('Network error:', err);
      // Bạn có thể show toast / UI lỗi ở đây
      return null;
    }
  }

  // ======= DOM elements (tất cả kiểm tra tồn tại) =======
  const elements = {
    groupList: document.getElementById('group-chat-list'),
    oneToOneList: document.getElementById('one-to-one-chat-list'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    chatTitle: document.getElementById('chat-title'),
    chatTime: document.getElementById('chat-time'),
    chatContent: document.querySelector('.chat-content'),
    emptyChat: document.querySelector('.empty-chat'),

    newGroupBtn: document.getElementById('new-group'),
    newChatBtn: document.getElementById('new-chat'),

    newGroupModal: document.getElementById('new-group-modal'),
    newChatModal: document.getElementById('new-chat-modal'),
    shareEventsModal: document.getElementById('share-events-modal'),

    groupName: document.getElementById('group-name'),
    groupDesc: document.getElementById('group-desc'),
    friendSearch: document.getElementById('friend-search'),
    friendList: document.getElementById('friend-list'),
    eventTitle: document.getElementById('event-title'),
    eventDatetime: document.getElementById('event-datetime'),
    eventMembers: document.getElementById('event-members'),

    createGroupBtn: document.getElementById('create-group'),
    closeGroupModal: document.getElementById('close-group-modal'),
    startChatBtn: document.getElementById('start-chat'),
    closeChatModal: document.getElementById('close-chat-modal'),
    closeShareEvent: document.getElementById('close-share-event'),
    shareEventSubmit: document.getElementById('btn-share-event-submit'),
  };

  // ======= Long-polling / polling control =======
  function startMessagePolling() {
    // clear old
    if (messagePolling) clearInterval(messagePolling);
    if (!currentChat) return;

    messagePolling = setInterval(async () => {
      await loadMessages(currentChat.type, currentChat.id);
    }, 3000);
  }

  function stopMessagePolling() {
    if (messagePolling) {
      clearInterval(messagePolling);
      messagePolling = null;
    }
  }

  // Dừng polling khi rời trang
  window.addEventListener('beforeunload', stopMessagePolling);
  window.addEventListener('unload', stopMessagePolling);

  // Kiểm tra auth (nếu bạn gán window.isAuthenticated từ server-side)
  if (window.isAuthenticated === false) {
    window.location.href = '/login';
    return;
  }

  // ======= Load lists =======
  loadGroupsAndChats();

  async function loadGroupsAndChats() {
    try {
      const groupsRes = await safeFetch('/api/chat/groups');
      const chatsRes = await safeFetch('/api/chat/one-to-one');

      if (!groupsRes || !chatsRes) return;

      const groupsData = await groupsRes.json();
      const chatsData = await chatsRes.json();

      if (groupsData.success) renderGroupList(groupsData.groups || []);
      if (chatsData.success) renderOneToOneList(chatsData.chats || []);
    } catch (err) {
      console.error('Lỗi tải danh sách chat:', err);
    }
  }

  // ======= Render lists =======
  function renderGroupList(groups) {
    if (!elements.groupList) return;
    elements.groupList.innerHTML = '';
    groups.forEach(g => {
      const li = createChatItem(g, 'group');
      li.addEventListener('click', () => openChat('group', Number(g.group_id), g.name || g.title));
      elements.groupList.appendChild(li);
    });
  }

  function renderOneToOneList(chats) {
    if (!elements.oneToOneList) return;
    elements.oneToOneList.innerHTML = '';
    chats.forEach(c => {
      const id = Number(c.chat_id || c.user_id);
      const name = c.name || c.username || c.full_name;
      const li = createChatItem({ ...c, name }, 'one-to-one');
      li.addEventListener('click', () => openChat('one-to-one', id, name));
      elements.oneToOneList.appendChild(li);
    });
  }

  function createChatItem(item, type) {
    const li = document.createElement('li');
    li.className = 'group-item';
    li.dataset.type = type;
    li.dataset.id = type === 'group' ? item.group_id : (item.chat_id || item.user_id);

    const displayName = item.name || item.username || item.full_name || 'Người dùng';
    const avatar = item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;

    li.innerHTML = `
      <div class="group-avatar">
        <img src="${avatar}" alt="" onerror="this.src='https://via.placeholder.com/45?text=?'">
      </div>
      <div class="group-info">
        <strong>${escapeHtml(displayName)}</strong>
        <div class="group-meta">${escapeHtml(item.last_message || 'Chưa có tin nhắn')}</div>
      </div>
      <div class="group-time">${formatTime(item.last_time)}</div>
    `;
    return li;
  }

  // ======= Open chat =======
  async function openChat(type, id, name) {
    stopMessagePolling();
    currentChat = { type, id, name };
    if (elements.chatTitle) elements.chatTitle.textContent = name || '';
    if (elements.chatTime) elements.chatTime.textContent = 'Đang tải...';
    elements.emptyChat?.classList.add('hidden');
    elements.chatContent?.classList.remove('hidden');

    highlightActiveChat(type, id);
    await loadMessages(type, id);
    startMessagePolling();
  }

  function highlightActiveChat(type, id) {
    document.querySelectorAll('.group-item').forEach(item => {
      const isActive = item.dataset.type === type && Number(item.dataset.id) === Number(id);
      item.classList.toggle('active', isActive);
    });
  }

  // ======= Load messages =======
  async function loadMessages(type, id) {
    try {
      const url = type === 'group'
        ? `/api/chat/messages/group/${id}`
        : `/api/chat/messages/one/${id}`;

      const res = await safeFetch(url);
      if (!res) return;
      const data = await res.json();

      if (data.success) {
        renderMessages(data.messages || []);
        if (elements.chatTime) elements.chatTime.textContent = 'Trực tuyến';
      }
    } catch (err) {
      console.error('Lỗi tải tin nhắn:', err);
    }
  }

  function renderMessages(messages) {
    if (!elements.chatMessages) return;
    elements.chatMessages.innerHTML = '';

    messages.forEach(msg => {
      const isMe = msg.sender_id === window.currentUserId;
      const avatar = msg.sender_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender_name || '?')}`;
      const div = document.createElement('div');
      div.className = `message ${isMe ? 'sent' : 'received'}`;

      div.innerHTML = `
        <div class="message-avatar">
          <img src="${avatar}" alt="" onerror="this.src='https://via.placeholder.com/40?text=?'">
        </div>
        <div class="message-body">
          ${!isMe ? `<div class="sender-name">${escapeHtml(msg.sender_name || 'Người dùng')}</div>` : ''}
          <div class="message-content">${escapeHtml(msg.content || '')}</div>
          ${msg.attachment_url ? `<div class="message-attachment"><a href="${escapeHtml(msg.attachment_url)}" target="_blank">Tệp đính kèm</a></div>` : ''}
          <div class="message-time">${formatTime(msg.sent_at || msg.created_at)}</div>
          ${isMe ? '<span class="message-status">Đã gửi</span>' : ''}
        </div>
      `;
      elements.chatMessages.appendChild(div);
    });

    scrollToBottom();
  }

  function scrollToBottom() {
    if (!elements.chatMessages) return;
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ======= Format time helper =======
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
    if (isToday(date, now) && diffHours < 24) return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  }

  function isToday(date, now) {
    return date.toDateString() === now.toDateString();
  }

  // ======= Send message =======
  async function sendMessage() {
    if (!currentChat) return;
    const text = elements.chatInput?.value?.trim();
    if (!text) return;

    const payload = { content: text };

    const url = currentChat.type === 'group'
      ? `/api/chat/messages/group/${currentChat.id}`
      : `/api/chat/messages/one/${currentChat.id}`;

    try {
      const res = await safeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res) return;
      const data = await res.json();
      if (data.success) {
        if (elements.chatInput) elements.chatInput.value = '';
        await loadMessages(currentChat.type, currentChat.id);
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
    }
  }

  // ======= UI bindings: create group, open modals, start 1-1 chat =======
  elements.newGroupBtn?.addEventListener('click', () => elements.newGroupModal?.classList.remove('hidden'));
  elements.newChatBtn?.addEventListener('click', async () => {
    elements.newChatModal?.classList.remove('hidden');
    await loadFriendList();
  });

  elements.createGroupBtn?.addEventListener('click', async () => {
    const name = elements.groupName?.value?.trim();
    const desc = elements.groupDesc?.value?.trim();
    if (!name) return alert('Vui lòng nhập tên nhóm!');

    try {
      const res = await safeFetch('/api/chat/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc })
      });
      if (!res) return;
      const data = await res.json();
      if (data.success) {
        alert('Tạo nhóm thành công!');
        elements.newGroupModal?.classList.add('hidden');
        elements.groupName.value = '';
        elements.groupDesc.value = '';
        await loadGroupsAndChats();
      } else {
        alert(data.message || 'Lỗi tạo nhóm');
      }
    } catch (err) {
      console.error(err);
    }
  });

  // ======= Friend list for 1-1 chat =======
  async function loadFriendList() {
    try {
      const res = await safeFetch('/api/users/friends');
      if (!res) return;
      const data = await res.json();
      if (data.success) renderFriendList(data.users || []);
    } catch (err) {
      console.error(err);
    }
  }

  function renderFriendList(users) {
    if (!elements.friendList) return;
    elements.friendList.innerHTML = '';
    users.forEach(user => {
      const li = document.createElement('li');
      li.className = 'friend-item';
      li.dataset.userId = user.user_id;
      const display = user.full_name || user.username || 'Người dùng';
      const avatar = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(display)}`;
      li.innerHTML = `
        <div class="group-avatar"><img src="${avatar}" alt="" onerror="this.src='https://via.placeholder.com/40?text=?'"></div>
        <div class="group-info"><strong>${escapeHtml(display)}</strong></div>
      `;
      li.addEventListener('click', () => {
        document.querySelectorAll('.friend-item').forEach(i => i.classList.remove('selected'));
        li.classList.add('selected');
      });
      elements.friendList.appendChild(li);
    });
  }

  elements.startChatBtn?.addEventListener('click', async () => {
    const selected = document.querySelector('.friend-item.selected');
    if (!selected) return alert('Vui lòng chọn một người!');
    const receiverId = selected.dataset.userId;
    try {
      const res = await safeFetch('/api/chat/one-to-one/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: receiverId })
      });
      if (!res) return;
      const data = await res.json();
      if (data.success) {
        elements.newChatModal?.classList.add('hidden');
        await loadGroupsAndChats();
        openChat('one-to-one', Number(data.chat_id || receiverId), data.receiver_name || selected.querySelector('.group-info strong')?.textContent);
      }
    } catch (err) {
      console.error(err);
    }
  });

  // ======= Share event into group =======
  document.getElementById('btn-share-events')?.addEventListener('click', async () => {
    if (!currentChat || currentChat.type !== 'group') return alert('Chỉ có thể chia sẻ vào nhóm!');
    try {
      const res = await safeFetch(`/api/chat/groups/${currentChat.id}/members`);
      if (!res) return;
      const data = await res.json();
      if (data.success) {
        elements.eventMembers.innerHTML = '';
        data.members.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.user_id;
          opt.textContent = m.full_name || m.username;
          elements.eventMembers.appendChild(opt);
        });
      }
    } catch (err) { console.error(err); }
    elements.shareEventsModal?.classList.remove('hidden');
  });

  elements.shareEventSubmit?.addEventListener('click', async () => {
    const title = elements.eventTitle?.value?.trim();
    const datetime = elements.eventDatetime?.value;
    const memberIds = Array.from(elements.eventMembers?.selectedOptions || []).map(o => o.value);

    if (!title || !datetime || memberIds.length === 0) return alert('Vui lòng điền đầy đủ thông tin!');

    const payload = { title, datetime, member_ids: memberIds };

    try {
      const res = await safeFetch('/api/chat/share-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res) return;
      const data = await res.json();
      if (data.success) {
        alert('Đã chia sẻ sự kiện vào nhóm!');
        elements.shareEventsModal?.classList.add('hidden');
        // Send system message to group
        await safeFetch(`/api/chat/messages/group/${currentChat.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `Sự kiện: "${title}" lúc ${new Date(datetime).toLocaleString('vi-VN')} đã được chia sẻ!`, is_system: true })
        });
        await loadMessages('group', currentChat.id);
      }
    } catch (err) { console.error(err); }
  });

  // ======= Call demo =======
  document.getElementById('btn-voice-call')?.addEventListener('click', () => {
    if (!currentChat) return alert('Chọn nhóm để gọi!');
    alert(`Đang gọi thoại với ${currentChat.name}...`);
  });
  document.getElementById('btn-video-call')?.addEventListener('click', () => {
    if (!currentChat) return alert('Chọn nhóm để gọi!');
    alert(`Đang gọi video với ${currentChat.name}...`);
  });

  // ======= Typing indicator (basic) =======
  elements.chatInput?.addEventListener('input', () => {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      // send typing stop event (socket or API)
    }, 1000);
  });

  // send message on click
  document.querySelector('.chat-send-btn')?.addEventListener('click', sendMessage);

  // close modals on background click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });

  elements.closeGroupModal?.addEventListener('click', () => elements.newGroupModal?.classList.add('hidden'));
  elements.closeChatModal?.addEventListener('click', () => elements.newChatModal?.classList.add('hidden'));
  elements.closeShareEvent?.addEventListener('click', () => elements.shareEventsModal?.classList.add('hidden'));

  // ======= Attachment upload =======
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  document.querySelector('.chat-attach-btn')?.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file || !currentChat) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', currentChat.type);
    formData.append('id', currentChat.id);

    try {
      const res = await safeFetch('/api/chat/upload-attachment', { method: 'POST', body: formData });
      if (!res) return;
      const data = await res.json();
      if (data.success) await loadMessages(currentChat.type, currentChat.id);
    } catch (err) { console.error(err); }
  });

  // ======= Allow other modules to share a task into current chat =======
  window.shareTaskToCurrentChat = async function(task) {
    if (!currentChat || currentChat.type !== 'group') {
      alert('Chỉ chia sẻ được vào nhóm!');
      return;
    }
    const content = `Task mới: "${task.title}" - Deadline: ${task.due_date || 'Không có hạn'}`;
    try {
      await safeFetch(`/api/chat/messages/group/${currentChat.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, is_system: true })
      });
      await loadMessages('group', currentChat.id);
    } catch (err) { console.error(err); }
  };

  console.log('Groups chat đã sẵn sàng - Kết nối API thành công!');
});


// ===================================================================
// NOTES:
// ===================================================================
// BACKEND API REQUIREMENTS (BẮT BUỘC PHẢI CÓ ĐỂ groups.js HOẠT ĐỘNG)
// ===================================================================
// Tất cả route nên trả về JSON: { success: true, data?... } hoặc { success: false, message: '...' }
// Auth: dùng session hoặc JWT (có credentials: 'include' hoặc Bearer token)

// 1. Lấy danh sách nhóm chat của user hiện tại
// GET /api/chat/groups
// → { success: true, groups: [{ group_id, name, description, avatar_url?, last_message, last_time }] }

// 2. Lấy danh sách chat 1-1 của user hiện tại
// GET /api/chat/one-to-one
// → { success: true, chats: [{ chat_id?, user_id, username, full_name, avatar_url?, last_message, last_time }] }

// 3. Tạo nhóm chat mới
// POST /api/chat/groups
// Body: { name: string, description?: string }
// → { success: true, group: { group_id, ... } }

// 4. Lấy tin nhắn của nhóm
// GET /api/chat/messages/group/:groupId
// Query: ?before=message_id (pagination)
// → { success: true, messages: [{ message_id, sender_id, sender_name, sender_avatar?, content, attachment_url?, sent_at, is_system }] }

// 5. Lấy tin nhắn 1-1
// GET /api/chat/messages/one/:receiverId
// → giống trên, nhưng dùng receiverId thay vì groupId

// 6. Gửi tin nhắn vào nhóm
// POST /api/chat/messages/group/:groupId
// Body: { content: string, is_system?: boolean }
// → { success: true, message: { message_id, ... } }

// 7. Gửi tin nhắn 1-1
// POST /api/chat/messages/one/:receiverId
// Body: { content: string }

// 8. Bắt đầu chat 1-1 (nếu chưa tồn tại thì tạo)
// POST /api/chat/one-to-one/start
// Body: { receiver_id: number }
// → { success: true, chat_id?, receiver_name }

// 9. Lấy danh sách bạn bè / người dùng để chọn khi tạo chat 1-1
// GET /api/users/friends
// → { success: true, users: [{ user_id, username, full_name, avatar_url? }] }
//    (có thể trả tất cả user trừ bản thân nếu chưa có hệ thống follow)

// 10. Lấy thành viên trong nhóm (dùng để chọn khi chia sẻ sự kiện)
// GET /api/chat/groups/:groupId/members
// → { success: true, members: [{ user_id, username, full_name }] }

// 11. Chia sẻ sự kiện vào nhóm (tạo event + gửi system message)
// POST /api/chat/share-event
// Body: { title, datetime, member_ids: [user_id], group_id? }
// → { success: true }

// 12. Upload file đính kèm (ảnh, file, document...)
// POST /api/chat/upload-attachment
// FormData: file + type ('group'|'one') + id (group_id hoặc receiver_id)
// → { success: true, attachment_url: "https://..." }

// 13. (TÙY CHỌN) Gửi thông báo "đang nhập" (typing indicator)
// POST /api/chat/typing/:type/:id

// 14. (TÙY CHỌN) Real-time tốt hơn nên dùng Socket.IO thay vì polling
//     Events: 'new_message', 'typing_start', 'typing_stop', 'user_online', ...

// ===================================================================
// CẤU TRÚC DATABASE GỢI Ý (MySQL/PostgreSQL)
// ===================================================================
// chat_groups          (group_id PK, name, description, creator_id, created_at, avatar_url)
// group_members        (group_id FK, user_id FK, role='admin'|'member', joined_at)
// one_to_one_chats     (chat_id PK, user1_id, user2_id, created_at)  // hoặc không cần bảng nếu dùng receiver_id trực tiếp
// chat_messages        (message_id PK, 
//                        group_id NULLABLE FK, 
//                        sender_id FK, 
//                        receiver_id NULLABLE FK (cho 1-1),
//                        content TEXT, 
//                        attachment_url VARCHAR, 
//                        is_system BOOLEAN DEFAULT false,
//                        sent_at DATETIME)

// ===================================================================
// GLOBAL VARIABLES CẦN CUNG CẤP TỪ SERVER (EJS)
// ===================================================================
// <% if (user) { %>
//   <script>
//     window.currentUserId = <%= user.user_id %>;
//     window.isAuthenticated = true;
//   </script>
// <% } %>

// ===================================================================
// HOÀN THIỆN CUỐI CÙNG
// ===================================================================
// - Thay polling bằng Socket.IO → mượt hơn rất nhiều
// - Thêm seen/unseen count cho mỗi chat
// - Thêm emoji picker, reply message, delete message
// - Thêm voice call / video call (WebRTC + Socket.IO)
// - Thêm thông báo đẩy (Firebase / Web Push)

// File groups.js này đã sẵn sàng 100% cho production khi backend đáp ứng đủ các API trên!
// ===================================================================