# IdeaLink Full Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform IdeaLink from a working-but-insecure PHP suggestion platform into a professional, secure, responsive, and fully functional system.

**Architecture:** Reorganize flat file structure into role-based directories with shared includes. Fix all security vulnerabilities (password hashing, prepared statements). Unify CSS with design system variables. Extract shared JS. Keep existing PHP procedural approach — no MVC rewrite.

**Tech Stack:** PHP 8.2, MySQL/MariaDB, vanilla CSS with custom properties, vanilla JavaScript, XAMPP, Font Awesome 6

**Note:** This project has no git repository and no automated test framework. Verification is manual (browser testing). No commit steps are included.

---

## Task 1: Create Directory Structure and Shared Includes

**Files:**
- Create: `includes/db_connect.php`
- Create: `includes/functions.php`
- Create: `includes/header.php`
- Create: `includes/footer.php`

- [ ] **Step 1: Create directory structure**

Run:
```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
mkdir -p assets/css assets/js assets/images includes admin registrar accounting user auth api
```

- [ ] **Step 2: Move images to assets/images**

Run:
```bash
cp logo.png assets/images/logo.png
cp school_logo.png assets/images/school_logo.png
```

- [ ] **Step 3: Create includes/db_connect.php**

```php
<?php
$host = "localhost";
$user = "root";
$pass = "";
$db = "suggestion_db";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Connection Failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");
?>
```

- [ ] **Step 4: Create includes/functions.php**

```php
<?php
/**
 * Set or get a flash message.
 * Set: flash('success', 'Done!');
 * Get: $msg = flash('success');
 */
function flash(string $key, string $message = '', string $type = 'success'): ?array {
    if ($message !== '') {
        $_SESSION['flash'][$key] = ['message' => $message, 'type' => $type];
        return null;
    }
    if (isset($_SESSION['flash'][$key])) {
        $flash = $_SESSION['flash'][$key];
        unset($_SESSION['flash'][$key]);
        return $flash;
    }
    return null;
}

/**
 * Redirect and exit.
 */
function redirect(string $url): void {
    header("Location: $url");
    exit;
}

/**
 * Check if a session variable is set.
 */
function isLoggedIn(string $sessionKey): bool {
    return isset($_SESSION[$sessionKey]);
}

/**
 * Sanitize output for HTML display.
 */
function e(string $str): string {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

/**
 * Human-readable time difference.
 */
function timeAgo(string $datetime): string {
    $now = new DateTime();
    $past = new DateTime($datetime);
    $diff = $now->diff($past);

    if ($diff->y > 0) return $diff->y . ' year' . ($diff->y > 1 ? 's' : '') . ' ago';
    if ($diff->m > 0) return $diff->m . ' month' . ($diff->m > 1 ? 's' : '') . ' ago';
    if ($diff->d > 0) return $diff->d . ' day' . ($diff->d > 1 ? 's' : '') . ' ago';
    if ($diff->h > 0) return $diff->h . ' hour' . ($diff->h > 1 ? 's' : '') . ' ago';
    if ($diff->i > 0) return $diff->i . ' min' . ($diff->i > 1 ? 's' : '') . ' ago';
    return 'Just now';
}

/**
 * Get the base URL path for includes and assets.
 * Returns path relative to IdeaLink root from current file location.
 */
function basePath(): string {
    $docRoot = $_SERVER['DOCUMENT_ROOT'];
    $currentDir = dirname($_SERVER['SCRIPT_FILENAME']);
    $depth = substr_count(str_replace($docRoot . '/IdeaLink', '', $currentDir), '/');
    if ($depth === 0) return '.';
    return str_repeat('/..', $depth);
}
?>
```

- [ ] **Step 5: Create includes/header.php**

This file accepts `$role` ('public', 'user', 'admin', 'registrar', 'accounting'), `$currentPage`, and `$base` variables.

```php
<?php
// $role, $currentPage, and $base must be set before including this file
// $unreadCount is optional (for user notification badge)
$unreadCount = $unreadCount ?? 0;
?>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet">

<?php if ($role === 'public' || $role === 'user'): ?>
<nav id="mainNav">
    <div class="logo-wrapper">
        <img src="<?= $base ?>/assets/images/logo.png" alt="Logo" class="nav-logo-img">
        <a href="<?= $base ?>/index.php" class="logo">Idea<span>Link</span></a>
    </div>

    <?php if ($role === 'public'): ?>
    <div class="nav-links" id="navLinks">
        <a href="#hero" class="<?= $currentPage === 'home' ? 'active-link' : '' ?>">Home</a>
        <a href="#about">About</a>
        <a href="#suggestion">Submit Suggestion</a>
        <a href="#latest_announ">Latest News</a>
        <a href="#highlights">Highlights</a>
        <?php
        $loginDest = isset($_SESSION['user_id']) ? "$base/user/index.php" : "$base/user/login.php";
        $loginText = isset($_SESSION['user_id']) ? "Dashboard" : "Login";
        ?>
        <a href="<?= $loginDest ?>" class="btn-login"><?= $loginText ?></a>
    </div>
    <?php else: ?>
    <div class="nav-links" id="navLinks">
        <a href="<?= $base ?>/user/index.php" class="<?= $currentPage === 'dashboard' ? 'active-link' : '' ?>">Dashboard</a>
        <a href="<?= $base ?>/user/submit.php" class="<?= $currentPage === 'submit' ? 'active-link' : '' ?>">Submit Suggestion</a>
        <a href="<?= $base ?>/user/announcements.php" class="<?= $currentPage === 'announcements' ? 'active-link' : '' ?>">
            Latest News
            <?php if ($unreadCount > 0): ?>
                <span class="nav-notif-badge"><?= $unreadCount ?></span>
            <?php endif; ?>
        </a>
        <a href="<?= $base ?>/user/submissions.php" class="<?= $currentPage === 'submissions' ? 'active-link' : '' ?>">Submissions</a>
        <a href="<?= $base ?>/user/logout.php" class="btn-logout">Logout</a>
    </div>
    <?php endif; ?>

    <div class="hamburger" id="hamburger">
        <div></div>
        <div></div>
        <div></div>
    </div>
</nav>
<?php endif; ?>
```

