/* =============================================
   IDEALINK SHARED JAVASCRIPT
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

    /* --- Navbar scroll effect --- */
    const mainNav = document.getElementById('mainNav');
    if (mainNav) {
        window.addEventListener('scroll', () => {
            mainNav.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    /* --- Hamburger menu --- */
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => navLinks.classList.toggle('show'));

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => navLinks.classList.remove('show'));
        });

        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
                navLinks.classList.remove('show');
            }
        });
    }

    /* --- Sidebar toggle (admin/department) --- */
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    /* --- Sidebar section switching --- */
    const sidebarNavItems = document.querySelectorAll('.sidebar .nav-links li');
    const contentSections = document.querySelectorAll('.content-section');

    if (sidebarNavItems.length > 0) {
        function switchSection(sectionId) {
            sidebarNavItems.forEach(n => n.classList.remove('active'));
            contentSections.forEach(s => s.classList.remove('active'));

            const activeNav = document.querySelector(`[data-section="${sectionId}"]`);
            if (activeNav) activeNav.classList.add('active');

            const activeSection = document.getElementById(sectionId);
            if (activeSection) activeSection.classList.add('active');
        }

        sidebarNavItems.forEach(item => {
            item.addEventListener('click', () => {
                const sid = item.getAttribute('data-section');
                switchSection(sid);
                window.history.replaceState(null, null, `?section=${sid}`);

                if (window.innerWidth <= 992 && sidebar) {
                    sidebar.classList.remove('open');
                }
            });
        });

        // Restore section from URL
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section');
        if (section) switchSection(section);

        // Expose for external use
        window.switchSection = switchSection;
    }

    /* --- Page transition for user nav links --- */
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        document.querySelectorAll('.nav-links a, .btn-page').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (!href || href.includes('logout') || href.startsWith('#') || link.classList.contains('disabled')) return;

                e.preventDefault();
                mainContent.classList.add('fade-out');
                setTimeout(() => { window.location.href = href; }, 350);
            });
        });
    }

    /* --- Auto-dismiss toasts --- */
    document.querySelectorAll('.toast').forEach(toast => {
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    });
});

/* --- Toast helper (call from anywhere) --- */
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

/* --- Styled confirmation dialog --- */
function confirmAction(message, title = 'Confirm') {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-box">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirm-actions">
                    <button class="btn btn-ghost" id="confirmNo">Cancel</button>
                    <button class="btn btn-primary" id="confirmYes">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#confirmYes').addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        overlay.querySelector('#confirmNo').addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        });
    });
}

/* --- Modal helpers --- */
function openModal(id) {
    document.getElementById(id).style.display = 'block';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

/* Close modals on backdrop click */
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

/* --- Password toggle helper --- */
function togglePasswordVisibility(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}
