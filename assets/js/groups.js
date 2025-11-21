document.addEventListener('DOMContentLoaded', () => {
  // ===== Nhúng header.html =====
  fetch('header.html')
    .then(res => res.text())
    .then(html => {
      document.getElementById('header-placeholder').innerHTML = html;
      setupHeaderToggle();
    })
    .catch(err => console.error('Lỗi tải header:', err));

  function setupHeaderToggle() {
    const menuToggle = document.getElementById('menu-toggle');
    const header = document.querySelector('header');
    if (menuToggle && header) {
      menuToggle.addEventListener('click', () => {
        header.classList.toggle('collapsed');
        menuToggle.style.transform = header.classList.contains('collapsed') ? 'rotate(180deg)' : 'rotate(0deg)';
      });
    }
  }

  // ===== DỮ LIỆU GIẢ (có thể mở rộng) =====
  let groups = [
    { id: 1, type: 'group', name: 'Team Alpha', desc: 'Dự án A', avatar: '../img/avt 1.jpg', time: '10:11 PM' },
    { id: 2, type: 'group', name: 'Team Beta', desc: 'Dự án B', avatar: '../img/avt 2.jpg', time: '9:45 AM' }
  ];

  let oneToOneChats = [
    { id: 3, type: 'one-to-one', name: 'John Doe', avatar: '../img/avt 3.jpg', time: 'Hôm qua' },
    { id: 4, type: 'one-to-one', name: 'Jane Smith', avatar: '../img/avt 4.jpg', time: '2 giờ trước' }
  ];

  const potentialFriends = [
    { id: 5, name: 'Mike Johnson', avatar: '../img/avt 5.jpg' },
    { id: 6, name: 'Sarah Lee', avatar: '../img/avt 6.jpg' }
  ];

  // ===== BIẾN TOÀN CỤC =====
  let currentChatId = null;
  let selectedFriendId = null;

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
    groupName: document.getElementById('group-name'),
    groupDesc: document.getElementById('group-desc'),
    friendSearch: document.getElementById('friend-search'),
    friendList: document.getElementById('friend-list'),
    createGroupBtn: document.getElementById('create-group'),
    closeGroupModal: document.getElementById('close-group-modal'),
    startChatBtn: document.getElementById('start-chat'),
    closeChatModal: document.getElementById('close-chat-modal'),
    chatSendBtn: null,
    chatAttachBtn: document.querySelector('.chat-attach-btn'),
    chatFile: document.getElementById('chat-file')
  };

  // ===== LƯU TIN NHẮN =====
  let messages = JSON.parse(localStorage.getItem('starconnect_messages')) || {};
  const saveMessages = () => localStorage.setItem('starconnect_messages', JSON.stringify(messages));

  // ===== HIỂN THỊ DANH SÁCH =====
  function renderChatList() {
    renderList(groups, elements.groupList);
    renderList(oneToOneChats, elements.oneToOneList);
  }

  function renderList(chats, container) {
    container.innerHTML = '';
    chats.forEach(chat => {
      const li = document.createElement('li');
      li.className = 'group-item';
      li.dataset.id = chat.id;
      li.innerHTML = `
        <div class="group-avatar"><img src="${chat.avatar}" alt="${chat.name}" onerror="this.src='https://via.placeholder.com/45?text=${chat.name[0]}'"></div>
        <div class="group-info">
          <strong>${chat.name}</strong>
          <div class="group-meta">${chat.desc || 'Tin nhắn gần nhất'}</div>
        </div>
        <div class="group-time">${chat.time}</div>
      `;
      li.addEventListener('click', () => openChat(chat));
      container.appendChild(li);
    });
  }

  // ===== MỞ CHAT =====
  function openChat(chat) {
    currentChatId = chat.id;
    elements.chatTitle.textContent = chat.name;
    elements.chatTime.textContent = 'Trực tuyến gần đây';
    elements.emptyChat.classList.add('hidden');
    elements.chatContent.classList.remove('hidden');
    renderMessages();
    highlightActiveChat(chat.id);
  }

  function highlightActiveChat(id) {
    document.querySelectorAll('.group-item').forEach(item => {
      item.classList.toggle('active', parseInt(item.dataset.id) === id);
    });
  }

  // ===== HIỂN THỊ TIN NHẮN =====
  function renderMessages() {
    if (!currentChatId) return;
    elements.chatMessages.innerHTML = '';
    const chatMsgs = messages[currentChatId] || [];

    chatMsgs.forEach(msg => {
      const div = document.createElement('div');
      div.className = `message ${msg.sender === 'me' ? 'sent' : 'received'}`;
      div.innerHTML = `
        <div class="message-avatar">
          <img src="${msg.sender === 'me' ? '../img/avt 5.jpg' : '../img/avt 1.jpg'}" alt="">
        </div>
        <div class="message-body">
          <div class="message-content">${escapeHtml(msg.text)}</div>
          <div class="message-time">${formatTime(msg.time)}</div>
          ${msg.sender === 'me' ? '<span class="message-status">✓✓</span>' : ''}
        </div>
      `;
      elements.chatMessages.appendChild(div);
    });
    scrollToBottom();
  }

  function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatTime(date) {
    return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  // ===== GỬI TIN NHẮN =====
  function sendMessage() {
    const text = elements.chatInput.value.trim();
    if (!currentChatId || !text) return;

    const newMsg = { id: Date.now(), text, time: new Date(), sender: 'me' };
    messages[currentChatId] = messages[currentChatId] || [];
    messages[currentChatId].push(newMsg);
    saveMessages();
    elements.chatInput.value = '';
    renderMessages();

    // Phản hồi giả lập
    setTimeout(() => {
      const reply = { id: Date.now() + 1, text: `Đã nhận: "${text}"`, time: new Date(), sender: 'other' };
      messages[currentChatId].push(reply);
      saveMessages();
      renderMessages();
    }, 1000 + Math.random() * 1000);
  }

  // ===== TẠO NHÓM MỚI =====
  function createGroup() {
    const name = elements.groupName.value.trim();
    const desc = elements.groupDesc.value.trim();
    if (!name) return alert('Vui lòng nhập tên nhóm!');

    const newGroup = {
      id: Date.now(),
      type: 'group',
      name,
      desc: desc || 'Nhóm mới',
      avatar: `https://via.placeholder.com/45?text=${name[0]}`,
      time: 'Vừa xong'
    };

    groups.push(newGroup);
    messages[newGroup.id] = [];
    saveMessages();
    renderChatList();
    elements.newGroupModal.classList.add('hidden');
    elements.groupName.value = '';
    elements.groupDesc.value = '';
  }

  // ===== BẮT ĐẦU CHAT 1-1 =====
  function startOneToOne() {
    if (!selectedFriendId) return alert('Vui lòng chọn một người bạn!');

    const friend = potentialFriends.find(f => f.id === selectedFriendId);
    const existing = oneToOneChats.find(c => c.name === friend.name);
    if (existing) {
      openChat(existing);
    } else {
      const newChat = {
        id: Date.now(),
        type: 'one-to-one',
        name: friend.name,
        avatar: friend.avatar,
        time: 'Vừa xong'
      };
      oneToOneChats.push(newChat);
      messages[newChat.id] = [];
      saveMessages();
      renderChatList();
      openChat(newChat);
    }
    elements.newChatModal.classList.add('hidden');
    selectedFriendId = null;
  }

  // ===== TÌM KIẾM BẠN BÈ =====
  function filterFriends() {
    const query = elements.friendSearch.value.toLowerCase();
    elements.friendList.innerHTML = '';
    const filtered = potentialFriends.filter(f => f.name.toLowerCase().includes(query));

    filtered.forEach(friend => {
      const li = document.createElement('li');
      li.className = 'group-item friend-item';
      li.innerHTML = `
        <div class="group-avatar"><img src="${friend.avatar}" alt=""></div>
        <div class="group-info"><strong>${friend.name}</strong></div>
      `;
      li.addEventListener('click', () => {
        document.querySelectorAll('.friend-item').forEach(i => i.classList.remove('selected'));
        li.classList.add('selected');
        selectedFriendId = friend.id;
      });
      elements.friendList.appendChild(li);
    });
  }

  // ===== GẮN SỰ KIỆN =====
  function attachEvents() {
    // Gửi tin nhắn
    elements.chatSendBtn = document.querySelector('.chat-send-btn');
    if (elements.chatSendBtn) {
      elements.chatSendBtn.addEventListener('click', sendMessage);
    }
    elements.chatInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') sendMessage();
    });

    // Đính kèm file
    elements.chatAttachBtn?.addEventListener('click', () => elements.chatFile.click());
    elements.chatFile.addEventListener('change', () => {
      if (elements.chatFile.files[0]) {
        alert(`Đã chọn file: ${elements.chatFile.files[0].name}`);
      }
    });

    // Modal nhóm
    elements.newGroupBtn?.addEventListener('click', () => {
      elements.newGroupModal.classList.remove('hidden');
    });
    elements.closeGroupModal?.addEventListener('click', () => {
      elements.newGroupModal.classList.add('hidden');
    });
    elements.createGroupBtn?.addEventListener('click', createGroup);

    // Modal chat 1-1
    elements.newChatBtn?.addEventListener('click', () => {
      elements.newChatModal.classList.remove('hidden');
      filterFriends();
    });
    elements.closeChatModal?.addEventListener('click', () => {
      elements.newChatModal.classList.add('hidden');
    });
    elements.startChatBtn?.addEventListener('click', startOneToOne);
    elements.friendSearch?.addEventListener('input', filterFriends);

    // Click ngoài modal để đóng
    document.addEventListener('click', e => {
      if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
      }
    });
  }

  // ===== KHỞI TẠO =====
  renderChatList();
  setTimeout(attachEvents, 300);
  setInterval(() => {
    if (currentChatId) elements.chatTime.textContent = 'Đang hoạt động';
  }, 5000);
});