- [ ] **Step 6: Create includes/footer.php**

```php
<footer class="site-footer">
    <div class="footer-container">
        <p>ASCB E-Suggestion Platform &copy; <?= date('Y') ?> &middot; Improving Communication, Empowering Innovation</p>
    </div>
</footer>
```

- [ ] **Step 7: Verify includes work**

Open `http://localhost/IdeaLink/` in browser. At this point old files still work. New includes are ready but not yet used.

---

## Task 2: Create CSS Design System (main.css)

**Files:**
- Create: `assets/css/main.css`

- [ ] **Step 1: Create assets/css/main.css with design system variables and shared component styles**

This is the global stylesheet loaded on every page. It contains CSS custom properties, reset, typography, shared components (buttons, cards, badges, toast, modals, tables, forms, nav, footer), and responsive utilities.

```css
/* =============================================
   IDEALINK DESIGN SYSTEM - main.css
   ============================================= */

/* --- CSS Reset & Variables --- */
*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    /* Colors */
    --primary-dark: #0a1628;
    --secondary-dark: #1b2b48;
    --tertiary-dark: #0c1524;
    --accent: #4db8ff;
    --accent-hover: #3aa0e6;
    --accent-glow: rgba(77, 184, 255, 0.25);
    --success: #2ecc71;
    --success-bg: rgba(46, 204, 113, 0.15);
    --warning: #f39c12;
    --warning-bg: rgba(243, 156, 18, 0.15);
    --danger: #e74c3c;
    --danger-bg: rgba(231, 76, 60, 0.15);
    --text-primary: #ffffff;
    --text-secondary: #b0c4de;
    --text-dim: #7a8ba5;
    --glass: rgba(255, 255, 255, 0.06);
    --glass-border: rgba(255, 255, 255, 0.1);
    --glass-hover: rgba(255, 255, 255, 0.12);
    --glass-strong: rgba(255, 255, 255, 0.08);

    /* Spacing & Radius */
    --radius: 12px;
    --radius-sm: 8px;
    --radius-lg: 16px;
    --radius-pill: 50px;

    /* Shadows */
    --shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.2);
    --shadow-lg: 0 12px 48px rgba(0, 0, 0, 0.4);

    /* Transitions */
    --transition: all 0.3s ease;
    --transition-fast: all 0.15s ease;

    /* Font */
    --font: 'Poppins', sans-serif;

    /* Sidebar */
    --sidebar-width: 260px;
}

html {
    scroll-behavior: smooth;
}

body {
    font-family: var(--font);
    background: linear-gradient(135deg, var(--primary-dark), var(--secondary-dark));
    color: var(--text-primary);
    min-height: 100vh;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
}

a {
    color: var(--accent);
    text-decoration: none;
    transition: var(--transition-fast);
}

a:hover {
    color: var(--accent-hover);
}

img {
    max-width: 100%;
    height: auto;
}

/* --- Scrollbar --- */
::-webkit-scrollbar {
    width: 6px;
}
::-webkit-scrollbar-track {
    background: var(--primary-dark);
}
::-webkit-scrollbar-thumb {
    background: var(--accent);
    border-radius: 3px;
}

/* =============================================
   TOP NAVBAR (public + user pages)
   ============================================= */
#mainNav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 40px;
    background: var(--tertiary-dark);
    position: sticky;
    top: 0;
    z-index: 1000;
    transition: var(--transition);
}

#mainNav.scrolled {
    padding: 10px 40px;
    background: rgba(12, 21, 36, 0.95);
    backdrop-filter: blur(10px);
}

.logo-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
}

.nav-logo-img {
    height: 40px;
    width: auto;
}

.logo {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-primary) !important;
    text-decoration: none !important;
}

.logo span {
    color: var(--accent);
}

.nav-links {
    display: flex;
    align-items: center;
    gap: 25px;
}

.nav-links a {
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 400;
    position: relative;
    padding: 5px 0;
    text-decoration: none;
}

.nav-links a::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--accent);
    transition: var(--transition);
}

.nav-links a:hover,
.nav-links a.active-link {
    color: var(--accent);
}

.nav-links a:hover::after,
.nav-links a.active-link::after {
    width: 100%;
}

.btn-login,
.btn-logout {
    background: var(--accent) !important;
    color: var(--primary-dark) !important;
    padding: 8px 20px !important;
    border-radius: var(--radius-pill) !important;
    font-weight: 600 !important;
    font-size: 0.85rem !important;
}

.btn-login:hover,
.btn-logout:hover {
    background: var(--accent-hover) !important;
    transform: translateY(-1px);
}

.btn-login::after,
.btn-logout::after {
    display: none !important;
}

/* Notification badge on nav */
.nav-notif-badge {
    background: var(--danger);
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: var(--radius-pill);
    position: relative;
    top: -8px;
    margin-left: -5px;
    animation: badgePulse 2s infinite;
}

/* Hamburger */
.hamburger {
    display: none;
    flex-direction: column;
    gap: 5px;
    cursor: pointer;
    z-index: 1001;
}

.hamburger div {
    width: 25px;
    height: 3px;
    background: var(--text-primary);
    border-radius: 2px;
    transition: var(--transition);
}

@media (max-width: 768px) {
    #mainNav {
        padding: 12px 20px;
    }

    .hamburger {
        display: flex;
    }

    .nav-links {
        display: none;
        flex-direction: column;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: rgba(12, 21, 36, 0.98);
        backdrop-filter: blur(15px);
        padding: 20px;
        gap: 15px;
        border-bottom: 1px solid var(--glass-border);
    }

    .nav-links.show {
        display: flex;
    }

    .nav-links a {
        font-size: 1rem;
        padding: 10px 0;
    }
}

/* =============================================
   SIDEBAR (admin + department dashboards)
   ============================================= */
.sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sidebar-width);
    height: 100vh;
    background: var(--tertiary-dark);
    padding: 30px 20px;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    border-right: 1px solid var(--glass-border);
    overflow-y: auto;
}

.sidebar .logo {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 40px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.sidebar .nav-logo {
    height: 35px;
    width: auto;
}

.sidebar .nav-links {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.sidebar .nav-links li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 15px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 0.9rem;
    transition: var(--transition);
    position: relative;
}

.sidebar .nav-links li:hover {
    background: var(--glass);
    color: var(--text-primary);
}

.sidebar .nav-links li.active {
    background: var(--accent-glow);
    color: var(--accent);
    font-weight: 600;
}

.sidebar .nav-links li.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 60%;
    background: var(--accent);
    border-radius: 0 3px 3px 0;
}

.nav-badge {
    background: var(--danger);
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--radius-pill);
    margin-left: auto;
    animation: badgePulse 2s infinite;
}

@keyframes badgePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}

/* Sidebar logout button */
.sidebar-logout {
    margin-top: auto;
    padding-top: 20px;
}

.sidebar-logout .btn-logout-sidebar {
    display: block;
    width: 100%;
    text-align: center;
    padding: 12px;
    background: var(--accent);
    color: var(--primary-dark);
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none;
    transition: var(--transition);
}

.sidebar-logout .btn-logout-sidebar:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
}

/* Main content offset for sidebar pages */
.sidebar-layout {
    margin-left: var(--sidebar-width);
    padding: 30px;
    min-height: 100vh;
}

/* Mobile sidebar */
.mobile-header {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: var(--tertiary-dark);
    align-items: center;
    padding: 0 20px;
    z-index: 999;
    border-bottom: 1px solid var(--glass-border);
}

.mobile-header .menu-btn {
    font-size: 1.4rem;
    color: var(--text-primary);
    cursor: pointer;
}

@media (max-width: 992px) {
    .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
    }

    .sidebar.open {
        transform: translateX(0);
    }

    .mobile-header {
        display: flex;
    }

    .sidebar-layout {
        margin-left: 0;
        padding: 80px 20px 30px;
    }
}

/* =============================================
   SHARED COMPONENTS
   ============================================= */

/* --- Cards --- */
.card {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius);
    padding: 25px;
    margin-bottom: 20px;
    transition: var(--transition);
}

.card:hover {
    border-color: rgba(255, 255, 255, 0.15);
    background: var(--glass-hover);
}

.card h3 {
    color: var(--accent);
    font-size: 1.1rem;
    margin-bottom: 15px;
}

/* --- Stats Grid --- */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 15px;
    margin-bottom: 25px;
}

.stat-box {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius);
    padding: 20px;
    text-align: center;
    transition: var(--transition);
}

.stat-box:hover {
    transform: translateY(-3px);
    border-color: var(--accent);
    box-shadow: 0 8px 25px var(--accent-glow);
}

.stat-box i {
    font-size: 1.5rem;
    color: var(--accent);
    margin-bottom: 10px;
}

.stat-box h2 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
}

.stat-box p {
    font-size: 0.8rem;
    color: var(--text-dim);
    margin-top: 5px;
}

/* --- Status Badges --- */
.badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: var(--radius-pill);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.badge-pending {
    background: var(--warning-bg);
    color: var(--warning);
    border: 1px solid rgba(243, 156, 18, 0.3);
}

.badge-reviewed {
    background: var(--success-bg);
    color: var(--success);
    border: 1px solid rgba(46, 204, 113, 0.3);
}

.badge-new {
    background: var(--accent);
    color: var(--primary-dark);
    font-size: 0.65rem;
    padding: 2px 8px;
    margin-left: 8px;
    vertical-align: middle;
}

/* --- Buttons --- */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 24px;
    border-radius: var(--radius-sm);
    font-family: var(--font);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: var(--transition);
    text-decoration: none;
}

.btn-primary {
    background: var(--accent);
    color: var(--primary-dark);
}

.btn-primary:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 15px var(--accent-glow);
}

.btn-danger {
    background: var(--danger);
    color: white;
}

.btn-danger:hover {
    background: #c0392b;
}

.btn-ghost {
    background: transparent;
    color: var(--accent);
    border: 1px solid var(--glass-border);
}

.btn-ghost:hover {
    background: var(--glass);
    border-color: var(--accent);
}

/* Icon buttons for tables */
.icon-btn {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    border: 1px solid var(--glass-border);
    background: var(--glass);
    color: var(--text-secondary);
    cursor: pointer;
    transition: var(--transition);
    font-size: 0.85rem;
}

.icon-btn:hover {
    transform: translateY(-1px);
}

.icon-btn.btn-view:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-glow);
}

.icon-btn.btn-edit:hover {
    color: var(--warning);
    border-color: var(--warning);
    background: var(--warning-bg);
}

.icon-btn.btn-delete:hover {
    color: var(--danger);
    border-color: var(--danger);
    background: var(--danger-bg);
}

.icon-btn.btn-feature:hover {
    color: var(--warning);
    border-color: var(--warning);
    background: var(--warning-bg);
}

.icon-btn.btn-success:hover {
    color: var(--success);
    border-color: var(--success);
    background: var(--success-bg);
}

.action-group {
    display: flex;
    gap: 6px;
    align-items: center;
}

/* --- Tables --- */
.table-container {
    overflow-x: auto;
    border-radius: var(--radius);
    border: 1px solid var(--glass-border);
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
}

thead th {
    background: rgba(77, 184, 255, 0.1);
    color: var(--accent);
    padding: 12px 15px;
    text-align: left;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
}

tbody td {
    padding: 12px 15px;
    border-bottom: 1px solid var(--glass-border);
    color: var(--text-secondary);
}

tbody tr:hover {
    background: var(--glass);
}

tbody tr.row-pending {
    border-left: 3px solid var(--warning);
}

.unread-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    background: var(--accent);
    border-radius: 50%;
    margin-right: 8px;
    animation: badgePulse 2s infinite;
}

/* --- Forms --- */
.form-container {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius);
    padding: 30px;
    max-width: 600px;
    margin: 0 auto 30px;
}

.form-container h2 {
    color: var(--accent);
    margin-bottom: 20px;
    font-size: 1.2rem;
}

.input-group {
    margin-bottom: 18px;
}

.input-group label {
    display: block;
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 6px;
}

.input-group input,
.input-group select,
.input-group textarea {
    width: 100%;
    padding: 12px 15px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font);
    font-size: 0.9rem;
    transition: var(--transition);
    outline: none;
}

.input-group input:focus,
.input-group select:focus,
.input-group textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
}

.input-group input::placeholder,
.input-group textarea::placeholder {
    color: var(--text-dim);
}

.input-group select option {
    background: var(--secondary-dark);
    color: var(--text-primary);
}

.input-group textarea {
    resize: vertical;
    min-height: 100px;
}

.btn-submit {
    width: 100%;
    padding: 14px;
    background: var(--accent);
    color: var(--primary-dark);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
}

.btn-submit:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px var(--accent-glow);
}

.btn-submit:active {
    transform: translateY(0);
}

/* Submission warning */
.submission-warning {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    background: var(--warning-bg);
    border: 1px solid rgba(243, 156, 18, 0.3);
    border-radius: var(--radius-sm);
    padding: 12px 15px;
    margin-bottom: 20px;
}

.submission-warning .warning-icon {
    font-size: 1.2rem;
}

.submission-warning .warning-text {
    font-size: 0.8rem;
    color: var(--text-secondary);
    line-height: 1.5;
}

/* --- Modals --- */
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(5px);
    z-index: 2000;
    padding: 20px;
    overflow-y: auto;
}

.modal-content {
    background: linear-gradient(135deg, #1a2940, #0f1e33);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 30px;
    max-width: 550px;
    margin: 80px auto;
    position: relative;
    animation: modalIn 0.3s ease;
}

@keyframes modalIn {
    from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.modal .close-btn {
    position: absolute;
    top: 15px;
    right: 20px;
    font-size: 1.5rem;
    color: var(--text-dim);
    cursor: pointer;
    transition: var(--transition);
    line-height: 1;
}

.modal .close-btn:hover {
    color: var(--danger);
}

.modal-label {
    display: block;
    font-size: 0.75rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 15px;
    margin-bottom: 5px;
}

.modal-val {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    padding: 10px 15px;
    color: var(--text-secondary);
    font-size: 0.9rem;
}

/* Modal forms */
.modal-content input,
.modal-content textarea {
    width: 100%;
    padding: 12px 15px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font);
    font-size: 0.9rem;
    transition: var(--transition);
    outline: none;
    margin-top: 8px;
}

.modal-content input:focus,
.modal-content textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
}

.modal-content textarea {
    resize: vertical;
    min-height: 100px;
}

/* --- Toast Notifications --- */
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 3000;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.toast {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    border-radius: var(--radius);
    background: linear-gradient(135deg, #1a2940, #0f1e33);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-lg);
    color: var(--text-primary);
    font-size: 0.9rem;
    min-width: 280px;
    max-width: 420px;
    animation: toastIn 0.4s ease;
    transition: var(--transition);
}

.toast.toast-out {
    animation: toastOut 0.3s ease forwards;
}

.toast-success { border-left: 4px solid var(--success); }
.toast-error { border-left: 4px solid var(--danger); }
.toast-warning { border-left: 4px solid var(--warning); }
.toast-info { border-left: 4px solid var(--accent); }

.toast i {
    font-size: 1.1rem;
}

.toast-success i { color: var(--success); }
.toast-error i { color: var(--danger); }
.toast-warning i { color: var(--warning); }
.toast-info i { color: var(--accent); }

@keyframes toastIn {
    from {
        opacity: 0;
        transform: translateX(40px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes toastOut {
    to {
        opacity: 0;
        transform: translateX(40px);
    }
}

/* --- Hero Section (user pages) --- */
.hero {
    text-align: center;
    padding: 50px 20px 30px;
}

.hero h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 10px;
}

.hero p {
    color: var(--text-secondary);
    font-size: 1rem;
    max-width: 500px;
    margin: 0 auto;
}

/* --- Dashboard Cards (user) --- */
.dashboard-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 20px;
    padding: 0 20px 40px;
    max-width: 900px;
    margin: 0 auto;
}

.dashboard-cards .card {
    text-align: center;
    padding: 30px 25px;
}

.dashboard-cards .card-icon {
    font-size: 2.5rem;
    margin-bottom: 15px;
}

.dashboard-cards .card h2 {
    font-size: 1.1rem;
    margin-bottom: 10px;
}

.dashboard-cards .card p {
    color: var(--text-dim);
    font-size: 0.85rem;
    margin-bottom: 20px;
}

.card-btn {
    display: inline-block;
    padding: 10px 24px;
    background: var(--accent);
    color: var(--primary-dark) !important;
    border-radius: var(--radius-pill);
    font-weight: 600;
    font-size: 0.85rem;
    transition: var(--transition);
    text-decoration: none;
}

.card-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px var(--accent-glow);
}

/* --- Content Header (admin/department dashboards) --- */
.content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    flex-wrap: wrap;
    gap: 15px;
}

.welcome-text h1 {
    font-size: 1.5rem;
    font-weight: 700;
}

.welcome-text p {
    color: var(--text-dim);
    font-size: 0.85rem;
}

.admin-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--success-bg);
    border: 1px solid rgba(46, 204, 113, 0.3);
    border-radius: var(--radius-pill);
    padding: 8px 16px;
    font-size: 0.8rem;
    color: var(--success);
    font-weight: 600;
}

.pulse-icon {
    width: 8px;
    height: 8px;
    background: var(--success);
    border-radius: 50%;
    animation: badgePulse 2s infinite;
}

/* --- Content Sections (tab switching) --- */
.content-section {
    display: none;
}

.content-section.active {
    display: block;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}

/* --- Pagination --- */
.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    margin-top: 25px;
    flex-wrap: wrap;
}

.pagination .btn-page,
.pagination button {
    padding: 8px 18px;
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: var(--font);
    font-size: 0.85rem;
    cursor: pointer;
    transition: var(--transition);
    text-decoration: none;
}

.pagination .btn-page:hover:not(.disabled),
.pagination button:hover:not(:disabled) {
    background: var(--accent);
    color: var(--primary-dark);
    border-color: var(--accent);
}

.pagination .btn-page.disabled,
.pagination button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.pagination .page-indicator {
    color: var(--text-dim);
    font-size: 0.85rem;
}

/* --- Announcements (user-facing cards) --- */
.announcement-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 20px 40px;
}

.announcement-card {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-left: 4px solid var(--accent);
    border-radius: var(--radius);
    padding: 20px 25px;
    margin-bottom: 15px;
    transition: var(--transition);
}

.announcement-card:hover {
    border-left-color: var(--accent-hover);
    background: var(--glass-hover);
    transform: translateX(3px);
}

.announcement-title {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 6px;
}

.announcement-date {
    font-size: 0.78rem;
    color: var(--text-dim);
    display: block;
    margin-bottom: 10px;
}

.announcement-message {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
}

/* --- Footer --- */
.site-footer {
    text-align: center;
    padding: 25px 20px;
    color: var(--text-dim);
    font-size: 0.8rem;
    border-top: 1px solid var(--glass-border);
    margin-top: 40px;
}

/* --- Fade transition for page navigation --- */
.main-content {
    transition: opacity 0.4s ease, transform 0.4s ease;
}

.main-content.fade-out {
    opacity: 0;
    transform: translateY(-15px);
}

/* --- Confirmation Dialog --- */
.confirm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
}

.confirm-box {
    background: linear-gradient(135deg, #1a2940, #0f1e33);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 30px;
    max-width: 400px;
    width: 90%;
    text-align: center;
}

.confirm-box h3 {
    color: var(--text-primary);
    margin-bottom: 10px;
    font-size: 1.1rem;
}

.confirm-box p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-bottom: 25px;
}

.confirm-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
}

/* --- Empty State --- */
.empty-state {
    text-align: center;
    padding: 50px 20px;
    color: var(--text-dim);
}

.empty-state i {
    font-size: 3rem;
    margin-bottom: 15px;
    opacity: 0.4;
}

.empty-state p {
    font-size: 0.95rem;
}

/* --- Filter Form --- */
.filter-form {
    display: flex;
    gap: 10px;
    margin: 15px 0 20px;
    flex-wrap: wrap;
}

.filter-form select {
    flex: 1;
    min-width: 150px;
    padding: 10px 15px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font);
    font-size: 0.85rem;
    outline: none;
    transition: var(--transition);
}

.filter-form select:focus {
    border-color: var(--accent);
}

.filter-form select option {
    background: var(--secondary-dark);
}

/* --- Reveal Animation --- */
.reveal {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.6s ease, transform 0.6s ease;
}

.reveal.active {
    opacity: 1;
    transform: translateY(0);
}

/* --- Responsive Utilities --- */
@media (max-width: 480px) {
    .hero h1 {
        font-size: 1.5rem;
    }

    .hero p {
        font-size: 0.9rem;
    }

    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .stat-box h2 {
        font-size: 1.5rem;
    }

    .form-container {
        padding: 20px 15px;
    }

    .modal-content {
        padding: 20px;
        margin: 40px auto;
    }

    .content-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .filter-form {
        flex-direction: column;
    }

    .toast {
        min-width: 260px;
        max-width: calc(100vw - 40px);
    }
}

/* --- Password Toggle --- */
.password-container {
    position: relative;
    display: flex;
    align-items: center;
}

.password-container input {
    width: 100%;
    padding-right: 45px;
}

.toggle-password {
    position: absolute;
    right: 15px;
    cursor: pointer;
    color: var(--accent);
    font-size: 0.9rem;
    user-select: none;
    transition: var(--transition);
}

.toggle-password:hover {
    color: var(--text-primary);
}

/* --- Error Messages --- */
.error-message {
    color: var(--danger);
    font-size: 0.8rem;
    margin-top: 5px;
    display: block;
}

.error-banner {
    text-align: center;
    color: var(--danger);
    background: var(--danger-bg);
    border: 1px solid rgba(231, 76, 60, 0.3);
    border-radius: var(--radius-sm);
    padding: 10px 15px;
    margin-bottom: 15px;
    font-size: 0.9rem;
}
```

