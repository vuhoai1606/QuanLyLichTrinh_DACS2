document.addEventListener('DOMContentLoaded', () => {
  // ========== Load header ==========
  fetch('header.html')
    .then(res => res.text())
    .then(html => {
      document.getElementById('header-placeholder').innerHTML = html;
      const menuToggle = document.getElementById('menu-toggle');
      const header = document.querySelector('header');
      if (menuToggle && header) {
        menuToggle.addEventListener('click', () => {
          header.classList.toggle('collapsed');
          menuToggle.style.transform = header.classList.contains('collapsed')
            ? 'rotate(180deg)' : 'rotate(0deg)';
        });
      }
    })
    .catch(err => console.error('Header load error:', err));

  // ========== Export CSV ==========
  document.getElementById('btn-export').addEventListener('click', () => {
    const rows = [
      ['id', 'title', 'description', 'due_at', 'priority', 'status'],
      ['1', 'Task A', 'Description A', '2025-09-20', 'High', 'Todo'],
      ['2', 'Task B', 'Description B', '2025-09-21', 'Medium', 'Done']
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  });

  // ========== Import CSV ==========
  document.getElementById('btn-import').addEventListener('click', () => {
    const file = document.getElementById('file-import').files[0];
    if (!file) return alert('Vui lòng chọn tệp CSV!');
    const reader = new FileReader();
    reader.onload = e => {
      const rows = e.target.result.split('\n').map(r => r.split(','));
      console.log('Dữ liệu nhập:', rows);
      alert('Đã nhập tệp thành công! (Xem console để xem nội dung)');
    };
    reader.readAsText(file);
  });

  // ========== In báo cáo ==========
  document.getElementById('btn-print').addEventListener('click', () => {
    window.print();
  });

  // ========== Gửi email ==========
  document.getElementById('btn-email').addEventListener('click', () => {
    const email = document.getElementById('email-recipient').value.trim();
    if (!email) return alert('Vui lòng nhập email!');
    alert(`(Mô phỏng) Gửi báo cáo đến ${email}`);
  });

  // ========== Sao lưu ==========
  document.getElementById('btn-backup').addEventListener('click', () => {
    const data = { backupAt: new Date().toISOString(), tasks: ['Task A', 'Task B'] };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  });

  // ========== Modal chia sẻ ==========
  const modal = document.getElementById('share-modal');
  const closeModal = () => modal.classList.add('hidden');
  document.getElementById('share-plan').addEventListener('click', () => modal.classList.remove('hidden'));
  document.getElementById('close-share').addEventListener('click', closeModal);
  document.getElementById('btn-share-submit').addEventListener('click', () => {
    const val = modal.querySelector('input').value.trim();
    if (!val) return alert('Vui lòng nhập link hoặc email!');
    alert(`(Mô phỏng) Đã chia sẻ tới: ${val}`);
    closeModal();
  });
});
