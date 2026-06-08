/* ==========================================================================
   LITCRACK FRONTEND CLIENT (ROUTER, SESSION AUTH, ADMIN & CORE MODULES)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation elements
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  const pageViews = document.querySelectorAll('.page-view');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  // Auth Overlay elements
  const authOverlay = document.getElementById('auth-overlay');
  const authTabLogin = document.getElementById('btn-auth-tab-login');
  const authTabRegister = document.getElementById('btn-auth-tab-register');
  const authFormLogin = document.getElementById('auth-form-login');
  const authFormRegister = document.getElementById('auth-form-register');

  const inputLoginEmail = document.getElementById('login-email');
  const inputLoginPass = document.getElementById('login-password');
  const btnLoginSubmit = document.getElementById('btn-login-submit');

  const inputRegName = document.getElementById('reg-name');
  const inputRegUsn = document.getElementById('reg-usn');
  const inputRegBranch = document.getElementById('reg-branch');
  const inputRegEmail = document.getElementById('reg-email');
  const inputRegPass = document.getElementById('reg-password');
  const btnRegisterSubmit = document.getElementById('btn-register-submit');

  const btnLogout = document.getElementById('btn-logout');

  // Sidebar profile tags
  const navAvatar = document.getElementById('nav-profile-avatar');
  const navName = document.getElementById('nav-profile-name');
  const navRole = document.getElementById('nav-profile-role');

  // Active Session State
  let currentUser = null; // { name, usn, branch, email, role }

  // Mobile Drawer Toggle
  function toggleSidebar() {
    sidebar.classList.toggle('open');
    if (sidebar.classList.contains('open')) {
      overlay.style.display = 'block';
    } else {
      overlay.style.display = 'none';
    }
  }

  if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
  if (overlay) overlay.addEventListener('click', toggleSidebar);

  // Switch View Routing
  window.switchView = (viewId) => {
    pageViews.forEach(view => {
      view.style.display = 'none';
    });

    const activeView = document.getElementById(`view-${viewId}`);
    if (activeView) {
      activeView.style.display = 'block';
    }

    menuItems.forEach(item => {
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (sidebar.classList.contains('open')) {
      toggleSidebar();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Custom view hooks
    if (viewId === 'dashboard') {
      updateDashboardStats();
      loadDashboardAnnouncements();
    } else if (viewId === 'about-klecet') {
      loadFacultiesRoster();
    } else if (viewId === 'admin-deck') {
      loadAdminDashboardData();
    }
  };

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      window.switchView(view);
    });
  });

  // ==========================================================================
  // SESSION AUTHENTICATION FLOWS
  // ==========================================================================

  // Check existing session
  function checkSession() {
    const saved = localStorage.getItem('litcrack_user');
    if (saved) {
      currentUser = JSON.parse(saved);
      applyUserSession();
    } else {
      authOverlay.style.display = 'flex';
    }
  }

  // Toggle Auth Tabs
  authTabLogin.addEventListener('click', () => {
    authTabLogin.classList.add('active');
    authTabRegister.classList.remove('active');
    authFormLogin.style.display = 'block';
    authFormRegister.style.display = 'none';
  });

  authTabRegister.addEventListener('click', () => {
    authTabRegister.classList.add('active');
    authTabLogin.classList.remove('active');
    authFormRegister.style.display = 'block';
    authFormLogin.style.display = 'none';
  });

  // Submit Sign In (Student/Admin)
  btnLoginSubmit.addEventListener('click', async () => {
    const email = inputLoginEmail.value.trim();
    const password = inputLoginPass.value.trim();

    if (!email || !password) {
      alert("Please fill out your login details.");
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        currentUser = data.user;
        localStorage.setItem('litcrack_user', JSON.stringify(currentUser));
        applyUserSession();
      } else {
        alert(data.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Please try again.");
    }
  });

  // Submit Student Registration
  btnRegisterSubmit.addEventListener('click', async () => {
    const name = inputRegName.value.trim();
    const usn = inputRegUsn.value.trim();
    const branch = inputRegBranch.value;
    const email = inputRegEmail.value.trim();
    const password = inputRegPass.value.trim();

    if (!name || !usn || !email || !password) {
      alert("Please fill out all registration fields.");
      return;
    }
    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, usn, branch, email, password })
      });
      const data = await res.json();

      if (data.success) {
        currentUser = data.user;
        localStorage.setItem('litcrack_user', JSON.stringify(currentUser));
        applyUserSession();
      } else {
        alert(data.message || "Registration failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    }
  });

  // Sync student progress helper
  window.syncStudentProgressToServer = async function(data) {
    if (!currentUser || currentUser.role !== 'student') return;
    
    // Update local currentUser object state
    if (data.roadmapProgress !== undefined) currentUser.roadmapProgress = data.roadmapProgress;
    if (data.starAnswers !== undefined) currentUser.starAnswers = data.starAnswers;
    if (data.gdCount !== undefined) currentUser.gdCount = data.gdCount;
    if (data.practiceScores !== undefined) currentUser.scores = data.practiceScores;
    
    localStorage.setItem('litcrack_user', JSON.stringify(currentUser));

    try {
      const res = await fetch('/api/student/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, ...data })
      });
      const resData = await res.json();
      if (!resData.success) {
        console.error("Failed to sync progress to server:", resData.message);
      }
    } catch (err) {
      console.error("Network error during progress sync:", err);
    }
  };

  // Sync STAR inputs from LocalStorage
  function syncStarCardInputsFromLocalStorage() {
    const savedStar = JSON.parse(localStorage.getItem('litcrack_star_saved') || 'null');
    if (savedStar) {
      if (typeof starQuestion !== 'undefined' && starQuestion) {
        starQuestion.value = savedStar.question || (starQuestion.options[0] ? starQuestion.options[0].value : '');
      }
      if (typeof starInputs !== 'undefined') {
        if (starInputs.situation) starInputs.situation.value = savedStar.situation || '';
        if (starInputs.task) starInputs.task.value = savedStar.task || '';
        if (starInputs.action) starInputs.action.value = savedStar.action || '';
        if (starInputs.result) starInputs.result.value = savedStar.result || '';
      }
      if (typeof updateStarPreview === 'function') {
        updateStarPreview();
      }
    } else {
      if (typeof starQuestion !== 'undefined' && starQuestion) {
        starQuestion.selectedIndex = 0;
      }
      if (typeof starInputs !== 'undefined') {
        if (starInputs.situation) starInputs.situation.value = '';
        if (starInputs.task) starInputs.task.value = '';
        if (starInputs.action) starInputs.action.value = '';
        if (starInputs.result) starInputs.result.value = '';
      }
      if (typeof updateStarPreview === 'function') {
        updateStarPreview();
      }
    }
  }

  // Apply user role view layout
  function applyUserSession() {
    authOverlay.style.display = 'none';
    
    // Clear forms
    inputLoginEmail.value = '';
    inputLoginPass.value = '';
    inputRegName.value = '';
    inputRegUsn.value = '';
    inputRegEmail.value = '';
    inputRegPass.value = '';

    // Populate Sidebar profile details
    navName.innerText = currentUser.name;
    navAvatar.innerText = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    // Toggle Sidebar controls depending on roles
    const adminLink = document.getElementById('sidebar-menu-admin');
    const roadmapLink = document.getElementById('sidebar-menu-roadmap');
    const starLink = document.getElementById('sidebar-menu-star');
    const aiLink = document.getElementById('sidebar-menu-ai');
    
    const adminCreateLobby = document.getElementById('admin-create-room-panel');

    if (currentUser.role === 'admin') {
      navRole.innerText = "KLECET Administrator";
      if (adminLink) adminLink.style.display = 'block';
      if (adminCreateLobby) adminCreateLobby.style.display = 'block';
      window.switchView('admin-deck');
    } else {
      navRole.innerText = `${currentUser.branch} - ${currentUser.usn}`;
      if (adminLink) adminLink.style.display = 'none';
      if (adminCreateLobby) adminCreateLobby.style.display = 'none';

      // Auto fill student attributes in live test and interviewer profiles
      const studentNameInput = document.getElementById('student-name');
      if (studentNameInput) studentNameInput.value = currentUser.name;
      
      const candidateNameInput = document.getElementById('candidate-name-input');
      if (candidateNameInput) candidateNameInput.value = currentUser.name;

      // Sync student session data into localStorage
      if (currentUser.scores !== undefined) {
        localStorage.setItem('litcrack_practice_scores', JSON.stringify(currentUser.scores || []));
      }
      if (currentUser.roadmapProgress !== undefined) {
        localStorage.setItem('litcrack_roadmap_progress', JSON.stringify(currentUser.roadmapProgress || {}));
      }
      if (currentUser.starAnswers !== undefined) {
        localStorage.setItem('litcrack_star_saved', JSON.stringify(currentUser.starAnswers || null));
      }
      if (currentUser.gdCount !== undefined) {
        localStorage.setItem('litcrack_gd_count', currentUser.gdCount || 0);
      }

      // Sync STAR Card Inputs
      syncStarCardInputsFromLocalStorage();

      // Refresh Roadmap views & Dashboard stats
      if (typeof renderRoadmap === 'function') renderRoadmap();
      if (typeof updateDashboardStats === 'function') updateDashboardStats();

      window.switchView('dashboard');
    }
  }

  // Logout Click
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (confirm("Logout from LitCrack portal?")) {
        localStorage.removeItem('litcrack_user');
        localStorage.removeItem('litcrack_practice_scores');
        localStorage.removeItem('litcrack_roadmap_progress');
        localStorage.removeItem('litcrack_star_saved');
        localStorage.removeItem('litcrack_gd_count');
        currentUser = null;
        authOverlay.style.display = 'flex';
        window.switchView('dashboard');
      }
    });
  }

  // ==========================================================================
  // ABOUT PAGE ROSTER (LOAD DYNAMICALLY)
  // ==========================================================================
  async function loadFacultiesRoster() {
    const container = document.getElementById('about-leadership-container');
    if (!container) return;

    try {
      const res = await fetch('/api/faculties');
      const data = await res.json();

      if (data.success) {
        if (data.faculties.length === 0) {
          container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No faculty profiles registered yet.</p>`;
        } else {
          container.innerHTML = data.faculties.map(f => `
            <div style="display: flex; align-items: center; gap: 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-light); padding: 0.85rem 1rem; border-radius: 14px; animation: scaleUp 0.3s ease;">
              <img src="${f.image || 'assets/club_coord.png'}" alt="${f.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary); box-shadow: 0 0 10px var(--primary-glow);">
              <div>
                <strong style="font-size: 0.9rem; color: #fff; display: block;">${f.name}</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.15rem;">${f.role}</span>
              </div>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error("Error loading faculties roster", err);
    }
  }

  // ==========================================================================
  // ADMIN DECK VIEW LOGICS
  // ==========================================================================
  const adminTabStudents = document.getElementById('btn-admin-tab-students');
  const adminTabFaculties = document.getElementById('btn-admin-tab-faculties');
  const adminPanelStudents = document.getElementById('admin-panel-students');
  const adminPanelFaculties = document.getElementById('admin-panel-faculties');

  const adminStudentsTbody = document.getElementById('admin-students-tbody');
  const adminFacultiesTbody = document.getElementById('admin-faculties-tbody');
  
  const inputNewFacName = document.getElementById('new-faculty-name');
  const inputNewFacRole = document.getElementById('new-faculty-role');
  const btnAddFacSubmit = document.getElementById('btn-add-faculty-submit');
  
  const labelUsersCount = document.getElementById('admin-stat-users-count');

  if (adminTabStudents) {
    adminTabStudents.addEventListener('click', () => {
      adminTabStudents.classList.add('active');
      adminTabFaculties.classList.remove('active');
      adminPanelStudents.style.display = 'block';
      adminPanelFaculties.style.display = 'none';
    });
  }

  if (adminTabFaculties) {
    adminTabFaculties.addEventListener('click', () => {
      adminTabFaculties.classList.add('active');
      adminTabStudents.classList.remove('active');
      adminPanelFaculties.style.display = 'block';
      adminPanelStudents.style.display = 'none';
    });
  }

  // Load Admin Data
  async function loadAdminDashboardData() {
    if (!currentUser || currentUser.role !== 'admin') return;

    const headers = { 'admin-email': currentUser.email };

    // 1. Fetch Students
    try {
      const res = await fetch('/api/admin/students', { headers });
      const data = await res.json();
      if (data.success) {
        labelUsersCount.innerText = data.students.length;
        
        if (data.students.length === 0) {
          adminStudentsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No student records found.</td></tr>`;
        } else {
          adminStudentsTbody.innerHTML = data.students.map(s => {
            const scoresLabel = s.scores && s.scores.length > 0 
              ? s.scores.map(sc => `${sc.score}%`).join(', ') 
              : 'None';
            return `
              <tr>
                <td><strong>${s.name}</strong></td>
                <td>${s.usn}</td>
                <td><span class="badge badge-info">${s.branch}</span></td>
                <td>${s.email}</td>
                <td style="font-weight: 600; color: var(--text-accent);">${scoresLabel}</td>
              </tr>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.error(err);
    }

    // 2. Fetch Faculties
    loadAdminFacultiesRoster();

    // 3. Fetch Announcements
    loadAdminAnnouncements();

    // 4. Fetch Questions
    loadAdminQuestionsData();
  }

  async function loadAdminFacultiesRoster() {
    try {
      const res = await fetch('/api/faculties');
      const data = await res.json();
      if (data.success) {
        if (data.faculties.length === 0) {
          adminFacultiesTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No faculties registered.</td></tr>`;
        } else {
          adminFacultiesTbody.innerHTML = data.faculties.map(f => `
            <tr>
              <td><strong>${f.name}</strong></td>
              <td>${f.role}</td>
              <td>
                <button class="btn btn-outline" style="color: var(--danger); padding: 0.35rem 0.75rem; border-color: rgba(239, 68, 68, 0.2);" onclick="window.removeFacultyMember(${f.id})">
                  <i class="fa-solid fa-trash"></i> Remove
                </button>
              </td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Add Faculty (Admin)
  if (btnAddFacSubmit) {
    btnAddFacSubmit.addEventListener('click', async () => {
      const name = inputNewFacName.value.trim();
      const role = inputNewFacRole.value.trim();

      if (!name || !role) {
        alert("Please fill out both faculty name and role fields.");
        return;
      }

      try {
        const res = await fetch('/api/admin/faculty/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'admin-email': currentUser.email
          },
          body: JSON.stringify({ name, role })
        });
        const data = await res.json();

        if (data.success) {
          inputNewFacName.value = '';
          inputNewFacRole.value = '';
          loadAdminFacultiesRoster();
          alert("Faculty member successfully added!");
        } else {
          alert(data.message || "Failed to add faculty.");
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Delete Faculty (Admin) - exposed globally
  window.removeFacultyMember = async (id) => {
    if (!confirm("Are you sure you want to remove this faculty member?")) return;

    try {
      const res = await fetch(`/api/admin/faculty/remove/${id}`, {
        method: 'DELETE',
        headers: { 'admin-email': currentUser.email }
      });
      const data = await res.json();
      if (data.success) {
        loadAdminFacultiesRoster();
        alert(data.message);
      } else {
        alert(data.message || "Failed to delete.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================================================
  // ANNOUNCEMENTS MODULE LOGIC
  // ==========================================================================
  const adminTabAnnouncements = document.getElementById('btn-admin-tab-announcements');
  const adminPanelAnnouncements = document.getElementById('admin-panel-announcements');
  const adminAnnouncementsTbody = document.getElementById('admin-announcements-tbody');
  
  const inputAnnTitle = document.getElementById('new-announcement-title');
  const inputAnnTag = document.getElementById('new-announcement-tag');
  const inputAnnMessage = document.getElementById('new-announcement-message');
  const btnAnnPublish = document.getElementById('btn-publish-announcement');

  if (adminTabAnnouncements) {
    adminTabAnnouncements.addEventListener('click', () => {
      adminTabAnnouncements.classList.add('active');
      adminTabStudents.classList.remove('active');
      adminTabFaculties.classList.remove('active');
      if (adminTabQuestions) adminTabQuestions.classList.remove('active');
      adminPanelAnnouncements.style.display = 'block';
      adminPanelStudents.style.display = 'none';
      adminPanelFaculties.style.display = 'none';
      if (adminPanelQuestions) adminPanelQuestions.style.display = 'none';
    });
  }

  // Update existing tab handlers to hide announcements and questions when other tabs are clicked
  if (adminTabStudents) {
    adminTabStudents.addEventListener('click', () => {
      adminTabStudents.classList.add('active');
      adminTabFaculties.classList.remove('active');
      if (adminTabAnnouncements) adminTabAnnouncements.classList.remove('active');
      if (adminTabQuestions) adminTabQuestions.classList.remove('active');
      adminPanelStudents.style.display = 'block';
      adminPanelFaculties.style.display = 'none';
      if (adminPanelAnnouncements) adminPanelAnnouncements.style.display = 'none';
      if (adminPanelQuestions) adminPanelQuestions.style.display = 'none';
    });
  }

  if (adminTabFaculties) {
    adminTabFaculties.addEventListener('click', () => {
      adminTabFaculties.classList.add('active');
      adminTabStudents.classList.remove('active');
      if (adminTabAnnouncements) adminTabAnnouncements.classList.remove('active');
      if (adminTabQuestions) adminTabQuestions.classList.remove('active');
      adminPanelFaculties.style.display = 'block';
      adminPanelStudents.style.display = 'none';
      if (adminPanelAnnouncements) adminPanelAnnouncements.style.display = 'none';
      if (adminPanelQuestions) adminPanelQuestions.style.display = 'none';
    });
  }

  async function loadDashboardAnnouncements() {
    const container = document.getElementById('dashboard-announcements-container');
    if (!container) return;

    try {
      const res = await fetch('/api/announcements');
      const data = await res.json();

      if (data.success) {
        if (data.announcements.length === 0) {
          container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem 0;">No announcements published yet.</p>`;
        } else {
          container.innerHTML = data.announcements.map(ann => {
            let badgeClass = 'badge-info';
            if (ann.tag === 'Placement Drive') badgeClass = 'badge-success';
            if (ann.tag === 'Training Seminar') badgeClass = 'badge-warning';
            if (ann.tag === 'Quiz Arena Update') badgeClass = 'badge-info';

            return `
              <div style="border-left: 3px solid var(--primary); padding-left: 1rem; margin-bottom: 0.5rem; animation: scaleUp 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                  <span class="badge ${badgeClass}" style="font-size: 0.65rem;">${ann.tag}</span>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">${ann.date}</span>
                </div>
                <h4 style="font-size: 0.9rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">${ann.title}</h4>
                <p style="font-size: 0.82rem; color: var(--text-desc); white-space: pre-wrap; line-height: 1.4;">${ann.message}</p>
              </div>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.error("Error loading dashboard announcements", err);
    }
  }

  async function loadAdminAnnouncements() {
    if (!adminAnnouncementsTbody) return;

    try {
      const res = await fetch('/api/announcements');
      const data = await res.json();

      if (data.success) {
        if (data.announcements.length === 0) {
          adminAnnouncementsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No announcements published yet.</td></tr>`;
        } else {
          adminAnnouncementsTbody.innerHTML = data.announcements.map(ann => `
            <tr>
              <td>${ann.date}</td>
              <td><strong>${ann.title}</strong></td>
              <td><span class="badge badge-info">${ann.tag}</span></td>
              <td style="text-align: center; font-weight: 700; color: var(--secondary-bright);">${ann.emailedCount} Students</td>
              <td>
                <button class="btn btn-outline" style="color: var(--danger); padding: 0.35rem 0.75rem; border-color: rgba(244, 63, 94, 0.2);" onclick="window.removeAnnouncement(${ann.id})">
                  <i class="fa-solid fa-trash"></i> Delete
                </button>
              </td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error("Error loading admin announcements roster", err);
    }
  }

  if (btnAnnPublish) {
    btnAnnPublish.addEventListener('click', async () => {
      const title = inputAnnTitle.value.trim();
      const tag = inputAnnTag.value;
      const message = inputAnnMessage.value.trim();

      if (!title || !message) {
        alert("Please fill out both the announcement title and message body.");
        return;
      }

      if (!confirm(`Are you sure you want to publish this announcement? This will send a simulated email broadcast to all registered students.`)) {
        return;
      }

      try {
        const res = await fetch('/api/admin/announcements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'admin-email': currentUser.email
          },
          body: JSON.stringify({ title, tag, message })
        });
        const data = await res.json();

        if (data.success) {
          inputAnnTitle.value = '';
          inputAnnMessage.value = '';
          loadAdminAnnouncements();
          alert(`Announcement broadcasted successfully!\nSimulated emails sent to ${data.announcement.emailedCount} students. Check the node server terminal for the SMTP dispatch logs.`);
        } else {
          alert(data.message || "Failed to publish announcement.");
        }
      } catch (err) {
        console.error("Error publishing announcement", err);
      }
    });
  }

  window.removeAnnouncement = async (id) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'admin-email': currentUser.email }
      });
      const data = await res.json();
      if (data.success) {
        loadAdminAnnouncements();
        alert("Announcement successfully deleted.");
      } else {
        alert(data.message || "Failed to delete announcement.");
      }
    } catch (err) {
      console.error("Error deleting announcement", err);
    }
  };

  // ==========================================================================
  // QUESTIONS DATABASE MANAGER MODULE LOGIC
  // ==========================================================================
  const adminTabQuestions = document.getElementById('btn-admin-tab-questions');
  const adminPanelQuestions = document.getElementById('admin-panel-questions');
  const btnSubtabAptitude = document.getElementById('btn-subtab-aptitude');
  const btnSubtabInterview = document.getElementById('btn-subtab-interview');
  const subpanelAptitude = document.getElementById('subpanel-aptitude');
  const subpanelInterview = document.getElementById('subpanel-interview');

  const adminMcqTbody = document.getElementById('admin-mcq-tbody');
  const adminIntTbody = document.getElementById('admin-int-tbody');

  // Forms MCQ
  const inputMcqQuestion = document.getElementById('mcq-question');
  const inputMcqOpt0 = document.getElementById('mcq-opt0');
  const inputMcqOpt1 = document.getElementById('mcq-opt1');
  const inputMcqOpt2 = document.getElementById('mcq-opt2');
  const inputMcqOpt3 = document.getElementById('mcq-opt3');
  const selectMcqAnswer = document.getElementById('mcq-answer');
  const inputMcqExplanation = document.getElementById('mcq-explanation');
  const btnAddMcq = document.getElementById('btn-add-mcq');

  // Forms Interview
  const selectIntCategory = document.getElementById('int-category');
  const inputIntQuestion = document.getElementById('int-question');
  const inputIntKeywords = document.getElementById('int-keywords');
  const textareaIntGood = document.getElementById('int-good');
  const btnAddInt = document.getElementById('btn-add-int');

  if (adminTabQuestions) {
    adminTabQuestions.addEventListener('click', () => {
      adminTabQuestions.classList.add('active');
      adminTabStudents.classList.remove('active');
      adminTabFaculties.classList.remove('active');
      if (adminTabAnnouncements) adminTabAnnouncements.classList.remove('active');
      
      adminPanelQuestions.style.display = 'block';
      adminPanelStudents.style.display = 'none';
      adminPanelFaculties.style.display = 'none';
      if (adminPanelAnnouncements) adminPanelAnnouncements.style.display = 'none';
      
      loadAdminQuestionsData();
    });
  }

  if (btnSubtabAptitude) {
    btnSubtabAptitude.addEventListener('click', () => {
      btnSubtabAptitude.classList.add('active');
      btnSubtabInterview.classList.remove('active');
      subpanelAptitude.style.display = 'block';
      subpanelInterview.style.display = 'none';
    });
  }

  if (btnSubtabInterview) {
    btnSubtabInterview.addEventListener('click', () => {
      btnSubtabInterview.classList.add('active');
      btnSubtabAptitude.classList.remove('active');
      subpanelInterview.style.display = 'block';
      subpanelAptitude.style.display = 'none';
    });
  }

  async function loadAdminQuestionsData() {
    loadAdminAptitudeQuestions();
    loadAdminInterviewQuestions();
  }

  async function loadAdminAptitudeQuestions() {
    if (!adminMcqTbody) return;
    try {
      const res = await fetch('/api/admin/questions/aptitude', {
        headers: { 'admin-email': currentUser.email }
      });
      const data = await res.json();
      if (data.success) {
        if (data.questions.length === 0) {
          adminMcqTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No aptitude questions available.</td></tr>`;
        } else {
          adminMcqTbody.innerHTML = data.questions.map(q => `
            <tr style="animation: scaleUp 0.25s ease;">
              <td><strong>${q.question}</strong></td>
              <td style="font-size: 0.8rem; color: var(--text-desc);">
                0: ${q.options[0]}<br>
                1: ${q.options[1]}<br>
                2: ${q.options[2]}<br>
                3: ${q.options[3]}
              </td>
              <td style="text-align: center; font-weight: 700; color: var(--secondary-bright);">Index ${q.answer}</td>
              <td>
                <button class="btn btn-outline" style="color: var(--danger); padding: 0.35rem 0.75rem; border-color: rgba(244, 63, 94, 0.2);" onclick="window.removeAptitudeQuestion(${q.id})">
                  <i class="fa-solid fa-trash"></i> Remove
                </button>
              </td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadAdminInterviewQuestions() {
    if (!adminIntTbody) return;
    try {
      const res = await fetch('/api/questions/interview');
      const data = await res.json();
      if (data.success) {
        const hrQ = data.interviewQuestions.hr || [];
        const techQ = data.interviewQuestions.technical || [];
        const allQuestions = [...hrQ.map(q => ({...q, category: 'hr'})), ...techQ.map(q => ({...q, category: 'technical'}))];

        if (allQuestions.length === 0) {
          adminIntTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No interview prompts available.</td></tr>`;
        } else {
          adminIntTbody.innerHTML = allQuestions.map(q => `
            <tr style="animation: scaleUp 0.25s ease;">
              <td><span class="badge ${q.category === 'hr' ? 'badge-info' : 'badge-success'}">${q.category.toUpperCase()}</span></td>
              <td><strong>${q.question}</strong></td>
              <td style="font-size: 0.8rem; color: var(--text-desc);">${q.keywords.join(', ')}</td>
              <td>
                <button class="btn btn-outline" style="color: var(--danger); padding: 0.35rem 0.75rem; border-color: rgba(244, 63, 94, 0.2);" onclick="window.removeInterviewQuestion('${q.category}', ${q.id})">
                  <i class="fa-solid fa-trash"></i> Remove
                </button>
              </td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (btnAddMcq) {
    btnAddMcq.addEventListener('click', async () => {
      const question = inputMcqQuestion.value.trim();
      const opt0 = inputMcqOpt0.value.trim();
      const opt1 = inputMcqOpt1.value.trim();
      const opt2 = inputMcqOpt2.value.trim();
      const opt3 = inputMcqOpt3.value.trim();
      const answer = selectMcqAnswer.value;
      const explanation = inputMcqExplanation.value.trim();

      if (!question || !opt0 || !opt1 || !opt2 || !opt3 || !explanation) {
        alert("Please fill out all fields for the MCQ question.");
        return;
      }

      try {
        const res = await fetch('/api/admin/questions/aptitude', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'admin-email': currentUser.email
          },
          body: JSON.stringify({
            question,
            options: [opt0, opt1, opt2, opt3],
            answer,
            explanation
          })
        });
        const data = await res.json();
        if (data.success) {
          inputMcqQuestion.value = '';
          inputMcqOpt0.value = '';
          inputMcqOpt1.value = '';
          inputMcqOpt2.value = '';
          inputMcqOpt3.value = '';
          inputMcqExplanation.value = '';
          loadAdminAptitudeQuestions();
          alert("Aptitude question successfully added!");
        } else {
          alert(data.message || "Failed to add MCQ.");
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  if (btnAddInt) {
    btnAddInt.addEventListener('click', async () => {
      const category = selectIntCategory.value;
      const question = inputIntQuestion.value.trim();
      const keywords = inputIntKeywords.value.trim();
      const goodPhrasing = textareaIntGood.value.trim();

      if (!question || !keywords || !goodPhrasing) {
        alert("Please fill out all fields for the Interview Prompt.");
        return;
      }

      try {
        const res = await fetch('/api/admin/questions/interview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'admin-email': currentUser.email
          },
          body: JSON.stringify({ category, question, keywords, goodPhrasing })
        });
        const data = await res.json();
        if (data.success) {
          inputIntQuestion.value = '';
          inputIntKeywords.value = '';
          textareaIntGood.value = '';
          loadAdminInterviewQuestions();
          alert("Interview prompt successfully added!");
        } else {
          alert(data.message || "Failed to add prompt.");
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  window.removeAptitudeQuestion = async (id) => {
    if (!confirm("Are you sure you want to remove this aptitude question?")) return;
    try {
      const res = await fetch(`/api/admin/questions/aptitude/${id}`, {
        method: 'DELETE',
        headers: { 'admin-email': currentUser.email }
      });
      const data = await res.json();
      if (data.success) {
        loadAdminAptitudeQuestions();
        alert(data.message);
      } else {
        alert(data.message || "Failed to delete.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  window.removeInterviewQuestion = async (category, id) => {
    if (!confirm("Are you sure you want to remove this interview question?")) return;
    try {
      const res = await fetch(`/api/admin/questions/interview/${category}/${id}`, {
        method: 'DELETE',
        headers: { 'admin-email': currentUser.email }
      });
      const data = await res.json();
      if (data.success) {
        loadAdminInterviewQuestions();
        alert(data.message);
      } else {
        alert(data.message || "Failed to delete.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================================================
  // ROADMAP MODULE
  // ==========================================================================
  const ROADMAP_DATA = [
    {
      id: "milestone-1",
      title: "Milestone 1: Verbal & Logical Foundation",
      description: "Establish basic grammar correctness, quantitative reasoning speed, and key logical deduction capabilities.",
      tasks: [
        { id: "task-1-1", text: "Learn 100 high-frequency placement words (synonyms/antonyms)" },
        { id: "task-1-2", text: "Master speed math tricks for quantitative aptitude (Percentages & Ratios)" },
        { id: "task-1-3", text: "Practice linear and circular logical seating arrangements" }
      ]
    },
    {
      id: "milestone-2",
      title: "Milestone 2: Coding Core & Technical Foundations",
      description: "Build logic in a primary language (Java/C++/Python) and understand core backend structures.",
      tasks: [
        { id: "task-2-1", text: "Understand Arrays, Strings, and basic Linked List traversal" },
        { id: "task-2-2", text: "Study Object-Oriented Programming principles (Inheritance, Polymorphism)" },
        { id: "task-2-3", text: "Review key SQL queries and DBMS indexing mechanics" }
      ]
    },
    {
      id: "milestone-3",
      title: "Milestone 3: Literary Mastery (GDs & Presentation)",
      description: "Perfect spoken communication, group coordination, and structured speaking patterns.",
      tasks: [
        { id: "task-3-1", text: "Practice speaking on 5 abstract GD topics (using templates)" },
        { id: "task-3-2", text: "Design a 60-second professional elevator pitch" },
        { id: "task-3-3", text: "Perform peer reviews on team speaking speed and posture" }
      ]
    },
    {
      id: "milestone-4",
      title: "Milestone 4: Profile & Resume Optimization",
      description: "Translate your achievements into high-converting professional portfolios.",
      tasks: [
        { id: "task-4-1", text: "Write 3 key behavioral stories using the STAR Method" },
        { id: "task-4-2", text: "Build a single-page ATS-friendly LaTeX or clean-styled resume" },
        { id: "task-4-3", text: "Clean up your GitHub profile (Add project READMEs and structures)" }
      ]
    },
    {
      id: "milestone-5",
      title: "Milestone 5: The Final Showdown (Mock Interviews)",
      description: "Simulate live high-pressure coding rounds and behavioral board calls.",
      tasks: [
        { id: "task-5-1", text: "Run 2 AI Voice Mock interviews (Get scorecards above 80%)" },
        { id: "task-5-2", text: "Prepare answers to typical HR questions ('Why should we hire you?')" },
        { id: "task-5-3", text: "Review negotiation templates and post-interview email follow-ups" }
      ]
    }
  ];

  function renderRoadmap() {
    const container = document.getElementById('roadmap-timeline-container');
    if (!container) return;

    let savedProgress = JSON.parse(localStorage.getItem('litcrack_roadmap_progress') || '{}');

    container.innerHTML = ROADMAP_DATA.map(node => {
      let nodeStatusClass = 'roadmap-node';
      let nodeTasksHtml = node.tasks.map(t => {
        let isChecked = savedProgress[t.id] ? 'checked' : '';
        return `
          <li>
            <input type="checkbox" id="${t.id}" ${isChecked} data-task-id="${t.id}">
            <label for="${t.id}">${t.text}</label>
          </li>
        `;
      }).join('');

      return `
        <div class="${nodeStatusClass}" id="node-${node.id}">
          <div class="roadmap-content">
            <h3>${node.title}</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.75rem;">${node.description}</p>
            <ul class="roadmap-tasks">
              ${nodeTasksHtml}
            </ul>
          </div>
        </div>
      `;
    }).join('');

    // Attach listeners
    container.querySelectorAll('input[type="checkbox"]').forEach(box => {
      box.addEventListener('change', (e) => {
        const taskId = e.target.getAttribute('data-task-id');
        savedProgress[taskId] = e.target.checked;
        localStorage.setItem('litcrack_roadmap_progress', JSON.stringify(savedProgress));
        updateRoadmapNodeStates();
        updateDashboardStats();

        if (currentUser && currentUser.role === 'student') {
          window.syncStudentProgressToServer({ roadmapProgress: savedProgress });
        }
      });
    });

    updateRoadmapNodeStates();
  }

  function updateRoadmapNodeStates() {
    let savedProgress = JSON.parse(localStorage.getItem('litcrack_roadmap_progress') || '{}');

    ROADMAP_DATA.forEach(node => {
      const nodeEl = document.getElementById(`node-${node.id}`);
      if (!nodeEl) return;

      const allChecked = node.tasks.every(t => savedProgress[t.id]);
      const someChecked = node.tasks.some(t => savedProgress[t.id]);

      nodeEl.className = 'roadmap-node';
      if (allChecked) {
        nodeEl.classList.add('completed');
      } else if (someChecked) {
        nodeEl.classList.add('active');
      }
    });
  }

  // ==========================================================================
  // DASHBOARD STATS REFRESH
  // ==========================================================================
  function updateDashboardStats() {
    // 1. Roadmap progress calculation
    let savedProgress = JSON.parse(localStorage.getItem('litcrack_roadmap_progress') || '{}');
    let totalTasks = ROADMAP_DATA.reduce((acc, curr) => acc + curr.tasks.length, 0);
    let checkedTasks = Object.values(savedProgress).filter(Boolean).length;
    let progressPercentage = totalTasks > 0 ? Math.round((checkedTasks / totalTasks) * 100) : 0;

    const progressStat = document.getElementById('stat-roadmap-progress');
    if (progressStat) progressStat.innerText = `${progressPercentage}%`;

    // 2. Practice quiz score calculation
    let practiceScores = JSON.parse(localStorage.getItem('litcrack_practice_scores') || '[]');
    let avgScore = 0;
    if (practiceScores.length > 0) {
      let sum = practiceScores.reduce((acc, s) => acc + s, 0);
      avgScore = Math.round(sum / practiceScores.length);
    }
    const quizStat = document.getElementById('stat-quiz-score');
    if (quizStat) quizStat.innerText = `${avgScore}%`;

    // 3. GD practice count
    let gdCount = localStorage.getItem('litcrack_gd_count') || '0';
    const gdStat = document.getElementById('stat-gd-topics');
    if (gdStat) gdStat.innerText = gdCount;
  }

  // ==========================================================================
  // GROUP DISCUSSION HUB
  // ==========================================================================
  const GD_TOPICS = [
    "Is generative AI a threat to entry-level software developer roles?",
    "Should college exams be replaced entirely by project-based evaluations?",
    "Social media algorithms: Connecting people or polarizing societies?",
    "Electric Vehicles: Are we ready for 100% adoption by 2030?",
    "Is corporate micro-management killing employee creativity?",
    "Literary and verbal communication vs coding logic: Which is more vital in software team success?"
  ];

  const GD_TEMPLATES = [
    { title: "Opening the discussion:", text: "\"I'd like to initiate the discussion by laying out the baseline. The topic points to... and there are two primary facets we must explore...\"" },
    { title: "Adding constructive arguments:", text: "\"Building on what my colleague said, it is also essential to evaluate the technical implications of...\"" },
    { title: "Politely disagreeing:", text: "\"I understand your viewpoint, however, we must also consider the practical constraints of...\"" },
    { title: "Summarizing / Closing:", text: "\"As we near the end of our discussion, it is evident that while... is beneficial, a hybrid approach combining... is the ideal solution.\"" }
  ];

  const gdTopicDisplay = document.getElementById('gd-topic-display');
  const btnGdGenerate = document.getElementById('btn-gd-generate');
  const btnGdTimer = document.getElementById('btn-gd-timer');
  const gdTimerRing = document.getElementById('gd-timer-ring');
  let gdTimerInterval = null;
  let gdTimeLeft = 120; // 2 minutes

  if (btnGdGenerate) {
    btnGdGenerate.addEventListener('click', () => {
      const idx = Math.floor(Math.random() * GD_TOPICS.length);
      gdTopicDisplay.innerText = GD_TOPICS[idx];
      
      let currentCount = parseInt(localStorage.getItem('litcrack_gd_count') || '0');
      const newCount = currentCount + 1;
      localStorage.setItem('litcrack_gd_count', newCount);
      updateDashboardStats();

      if (currentUser && currentUser.role === 'student') {
        window.syncStudentProgressToServer({ gdCount: newCount });
      }

      clearInterval(gdTimerInterval);
      gdTimeLeft = 120;
      gdTimerRing.innerText = "02:00";
      gdTimerRing.classList.remove('active');
      btnGdTimer.innerText = "Start Timer";
    });
  }

  if (btnGdTimer) {
    btnGdTimer.addEventListener('click', () => {
      if (gdTimerInterval) {
        clearInterval(gdTimerInterval);
        gdTimerInterval = null;
        gdTimerRing.classList.remove('active');
        btnGdTimer.innerText = "Resume Timer";
      } else {
        gdTimerRing.classList.add('active');
        btnGdTimer.innerText = "Pause Timer";
        gdTimerInterval = setInterval(() => {
          gdTimeLeft--;
          let minutes = Math.floor(gdTimeLeft / 60);
          let seconds = gdTimeLeft % 60;
          gdTimerRing.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

          if (gdTimeLeft <= 0) {
            clearInterval(gdTimerInterval);
            gdTimerInterval = null;
            gdTimerRing.classList.remove('active');
            btnGdTimer.innerText = "Start Timer";
            alert("GD prep time completed! Ready to summarize?");
          }
        }, 1000);
      }
    });
  }

  const gdTemplatesContainer = document.getElementById('gd-templates-container');
  if (gdTemplatesContainer) {
    gdTemplatesContainer.innerHTML = GD_TEMPLATES.map(t => `
      <div>
        <strong>${t.title}</strong>
        <p class="template-box">${t.text}</p>
      </div>
    `).join('');
  }

  // ==========================================================================
  // STAR METHOD BUILDER
  // ==========================================================================
  const starInputs = {
    situation: document.getElementById('star-situation'),
    task: document.getElementById('star-task'),
    action: document.getElementById('star-action'),
    result: document.getElementById('star-result')
  };

  const starPreviews = {
    s: document.getElementById('preview-s'),
    t: document.getElementById('preview-t'),
    a: document.getElementById('preview-a'),
    r: document.getElementById('preview-r')
  };

  const starQuestion = document.getElementById('star-question-selector');
  const btnSaveStar = document.getElementById('btn-save-star');
  const btnExportStar = document.getElementById('btn-export-star');

  function updateStarPreview() {
    if (starInputs.situation) starPreviews.s.innerText = starInputs.situation.value || "Type in the situation input field...";
    if (starInputs.task) starPreviews.t.innerText = starInputs.task.value || "Type in the task input field...";
    if (starInputs.action) starPreviews.a.innerText = starInputs.action.value || "Type in the action input field...";
    if (starInputs.result) starPreviews.r.innerText = starInputs.result.value || "Type in the result input field...";
  }

  Object.keys(starInputs).forEach(key => {
    if (starInputs[key]) {
      starInputs[key].addEventListener('input', updateStarPreview);
    }
  });

  if (btnSaveStar) {
    btnSaveStar.addEventListener('click', () => {
      const compiled = {
        question: starQuestion.value,
        situation: starInputs.situation.value,
        task: starInputs.task.value,
        action: starInputs.action.value,
        result: starInputs.result.value,
        timestamp: new Date().toLocaleDateString()
      };
      
      localStorage.setItem('litcrack_star_saved', JSON.stringify(compiled));
      alert("STAR Answer Card successfully saved locally!");

      if (currentUser && currentUser.role === 'student') {
        window.syncStudentProgressToServer({ starAnswers: compiled });
      }
    });
  }

  if (btnExportStar) {
    btnExportStar.addEventListener('click', () => {
      const text = `STAR ANSWER CARD\nQuestion: ${starQuestion.value}\n\n[S] Situation:\n${starInputs.situation.value}\n\n[T] Task:\n${starInputs.task.value}\n\n[A] Action:\n${starInputs.action.value}\n\n[R] Result:\n${starInputs.result.value}`;
      navigator.clipboard.writeText(text).then(() => {
        alert("STAR Card text copied to clipboard!");
      }).catch(err => {
        console.error("Failed to copy card", err);
      });
    });
  }

  syncStarCardInputsFromLocalStorage();

  // ==========================================================================
  // PRACTICE QUIZ ARENA
  // ==========================================================================
  const PRACTICE_QUESTIONS = {
    verbal: [
      {
        question: "Select the correct meaning of the underlined idiom: He is a 'dark horse' in the placement competition.",
        options: ["An elite candidate who always leads", "An unexpected winner who was previously unknown", "A candidate who performs poorly in exams", "A candidate with unfair resources"],
        answer: 1,
        explanation: "'Dark horse' refers to a candidate or competitor who is little known but unexpectedly wins or succeeds."
      },
      {
        question: "Choose the grammatically correct sentence structure:",
        options: [
          "Either the HR manager or the engineers has to submit the code review.",
          "Either the HR manager or the engineers have to submit the code review.",
          "Either the HR manager or the engineers are having to submit the code review.",
          "Either the HR manager or the engineers is to submit the code review."
        ],
        answer: 1,
        explanation: "When subject elements are joined by 'either... or', the verb agrees with the subject closest to it. 'Engineers' is plural, so we use 'have to'."
      },
      {
        question: "Which of the following words is a SYNONYM of 'METICULOUS'?",
        options: ["Sloppy", "Scrupulous/Precise", "Aggressive", "Carefree"],
        answer: 1,
        explanation: "Meticulous means showing great attention to detail; very careful and precise (synonymous with scrupulous)."
      }
    ],
    technical: [
      {
        question: "What is the time complexity of searching an element in a balanced Binary Search Tree (BST) of N nodes?",
        options: ["O(1)", "O(N)", "O(log N)", "O(N log N)"],
        answer: 2,
        explanation: "Searching in a balanced BST halves the search space at each node decision, yielding a logarithmic runtime of O(log N)."
      },
      {
        question: "In standard database transactions, what does the 'I' represent in the ACID compliance model?",
        options: ["Inheritance", "Index", "Isolation", "Integration"],
        answer: 2,
        explanation: "ACID stands for Atomicity, Consistency, Isolation, and Durability. Isolation ensures concurrent transactions execute without interference."
      },
      {
        question: "Which code compilation phase gathers diagnostic statistics and creates syntax trees?",
        options: ["Semantic Analysis", "Lexical Analysis", "Syntax Analysis/Parsing", "Code Generation"],
        answer: 2,
        explanation: "Parsing or Syntax Analysis reads tokens from lexical analysis and aggregates them into a hierarchical structure called a Syntax Tree."
      }
    ]
  };

  let activeQuizDomain = 'verbal';
  let activeQuestionIndex = 0;
  let activeQuizScore = 0;

  const panelSelection = document.getElementById('quiz-selection-panel');
  const panelPlay = document.getElementById('quiz-play-panel');
  const panelResults = document.getElementById('quiz-results-panel');
  const questionTitle = document.getElementById('quiz-question-title');
  const optionsContainer = document.getElementById('quiz-options-container');
  const progressText = document.getElementById('quiz-progress-text');
  const scoreBadge = document.getElementById('quiz-score-badge');
  const explanationBox = document.getElementById('quiz-explanation-box');
  const explanationText = document.getElementById('quiz-explanation-text');
  const btnNext = document.getElementById('btn-quiz-next');

  window.startPracticeQuiz = (domain) => {
    activeQuizDomain = domain;
    activeQuestionIndex = 0;
    activeQuizScore = 0;

    panelSelection.style.display = 'none';
    panelPlay.style.display = 'block';
    panelResults.style.display = 'none';
    
    loadQuestion();
  };

  function loadQuestion() {
    const questionsList = PRACTICE_QUESTIONS[activeQuizDomain];
    const q = questionsList[activeQuestionIndex];

    progressText.innerText = `Question ${activeQuestionIndex + 1} of ${questionsList.length}`;
    scoreBadge.innerText = `Score: ${activeQuizScore}`;
    questionTitle.innerText = q.question;
    
    explanationBox.style.display = 'none';
    btnNext.style.display = 'none';

    optionsContainer.innerHTML = q.options.map((opt, idx) => `
      <button class="option-btn" onclick="window.selectQuizOption(${idx})">${opt}</button>
    `).join('');
  }

  window.selectQuizOption = (selectedIndex) => {
    const questionsList = PRACTICE_QUESTIONS[activeQuizDomain];
    const q = questionsList[activeQuestionIndex];
    const btns = optionsContainer.querySelectorAll('.option-btn');

    btns.forEach((btn, idx) => {
      btn.removeAttribute('onclick');
      if (idx === q.answer) {
        btn.classList.add('correct');
      } else if (idx === selectedIndex) {
        btn.classList.add('wrong');
      }
    });

    if (selectedIndex === q.answer) {
      activeQuizScore++;
      scoreBadge.innerText = `Score: ${activeQuizScore}`;
    }

    explanationText.innerText = q.explanation;
    explanationBox.style.display = 'block';
    btnNext.style.display = 'block';
  };

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const questionsList = PRACTICE_QUESTIONS[activeQuizDomain];
      activeQuestionIndex++;

      if (activeQuestionIndex < questionsList.length) {
        loadQuestion();
      } else {
        panelPlay.style.display = 'none';
        panelResults.style.display = 'block';

        let percent = Math.round((activeQuizScore / questionsList.length) * 100);
        document.getElementById('quiz-final-score').innerText = `${percent}%`;

        let scores = JSON.parse(localStorage.getItem('litcrack_practice_scores') || '[]');
        scores.push(percent);
        localStorage.setItem('litcrack_practice_scores', JSON.stringify(scores));

        // Sync practice scores with database profile
        if (currentUser && currentUser.role === 'student') {
          window.syncStudentProgressToServer({ practiceScores: scores });
        }

        updateDashboardStats();
      }
    });
  }

  window.resetQuizArena = () => {
    panelSelection.style.display = 'block';
    panelPlay.style.display = 'none';
    panelResults.style.display = 'none';
  };

  // ==========================================================================
  // 3D CARD HOVER TILT SCRIPT
  // ==========================================================================
  function init3DTilt() {
    const cards = document.querySelectorAll('.glass-card');
    cards.forEach(card => {
      card.style.transition = 'transform 0.1s ease, box-shadow 0.3s ease, border-color 0.3s ease';
      
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((centerY - y) / centerY) * 6; 
        const rotateY = ((x - centerX) / centerX) * 6;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s ease';
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0deg)`;
      });
    });
  }

  // Initial Boot Actions
  checkSession();
  renderRoadmap();
  updateDashboardStats();
  init3DTilt();

  window.reinit3DTilt = init3DTilt;
});