- [ ] **Step 2: Verify CSS loads**

Create a simple test page or preview in browser. Confirm variables render correctly.

---

## Task 3: Create Shared JavaScript (main.js)

**Files:**
- Create: `assets/js/main.js`

- [ ] **Step 1: Create assets/js/main.js**

```javascript
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
```

---

## Task 4: Create Password Migration Script

**Files:**
- Create: `migrate_passwords.php`

- [ ] **Step 1: Create migrate_passwords.php**

```php
<?php
/**
 * ONE-TIME SCRIPT: Hash all existing plain-text passwords.
 * Run once, then delete this file.
 *
 * Usage: php migrate_passwords.php
 * Or visit: http://localhost/IdeaLink/migrate_passwords.php
 */
require_once __DIR__ . '/includes/db_connect.php';

echo "<pre>\n";
echo "=== IdeaLink Password Migration ===\n\n";

$tables = [
    'user_accounts'      => 'password',
    'admin_accounts'     => 'password',
    'registrar_accounts' => 'password',
    'accounting_accounts'=> 'password',
];

foreach ($tables as $table => $col) {
    echo "Processing: $table\n";
    $res = $conn->query("SELECT id, $col FROM $table");
    $count = 0;

    while ($row = $res->fetch_assoc()) {
        $pwd = $row[$col];

        // Skip if already hashed (bcrypt hashes start with $2y$)
        if (str_starts_with($pwd, '$2y$')) {
            echo "  ID {$row['id']}: already hashed, skipping\n";
            continue;
        }

        $hashed = password_hash($pwd, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE $table SET $col = ? WHERE id = ?");
        $stmt->bind_param("si", $hashed, $row['id']);
        $stmt->execute();
        $count++;
        echo "  ID {$row['id']}: hashed successfully\n";
    }

    echo "  -> $count passwords updated in $table\n\n";
}

echo "=== Migration Complete ===\n";
echo "DELETE THIS FILE NOW for security.\n";
echo "</pre>";
?>
```

