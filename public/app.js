/* ==========================================================================
   LITCRACK FRONTEND CLIENT (ROUTER, SESSION AUTH, ADMIN & CORE MODULES)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // In-app Toast Notification System
  window.showAppToast = function(message, isWarning = false) {
    const existing = document.querySelectorAll('.gd-toast-notify');
    existing.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'gd-toast-notify' + (isWarning ? ' timer-finished' : '');
    toast.innerHTML = `
      <i class="fa-solid ${isWarning ? 'fa-bell fa-bounce' : 'fa-circle-check'}" style="color: ${isWarning ? 'var(--danger)' : 'var(--secondary)'}; font-size: 1.1rem;"></i>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('out-anim');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  };

  const showGdToast = window.showAppToast;

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

  // Mobile Drawer Toggle with scroll lock
  function toggleSidebar() {
    sidebar.classList.toggle('open');
    if (sidebar.classList.contains('open')) {
      overlay.style.display = 'block';
      document.body.style.overflow = 'hidden';
    } else {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
  if (overlay) overlay.addEventListener('click', toggleSidebar);

  // Desktop sidebar scroll lock on hover
  if (sidebar) {
    sidebar.addEventListener('mouseenter', () => {
      if (window.innerWidth > 768) {
        document.body.style.overflow = 'hidden';
      }
    });
    sidebar.addEventListener('mouseleave', () => {
      if (window.innerWidth > 768) {
        document.body.style.overflow = '';
      }
    });
  }

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
    } else if (viewId === 'student-profile') {
      renderStudentProfile();
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

  // JS-driven count-up stats counter logic
  function runLandingStatsCounter() {
    const stats = [
      { id: 'landing-stat-questions', target: 1250 },
      { id: 'landing-stat-roadmap', target: 15 },
      { id: 'landing-stat-interviews', target: 100 },
      { id: 'landing-stat-pass', target: 100 }
    ];

    stats.forEach(stat => {
      const el = document.getElementById(stat.id);
      if (!el) return;

      let current = 0;
      const duration = 1500; // 1.5 seconds
      const steps = 60;
      const stepTime = duration / steps;
      const increment = stat.target / steps;

      el.innerText = '0';

      const interval = setInterval(() => {
        current += increment;
        if (current >= stat.target) {
          el.innerText = stat.target + (stat.id === 'landing-stat-questions' || stat.id === 'landing-stat-interviews' ? '+' : (stat.id === 'landing-stat-pass' ? '%' : ''));
          clearInterval(interval);
        } else {
          el.innerText = Math.floor(current) + (stat.id === 'landing-stat-questions' || stat.id === 'landing-stat-interviews' ? '+' : (stat.id === 'landing-stat-pass' ? '%' : ''));
        }
      }, stepTime);
    });
  }

  // Check existing session
  function checkSession() {
    const saved = localStorage.getItem('litcrack_user');
    const landingPage = document.getElementById('landing-page');
    const btnLandingBegin = document.getElementById('btn-landing-begin');

    if (btnLandingBegin) {
      btnLandingBegin.addEventListener('click', () => {
        authOverlay.style.display = 'flex';
      });
    }

    if (saved) {
      currentUser = JSON.parse(saved);
      applyUserSession();
      if (landingPage) landingPage.style.display = 'none';
    } else {
      if (landingPage) {
        landingPage.style.display = 'flex';
        authOverlay.style.display = 'none';
        runLandingStatsCounter();
      } else {
        authOverlay.style.display = 'flex';
      }
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

    // Prepare payload
    let payload = { ...data };
    if (payload.roadmapProgress !== undefined) {
      const profile = JSON.parse(localStorage.getItem('litcrack_student_profile') || 'null');
      if (profile) {
        // Merge profile into roadmapProgress payload under __profile
        payload.roadmapProgress = { ...payload.roadmapProgress, __profile: profile };
      }
    }

    try {
      const res = await fetch('/api/student/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, ...payload })
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
    
    // Parse library list
    let library = [];
    try {
      library = JSON.parse(localStorage.getItem('litcrack_star_saved_library') || '[]');
    } catch (e) {
      library = [];
    }

    // Migration and alignment logic
    if (Array.isArray(savedStar)) {
      library = savedStar;
      localStorage.setItem('litcrack_star_saved_library', JSON.stringify(library));
      localStorage.removeItem('litcrack_star_saved');
    } else if (savedStar && savedStar.library && Array.isArray(savedStar.library)) {
      library = savedStar.library;
      localStorage.setItem('litcrack_star_saved_library', JSON.stringify(library));
      if (savedStar.activeDraft) {
        localStorage.setItem('litcrack_star_saved', JSON.stringify(savedStar.activeDraft));
      }
    }

    // Populating inputs from active draft
    const draft = JSON.parse(localStorage.getItem('litcrack_star_saved') || 'null');
    const starQuestionSel = document.getElementById('star-question-selector');
    const starCustomQuestionIn = document.getElementById('star-custom-question-input');
    const btnStarModeSel = document.getElementById('btn-star-mode-select');
    const btnStarModeCust = document.getElementById('btn-star-mode-custom');
    
    if (draft) {
      if (starQuestionSel) {
        if (draft.isCustom) {
          if (btnStarModeCust) btnStarModeCust.click();
          if (starCustomQuestionIn) starCustomQuestionIn.value = draft.question || '';
        } else {
          if (btnStarModeSel) btnStarModeSel.click();
          starQuestionSel.value = draft.question || '';
        }
      }
      if (typeof starInputs !== 'undefined') {
        if (starInputs.situation) starInputs.situation.value = draft.situation || '';
        if (starInputs.task) starInputs.task.value = draft.task || '';
        if (starInputs.action) starInputs.action.value = draft.action || '';
        if (starInputs.result) starInputs.result.value = draft.result || '';
      }
    } else {
      if (starInputs.situation) starInputs.situation.value = '';
      if (starInputs.task) starInputs.task.value = '';
      if (starInputs.action) starInputs.action.value = '';
      if (starInputs.result) starInputs.result.value = '';
    }

    if (typeof updateStarPreview === 'function') {
      updateStarPreview();
    }
    if (typeof updateAllLengthGuides === 'function') {
      updateAllLengthGuides();
    }
    if (typeof renderStarLibrary === 'function') {
      renderStarLibrary();
    }
  }

  // Apply user role view layout
  function applyUserSession() {
    authOverlay.style.display = 'none';
    const landingPage = document.getElementById('landing-page');
    if (landingPage) landingPage.style.display = 'none';
    
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

    // Dynamic welcome message greeting
    const welcomeTitle = document.getElementById('dashboard-welcome-title');
    if (welcomeTitle) {
      welcomeTitle.innerHTML = `Welcome back, <span style="background: linear-gradient(135deg, var(--primary-bright), var(--accent-rose)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;">${currentUser.name}</span>!`;
    }

    // Toggle Sidebar controls depending on roles
    const adminLink = document.getElementById('sidebar-menu-admin');
    const roadmapLink = document.getElementById('sidebar-menu-roadmap');
    const gdLink = document.getElementById('sidebar-menu-gd');
    const starLink = document.getElementById('sidebar-menu-star');
    const quizLink = document.getElementById('sidebar-menu-quiz');
    const liveLink = document.getElementById('sidebar-menu-livetest');
    const aiLink = document.getElementById('sidebar-menu-ai');
    const profileLink = document.getElementById('sidebar-menu-profile');
    
    const adminCreateLobby = document.getElementById('admin-create-room-panel');

    if (currentUser.role === 'admin') {
      navRole.innerText = "KLECET Administrator";
      if (adminLink) adminLink.style.display = 'block';
      if (roadmapLink) roadmapLink.style.display = 'none';
      if (gdLink) gdLink.style.display = 'none';
      if (starLink) starLink.style.display = 'none';
      if (quizLink) quizLink.style.display = 'none';
      if (liveLink) liveLink.style.display = 'none';
      if (aiLink) aiLink.style.display = 'none';
      if (profileLink) profileLink.style.display = 'none';
      if (adminCreateLobby) adminCreateLobby.style.display = 'block';
      const headerProfileShortcut = document.getElementById('header-profile-shortcut');
      if (headerProfileShortcut) headerProfileShortcut.style.display = 'none';
      window.switchView('admin-deck');
    } else {
      const headerProfileShortcut = document.getElementById('header-profile-shortcut');
      if (headerProfileShortcut) headerProfileShortcut.style.display = 'flex';
      navRole.innerText = `${currentUser.branch} - ${currentUser.usn}`;
      if (adminLink) adminLink.style.display = 'none';
      if (roadmapLink) roadmapLink.style.display = 'block';
      if (gdLink) gdLink.style.display = 'block';
      if (starLink) starLink.style.display = 'block';
      if (quizLink) quizLink.style.display = 'block';
      if (liveLink) liveLink.style.display = 'block';
      if (aiLink) aiLink.style.display = 'block';
      if (profileLink) profileLink.style.display = 'block';
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
        let rp = currentUser.roadmapProgress || {};
        if (rp.__profile) {
          localStorage.setItem('litcrack_student_profile', JSON.stringify(rp.__profile));
          rp = { ...rp };
          delete rp.__profile;
        }
        localStorage.setItem('litcrack_roadmap_progress', JSON.stringify(rp));
      }
      if (currentUser.starAnswers !== undefined) {
        localStorage.setItem('litcrack_star_saved', JSON.stringify(currentUser.starAnswers || null));
      }
      if (currentUser.gdCount !== undefined) {
        localStorage.setItem('litcrack_gd_count', currentUser.gdCount || 0);
      }

      // Sync STAR Card Inputs
      syncStarCardInputsFromLocalStorage();

      // Load Profile theme & details into Sidebar Profile Widget
      const profile = JSON.parse(localStorage.getItem('litcrack_student_profile') || 'null');
      if (profile) {
        updateSidebarProfile(profile);
        if (welcomeTitle) {
          welcomeTitle.innerHTML = `Welcome back, <span style="background: linear-gradient(135deg, var(--primary-bright), var(--accent-rose)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;">${profile.name}</span>!`;
        }
      } else {
        updateSidebarProfile({
          name: currentUser.name,
          role: "KLECET Aspirant",
          theme: "amethyst"
        });
      }

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
        const landingPage = document.getElementById('landing-page');
        if (landingPage) {
          landingPage.style.display = 'flex';
          authOverlay.style.display = 'none';
          runLandingStatsCounter();
          if (typeof initLandingCanvas === 'function') initLandingCanvas();
        } else {
          authOverlay.style.display = 'flex';
        }
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

  // Persist open milestones state
  let openMilestones = JSON.parse(localStorage.getItem('litcrack_roadmap_open') || '["milestone-1"]');

  window.toggleMilestone = (nodeId) => {
    const nodeEl = document.getElementById(`node-${nodeId}`);
    if (!nodeEl) return;
    const bodyEl = nodeEl.querySelector('.roadmap-body');
    if (!bodyEl) return;

    const isOpen = nodeEl.classList.contains('open-node');
    if (isOpen) {
      // Collapse
      bodyEl.style.maxHeight = bodyEl.scrollHeight + 'px';
      setTimeout(() => {
        bodyEl.style.maxHeight = '0px';
        bodyEl.classList.remove('open');
      }, 10);
      nodeEl.classList.remove('open-node');
      openMilestones = openMilestones.filter(id => id !== nodeId);
    } else {
      // Expand
      bodyEl.classList.add('open');
      bodyEl.style.maxHeight = bodyEl.scrollHeight + 'px';
      nodeEl.classList.add('open-node');
      setTimeout(() => {
        bodyEl.style.maxHeight = 'none';
      }, 450);
      if (!openMilestones.includes(nodeId)) {
        openMilestones.push(nodeId);
      }
    }
    localStorage.setItem('litcrack_roadmap_open', JSON.stringify(openMilestones));
  };

  function renderRoadmap() {
    const container = document.getElementById('roadmap-nodes-list');
    if (!container) return;

    let savedProgress = JSON.parse(localStorage.getItem('litcrack_roadmap_progress') || '{}');

    container.innerHTML = ROADMAP_DATA.map(node => {
      let nodeTasksHtml = node.tasks.map(t => {
        let isChecked = savedProgress[t.id] ? 'checked' : '';
        return `
          <li>
            <input type="checkbox" id="${t.id}" ${isChecked} data-task-id="${t.id}">
            <label for="${t.id}">${t.text}</label>
          </li>
        `;
      }).join('');

      let completedCount = node.tasks.filter(t => savedProgress[t.id]).length;
      let totalCount = node.tasks.length;
      let progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      let isExpanded = openMilestones.includes(node.id);
      let bodyClass = isExpanded ? 'roadmap-body open' : 'roadmap-body';
      let nodeClass = 'roadmap-node' + (isExpanded ? ' open-node' : '');
      let maxStyle = isExpanded ? 'style="max-height: none;"' : 'style="max-height: 0px;"';

      let badgeHtml = '';
      if (progressPercent === 100) {
        badgeHtml = `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Completed</span>`;
      } else if (progressPercent > 0) {
        badgeHtml = `<span class="badge badge-progressing"><i class="fa-solid fa-spinner fa-spin"></i> In Progress</span>`;
      } else {
        badgeHtml = `<span class="badge badge-locked">Not Started</span>`;
      }

      return `
        <div class="${nodeClass}" id="node-${node.id}">
          <div class="roadmap-content">
            <div class="roadmap-header" onclick="window.toggleMilestone('${node.id}')">
              <div style="flex-grow: 1; margin-right: 1.5rem;">
                <h3>${node.title}</h3>
                <div class="node-progress-container">
                  <div class="node-progress-track">
                    <div class="node-progress-bar" id="progress-bar-${node.id}" style="width: ${progressPercent}%;"></div>
                  </div>
                  <span class="node-progress-text" id="progress-text-${node.id}">${completedCount} / ${totalCount} Tasks</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div id="badge-container-${node.id}">${badgeHtml}</div>
                <i class="fa-solid fa-chevron-down roadmap-chevron"></i>
              </div>
            </div>
            <div class="${bodyClass}" ${maxStyle}>
              <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.75rem; margin-top: 0.5rem;">${node.description}</p>
              <ul class="roadmap-tasks">
                ${nodeTasksHtml}
              </ul>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach checkbox event listeners
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
    let overallChecked = 0;
    let overallTotal = 0;

    ROADMAP_DATA.forEach(node => {
      const nodeEl = document.getElementById(`node-${node.id}`);
      if (!nodeEl) return;

      const completedCount = node.tasks.filter(t => savedProgress[t.id]).length;
      const totalCount = node.tasks.length;
      const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      overallChecked += completedCount;
      overallTotal += totalCount;

      // Update progress bar width
      const bar = document.getElementById(`progress-bar-${node.id}`);
      if (bar) bar.style.width = `${progressPercent}%`;

      // Update progress label text
      const text = document.getElementById(`progress-text-${node.id}`);
      if (text) text.innerText = `${completedCount} / ${totalCount} Tasks`;

      // Update badge HTML
      const badgeContainer = document.getElementById(`badge-container-${node.id}`);
      if (badgeContainer) {
        if (progressPercent === 100) {
          badgeContainer.innerHTML = `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Completed</span>`;
        } else if (progressPercent > 0) {
          badgeContainer.innerHTML = `<span class="badge badge-progressing"><i class="fa-solid fa-spinner fa-spin"></i> In Progress</span>`;
        } else {
          badgeContainer.innerHTML = `<span class="badge badge-locked">Not Started</span>`;
        }
      }

      // Re-apply correct status classes on the roadmap node wrapper
      const isOpen = nodeEl.classList.contains('open-node');
      nodeEl.className = 'roadmap-node';
      if (isOpen) nodeEl.classList.add('open-node');

      if (progressPercent === 100) {
        nodeEl.classList.add('completed');
      } else if (progressPercent > 0) {
        nodeEl.classList.add('active');
      }
    });

    // Update overall connecting timeline fill track
    const timelineFill = document.getElementById('roadmap-timeline-fill');
    if (timelineFill) {
      let overallPercent = overallTotal > 0 ? Math.round((overallChecked / overallTotal) * 100) : 0;
      timelineFill.style.height = `calc(${overallPercent}% - 8px)`;
    }
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
    const progressStatBar = document.getElementById('stat-roadmap-progress-bar');
    if (progressStatBar) progressStatBar.style.width = `${progressPercentage}%`;

    // 2. Practice quiz score calculation
    let practiceScores = JSON.parse(localStorage.getItem('litcrack_practice_scores') || '[]');
    let avgScore = 0;
    if (practiceScores.length > 0) {
      let sum = practiceScores.reduce((acc, s) => acc + s, 0);
      avgScore = Math.round(sum / practiceScores.length);
    }
    const quizStat = document.getElementById('stat-quiz-score');
    if (quizStat) quizStat.innerText = `${avgScore}%`;
    const quizStatBar = document.getElementById('stat-quiz-score-bar');
    if (quizStatBar) quizStatBar.style.width = `${avgScore}%`;

    // 3. GD practice count
    let gdCount = localStorage.getItem('litcrack_gd_count') || '0';
    const gdStat = document.getElementById('stat-gd-topics');
    if (gdStat) gdStat.innerText = gdCount;
    const gdStatBar = document.getElementById('stat-gd-topics-bar');
    if (gdStatBar) {
      let gdVal = parseInt(gdCount);
      let gdPercentage = Math.min(Math.round((gdVal / 5) * 100), 100);
      gdStatBar.style.width = `${gdPercentage}%`;
    }
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

  // DOM Elements
  const gdTopicDisplay = document.getElementById('gd-topic-display');
  const btnGdGenerate = document.getElementById('btn-gd-generate');
  const btnGdTimer = document.getElementById('btn-gd-timer');
  const btnGdTimerIcon = document.getElementById('btn-gd-timer-icon');
  const btnGdTimerText = document.getElementById('btn-gd-timer-text');
  const gdTimerRing = document.getElementById('gd-timer-ring');
  const gdTimerCircle = document.getElementById('gd-timer-circle');
  
  // Custom Mode Toggle
  const btnGdModeRandom = document.getElementById('btn-gd-mode-random');
  const btnGdModeCustom = document.getElementById('btn-gd-mode-custom');
  const gdCustomInputContainer = document.getElementById('gd-custom-input-container');
  const gdCustomTopicInput = document.getElementById('gd-custom-topic-input');
  const btnGdCustomSet = document.getElementById('btn-gd-custom-set');

  // Notepad Elements
  const gdNotepadDraft = document.getElementById('gd-notepad-draft');
  const gdWordCount = document.getElementById('gd-word-count');
  const gdCharCount = document.getElementById('gd-char-count');
  const btnNotepadCopy = document.getElementById('btn-notepad-copy');
  const btnNotepadDownload = document.getElementById('btn-notepad-download');
  const btnNotepadClear = document.getElementById('btn-notepad-clear');

  // Rubrics
  const slideRubricInit = document.getElementById('slide-rubric-init');
  const slideRubricListen = document.getElementById('slide-rubric-listen');
  const slideRubricStructure = document.getElementById('slide-rubric-structure');
  const slideRubricVocab = document.getElementById('slide-rubric-vocab');
  
  const valRubricInit = document.getElementById('val-rubric-init');
  const valRubricListen = document.getElementById('val-rubric-listen');
  const valRubricStructure = document.getElementById('val-rubric-structure');
  const valRubricVocab = document.getElementById('val-rubric-vocab');

  const gdTotalScoreVal = document.getElementById('gd-total-score-val');
  const gdGradeBadge = document.getElementById('gd-grade-badge');
  const btnRubricsReset = document.getElementById('btn-rubrics-reset');

  // Global State Variables
  let gdTimerInterval = null;
  let gdTimeTotal = 120; // Default: 2 minutes (120 seconds)
  let gdTimeLeft = 120;
  const GD_TIMER_CIRCUMFERENCE = 339.292; // 2 * PI * 54



  // Play synthetic tone on timeout (using AudioContext)
  function playBeepTone() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1.2);
      oscillator.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      console.log("AudioContext blocked or not supported.");
    }
  }

  // Set topic card text with flip/reveal animation
  function setTopicText(text) {
    if (!gdTopicDisplay) return;
    gdTopicDisplay.classList.remove('reveal-anim');
    void gdTopicDisplay.offsetWidth; // Force reflow
    gdTopicDisplay.innerText = text;
    gdTopicDisplay.classList.add('reveal-anim');
  }

  // Toggle Mode Selection
  if (btnGdModeRandom && btnGdModeCustom) {
    btnGdModeRandom.addEventListener('click', () => {
      btnGdModeRandom.classList.add('active');
      btnGdModeCustom.classList.remove('active');
      if (btnGdGenerate) btnGdGenerate.style.display = 'inline-flex';
      if (gdCustomInputContainer) gdCustomInputContainer.style.display = 'none';
    });

    btnGdModeCustom.addEventListener('click', () => {
      btnGdModeCustom.classList.add('active');
      btnGdModeRandom.classList.remove('active');
      if (btnGdGenerate) btnGdGenerate.style.display = 'none';
      if (gdCustomInputContainer) gdCustomInputContainer.style.display = 'flex';
    });
  }

  // Custom Topic Set Handler
  if (btnGdCustomSet && gdCustomTopicInput) {
    btnGdCustomSet.addEventListener('click', () => {
      const text = gdCustomTopicInput.value.trim();
      if (!text) {
        showGdToast("Please enter a custom topic first.", true);
        return;
      }
      setTopicText(text);
      showGdToast("Custom topic activated! Start drafting your points below.");
      
      // Increment GD count for student practice session
      let currentCount = parseInt(localStorage.getItem('litcrack_gd_count') || '0');
      const newCount = currentCount + 1;
      localStorage.setItem('litcrack_gd_count', newCount);
      updateDashboardStats();
      if (currentUser && currentUser.role === 'student') {
        window.syncStudentProgressToServer({ gdCount: newCount });
      }

      // Reset timer
      resetGdTimer();
    });
  }

  // Topic Generator Button (Random Mode)
  if (btnGdGenerate) {
    btnGdGenerate.addEventListener('click', () => {
      const idx = Math.floor(Math.random() * GD_TOPICS.length);
      setTopicText(GD_TOPICS[idx]);
      
      let currentCount = parseInt(localStorage.getItem('litcrack_gd_count') || '0');
      const newCount = currentCount + 1;
      localStorage.setItem('litcrack_gd_count', newCount);
      updateDashboardStats();

      if (currentUser && currentUser.role === 'student') {
        window.syncStudentProgressToServer({ gdCount: newCount });
      }

      resetGdTimer();
      showGdToast("New random topic generated!");
    });
  }

  // Timer rendering and calculations
  function updateTimerCircle(timeLeft, timeTotal) {
    if (!gdTimerCircle) return;
    const progressFraction = timeLeft / timeTotal;
    const offset = GD_TIMER_CIRCUMFERENCE * (1 - progressFraction);
    gdTimerCircle.style.strokeDashoffset = offset;

    // Apply color thresholds
    gdTimerCircle.classList.remove('warning', 'danger');
    if (gdTimerRing) gdTimerRing.classList.remove('danger');

    if (timeLeft <= timeTotal * 0.25) {
      gdTimerCircle.classList.add('danger');
      if (gdTimerRing) gdTimerRing.classList.add('danger');
    } else if (timeLeft <= timeTotal * 0.5) {
      gdTimerCircle.classList.add('warning');
    }
  }

  function formatTimerText(seconds) {
    let minutes = Math.floor(seconds / 60);
    let remSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remSeconds.toString().padStart(2, '0')}`;
  }

  function resetGdTimer() {
    clearInterval(gdTimerInterval);
    gdTimerInterval = null;
    gdTimeLeft = gdTimeTotal;
    if (gdTimerRing) gdTimerRing.innerText = formatTimerText(gdTimeLeft);
    if (btnGdTimerText) btnGdTimerText.innerText = "Start Timer";
    if (btnGdTimerIcon) {
      btnGdTimerIcon.className = "fa-solid fa-play";
    }
    updateTimerCircle(gdTimeLeft, gdTimeTotal);
  }

  // Timer Play/Pause toggle
  if (btnGdTimer) {
    btnGdTimer.addEventListener('click', () => {
      if (gdTimerInterval) {
        // Pause state
        clearInterval(gdTimerInterval);
        gdTimerInterval = null;
        if (btnGdTimerText) btnGdTimerText.innerText = "Resume Timer";
        if (btnGdTimerIcon) btnGdTimerIcon.className = "fa-solid fa-play";
      } else {
        // Start state
        if (btnGdTimerText) btnGdTimerText.innerText = "Pause Timer";
        if (btnGdTimerIcon) btnGdTimerIcon.className = "fa-solid fa-pause";
        
        gdTimerInterval = setInterval(() => {
          gdTimeLeft--;
          if (gdTimerRing) gdTimerRing.innerText = formatTimerText(gdTimeLeft);
          updateTimerCircle(gdTimeLeft, gdTimeTotal);

          if (gdTimeLeft <= 0) {
            clearInterval(gdTimerInterval);
            gdTimerInterval = null;
            if (btnGdTimerText) btnGdTimerText.innerText = "Start Timer";
            if (btnGdTimerIcon) btnGdTimerIcon.className = "fa-solid fa-play";
            playBeepTone();
            showGdToast("GD prep time completed! Ready to summarize?", true);
          }
        }, 1000);
      }
    });
  }

  // Duration Presets Event Handlers
  const presetButtons = document.querySelectorAll('#gd-duration-presets .preset-btn');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gdTimeTotal = parseInt(btn.getAttribute('data-time'));
      resetGdTimer();
    });
  });

  // Notepad Stats calculator (Word & Character count)
  if (gdNotepadDraft) {
    gdNotepadDraft.addEventListener('input', () => {
      const text = gdNotepadDraft.value;
      const charCount = text.length;
      const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
      
      if (gdWordCount) gdWordCount.innerText = wordCount;
      if (gdCharCount) gdCharCount.innerText = charCount;
    });
  }

  // Notepad Clear Button
  if (btnNotepadClear) {
    btnNotepadClear.addEventListener('click', () => {
      if (!gdNotepadDraft.value.trim()) return;
      if (confirm("Are you sure you want to clear your current scratchpad notes?")) {
        gdNotepadDraft.value = "";
        if (gdWordCount) gdWordCount.innerText = "0";
        if (gdCharCount) gdCharCount.innerText = "0";
        showGdToast("Scratchpad cleared.");
      }
    });
  }

  // Notepad Copy Button with feedback
  if (btnNotepadCopy) {
    btnNotepadCopy.addEventListener('click', () => {
      const text = gdNotepadDraft.value.trim();
      if (!text) {
        showGdToast("Your draft is empty. Write something first!", true);
        return;
      }
      navigator.clipboard.writeText(text).then(() => {
        btnNotepadCopy.classList.add('success-feedback');
        btnNotepadCopy.innerHTML = `<i class="fa-solid fa-check"></i>Copied!`;
        showGdToast("Draft copied to clipboard.");
        setTimeout(() => {
          btnNotepadCopy.classList.remove('success-feedback');
          btnNotepadCopy.innerHTML = `<i class="fa-solid fa-copy"></i>Copy Draft`;
        }, 1500);
      });
    });
  }

  // Notepad Download Button
  if (btnNotepadDownload) {
    btnNotepadDownload.addEventListener('click', () => {
      const text = gdNotepadDraft.value.trim();
      if (!text) {
        showGdToast("Draft notepad is empty. Nothing to download.", true);
        return;
      }
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LitCrack_GD_Draft_Notes.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showGdToast("Downloaded draft notepad as a .txt file!");
    });
  }

  // Load Phrasing Booster Templates Dynamically with Copy + Insert actions
  const gdTemplatesContainer = document.getElementById('gd-templates-container');
  if (gdTemplatesContainer) {
    gdTemplatesContainer.innerHTML = GD_TEMPLATES.map((t, idx) => `
      <div class="template-booster-item">
        <div class="template-booster-content" data-idx="${idx}" title="Click to copy">
          <div class="template-booster-title">${t.title}</div>
          <div class="template-booster-text">${t.text}</div>
        </div>
        <div class="template-booster-actions">
          <button class="btn-template-action btn-template-copy" title="Copy phrasing text" data-idx="${idx}">
            <i class="fa-solid fa-copy" id="booster-copy-icon-${idx}"></i>
          </button>
          <button class="btn-template-action btn-template-insert" title="Insert into Scratchpad" data-idx="${idx}">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    `).join('');

    // Attach click events on templates for Copy Action
    document.querySelectorAll('.template-booster-content, .btn-template-copy').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = el.getAttribute('data-idx');
        const textToCopy = GD_TEMPLATES[idx].text;
        navigator.clipboard.writeText(textToCopy).then(() => {
          showGdToast(`Copied phrasing template to clipboard.`);
          const copyBtn = document.getElementById(`booster-copy-icon-${idx}`);
          if (copyBtn) {
            copyBtn.className = "fa-solid fa-check success-feedback";
            setTimeout(() => {
              copyBtn.className = "fa-solid fa-copy";
            }, 1500);
          }
        });
      });
    });

    // Attach click events on templates for Insert Action
    document.querySelectorAll('.btn-template-insert').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = btn.getAttribute('data-idx');
        const textToInsert = GD_TEMPLATES[idx].text;
        
        if (!gdNotepadDraft) return;
        
        // Find cursor location or append
        const startPos = gdNotepadDraft.selectionStart;
        const endPos = gdNotepadDraft.selectionEnd;
        const existingText = gdNotepadDraft.value;
        
        gdNotepadDraft.value = existingText.substring(0, startPos) + textToInsert + existingText.substring(endPos, existingText.length);
        
        // Focus and place cursor right after inserted text
        gdNotepadDraft.focus();
        gdNotepadDraft.selectionStart = startPos + textToInsert.length;
        gdNotepadDraft.selectionEnd = startPos + textToInsert.length;
        
        // Trigger word/char counter manually
        gdNotepadDraft.dispatchEvent(new Event('input'));
        
        showGdToast("Inserted template phrasing into draft notes!");
      });
    });
  }

  // Interactive Scoring Rubrics scorecard
  function updateGdScorecard() {
    if (!slideRubricInit || !slideRubricListen || !slideRubricStructure || !slideRubricVocab) return;

    const valInit = parseInt(slideRubricInit.value);
    const valListen = parseInt(slideRubricListen.value);
    const valStructure = parseInt(slideRubricStructure.value);
    const valVocab = parseInt(slideRubricVocab.value);

    // Update Slider text elements
    if (valRubricInit) valRubricInit.innerText = `${valInit} / 5`;
    if (valRubricListen) valRubricListen.innerText = `${valListen} / 5`;
    if (valRubricStructure) valRubricStructure.innerText = `${valStructure} / 5`;
    if (valRubricVocab) valRubricVocab.innerText = `${valVocab} / 5`;

    // Calculate sum
    const totalScore = valInit + valListen + valStructure + valVocab;
    if (gdTotalScoreVal) gdTotalScoreVal.innerText = totalScore;

    // Set Grade Badge and styling classes
    if (gdGradeBadge) {
      gdGradeBadge.classList.remove('elite', 'competent', 'practicing');
      if (totalScore >= 17) {
        gdGradeBadge.innerText = "Elite Speaker";
        gdGradeBadge.classList.add('elite');
      } else if (totalScore >= 12) {
        gdGradeBadge.innerText = "Highly Competent";
        gdGradeBadge.classList.add('competent');
      } else {
        gdGradeBadge.innerText = "Practicing";
        gdGradeBadge.classList.add('practicing');
      }
    }
  }

  // Scorecard Event Listeners
  const sliders = [slideRubricInit, slideRubricListen, slideRubricStructure, slideRubricVocab];
  sliders.forEach(slider => {
    if (slider) {
      slider.addEventListener('input', updateGdScorecard);
    }
  });

  // Scorecard Reset button
  if (btnRubricsReset) {
    btnRubricsReset.addEventListener('click', () => {
      sliders.forEach(slider => {
        if (slider) slider.value = 0;
      });
      updateGdScorecard();
      showGdToast("Performance scorecard reset.");
    });
  }

  // Initialize scorecard on startup
  updateGdScorecard();

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
  const btnClearStar = document.getElementById('btn-clear-star');
  const btnExportStar = document.getElementById('btn-export-star');
  const btnDownloadStar = document.getElementById('btn-download-star');
  const savedStarLibraryList = document.getElementById('saved-star-library-list');

  // Custom vs Standard mode controls
  const btnStarModeSelect = document.getElementById('btn-star-mode-select');
  const btnStarModeCustom = document.getElementById('btn-star-mode-custom');
  const starSelectContainer = document.getElementById('star-select-container');
  const starCustomPromptContainer = document.getElementById('star-custom-prompt-container');
  const starCustomQuestionInput = document.getElementById('star-custom-question-input');

  let isCustomQuestion = false;

  // Length limits constants
  const STAR_LIMITS = {
    situation: { min: 40, max: 100 },
    task: { min: 30, max: 80 },
    action: { min: 100, max: 250 },
    result: { min: 60, max: 150 }
  };

  // Toggle prompt mode
  if (btnStarModeSelect && btnStarModeCustom) {
    btnStarModeSelect.addEventListener('click', () => {
      btnStarModeSelect.classList.add('active');
      btnStarModeCustom.classList.remove('active');
      if (starSelectContainer) starSelectContainer.style.display = 'block';
      if (starCustomPromptContainer) starCustomPromptContainer.style.display = 'none';
      isCustomQuestion = false;
      saveActiveStarDraft();
    });

    btnStarModeCustom.addEventListener('click', () => {
      btnStarModeCustom.classList.add('active');
      btnStarModeSelect.classList.remove('active');
      if (starSelectContainer) starSelectContainer.style.display = 'none';
      if (starCustomPromptContainer) starCustomPromptContainer.style.display = 'block';
      isCustomQuestion = true;
      saveActiveStarDraft();
    });
  }

  if (starCustomQuestionInput) {
    starCustomQuestionInput.addEventListener('input', () => {
      saveActiveStarDraft();
    });
  }
  if (starQuestion) {
    starQuestion.addEventListener('change', () => {
      saveActiveStarDraft();
    });
  }

  // Active Highlight Handlers
  Object.keys(starInputs).forEach(key => {
    const textarea = starInputs[key];
    const previewBox = document.getElementById(`preview-section-${key[0]}`);
    if (textarea && previewBox) {
      textarea.addEventListener('focus', () => {
        previewBox.classList.add('active-edit');
      });
      textarea.addEventListener('blur', () => {
        previewBox.classList.remove('active-edit');
      });
    }
  });

  // Length Guide updater
  function updateLengthGuide(section, text, optimalMin, optimalMax) {
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
    const bar = document.getElementById(`fill-star-${section[0]}`);
    const textVal = document.getElementById(`star-words-${section[0]}`);
    const tag = document.getElementById(`tag-star-${section[0]}`);
    
    if (textVal) textVal.innerText = words;
    
    if (bar && tag) {
      let pct = Math.min(Math.round((words / optimalMax) * 100), 100);
      bar.style.width = `${pct}%`;
      
      bar.classList.remove('optimal', 'verbose');
      tag.classList.remove('optimal', 'verbose');
      
      if (words === 0) {
        tag.innerText = "Too Short";
        bar.style.width = "0%";
      } else if (words < optimalMin) {
        tag.innerText = "Too Short";
      } else if (words <= optimalMax) {
        tag.innerText = "Optimal";
        bar.classList.add('optimal');
        tag.classList.add('optimal');
      } else {
        tag.innerText = "Too Verbose";
        bar.classList.add('verbose');
        tag.classList.add('verbose');
      }
    }
  }

  function updateAllLengthGuides() {
    Object.keys(starInputs).forEach(key => {
      if (starInputs[key]) {
        const limits = STAR_LIMITS[key];
        updateLengthGuide(key, starInputs[key].value, limits.min, limits.max);
      }
    });
  }

  // Preview builder
  function updateStarPreview() {
    if (starInputs.situation) starPreviews.s.innerText = starInputs.situation.value || "Type in the situation input field...";
    if (starInputs.task) starPreviews.t.innerText = starInputs.task.value || "Type in the task input field...";
    if (starInputs.action) starPreviews.a.innerText = starInputs.action.value || "Type in the action input field...";
    if (starInputs.result) starPreviews.r.innerText = starInputs.result.value || "Type in the result input field...";
  }

  // Save current active draft locally
  function saveActiveStarDraft() {
    const draft = {
      isCustom: isCustomQuestion,
      question: isCustomQuestion ? (starCustomQuestionInput ? starCustomQuestionInput.value : "") : (starQuestion ? starQuestion.value : ""),
      situation: starInputs.situation ? starInputs.situation.value : "",
      task: starInputs.task ? starInputs.task.value : "",
      action: starInputs.action ? starInputs.action.value : "",
      result: starInputs.result ? starInputs.result.value : ""
    };
    localStorage.setItem('litcrack_star_saved', JSON.stringify(draft));
  }

  Object.keys(starInputs).forEach(key => {
    if (starInputs[key]) {
      starInputs[key].addEventListener('input', () => {
        updateStarPreview();
        const limits = STAR_LIMITS[key];
        updateLengthGuide(key, starInputs[key].value, limits.min, limits.max);
        saveActiveStarDraft();
      });
    }
  });

  // Get active compiled STAR card text format
  function getCompiledStarText() {
    const q = isCustomQuestion ? (starCustomQuestionInput ? starCustomQuestionInput.value.trim() : "") : (starQuestion ? starQuestion.value : "");
    return `STAR ANSWER CARD\n================================\nQuestion: ${q}\n\n[S] Situation:\n${starInputs.situation.value}\n\n[T] Task:\n${starInputs.task.value}\n\n[A] Action:\n${starInputs.action.value}\n\n[R] Result:\n${starInputs.result.value}`;
  }

  // Get active compiled STAR card Markdown format
  function getCompiledStarMarkdown() {
    const q = isCustomQuestion ? (starCustomQuestionInput ? starCustomQuestionInput.value.trim() : "") : (starQuestion ? starQuestion.value : "");
    return `# STAR Interview Prep Card\n\n**Question:** ${q}\n\n---\n\n### 🚀 [S] Situation\n${starInputs.situation.value}\n\n### 🎯 [T] Task\n${starInputs.task.value}\n\n### 🛠️ [A] Action\n${starInputs.action.value}\n\n### 🏆 [R] Result\n${starInputs.result.value}\n\n*Created on LitCrack Placement Hub - ${new Date().toLocaleDateString()}*`;
  }

  // Copy card text
  if (btnExportStar) {
    btnExportStar.addEventListener('click', () => {
      const q = isCustomQuestion ? (starCustomQuestionInput ? starCustomQuestionInput.value.trim() : "") : (starQuestion ? starQuestion.value : "");
      if (!q || !starInputs.situation.value.trim()) {
        window.showAppToast("Draft card is empty. Please enter your answers first.", true);
        return;
      }
      navigator.clipboard.writeText(getCompiledStarText()).then(() => {
        window.showAppToast("STAR Card text copied to clipboard!");
      });
    });
  }

  // Download Markdown file
  if (btnDownloadStar) {
    btnDownloadStar.addEventListener('click', () => {
      const q = isCustomQuestion ? (starCustomQuestionInput ? starCustomQuestionInput.value.trim() : "") : (starQuestion ? starQuestion.value : "");
      if (!q || !starInputs.situation.value.trim()) {
        window.showAppToast("Draft card is empty. Nothing to download.", true);
        return;
      }
      const blob = new Blob([getCompiledStarMarkdown()], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `STAR_Prep_${q.slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.showAppToast("Downloaded STAR Card as a markdown file!");
    });
  }

  // Save Card to Library
  if (btnSaveStar) {
    btnSaveStar.addEventListener('click', () => {
      const q = isCustomQuestion ? (starCustomQuestionInput ? starCustomQuestionInput.value.trim() : "") : (starQuestion ? starQuestion.value : "");
      if (!q || !starInputs.situation.value.trim() || !starInputs.action.value.trim()) {
        window.showAppToast("Please fill in the Question, Situation, and Action before saving.", true);
        return;
      }

      const card = {
        id: Date.now(),
        isCustom: isCustomQuestion,
        question: q,
        situation: starInputs.situation.value,
        task: starInputs.task.value,
        action: starInputs.action.value,
        result: starInputs.result.value,
        timestamp: new Date().toLocaleDateString()
      };

      let library = [];
      try {
        library = JSON.parse(localStorage.getItem('litcrack_star_saved_library') || '[]');
      } catch (e) {
        library = [];
      }

      // Check if updating an existing loaded card (we can store the loaded ID)
      const loadedId = localStorage.getItem('litcrack_star_loaded_id');
      if (loadedId) {
        const idx = library.findIndex(c => c.id == loadedId);
        if (idx !== -1) {
          card.id = parseInt(loadedId); // Maintain same ID
          library[idx] = card;
          window.showAppToast("STAR Answer Card updated in your library!");
        } else {
          library.unshift(card);
          window.showAppToast("STAR Answer Card saved to your library!");
        }
        localStorage.removeItem('litcrack_star_loaded_id');
      } else {
        library.unshift(card);
        window.showAppToast("STAR Answer Card saved to your library!");
      }

      localStorage.setItem('litcrack_star_saved_library', JSON.stringify(library));
      
      // Update saved card to match current state
      saveActiveStarDraft();

      // Sync overall library state to server
      if (currentUser && currentUser.role === 'student') {
        window.syncStudentProgressToServer({ starAnswers: library });
      }

      renderStarLibrary();
    });
  }

  // Clear Editor fields
  if (btnClearStar) {
    btnClearStar.addEventListener('click', () => {
      if (confirm("Are you sure you want to clear the active editor fields? Current unsaved draft progress will be wiped.")) {
        localStorage.removeItem('litcrack_star_saved');
        localStorage.removeItem('litcrack_star_loaded_id');
        if (starInputs.situation) starInputs.situation.value = "";
        if (starInputs.task) starInputs.task.value = "";
        if (starInputs.action) starInputs.action.value = "";
        if (starInputs.result) starInputs.result.value = "";
        if (starCustomQuestionInput) starCustomQuestionInput.value = "";
        
        updateStarPreview();
        updateAllLengthGuides();
        window.showAppToast("Editor fields cleared.");
      }
    });
  }

  // Render library cards list
  function renderStarLibrary() {
    if (!savedStarLibraryList) return;

    let library = [];
    try {
      library = JSON.parse(localStorage.getItem('litcrack_star_saved_library') || '[]');
    } catch(e) {
      library = [];
    }

    if (library.length === 0) {
      savedStarLibraryList.innerHTML = `
        <div class="star-empty-library-msg">
          <i class="fa-solid fa-folder-open" style="font-size: 2rem; display: block; margin-bottom: 0.75rem; color: var(--text-muted);"></i>
          Your Saved Cards library is currently empty. Write your STAR answers and click "Save Answer Card" to start building your personal interview portfolio!
        </div>
      `;
      return;
    }

    savedStarLibraryList.innerHTML = library.map((card, idx) => {
      const previewText = card.situation ? card.situation.substring(0, 100) + "..." : "No preview text.";
      return `
        <div class="saved-star-card">
          <div>
            <div class="saved-star-header">
              <div class="saved-star-title">${card.question}</div>
              <div class="saved-star-date">${card.timestamp}</div>
            </div>
            <div class="saved-star-preview-snippet">${previewText}</div>
          </div>
          <div class="saved-star-actions">
            <button class="btn-star-card-action btn-star-load" data-id="${card.id}">
              <i class="fa-solid fa-pencil" style="margin-right: 0.25rem;"></i> Load Card
            </button>
            <div class="saved-star-btn-group">
              <button class="btn-star-card-action btn-star-copy-lib" title="Copy Card text" data-idx="${idx}">
                <i class="fa-solid fa-copy" id="lib-copy-icon-${idx}"></i>
              </button>
              <button class="btn-star-card-action btn-star-download-lib" title="Download Card" data-idx="${idx}">
                <i class="fa-solid fa-download"></i>
              </button>
              <button class="btn-star-card-action btn-star-delete" title="Delete Card" data-id="${card.id}">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Load action handlers
    document.querySelectorAll('.btn-star-load').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const card = library.find(c => c.id == id);
        if (card) {
          localStorage.setItem('litcrack_star_loaded_id', id);
          if (card.isCustom) {
            if (btnStarModeCustom) btnStarModeCustom.click();
            if (starCustomQuestionInput) starCustomQuestionInput.value = card.question || '';
          } else {
            if (btnStarModeSelect) btnStarModeSelect.click();
            if (starQuestion) starQuestion.value = card.question || '';
          }
          
          if (starInputs.situation) starInputs.situation.value = card.situation || '';
          if (starInputs.task) starInputs.task.value = card.task || '';
          if (starInputs.action) starInputs.action.value = card.action || '';
          if (starInputs.result) starInputs.result.value = card.result || '';

          updateStarPreview();
          updateAllLengthGuides();
          saveActiveStarDraft();
          window.showAppToast("Card loaded into editor! Scroll up to review and modify.");
        }
      });
    });

    // Copy action handlers
    document.querySelectorAll('.btn-star-copy-lib').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.getAttribute('data-idx');
        const card = library[idx];
        const textToCopy = `STAR ANSWER CARD\n================================\nQuestion: ${card.question}\n\n[S] Situation:\n${card.situation}\n\n[T] Task:\n${card.task}\n\n[A] Action:\n${card.action}\n\n[R] Result:\n${card.result}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
          window.showAppToast("Saved STAR card text copied to clipboard!");
          const copyBtn = document.getElementById(`lib-copy-icon-${idx}`);
          if (copyBtn) {
            copyBtn.className = "fa-solid fa-check text-success";
            setTimeout(() => {
              copyBtn.className = "fa-solid fa-copy";
            }, 1500);
          }
        });
      });
    });

    // Download action handlers
    document.querySelectorAll('.btn-star-download-lib').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.getAttribute('data-idx');
        const card = library[idx];
        const mdText = `# STAR Interview Prep Card\n\n**Question:** ${card.question}\n\n---\n\n### 🚀 [S] Situation\n${card.situation}\n\n### 🎯 [T] Task\n${card.task}\n\n### 🛠️ [A] Action\n${card.action}\n\n### 🏆 [R] Result\n${card.result}\n\n*Created on LitCrack Placement Hub - ${card.timestamp}*`;
        const blob = new Blob([mdText], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `STAR_Prep_${card.question.slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.showAppToast("Downloaded STAR Card as a markdown file!");
      });
    });

    // Delete action handlers
    document.querySelectorAll('.btn-star-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm("Are you sure you want to delete this STAR answer card?")) {
          const id = btn.getAttribute('data-id');
          library = library.filter(c => c.id != id);
          localStorage.setItem('litcrack_star_saved_library', JSON.stringify(library));
          
          // Clear active editor if we deleted the loaded card
          const loadedId = localStorage.getItem('litcrack_star_loaded_id');
          if (loadedId == id) {
            localStorage.removeItem('litcrack_star_loaded_id');
          }

          if (currentUser && currentUser.role === 'student') {
            window.syncStudentProgressToServer({ starAnswers: library });
          }

          renderStarLibrary();
          window.showAppToast("Card deleted from your library.");
        }
      });
    });
  }

  // Initialize STAR scripts
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

  // ==========================================================================
  // STUDENT CAREER PROFILE FUNCTIONS & HANDLERS
  // ==========================================================================

  function updateSidebarProfile(profile) {
    if (!profile) return;
    if (navName) navName.innerText = profile.name || currentUser.name || "Guest Student";
    if (navRole) navRole.innerText = profile.role || "KLECET Aspirant";
    if (navAvatar) {
      navAvatar.innerText = (profile.name || currentUser.name || "LC").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      // Remove any existing theme classes
      navAvatar.classList.remove('avatar-theme-amethyst', 'avatar-theme-emerald', 'avatar-theme-gold', 'avatar-theme-rose');
      navAvatar.classList.add(`avatar-theme-${profile.theme || 'amethyst'}`);
    }
    const headerAvatar = document.getElementById('header-avatar-initials');
    if (headerAvatar) {
      headerAvatar.innerText = (profile.name || currentUser.name || "LC").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      headerAvatar.className = `header-avatar avatar-theme-${profile.theme || 'amethyst'}`;
    }
  }

  function renderStudentProfile() {
    if (!currentUser || currentUser.role !== 'student') return;

    let profile = null;
    try {
      profile = JSON.parse(localStorage.getItem('litcrack_student_profile') || 'null');
    } catch (e) {
      profile = null;
    }

    if (!profile) {
      profile = {
        name: currentUser.name || "",
        usn: currentUser.usn || "",
        branch: currentUser.branch || "",
        email: currentUser.email || "",
        phone: "",
        gradYear: "",
        cgpa: "",
        role: "KLECET Aspirant",
        skills: "",
        bio: "",
        linkedin: "",
        github: "",
        theme: "amethyst"
      };
      localStorage.setItem('litcrack_student_profile', JSON.stringify(profile));
    }

    // Populate the form fields
    const inputName = document.getElementById('profile-input-name');
    const inputUsn = document.getElementById('profile-input-usn');
    const inputBranch = document.getElementById('profile-input-branch');
    const inputEmail = document.getElementById('profile-input-email');
    const inputPhone = document.getElementById('profile-input-phone');
    const inputGrad = document.getElementById('profile-input-grad');
    const inputCgpa = document.getElementById('profile-input-cgpa');
    const inputRole = document.getElementById('profile-input-role');
    const inputSkills = document.getElementById('profile-input-skills');
    const inputBio = document.getElementById('profile-input-bio');
    const inputLinkedin = document.getElementById('profile-input-linkedin');
    const inputGithub = document.getElementById('profile-input-github');

    if (inputName) inputName.value = profile.name || "";
    if (inputUsn) inputUsn.value = profile.usn || currentUser.usn || "";
    if (inputBranch) inputBranch.value = profile.branch || currentUser.branch || "Computer Science";
    if (inputEmail) inputEmail.value = profile.email || currentUser.email || "";
    if (inputPhone) inputPhone.value = profile.phone || "";
    if (inputGrad) inputGrad.value = profile.gradYear || "";
    if (inputCgpa) inputCgpa.value = profile.cgpa || "";
    if (inputRole) inputRole.value = profile.role || "";
    if (inputSkills) inputSkills.value = profile.skills || "";
    if (inputBio) inputBio.value = profile.bio || "";
    if (inputLinkedin) inputLinkedin.value = profile.linkedin || "";
    if (inputGithub) inputGithub.value = profile.github || "";

    // Set active dot for the visual theme
    const activeTheme = profile.theme || 'amethyst';
    document.querySelectorAll('.avatar-theme-dot').forEach(dot => {
      if (dot.getAttribute('data-theme') === activeTheme) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Update Skills Tag Pills
    updateSkillsPills(profile.skills || "");

    // Update the Preview Card on the Left
    updateProfilePreviewCard(profile);

    // Compute and Render Placement Readiness Gauge & Badge
    updatePlacementReadinessScore();
  }

  function updateSkillsPills(skillsStr) {
    const container = document.getElementById('profile-skills-tags');
    if (!container) return;

    if (!skillsStr.trim()) {
      container.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No skills added yet</span>`;
      return;
    }

    const skills = skillsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
    container.innerHTML = skills.map(skill => `
      <span class="skill-tag-pill">
        <i class="fa-solid fa-code" style="font-size: 0.7rem; color: var(--primary-bright);"></i>
        ${skill}
      </span>
    `).join('');
  }

  function updateProfilePreviewCard(profile) {
    const previewAvatar = document.getElementById('profile-preview-avatar');
    const previewName = document.getElementById('profile-preview-name');
    const previewRole = document.getElementById('profile-preview-role');
    const previewBranch = document.getElementById('profile-preview-branch');
    const previewUsn = document.getElementById('profile-preview-usn');
    const linkLinkedin = document.getElementById('profile-link-linkedin');
    const linkGithub = document.getElementById('profile-link-github');
    const previewBio = document.getElementById('profile-preview-bio');

    const previewCard = document.querySelector('.profile-preview-card');
    if (previewCard) {
      previewCard.className = `glass-card profile-preview-card theme-${profile.theme || 'amethyst'}`;
    }

    if (previewAvatar) {
      previewAvatar.innerText = (profile.name || currentUser.name || "LC").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      // Remove any existing theme classes
      previewAvatar.classList.remove('avatar-theme-amethyst', 'avatar-theme-emerald', 'avatar-theme-gold', 'avatar-theme-rose');
      previewAvatar.classList.add(`avatar-theme-${profile.theme || 'amethyst'}`);
    }

    if (previewName) previewName.innerText = profile.name || currentUser.name || "Guest Student";
    if (previewRole) previewRole.innerText = profile.role || "KLECET Aspirant";
    if (previewBranch) previewBranch.innerText = profile.branch || currentUser.branch || "Computer Science";
    if (previewUsn) previewUsn.innerText = profile.usn || currentUser.usn || "N/A";
    
    if (linkLinkedin) {
      if (profile.linkedin && profile.linkedin.trim()) {
        linkLinkedin.href = profile.linkedin.trim();
        linkLinkedin.style.display = 'inline-flex';
      } else {
        linkLinkedin.style.display = 'none';
      }
    }
    
    if (linkGithub) {
      if (profile.github && profile.github.trim()) {
        linkGithub.href = profile.github.trim();
        linkGithub.style.display = 'inline-flex';
      } else {
        linkGithub.style.display = 'none';
      }
    }

    if (previewBio) {
      if (profile.bio && profile.bio.trim()) {
        previewBio.innerText = `"${profile.bio.trim()}"`;
      } else {
        previewBio.innerText = `"No biography details entered yet. Update your career profile settings to show your bio."`;
      }
    }
  }

  function updatePlacementReadinessScore() {
    const valEl = document.getElementById('profile-readiness-val');
    const barEl = document.getElementById('profile-readiness-bar');
    const rankEl = document.getElementById('profile-readiness-rank');

    if (!valEl || !barEl || !rankEl) return;

    // 1. Roadmap Progress (40 max)
    let checkedTasks = 0;
    const progress = JSON.parse(localStorage.getItem('litcrack_roadmap_progress') || '{}');
    for (let key in progress) {
      if (key !== '__profile' && progress[key] === true) {
        checkedTasks++;
      }
    }
    // Total tasks count across all milestones is 15
    const roadmapScore = Math.min(40, (checkedTasks / 15) * 40);

    // 2. Quiz Score (30 max)
    let quizAvg = 0;
    try {
      const scores = JSON.parse(localStorage.getItem('litcrack_practice_scores') || '[]');
      if (scores && scores.length > 0) {
        const sum = scores.reduce((a, b) => a + b, 0);
        quizAvg = sum / scores.length;
      }
    } catch(e) {}
    const quizScore = Math.min(30, (quizAvg / 100) * 30);

    // 3. GD Simulator topics (20 max)
    let gdCount = parseInt(localStorage.getItem('litcrack_gd_count') || '0', 10);
    const gdScore = Math.min(20, (gdCount / 5) * 20);

    // 4. STAR Answer Builder (10 max)
    let starCount = 0;
    try {
      const lib = JSON.parse(localStorage.getItem('litcrack_star_saved_library') || '[]');
      starCount = lib.length;
    } catch(e) {}
    const starScore = Math.min(10, (starCount / 2) * 10);

    const totalReadiness = Math.round(roadmapScore + quizScore + gdScore + starScore);

    // Render elements
    valEl.innerText = `${totalReadiness}%`;
    barEl.style.width = `${totalReadiness}%`;

    // Reset classes
    rankEl.className = 'badge-rank';
    if (totalReadiness >= 85) {
      rankEl.innerText = "Job-Ready Elite";
      rankEl.classList.add('elite');
    } else if (totalReadiness >= 55) {
      rankEl.innerText = "Strong Contender";
      rankEl.classList.add('strong');
    } else if (totalReadiness >= 25) {
      rankEl.innerText = "Developing Fluency";
      rankEl.classList.add('developing');
    } else {
      rankEl.innerText = "Just Starting";
      rankEl.classList.add('starting');
    }
  }

  // Avatar theme selection event delegation
  const themeSelectorGrid = document.getElementById('avatar-theme-selector-grid');
  if (themeSelectorGrid) {
    themeSelectorGrid.addEventListener('click', (e) => {
      const dot = e.target.closest('.avatar-theme-dot');
      if (!dot) return;

      document.querySelectorAll('.avatar-theme-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');

      const selectedTheme = dot.getAttribute('data-theme');
      
      // Update preview card theme immediately
      const previewAvatar = document.getElementById('profile-preview-avatar');
      if (previewAvatar) {
        previewAvatar.className = `profile-avatar-large avatar-theme-${selectedTheme}`;
      }

      // Update preview card border immediately
      const previewCard = document.querySelector('.profile-preview-card');
      if (previewCard) {
        previewCard.className = `glass-card profile-preview-card theme-${selectedTheme}`;
      }
    });
  }

  // Settings Tab Switching Event Listener
  const settingsTabContainer = document.getElementById('profile-settings-tabs');
  if (settingsTabContainer) {
    settingsTabContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.settings-tab-btn');
      if (!btn) return;

      // Reset active tabs
      document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');

      // Toggle display of settings panels
      document.querySelectorAll('.settings-group-panel').forEach(panel => {
        panel.style.display = 'none';
      });

      const activePanel = document.getElementById(`settings-group-${targetTab}`);
      if (activePanel) {
        activePanel.style.display = 'flex';
      }
    });
  }

  // Skills input changes to render tag pills live
  const skillsInput = document.getElementById('profile-input-skills');
  if (skillsInput) {
    skillsInput.addEventListener('input', (e) => {
      updateSkillsPills(e.target.value);
    });
  }

  // Save Career Profile Action
  const btnSaveProfile = document.getElementById('btn-save-profile');
  if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', async () => {
      if (!currentUser || currentUser.role !== 'student') return;

      const nameVal = document.getElementById('profile-input-name').value.trim();
      const usnVal = document.getElementById('profile-input-usn').value.trim();
      const branchVal = document.getElementById('profile-input-branch').value;
      const phoneVal = document.getElementById('profile-input-phone').value.trim();
      const gradVal = document.getElementById('profile-input-grad').value.trim();
      const cgpaVal = document.getElementById('profile-input-cgpa').value.trim();
      const roleVal = document.getElementById('profile-input-role').value.trim();
      const skillsVal = document.getElementById('profile-input-skills').value.trim();
      const bioVal = document.getElementById('profile-input-bio').value.trim();
      const linkedinVal = document.getElementById('profile-input-linkedin').value.trim();
      const githubVal = document.getElementById('profile-input-github').value.trim();

      const activeDot = document.querySelector('.avatar-theme-dot.active');
      const themeVal = activeDot ? activeDot.getAttribute('data-theme') : 'amethyst';

      if (!nameVal) {
        alert("Full Name is required.");
        return;
      }

      // Construct profile object
      const profile = {
        name: nameVal,
        usn: usnVal,
        branch: branchVal,
        email: currentUser.email,
        phone: phoneVal,
        gradYear: gradVal,
        cgpa: cgpaVal,
        role: roleVal || "KLECET Aspirant",
        skills: skillsVal,
        bio: bioVal,
        linkedin: linkedinVal,
        github: githubVal,
        theme: themeVal
      };

      // Save to localStorage
      localStorage.setItem('litcrack_student_profile', JSON.stringify(profile));

      // Update sidebar details immediately
      updateSidebarProfile(profile);

      // Update live preview card
      updateProfilePreviewCard(profile);

      // Update welcome message
      const welcomeTitle = document.getElementById('dashboard-welcome-title');
      if (welcomeTitle) {
        welcomeTitle.innerHTML = `Welcome back, <span style="background: linear-gradient(135deg, var(--primary-bright), var(--accent-rose)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;">${profile.name}</span>!`;
      }

      // Merge into roadmapProgress for server sync
      let savedProgress = JSON.parse(localStorage.getItem('litcrack_roadmap_progress') || '{}');
      // Sync to server
      await window.syncStudentProgressToServer({ roadmapProgress: savedProgress });

      window.showAppToast("Career Profile saved and synced successfully!");
    });
  }

  // Canvas Particles Background Simulation
  let particleAnimationId = null;
  function initLandingCanvas() {
    const canvas = document.getElementById('landing-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles = [];
    const maxParticles = 65;
    const connectionDist = 110;
    const mouse = { x: null, y: null, radius: 150 };

    function setCanvasDimensions() {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }
    window.addEventListener('resize', setCanvasDimensions);

    const landingPageEl = document.getElementById('landing-page');
    if (landingPageEl) {
      landingPageEl.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
      });

      landingPageEl.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
      });
    }

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = (Math.random() - 0.5) * 0.45;
        this.radius = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse attraction
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            this.x -= (dx / dist) * force * 0.5;
            this.y -= (dy / dist) * force * 0.5;
          }
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(157, 89, 247, 0.4)';
        ctx.fill();
      }
    }

    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }

    function animate() {
      if (document.getElementById('landing-page').style.display === 'none') {
        if (particleAnimationId) {
          cancelAnimationFrame(particleAnimationId);
          particleAnimationId = null;
        }
        return;
      }
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist) {
            let alpha = (1 - dist / connectionDist) * 0.15;
            
            if (mouse.x !== null && mouse.y !== null) {
              const mdx1 = mouse.x - particles[i].x;
              const mdy1 = mouse.y - particles[i].y;
              const mdist1 = Math.sqrt(mdx1 * mdx1 + mdy1 * mdy1);
              if (mdist1 < mouse.radius) {
                alpha += (1 - mdist1 / mouse.radius) * 0.15;
              }
            }

            ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      particleAnimationId = requestAnimationFrame(animate);
    }

    if (particleAnimationId) {
      cancelAnimationFrame(particleAnimationId);
    }
    animate();
  }

  // Spotlight Hover Coordinates Tracker
  function initSpotlightHover() {
    const cards = document.querySelectorAll('.landing-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }

  // Live Portal Showcase Interactivity
  let starShowcaseInterval = null;
  function initShowcaseInteractions() {
    const tabs = document.querySelectorAll('.showcase-tab');
    const panels = document.querySelectorAll('.showcase-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const showcaseId = tab.getAttribute('data-showcase');
        const activePanel = document.getElementById(`panel-showcase-${showcaseId}`);
        if (activePanel) {
          activePanel.classList.add('active');
        }

        if (showcaseId === 'star') {
          startMockStarSequence();
        } else {
          stopMockStarSequence();
        }
      });
    });

    // Sub-modules:
    // A. AI Speech Interview Simulation
    const mockBtnMic = document.getElementById('mock-btn-mic');
    const mockAudioWave = document.getElementById('mock-audio-wave');
    const mockMicStatus = document.getElementById('mock-mic-status');
    const mockStudentResponse = document.getElementById('mock-student-response');

    if (mockBtnMic) {
      mockBtnMic.addEventListener('click', () => {
        mockBtnMic.disabled = true;
        mockBtnMic.style.background = 'var(--danger)';
        mockBtnMic.style.borderColor = 'var(--danger)';
        mockBtnMic.innerHTML = `<i class="fa-solid fa-microphone-lines fa-fade" style="color: #fff;"></i>`;
        if (mockAudioWave) mockAudioWave.style.display = 'flex';
        if (mockMicStatus) mockMicStatus.innerText = "Listening to your response...";
        if (mockStudentResponse) mockStudentResponse.style.display = 'none';

        setTimeout(() => {
          if (mockAudioWave) mockAudioWave.style.display = 'none';
          mockBtnMic.style.background = 'none';
          mockBtnMic.style.borderColor = 'var(--primary)';
          mockBtnMic.innerHTML = `<i class="fa-solid fa-microphone" style="color: var(--primary-bright);"></i>`;
          if (mockMicStatus) mockMicStatus.innerText = "Answer submitted successfully!";
          if (mockStudentResponse) mockStudentResponse.style.display = 'block';

          const chatWindow = document.querySelector('.mock-chat-window');
          if (chatWindow) {
            chatWindow.scrollTop = chatWindow.scrollHeight;
          }

          setTimeout(() => {
            mockBtnMic.disabled = false;
            if (mockMicStatus) mockMicStatus.innerText = "Click microphone to respond";
          }, 2000);

        }, 3000);
      });
    }

    // B. STAR Steps Cycle Sequence
    function startMockStarSequence() {
      stopMockStarSequence();
      const fields = ['s', 't', 'a', 'r'];
      let idx = 0;

      function highlightStep() {
        fields.forEach(f => {
          const el = document.getElementById(`mock-star-${f}`);
          if (el) el.classList.remove('highlighted');
        });

        const activeField = document.getElementById(`mock-star-${fields[idx]}`);
        if (activeField) {
          activeField.classList.add('highlighted');
        }
        idx = (idx + 1) % fields.length;
      }

      highlightStep();
      starShowcaseInterval = setInterval(highlightStep, 2500);
    }

    // C. Practice Quiz Arena Simulated Clicks
    const quizOpts = document.querySelectorAll('.mock-quiz-opt');
    const quizFeedback = document.getElementById('mock-quiz-feedback');

    quizOpts.forEach(opt => {
      opt.addEventListener('click', () => {
        quizOpts.forEach(o => {
          o.classList.remove('clicked-wrong', 'clicked-correct');
          o.disabled = true;
        });

        const isCorrect = opt.getAttribute('data-correct') === 'true';
        if (isCorrect) {
          opt.classList.add('clicked-correct');
          if (quizFeedback) {
            quizFeedback.style.display = 'flex';
            quizFeedback.querySelector('p').innerHTML = `<strong>Correct Answer!</strong> Stacks add and remove items only from the top boundary (LIFO).`;
            const badge = quizFeedback.querySelector('.quiz-badge-add');
            if (badge) badge.style.display = 'inline-block';
          }
        } else {
          opt.classList.add('clicked-wrong');
          quizOpts.forEach(o => {
            if (o.getAttribute('data-correct') === 'true') {
              o.classList.add('clicked-correct');
            }
          });
          if (quizFeedback) {
            quizFeedback.style.display = 'flex';
            quizFeedback.querySelector('p').innerHTML = `<strong>Option Chosen is Incorrect!</strong> Correct answer is Stack (LIFO).`;
            const badge = quizFeedback.querySelector('.quiz-badge-add');
            if (badge) badge.style.display = 'none';
          }
        }

        setTimeout(() => {
          quizOpts.forEach(o => {
            o.classList.remove('clicked-wrong', 'clicked-correct');
            o.disabled = false;
          });
          if (quizFeedback) quizFeedback.style.display = 'none';
        }, 4000);
      });
    });
  }

  // FAQ Accordion Panel Toggle Logic
  function initFAQAccordion() {
    const triggers = document.querySelectorAll('.faq-trigger');

    triggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.faq-item');
        const content = item.querySelector('.faq-content');
        const isActive = item.classList.contains('active');

        document.querySelectorAll('.faq-item').forEach(i => {
          i.classList.remove('active');
          i.querySelector('.faq-content').style.maxHeight = null;
        });

        if (!isActive) {
          item.classList.add('active');
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      });
    });
  }

  // Scroll Reveal Observer & Scroll Indicator scroll-down bindings
  function initScrollReveal() {
    const scrollInd = document.querySelector('.scroll-indicator');
    const statsSec = document.querySelector('.landing-stats');
    if (scrollInd && statsSec) {
      scrollInd.addEventListener('click', () => {
        statsSec.scrollIntoView({ behavior: 'smooth' });
      });
    }

    const revealedElements = document.querySelectorAll('.landing-stats, .landing-showcase, .landing-features, .landing-advisors, .landing-faq');
    revealedElements.forEach(el => {
      el.classList.add('reveal-init');
    });

    const observerOptions = {
      root: null,
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    revealedElements.forEach(el => {
      observer.observe(el);
    });
  }


  // Initial Boot Actions
  checkSession();
  renderRoadmap();
  updateDashboardStats();
  init3DTilt();
  initLandingCanvas();
  initSpotlightHover();
  initShowcaseInteractions();
  initFAQAccordion();
  initScrollReveal();

  window.reinit3DTilt = init3DTilt;
  window.reinitLandingCanvas = initLandingCanvas;
});
