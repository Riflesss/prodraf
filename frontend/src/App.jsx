import { useEffect, useState } from 'react';
import './App.css';

const MOCK_TOKEN = 'mock-token';
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${MOCK_TOKEN}`
};

const CATEGORIES = [
  { value: 'all', label: 'ทั้งหมด', emoji: '🌟' },
  { value: 'device', label: 'อุปกรณ์ไอที', emoji: '💻' },
  { value: 'equipment', label: 'ครุภัณฑ์/กล้อง', emoji: '📷' },
  { value: 'tool', label: 'เครื่องมือช่าง/อิเล็กส์', emoji: '🛠️' },
  { value: 'book', label: 'หนังสือ', emoji: '📚' },
  { value: 'other', label: 'อื่นๆ', emoji: '📦' }
];

function App() {
  // Navigation & Authentication
  const [activeTab, setActiveTab] = useState('catalog');
  const [currentUser, setCurrentUser] = useState(null);
  
  // Data States
  const [items, setItems] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal States
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  
  // Form States (Borrowing)
  const [borrowQty, setBorrowQty] = useState(1);
  const [borrowReason, setBorrowReason] = useState('');
  const [borrowDate, setBorrowDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  // Form States (Add Item)
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'device',
    totalQuantity: 1,
    unit: 'ชิ้น',
    description: '',
    location: ''
  });

  // Form States (Rejection Note)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingBorrowId, setRejectingBorrowId] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Fetch Current User on Mount
  useEffect(() => {
    loadUser();
  }, []);

  // Reload data when activeTab or user role changes
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [activeTab, currentUser?.role]);

  // Load current user profile from backend
  async function loadUser() {
    try {
      setLoading(true);
      const res = await fetch('/api/users/me', {
        headers: DEFAULT_HEADERS
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setCurrentUser(result.data);
      } else {
        throw new Error(result.message || 'ไม่สามารถดึงข้อมูลผู้ใช้ได้');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fetch items and/or borrowings based on active tab
  async function loadData() {
    try {
      setLoading(true);
      
      // Load Items
      const itemsRes = await fetch('/api/items', { headers: DEFAULT_HEADERS });
      const itemsData = await itemsRes.json();
      if (itemsRes.ok && itemsData.success) {
        setItems(itemsData.data);
      }

      // Load Borrowing Requests
      const isAdmin = currentUser?.role === 'admin';
      const borrowingsUrl = isAdmin && activeTab === 'manage-borrowings'
        ? '/api/borrowings' // Admin gets all requests
        : '/api/borrowings/me'; // User gets their own requests (actually, endpoint /api/borrowings lists user's requests, let's verify route details)
      
      // Note: backend routes/borrowing.js has:
      // router.post('/', verifyToken, createBorrowRequest);
      // router.get('/', verifyToken, getAllBorrowings); // Wait, does GET '/' return all borrowings or is it protected?
      // Let's check who can see what.
      // In borrowingController.js:
      // getUserBorrowings -> finds by firebaseUid
      // getAllBorrowings -> finds all
      // In routes/borrowing.js:
      // router.get('/', verifyToken, checkAdmin, getAllBorrowings); -> admin gets all
      // router.get('/my', verifyToken, getUserBorrowings); -> user gets theirs
      // Let's verify routes/borrowing.js paths!
      
      const borrowsRes = await fetch(isAdmin && activeTab === 'manage-borrowings' ? '/api/borrowings' : '/api/borrowings/my', {
        headers: DEFAULT_HEADERS
      });
      const borrowsData = await borrowsRes.json();
      if (borrowsRes.ok && borrowsData.success) {
        setBorrowings(borrowsData.data);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Switch User Role (for testing purposes)
  async function handleRoleChange(newRole) {
    if (!currentUser) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${currentUser._id}/role`, {
        method: 'PUT',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ role: newRole })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setCurrentUser(result.data);
        showToast(`สลับสิทธิ์เป็นผู้ใช้งาน: ${newRole === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'ผู้ใช้ทั่วไป (User)'}`);
        
        // If switching from admin, reset active tabs if they were on admin tabs
        if (newRole !== 'admin' && (activeTab === 'manage-borrowings' || activeTab === 'manage-items')) {
          setActiveTab('catalog');
        }
      } else {
        throw new Error(result.message || 'ไม่สามารถสลับสิทธิ์ได้');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  // Trigger Notifications / Toast alerts
  function showToast(message, type = 'success') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }

  // Seed default data for testing
  async function seedCatalog() {
    if (currentUser?.role !== 'admin') {
      showToast('คุณต้องมีสิทธิ์เป็น Admin ในการดึงข้อมูลจำลอง', 'danger');
      return;
    }

    const defaultItems = [
      { name: 'MacBook Pro M3 16"', category: 'device', totalQuantity: 5, availableQuantity: 5, unit: 'เครื่อง', description: 'แล็ปท็อปประสิทธิภาพสูงสำหรับการพัฒนาและออกแบบ', location: 'ห้องปฏิบัติการไอที' },
      { name: 'iPad Pro 12.9" 256GB', category: 'device', totalQuantity: 8, availableQuantity: 8, unit: 'เครื่อง', description: 'ไอแพดโปรพร้อม Apple Pencil สำหรับวาดรูปเขียนจดโน้ต', location: 'ตู้เก็บของห้องทะเบียน' },
      { name: 'Sony Alpha A7 IV (Body)', category: 'equipment', totalQuantity: 3, availableQuantity: 3, unit: 'ตัว', description: 'กล้อง Mirrorless ความละเอียดสูงสำหรับถ่ายภาพนิ่งและวิดีโอ', location: 'ห้องสตูดิโอมัลติมีเดีย' },
      { name: 'Arduino Uno Starter Kit', category: 'tool', totalQuantity: 15, availableQuantity: 15, unit: 'กล่อง', description: 'ชุดทดลองเขียนโปรแกรมไมโครคอนโทรลเลอร์เบื้องต้น', location: 'ห้องปฏิบัติการฮาร์ดแวร์ ชั้น 3' },
      { name: 'Hakko Soldering Station', category: 'tool', totalQuantity: 10, availableQuantity: 10, unit: 'ชุด', description: 'เครื่องบัดกรีควบคุมอุณหภูมิความร้อนสูงและปลอดภัย', location: 'ตู้เครื่องมือช่างวิทยาศาสตร์' },
      { name: 'Introduction to JavaScript', category: 'book', totalQuantity: 6, availableQuantity: 6, unit: 'เล่ม', description: 'หนังสือสอนเขียนโปรแกรมพื้นฐาน JavaScript ถึงระดับกลาง', location: 'ห้องสมุดอิเล็กทรอนิกส์ ชั้น 2' },
      { name: 'Clean Code (Robert C. Martin)', category: 'book', totalQuantity: 2, availableQuantity: 2, unit: 'เล่ม', description: 'หนังสือแนวทางการเขียนซอร์สโค้ดที่ดี มีระเบียบและดูแลรักษาง่าย', location: 'ห้องสมุดอิเล็กทรอนิกส์ ชั้น 2' },
      { name: 'Creality 3D Printer V2', category: 'equipment', totalQuantity: 2, availableQuantity: 2, unit: 'เครื่อง', description: 'เครื่องพิมพ์วัตถุสามมิติสำหรับการขึ้นรูปชิ้นงานโครงงาน', location: 'ห้องนวัตกรรมเมกเกอร์' }
    ];

    try {
      setLoading(true);
      let successCount = 0;
      for (const item of defaultItems) {
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: DEFAULT_HEADERS,
          body: JSON.stringify(item)
        });
        if (res.ok) successCount++;
      }
      showToast(`สร้างข้อมูลตัวอย่างพัสดุสำเร็จ ${successCount} รายการ!`);
      loadData();
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการใส่ข้อมูลตัวอย่าง: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  // Handle Request Borrowing
  async function submitBorrowRequest(e) {
    e.preventDefault();
    if (!selectedItem) return;

    if (borrowQty > selectedItem.availableQuantity) {
      showToast('จำนวนพัสดุคงเหลือไม่พอสำหรับการยืม', 'danger');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/borrowings', {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          items: [{ itemName: selectedItem.name, quantity: Number(borrowQty) }],
          borrowDate,
          expectedReturnDate: returnDate,
          reason: borrowReason
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast('ส่งคำขอยืมเรียบร้อยแล้ว รอผู้ดูแลอนุมัติ!');
        setShowBorrowModal(false);
        setBorrowQty(1);
        setBorrowReason('');
        setActiveTab('my-borrowings');
      } else {
        throw new Error(result.message || 'ส่งคำขอยืมไม่สำเร็จ');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  // Handle Admin Decision (Approve / Return / Reject)
  async function handleAdminDecision(borrowId, status, notes = '') {
    try {
      setLoading(true);
      const res = await fetch(`/api/borrowings/${borrowId}/status`, {
        method: 'PUT',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ status, notes })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast(`ทำรายการอัปเดตสถานะเป็น [${status}] เรียบร้อย!`);
        loadData();
      } else {
        throw new Error(result.message || 'ทำรายการไม่สำเร็จ');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  // Handle Create New Item (Admin)
  async function handleCreateItem(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          ...newItem,
          availableQuantity: Number(newItem.totalQuantity),
          totalQuantity: Number(newItem.totalQuantity)
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast(`เพิ่มพัสดุ "${newItem.name}" เรียบร้อยแล้ว!`);
        setShowItemModal(false);
        setNewItem({ name: '', category: 'device', totalQuantity: 1, unit: 'ชิ้น', description: '', location: '' });
        loadData();
      } else {
        throw new Error(result.message || 'เพิ่มพัสดุไม่สำเร็จ');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  // Handle Delete Item (Admin)
  async function handleDeleteItem(itemId, itemName) {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบพัสดุ "${itemName}" ออกจากระบบ?`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
        headers: DEFAULT_HEADERS
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast(`ลบพัสดุ "${itemName}" ออกจากระบบแล้ว`);
        loadData();
      } else {
        throw new Error(result.message || 'ลบไม่สำเร็จ');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  // Open Rejection Dialog
  function openRejectionDialog(borrowId) {
    setRejectingBorrowId(borrowId);
    setRejectionNotes('');
    setShowRejectModal(true);
  }

  // Submit Rejection
  function submitRejection(e) {
    e.preventDefault();
    if (!rejectionNotes.trim()) {
      showToast('กรุณากรอกเหตุผลในการปฏิเสธการยืม', 'danger');
      return;
    }
    setShowRejectModal(false);
    handleAdminDecision(rejectingBorrowId, 'rejected', rejectionNotes);
  }

  // Get category details helper
  function getCategoryInfo(catVal) {
    return CATEGORIES.find(c => c.value === catVal) || { label: catVal, emoji: '📦' };
  }

  // Format Date Helper
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Filtered catalog list
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate statistics for dashboard widgets
  const stats = {
    totalItems: items.length,
    inStock: items.reduce((sum, item) => sum + item.availableQuantity, 0),
    outOfStock: items.filter(item => item.availableQuantity === 0).length,
    pendingBorrows: borrowings.filter(b => b.status === 'pending').length,
    activeBorrows: borrowings.filter(b => b.status === 'approved' || b.status === 'borrowed').length
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {notification && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 24px',
            borderRadius: '12px',
            color: 'white',
            fontWeight: '600',
            zIndex: 999,
            boxShadow: 'var(--shadow-lg)',
            backgroundColor: notification.type === 'danger' ? 'var(--danger)' : 'var(--success)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {notification.type === 'danger' ? '❌ ' : '✅ '} {notification.message}
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <span className="logo-icon">🔑</span>
          <div className="logo-text">ระบบยืม-คืนพัสดุ</div>
        </div>

        <nav className="nav-menu">
          <div className="nav-section-title">เมนูหลัก</div>
          <button 
            className={`nav-item ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            <span>🎒</span> รายการพัสดุทั้งหมด
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'my-borrowings' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-borrowings')}
          >
            <span>📜</span> รายการยืมของคุณ
          </button>

          {currentUser?.role === 'admin' && (
            <>
              <div className="nav-section-title">ผู้ดูแลระบบ (Admin)</div>
              <button 
                className={`nav-item ${activeTab === 'manage-borrowings' ? 'active' : ''}`}
                onClick={() => setActiveTab('manage-borrowings')}
              >
                <span>⚙️</span> จัดการคำขอยืม
                {stats.pendingBorrows > 0 && (
                  <span className="badge badge-danger" style={{ marginLeft: 'auto', padding: '1px 6px' }}>
                    {stats.pendingBorrows}
                  </span>
                )}
              </button>
              
              <button 
                className={`nav-item ${activeTab === 'manage-items' ? 'active' : ''}`}
                onClick={() => setActiveTab('manage-items')}
              >
                <span>📦</span> จัดการพัสดุในคลัง
              </button>
            </>
          )}
        </nav>

        {/* User profile section at the bottom */}
        {currentUser && (
          <div className="user-profile-widget">
            <div className="user-info">
              <div className="user-avatar">
                {currentUser.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <span className="user-name">{currentUser.displayName}</span>
                <span className={`user-role-badge ${currentUser.role}`}>
                  {currentUser.role === 'admin' ? 'Admin' : 'User'}
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Wrapper */}
      <div className="main-wrapper">
        
        {/* Topbar */}
        <header className="topbar">
          <h2 className="page-title">
            {activeTab === 'catalog' && '🏫 คลังพัสดุและคุรุภัณฑ์'}
            {activeTab === 'my-borrowings' && '📜 ประวัติการยืมของคุณ'}
            {activeTab === 'manage-borrowings' && '⚙️ ตารางอนุมัติการยืมพัสดุ'}
            {activeTab === 'manage-items' && '📦 ระบบลงทะเบียนพัสดุ'}
          </h2>
          
          <div className="topbar-actions">
            {/* Simulation Switcher */}
            <div className="role-switcher-box">
              <span className="role-switcher-label">สลับสิทธิ์ทดสอบ:</span>
              <select 
                className="role-select"
                value={currentUser?.role || 'user'}
                onChange={(e) => handleRoleChange(e.target.value)}
                disabled={loading}
              >
                <option value="user">User (ผู้ใช้ทั่วไป)</option>
                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
              </select>
            </div>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <main className="content-body">
          {error && (
            <div className="badge badge-danger" style={{ padding: '12px', width: '100%', borderRadius: '12px', fontSize: '0.9rem' }}>
              ⚠️ เกิดข้อผิดพลาด: {error}
            </div>
          )}

          {/* Catalog View */}
          {activeTab === 'catalog' && (
            <>
              {/* Dashboard stats summary widgets */}
              <section className="stats-row">
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>💼</div>
                  <div className="stat-details">
                    <span className="stat-val">{stats.totalItems}</span>
                    <span className="stat-label">พัสดุทั้งหมด</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>✅</div>
                  <div className="stat-details">
                    <span className="stat-val">{stats.inStock}</span>
                    <span className="stat-label">พร้อมให้ยืม (ชิ้น)</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>⏳</div>
                  <div className="stat-details">
                    <span className="stat-val">{stats.pendingBorrows}</span>
                    <span className="stat-label">รอตรวจอนุมัติ</span>
                  </div>
                </div>
              </section>

              {/* Filters */}
              <div className="filter-bar">
                <div className="search-input-wrapper">
                  <span className="search-icon">🔍</span>
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่อพัสดุ, คำอธิบาย, สถานที่..." 
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="category-filter">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      className={`category-tab ${selectedCategory === cat.value ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat.value)}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blank catalog warning and seeder */}
              {items.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed var(--border-color)', borderRadius: '24px', backgroundColor: 'var(--bg-card)' }}>
                  <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📭</span>
                  <h3>ยังไม่มีข้อมูลพัสดุอยู่ในฐานข้อมูลคลัง</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '8px', marginBottom: '24px' }}>
                    คุณสามารถเปลี่ยนสิทธิ์เป็น Admin (มุมขวาบน) เพื่อกดเปิดปุ่มสร้างชุดข้อมูลพัสดุจำลองสำหรับทดสอบระบบ
                  </p>
                  {currentUser?.role === 'admin' ? (
                    <button className="btn btn-primary" onClick={seedCatalog}>
                      🚀 สร้างข้อมูลพัสดุเริ่มต้น (Seed Data)
                    </button>
                  ) : (
                    <div className="badge badge-warning" style={{ fontSize: '0.85rem' }}>
                      กรุณาสลับสิทธิ์เป็น Admin เพื่อสร้างข้อมูลตัวอย่างพัสดุในระบบ
                    </div>
                  )}
                </div>
              )}

              {/* Items grid */}
              {filteredItems.length > 0 && (
                <div className="items-grid">
                  {filteredItems.map(item => {
                    const cat = getCategoryInfo(item.category);
                    const stockPercent = (item.availableQuantity / item.totalQuantity) * 100;
                    return (
                      <div className="item-card" key={item._id}>
                        <span className="item-category-emoji">{cat.emoji}</span>
                        <span 
                          className={`item-badge badge ${
                            item.status === 'active' && item.availableQuantity > 0 ? 'badge-success' : 'badge-danger'
                          }`}
                        >
                          {item.status === 'active' 
                            ? (item.availableQuantity > 0 ? 'พร้อมให้ยืม' : 'ของหมดคลัง') 
                            : 'ปิดปรับปรุง'}
                        </span>
                        
                        <h3 className="item-name">{item.name}</h3>
                        <p className="item-desc">{item.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                        
                        <div className="item-meta-row">
                          <span>📍 {item.location || 'คลังส่วนกลาง'}</span>
                          <span>📦 หมวดหมู่: {cat.label}</span>
                        </div>
                        
                        <div className="item-stock-container">
                          <div className="item-stock-header">
                            <span>ความพร้อม</span>
                            <span>{item.availableQuantity} / {item.totalQuantity} {item.unit}</span>
                          </div>
                          <div className="item-stock-bar">
                            <div 
                              className="item-stock-progress"
                              style={{ 
                                width: `${stockPercent}%`,
                                backgroundColor: stockPercent === 0 
                                  ? 'var(--danger)' 
                                  : stockPercent < 30 ? 'var(--warning)' : 'var(--success)'
                              }}
                            />
                          </div>
                        </div>

                        <button 
                          className="btn btn-primary"
                          disabled={item.status !== 'active' || item.availableQuantity === 0}
                          onClick={() => {
                            setSelectedItem(item);
                            setBorrowQty(1);
                            setShowBorrowModal(true);
                          }}
                        >
                          📩 ส่งคำขอยืมพัสดุ
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No search results */}
              {filteredItems.length === 0 && items.length > 0 && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <span style={{ fontSize: '32px' }}>🔍</span>
                  <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>ไม่พบพัสดุตามที่คุณค้นหา ลองเปลี่ยนคำค้นหรือตัวกรองหมวดหมู่</p>
                </div>
              )}
            </>
          )}

          {/* My Borrowings View */}
          {activeTab === 'my-borrowings' && (
            <div className="table-card">
              <div className="table-header-box">
                <div>
                  <h3 style={{ color: 'var(--text-primary)' }}>รายการยืมพัสดุของคุณ</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    แสดงประวัติและรายการขอยืมทั้งหมดของผู้ใช้รายนี้
                  </p>
                </div>
              </div>
              
              <div className="table-container">
                {borrowings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px' }}>
                    <span style={{ fontSize: '32px' }}>📁</span>
                    <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>คุณยังไม่มีประวัติการส่งคำขอยืมพัสดุ</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>วันที่ขอยืม</th>
                        <th>รายการพัสดุ</th>
                        <th>จำนวน</th>
                        <th>กำหนดส่งคืน</th>
                        <th>เหตุผลการยืม</th>
                        <th>สถานะ</th>
                        <th>บันทึกจากผู้ดูแล</th>
                      </tr>
                    </thead>
                    <tbody>
                      {borrowings.map(b => (
                        <tr key={b._id}>
                          <td>{formatDate(b.borrowDate)}</td>
                          <td>
                            {b.items.map((it, idx) => (
                              <div key={idx} style={{ fontWeight: '600' }}>{it.itemName}</div>
                            ))}
                          </td>
                          <td>{b.items.map((it, idx) => <span key={idx}>{it.quantity}</span>)}</td>
                          <td>{formatDate(b.expectedReturnDate)}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{b.reason}</td>
                          <td>
                            <span 
                              className={`badge ${
                                b.status === 'pending' ? 'badge-warning' :
                                b.status === 'approved' || b.status === 'borrowed' ? 'badge-success' :
                                b.status === 'returned' ? 'badge-info' : 'badge-danger'
                              }`}
                            >
                              {b.status === 'pending' && '⏳ รออนุมัติ'}
                              {b.status === 'approved' && '✅ อนุมัติแล้ว'}
                              {b.status === 'borrowed' && '🎒 กำลังยืมอยู่'}
                              {b.status === 'returned' && '🔄 คืนของแล้ว'}
                              {b.status === 'rejected' && '❌ ปฏิเสธ'}
                              {b.status === 'overdue' && '⚠️ คืนช้าเกินกำหนด'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {b.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Admin - Manage Borrowings View */}
          {activeTab === 'manage-borrowings' && currentUser?.role === 'admin' && (
            <div className="table-card">
              <div className="table-header-box">
                <div>
                  <h3 style={{ color: 'var(--text-primary)' }}>อนุมัติและจัดการการยืม (Admin)</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    สำหรับอนุมัติใบคำขอและบันทึกข้อมูลการรับคืนพัสดุจากทุกคน
                  </p>
                </div>
              </div>
              
              <div className="table-container">
                {borrowings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px' }}>
                    <span style={{ fontSize: '32px' }}>📭</span>
                    <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>ไม่มีรายการคำขอยืมจากระบบ</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>ผู้ยืม</th>
                        <th>วันที่ยืม - กำหนดคืน</th>
                        <th>รายการพัสดุ</th>
                        <th>จำนวน</th>
                        <th>เหตุผล</th>
                        <th>สถานะ</th>
                        <th>การจัดการ (Actions)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {borrowings.map(b => (
                        <tr key={b._id}>
                          <td>
                            <div style={{ fontWeight: '600' }}>{b.userId?.displayName || b.firebaseUid}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.userId?.email || ''}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem' }}>ยืม: {formatDate(b.borrowDate)}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>คืน: {formatDate(b.expectedReturnDate)}</div>
                          </td>
                          <td>
                            {b.items.map((it, idx) => (
                              <div key={idx} style={{ fontWeight: '600' }}>{it.itemName}</div>
                            ))}
                          </td>
                          <td>{b.items.map((it, idx) => <span key={idx}>{it.quantity}</span>)}</td>
                          <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.reason}
                          </td>
                          <td>
                            <span 
                              className={`badge ${
                                b.status === 'pending' ? 'badge-warning' :
                                b.status === 'approved' || b.status === 'borrowed' ? 'badge-success' :
                                b.status === 'returned' ? 'badge-info' : 'badge-danger'
                              }`}
                            >
                              {b.status === 'pending' && '⏳ รออนุมัติ'}
                              {b.status === 'approved' && '✅ อนุมัติแล้ว'}
                              {b.status === 'borrowed' && '🎒 กำลังยืมอยู่'}
                              {b.status === 'returned' && '🔄 คืนของแล้ว'}
                              {b.status === 'rejected' && '❌ ปฏิเสธ'}
                              {b.status === 'overdue' && '⚠️ คืนช้า'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {b.status === 'pending' && (
                                <>
                                  <button 
                                    className="btn btn-success" 
                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                    onClick={() => handleAdminDecision(b._id, 'approved')}
                                  >
                                    อนุมัติ
                                  </button>
                                  <button 
                                    className="btn btn-danger" 
                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                    onClick={() => openRejectionDialog(b._id)}
                                  >
                                    ปฏิเสธ
                                  </button>
                                </>
                              )}
                              
                              {b.status === 'approved' && (
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: 'var(--primary)' }}
                                  onClick={() => handleAdminDecision(b._id, 'returned')}
                                >
                                  🔄 ได้รับของคืนแล้ว
                                </button>
                              )}
                              
                              {(b.status === 'returned' || b.status === 'rejected') && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>ไม่มีการจัดการ</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Admin - Manage Items View */}
          {activeTab === 'manage-items' && currentUser?.role === 'admin' && (
            <div className="table-card">
              <div className="table-header-box">
                <div>
                  <h3 style={{ color: 'var(--text-primary)' }}>คลังสินค้าและพัสดุทั้งหมด</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    เพิ่ม ลบ หรือแก้ไขพัสดุครุภัณฑ์ในระบบจัดเก็บข้อมูล
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-secondary" onClick={seedCatalog}>
                    🧬 โหลดข้อมูลตัวอย่าง
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowItemModal(true)}>
                    ➕ ลงทะเบียนพัสดุใหม่
                  </button>
                </div>
              </div>
              
              <div className="table-container">
                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px' }}>
                    <span style={{ fontSize: '32px' }}>📦</span>
                    <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>ยังไม่มีสินค้าในคลังพัสดุ</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>พัสดุ</th>
                        <th>หมวดหมู่</th>
                        <th>ยอดคงคลัง</th>
                        <th>หน่วยนับ</th>
                        <th>สถานที่จัดเก็บ</th>
                        <th>สถานะการใช้งาน</th>
                        <th>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => {
                        const cat = getCategoryInfo(item.category);
                        return (
                          <tr key={item._id}>
                            <td style={{ fontWeight: '600' }}>
                              <div>{item.name}</div>
                              <div style={{ fontWeight: 'normal', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {item.description || 'ไม่มีรายละเอียด'}
                              </div>
                            </td>
                            <td>{cat.emoji} {cat.label}</td>
                            <td>
                              <strong>{item.availableQuantity}</strong> / {item.totalQuantity}
                            </td>
                            <td>{item.unit}</td>
                            <td>{item.location || 'คลังกลาง'}</td>
                            <td>
                              <span className={`badge ${item.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                {item.status === 'active' ? 'เปิดให้ยืม' : 'ซ่อมบำรุง'}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="btn btn-danger"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                onClick={() => handleDeleteItem(item._id, item.name)}
                              >
                                🗑️ ลบ
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: Borrowing Form */}
      {showBorrowModal && selectedItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title">กรอกฟอร์มขอยืมพัสดุ</h3>
              <button 
                onClick={() => setShowBorrowModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            </header>
            
            <form onSubmit={submitBorrowRequest}>
              <div className="modal-body">
                <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', marginBottom: '8px' }}>
                  <strong>📦 ชิ้นที่ยืม:</strong> {selectedItem.name} <br/>
                  <strong>📍 แหล่งจัดเก็บ:</strong> {selectedItem.location || 'คลังกลาง'} <br/>
                  <strong>📊 เหลือในคลัง:</strong> {selectedItem.availableQuantity} {selectedItem.unit}
                </div>

                <div className="form-group">
                  <label htmlFor="borrowQty">จำนวนที่ต้องการยืม ({selectedItem.unit})</label>
                  <input 
                    type="number" 
                    id="borrowQty" 
                    className="form-control"
                    min="1" 
                    max={selectedItem.availableQuantity}
                    value={borrowQty} 
                    onChange={(e) => setBorrowQty(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="borrowDate">วันที่ขอยืม</label>
                  <input 
                    type="date" 
                    id="borrowDate" 
                    className="form-control"
                    value={borrowDate}
                    onChange={(e) => setBorrowDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="returnDate">กำหนดส่งคืนโดยประมาณ</label>
                  <input 
                    type="date" 
                    id="returnDate" 
                    className="form-control"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reason">เหตุผลความจำเป็นในการยืม</label>
                  <textarea 
                    id="reason" 
                    className="form-control"
                    placeholder="เช่น ใช้ทำรายงานวิชาโปรแกรมมิ่ง / ถ่ายงานสโมสรนักศึกษา..." 
                    value={borrowReason}
                    onChange={(e) => setBorrowReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <footer className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBorrowModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                  🚀 ยืนยันส่งคำขอ
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reject Dialog */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--danger)' }}>ปฏิเสธคำขอยืมพัสดุ</h3>
              <button 
                onClick={() => setShowRejectModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            </header>
            
            <form onSubmit={submitRejection}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="rejectReason">เหตุผลในการปฏิเสธคำขอยืม</label>
                  <textarea 
                    id="rejectReason" 
                    className="form-control"
                    placeholder="ระบุเหตุผล เช่น ของชิ้นนี้มีกำหนดซ่อมบำรุง / ข้อมูลไม่ถูกต้อง..." 
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <footer className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-danger">
                  ❌ ยืนยันการปฏิเสธ
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add New Item (Admin) */}
      {showItemModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title">ลงทะเบียนพัสดุเข้าระบบ</h3>
              <button 
                onClick={() => setShowItemModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            </header>
            
            <form onSubmit={handleCreateItem}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="itemName">ชื่อพัสดุ/ครุภัณฑ์</label>
                  <input 
                    type="text" 
                    id="itemName" 
                    className="form-control"
                    placeholder="เช่น กล้องถ่ายวิดีโอ Canon XA40"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="itemCategory">หมวดหมู่สินค้า</label>
                  <select 
                    id="itemCategory" 
                    className="form-control"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  >
                    <option value="device">💻 อุปกรณ์ไอที</option>
                    <option value="equipment">📷 ครุภัณฑ์/กล้อง</option>
                    <option value="tool">🛠️ เครื่องมือช่าง/อิเล็กส์</option>
                    <option value="book">📚 หนังสือ</option>
                    <option value="other">📦 อื่นๆ</option>
                  </select>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '12px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="totalQuantity">จำนวนทั้งหมด</label>
                    <input 
                      type="number" 
                      id="totalQuantity" 
                      className="form-control"
                      min="1"
                      value={newItem.totalQuantity}
                      onChange={(e) => setNewItem({ ...newItem, totalQuantity: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="unit">หน่วยนับ</label>
                    <input 
                      type="text" 
                      id="unit" 
                      className="form-control"
                      placeholder="เช่น เครื่อง, เล่ม, กล่อง..."
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="location">สถานที่จัดเก็บ</label>
                  <input 
                    type="text" 
                    id="location" 
                    className="form-control"
                    placeholder="เช่น ห้องสมุด ชั้น 2, ตู้ IT"
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">รายละเอียดเพิ่มเติม</label>
                  <textarea 
                    id="description" 
                    className="form-control"
                    placeholder="รายละเอียดพัสดุ สเปก ยี่ห้อ..."
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </div>
              </div>
              
              <footer className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowItemModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                  💾 ลงทะเบียนสำเร็จ
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