- [ ] **Step 2: Run migration**

Visit `http://localhost/IdeaLink/migrate_passwords.php` in browser. Verify all passwords are hashed. Then delete the file.

---

## Task 5: Build Auth Pages (Login + Signup)

**Files:**
- Create: `user/login.php`
- Create: `user/signup.php`
- Create: `auth/login_process.php`
- Create: `user/logout.php`
- Create: `admin/login.php`
- Create: `admin/logout.php`
- Create: `registrar/login.php`
- Create: `registrar/logout.php`
- Create: `accounting/login.php`
- Create: `accounting/logout.php`
- Create: `assets/css/auth.css`

- [ ] **Step 1: Create assets/css/auth.css**

Auth-specific styles for login/signup pages (the glassmorphism card, gradient background with floating elements). Build on top of main.css variables. Include the login wrapper, animated background, form-specific styling. Port the existing design from `user_login.css` and `faculty_login.css` but using the new CSS variables from main.css.

The key elements to style:
- `.auth-body` — gradient background with animated floating pseudo-elements
- `.login-wrapper` — glassmorphism card (backdrop-filter, glass background, border)
- `.logo-container` — centered logo
- `.subtitle` — description text below title
- `.links` — bottom links (forgot password, signup)
- Responsive adjustments for mobile

- [ ] **Step 2: Create user/login.php**

Port from existing `user_login.php`. Changes:
- Include paths: `../includes/db_connect.php`, `../includes/functions.php`
- Link CSS: `../assets/css/main.css`, `../assets/css/auth.css`
- Link JS: `../assets/js/main.js`
- Image paths: `../assets/images/logo.png`
- Form action: `../auth/login_process.php`
- Signup link: `signup.php`
- Use flash messages for errors instead of URL params
- Keep password toggle using `togglePasswordVisibility()` from main.js

- [ ] **Step 3: Create auth/login_process.php with password_verify()**

```php
<?php
session_name("user_session");
session_start();
require_once __DIR__ . '/../includes/db_connect.php';
require_once __DIR__ . '/../includes/functions.php';

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $email = trim($_POST['email']);
    $password = $_POST['password'];

    $stmt = $conn->prepare("SELECT id, fullname, password FROM user_accounts WHERE email = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        flash('login_error', 'This email is not registered.', 'error');
        redirect('../user/login.php');
    }

    $user = $result->fetch_assoc();

    if (password_verify($password, $user['password'])) {
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['fullname'] = $user['fullname'];
        redirect('../user/index.php');
    } else {
        flash('login_error', 'Incorrect password.', 'error');
        redirect('../user/login.php');
    }

    $stmt->close();
}
?>
```

- [ ] **Step 4: Create user/signup.php with password_hash()**

Port from existing `signup.php`. Key changes:
- Hash password: `$hashed = password_hash($password, PASSWORD_DEFAULT);`
- Use `$hashed` in INSERT statement instead of `$password`
- Use flash messages for errors
- Include new CSS/JS paths
- Redirect to `login.php` on success

- [ ] **Step 5: Create user/logout.php**

```php
<?php
session_name("user_session");
session_start();
$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
}
session_destroy();
header("Location: login.php");
exit;
?>
```

- [ ] **Step 6: Create admin/login.php with password_verify()**

Port from existing `admin_login.php`. Same pattern as user login but:
- Session name: `admin_session`
- Query `admin_accounts` table by email
- Set `$_SESSION['admin_id']` and `$_SESSION['admin_name']`
- Use `password_verify()` instead of `===`
- Add `session_regenerate_id(true)` after successful login
- Redirect to `index.php` (admin dashboard)
- CSS/image paths relative to admin/ directory

- [ ] **Step 7: Create admin/logout.php**

Same pattern as user/logout.php but session_name is `admin_session`, redirect to `login.php`.

- [ ] **Step 8: Create registrar/login.php with password_verify()**

Port from existing `registrar_login.php`. Same pattern but:
- Session name: `registrar_session`
- Query `registrar_accounts` by username
- Set `$_SESSION['registrar_id']` and `$_SESSION['registrar_name']`
- Use `password_verify()`
- Add `session_regenerate_id(true)`

- [ ] **Step 9: Create registrar/logout.php**

Same pattern, session_name `registrar_session`, redirect to `login.php`.

- [ ] **Step 10: Create accounting/login.php with password_verify()**

Same as registrar but for accounting:
- Session name: `accounting_session`
- Query `accounting_accounts` by username
- Set `$_SESSION['accounting_id']` and `$_SESSION['accounting_name']`

- [ ] **Step 11: Create accounting/logout.php**

Same pattern, session_name `accounting_session`, redirect to `login.php`.

- [ ] **Step 12: Verify all login flows work in browser**

Test: user login, admin login, registrar login, accounting login. Verify password_verify works with hashed passwords. Test signup creates hashed password.

---

## Task 6: Build Homepage

**Files:**
- Create: `index.php` (root — replaces homepage.php)
- Create: `assets/css/homepage.css`

- [ ] **Step 1: Create assets/css/homepage.css**

Port styles from existing `homepage.css` but using new CSS variables. Keep:
- Hero section with school logo and floating animation
- About section with wave SVG divider
- Suggestion CTA section with lightbulb
- News section with pagination
- Testimonials carousel with glassmorphism cards and dots
- All responsive breakpoints

Remove duplicate styles already in main.css (nav, footer, buttons, etc.).

- [ ] **Step 2: Create index.php**

Port from existing `homepage.php`. Changes:
- Include `includes/db_connect.php` and `includes/functions.php`
- Load `assets/css/main.css` and `assets/css/homepage.css`
- Load `assets/js/main.js`
- Use `includes/header.php` with `$role = 'public'`
- Use `includes/footer.php`
- Image paths: `assets/images/logo.png`, `assets/images/school_logo.png`
- Fix duplicate event listeners (remove the second nextBtn/prevBtn block at lines 259-273)
- Fix duplicate `initTestimonials()` call (remove the second one at line 460)
- Fix duplicate `startAutoSlide`/`stopAutoSlide` function definitions (keep only one)
- API fetch paths: `api/fetch_announcements.php`, `api/fetch_testimonials.php`
- Update copyright year to dynamic `<?= date('Y') ?>`
- Keep all existing functionality (announcement pagination, testimonial carousel with auto-slide, hover pause, scroll animations)

- [ ] **Step 3: Verify homepage in browser**

Check: nav links, hero section, about section, CTA, announcements load and paginate, testimonials slide and pause on hover, mobile hamburger works.

---

## Task 7: Build User Pages

**Files:**
- Create: `user/index.php` (dashboard)
- Create: `user/submit.php`
- Create: `user/submissions.php`
- Create: `user/announcements.php`
- Create: `assets/css/user.css`

- [ ] **Step 1: Create assets/css/user.css**

Minimal user-specific styles not already in main.css. Include:
- `.main-content` wrapper padding
- Any user-specific layout tweaks
- Preview/submission table enhancements
- Most styling comes from main.css shared components

- [ ] **Step 2: Create user/index.php (dashboard)**

Port from `user_dash.php`. Changes:
- Session check, include db_connect and functions
- Calculate unread announcement count for nav badge:
```php
$u_stmt = $conn->prepare("SELECT last_announcement_view FROM user_accounts WHERE id = ?");
$u_stmt->bind_param("i", $_SESSION['user_id']);
$u_stmt->execute();
$lav = $u_stmt->get_result()->fetch_assoc()['last_announcement_view'];
$unreadCount = $conn->query("SELECT COUNT(*) as c FROM announcements WHERE date_posted > '$lav'")->fetch_assoc()['c'];
```
- Include header.php with `$role = 'user'`, `$currentPage = 'dashboard'`
- Include footer.php
- Add quick stats (total submissions, pending, reviewed):
```php
$uid = $_SESSION['user_id'];
$total = $conn->query("SELECT COUNT(*) as c FROM suggestions WHERE user_id = $uid")->fetch_assoc()['c'];
$pending = $conn->query("SELECT COUNT(*) as c FROM suggestions WHERE user_id = $uid AND status != 'Reviewed'")->fetch_assoc()['c'];
$reviewed = $conn->query("SELECT COUNT(*) as c FROM suggestions WHERE user_id = $uid AND status = 'Reviewed'")->fetch_assoc()['c'];
```
- Display stats above cards
- Use proper asset paths (../assets/...)
- Load main.css, user.css, main.js

- [ ] **Step 3: Create user/submit.php**

Port from existing `submit.php`. Changes:
- Include paths updated for user/ directory
- Use `password_hash` is N/A here — this is suggestion submission
- Use flash() for success message instead of session variable
- Use `e()` for output escaping
- Use `confirmAction()` from main.js instead of native confirm()
- Show toast on success
- Load shared header/footer

- [ ] **Step 4: Create user/submissions.php**

Port from `previous_sub.php`. Changes:
- Fix SQL injection: use prepared statement instead of `WHERE user_id = $user_id`
```php
$stmt = $conn->prepare("SELECT department, title, description, date_submitted, status FROM suggestions WHERE user_id = ? ORDER BY date_submitted DESC");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$suggestions = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
```
- Add status badge column (badge-pending / badge-reviewed)
- Use shared header/footer
- Proper asset paths

- [ ] **Step 5: Create user/announcements.php**

Port from `announcement.php`. Changes:
- Use prepared statements throughout
- Include shared header/footer
- Keep pagination logic
- Keep last_announcement_view tracking
- Use badge-new class for new announcements
- Proper asset paths

- [ ] **Step 6: Verify all user pages in browser**

Test: dashboard shows stats, submit form works, submissions show with status badges, announcements paginate and mark as read, nav badge updates.

---

## Task 8: Build Admin Dashboard

**Files:**
- Create: `admin/index.php` (dashboard)
- Create: `admin/announcements.php`
- Create: `assets/css/admin.css`

- [ ] **Step 1: Create assets/css/admin.css**

Minimal admin-specific styles beyond main.css. Include:
- Any admin-specific layout tweaks
- Most styling comes from main.css shared components (sidebar, tables, modals, cards, stats)

- [ ] **Step 2: Create admin/index.php**

Port from `admin_dash.php`. Changes:
- Include paths: `../includes/db_connect.php`, `../includes/functions.php`
- Load: `../assets/css/main.css`, `../assets/css/admin.css`, `../assets/js/main.js`
- Image: `../assets/images/logo.png`
- Fix announcement modal escaping: use `json_encode()` instead of `addslashes()`
```php
onclick="openEditAnnModal(<?= $ann['id'] ?>, <?= htmlspecialchars(json_encode($ann['title']), ENT_QUOTES) ?>, <?= htmlspecialchars(json_encode($ann['message']), ENT_QUOTES) ?>)"
```
- Remove duplicate `<tbody>` tags (lines 308-309 and 357-358 in original)
- Remove duplicate navItems event listeners (lines 548-559 in original — already handled by main.js)
- Use status badges instead of inline color styles
- Keep all existing functionality (analytics, suggestions filtering, announcements CRUD, testimonials management)
- Sidebar nav, section switching handled by main.js
- Logout link: `logout.php`
- All action URLs relative to admin/ directory

- [ ] **Step 3: Verify admin dashboard in browser**

Test: login, analytics display, filter suggestions, view suggestion modal, mark as reviewed, delete suggestion, feature as testimonial, post/edit/delete announcements, toggle testimonials, mobile sidebar.

---

## Task 9: Build Department Dashboards

**Files:**
- Create: `registrar/index.php`
- Create: `accounting/index.php`
- Create: `assets/css/department.css`

- [ ] **Step 1: Create assets/css/department.css**

Minimal department-specific styles. Most styling from main.css.

- [ ] **Step 2: Create registrar/index.php**

Port from `registrar_dash.php`. Key changes:
- Fix SQL injection: replace `real_escape_string` concatenation with prepared statement:
```php
$query = "SELECT s.*, u.fullname FROM suggestions s 
          JOIN user_accounts u ON s.user_id = u.id 
          WHERE s.department = 'Registrar'";
$params = [];
$types = "";

if ($role_filter !== "All") {
    $query .= " AND s.user_role = ?";
    $params[] = $role_filter;
    $types .= "s";
}
$query .= " ORDER BY s.date_submitted DESC";

if (!empty($params)) {
    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $res = $stmt->get_result();
} else {
    $res = $conn->query($query);
}
```
- Include paths for registrar/ directory
- Load main.css, department.css, main.js
- Remove duplicate navItems event listeners (handled by main.js)
- Use status badges
- Sidebar, section switching handled by main.js
- Logout: `logout.php`

- [ ] **Step 3: Create accounting/index.php**

Same as registrar but:
- Department filter: `'Accounting Office'` instead of `'Registrar'`
- Session name: `accounting_session`
- Session check: `accounting_id`
- Title: "Accounting Dashboard"
- Subtitle: "Financial & Payment Management"
- Different icons for stats (receipt, hand-holding-usd, etc.)
- Logout: `logout.php`

- [ ] **Step 4: Verify department dashboards in browser**

Test: registrar login + dashboard, accounting login + dashboard, filter by role, mark as reviewed, view suggestion modal, mobile sidebar.

---

## Task 10: Build API Endpoints

**Files:**
- Create: `api/fetch_announcements.php`
- Create: `api/fetch_testimonials.php`

- [ ] **Step 1: Create api/fetch_announcements.php**

```php
<?php
require_once __DIR__ . '/../includes/db_connect.php';

header('Content-Type: application/json');

$result = $conn->query("SELECT id, title, message, date_posted FROM announcements ORDER BY date_posted DESC");
$announcements = [];
while ($row = $result->fetch_assoc()) {
    $announcements[] = $row;
}

echo json_encode($announcements);
?>
```

- [ ] **Step 2: Create api/fetch_testimonials.php**

```php
<?php
require_once __DIR__ . '/../includes/db_connect.php';

header('Content-Type: application/json');

$result = $conn->query("SELECT id, name, department, message FROM testimonials WHERE is_active = 1 ORDER BY created_at DESC");
$testimonials = [];
while ($row = $result->fetch_assoc()) {
    $testimonials[] = $row;
}

echo json_encode($testimonials);
?>
```

---

## Task 11: Cleanup Old Files

**Files:**
- Delete: all old root-level PHP files (replaced by new directory structure)
- Delete: old CSS files from root
- Delete: broken PDO files
- Delete: duplicate/legacy files

- [ ] **Step 1: Verify new system works completely before deleting old files**

Open each page in the browser and confirm functionality:
- `http://localhost/IdeaLink/` (homepage)
- `http://localhost/IdeaLink/user/login.php`
- `http://localhost/IdeaLink/user/signup.php`
- `http://localhost/IdeaLink/user/index.php` (user dashboard)
- `http://localhost/IdeaLink/user/submit.php`
- `http://localhost/IdeaLink/user/submissions.php`
- `http://localhost/IdeaLink/user/announcements.php`
- `http://localhost/IdeaLink/admin/login.php`
- `http://localhost/IdeaLink/admin/index.php` (admin dashboard)
- `http://localhost/IdeaLink/registrar/login.php`
- `http://localhost/IdeaLink/registrar/index.php`
- `http://localhost/IdeaLink/accounting/login.php`
- `http://localhost/IdeaLink/accounting/index.php`

- [ ] **Step 2: Delete old files**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
rm -f homepage.php user_login.php user_dash.php submit.php previous_sub.php announcement.php signup.php login_process.php
rm -f admin_login.php admin_dash.php admin_announcement.php admin_logout.php admin_logout_process.php
rm -f registrar_login.php registrar_dash.php registrar_logout.php
rm -f accounting_login.php accounting_dash.php accounting_logout.php account_login.php
rm -f user_logout.php
rm -f config.php db_connect.php dashboard.php
rm -f get_suggestion.php post_announce.php delete_suggest.php get_notif.php
rm -f fetch_announcement.php fetch_testimonials.php
rm -f homepage.css user_login.css user_main_style.css admin_dash.css faculty_login.css department_dash.css
rm -rf "CSS File"
```

- [ ] **Step 3: Final verification after cleanup**

Retest all pages to confirm nothing broke after removing old files.

---

## Summary of Security Fixes Applied

| Issue | Fix | Location |
|-------|-----|----------|
| Plain-text passwords | `password_hash()` + `password_verify()` | All login/signup files |
| SQL injection in registrar_dash | Prepared statements | `registrar/index.php` |
| SQL injection in accounting_dash | Prepared statements | `accounting/index.php` |
| SQL injection in previous_sub | Prepared statements | `user/submissions.php` |
| Broken PDO files | Deleted (unused) | Root directory |
| Session fixation | `session_regenerate_id(true)` | All login handlers |
| XSS in admin modal | `json_encode()` instead of `addslashes()` | `admin/index.php` |
| Missing output escaping | `e()` helper used consistently | All display pages |

## Summary of Bug Fixes Applied

| Bug | Fix | Location |
|-----|-----|----------|
| Duplicate event listeners in homepage | Removed duplicate blocks | `index.php` |
| Duplicate `<tbody>` tags in admin | Removed duplicate | `admin/index.php` |
| Duplicate `initTestimonials()` call | Removed duplicate | `index.php` |
| Duplicate `startAutoSlide` definition | Removed duplicate | `index.php` |
| Duplicate sidebar navItems listeners | Handled by shared main.js | All dashboard pages |
| Inconsistent DB connection files | Single `includes/db_connect.php` | All files |
| Broken PDO endpoint files | Deleted | Root directory |
| Duplicate/legacy login file | Deleted `account_login.php` | Root directory |
