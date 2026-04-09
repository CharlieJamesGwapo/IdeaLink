<?php
session_name("admin_session");
session_start();
require_once __DIR__ . '/../includes/db_connect.php';
require_once __DIR__ . '/../includes/functions.php';

if (!isLoggedIn('admin_id')) {
    redirect('login.php');
}

// --- ANALYTICS ---
$user_count = $conn->query("SELECT COUNT(*) as total FROM user_accounts")->fetch_assoc()['total'];
$suggest_count = $conn->query("SELECT COUNT(*) as total FROM suggestions")->fetch_assoc()['total'];
$month_count = $conn->query("SELECT COUNT(*) as total FROM suggestions WHERE date_submitted >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetch_assoc()['total'];
$unread_count = $conn->query("SELECT COUNT(*) as total FROM suggestions WHERE status != 'Reviewed' OR status IS NULL")->fetch_assoc()['total'];
$student_count = $conn->query("SELECT COUNT(*) as total FROM suggestions WHERE user_role = 'Student'")->fetch_assoc()['total'];
$faculty_count = $conn->query("SELECT COUNT(*) as total FROM suggestions WHERE user_role = 'Faculty Staff'")->fetch_assoc()['total'];

$activities = [];
$act_res = $conn->query("(SELECT title, date_submitted as dt, 'suggestion' as type FROM suggestions)
                         UNION
                         (SELECT title, date_posted as dt, 'announcement' as type FROM announcements)
                         ORDER BY dt DESC LIMIT 5");
if ($act_res) {
    while ($row = $act_res->fetch_assoc()) {
        $activities[] = $row;
    }
}

// --- ACTION HANDLERS ---

// Delete announcement
if (isset($_GET['delete_ann_id'])) {
    $ann_id = intval($_GET['delete_ann_id']);
    $stmt = $conn->prepare("DELETE FROM announcements WHERE id = ?");
    $stmt->bind_param("i", $ann_id);
    $stmt->execute();
    $stmt->close();
    redirect('index.php?section=announcements');
}

// Update announcement
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_announcement'])) {
    $ann_id = intval($_POST['ann_id']);
    $title = trim($_POST['edit_title']);
    $message = trim($_POST['edit_message']);
    $stmt = $conn->prepare("UPDATE announcements SET title = ?, message = ? WHERE id = ?");
    $stmt->bind_param("ssi", $title, $message, $ann_id);
    $stmt->execute();
    $stmt->close();
    redirect('index.php?section=announcements');
}

// Feature suggestion as testimonial
if (isset($_GET['feature_id'])) {
    $feature_id = intval($_GET['feature_id']);
    $stmt = $conn->prepare("SELECT s.description, s.department, s.anonymous, u.fullname FROM suggestions s JOIN user_accounts u ON s.user_id = u.id WHERE s.id = ?");
    $stmt->bind_param("i", $feature_id);
    $stmt->execute();
    $data = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($data) {
        $name = ($data['anonymous'] == 1) ? "Anonymous" : $data['fullname'];
        $message = $data['description'];
        $dept = $data['department'];
        $insert = $conn->prepare("INSERT INTO testimonials (suggestion_id, name, department, message, is_active) VALUES (?, ?, ?, ?, 1)");
        $insert->bind_param("isss", $feature_id, $name, $dept, $message);
        $insert->execute();
        $insert->close();
    }
    flash('testimonial', 'Suggestion has been added to testimonials!', 'success');
    redirect('index.php?section=suggestions');
}

// Toggle testimonial visibility
if (isset($_GET['toggle_testimonial'])) {
    $tid = intval($_GET['toggle_testimonial']);
    $stmt = $conn->prepare("UPDATE testimonials SET is_active = 1 - is_active WHERE id = ?");
    $stmt->bind_param("i", $tid);
    $stmt->execute();
    $stmt->close();
    flash('testimonial', 'Testimonial visibility updated!', 'success');
    redirect('index.php?section=testimonials');
}

// Delete testimonial
if (isset($_GET['delete_testimonial'])) {
    $tid = intval($_GET['delete_testimonial']);
    $stmt = $conn->prepare("DELETE FROM testimonials WHERE id = ?");
    $stmt->bind_param("i", $tid);
    $stmt->execute();
    $stmt->close();
    flash('testimonial', 'Testimonial removed successfully.', 'success');
    redirect('index.php?section=testimonials');
}

// Filters for suggestions
$filter = $_GET['department'] ?? 'All';
$role_filter = $_GET['user_role'] ?? 'All';

// Delete suggestion
if (isset($_GET['delete_id'])) {
    $delete_id = intval($_GET['delete_id']);
    $stmt = $conn->prepare("DELETE FROM suggestions WHERE id = ?");
    $stmt->bind_param("i", $delete_id);
    $stmt->execute();
    $stmt->close();
    redirect('index.php?section=suggestions&department=' . urlencode($filter));
}

// Mark suggestion as reviewed
if (isset($_GET['mark_id'])) {
    $mark_id = intval($_GET['mark_id']);
    $stmt = $conn->prepare("UPDATE suggestions SET status = 'Reviewed' WHERE id = ?");
    $stmt->bind_param("i", $mark_id);
    $stmt->execute();
    $stmt->close();
    redirect('index.php?section=suggestions&department=' . urlencode($filter));
}

// Post new announcement
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['announcement_title'], $_POST['announcement_message'])) {
    $title = trim($_POST['announcement_title']);
    $message = trim($_POST['announcement_message']);
    if ($title !== "" && $message !== "") {
        $admin_id = intval($_SESSION['admin_id']);
        $stmt = $conn->prepare("INSERT INTO announcements (admin_id, title, message, date_posted) VALUES (?, ?, ?, NOW())");
        $stmt->bind_param("iss", $admin_id, $title, $message);
        $stmt->execute();
        $stmt->close();
        redirect('index.php?section=announcements');
    }
}

// --- DATA FETCHING ---

// Announcements
$announcements = [];
$res_ann = $conn->query("SELECT * FROM announcements ORDER BY date_posted DESC");
if ($res_ann) {
    while ($row = $res_ann->fetch_assoc()) {
        $announcements[] = $row;
    }
}

// Suggestions with filters
$suggestions = [];
$query_parts = [];
$params = [];
$types = "";

if ($filter !== "All") {
    $query_parts[] = "s.department = ?";
    $params[] = $filter;
    $types .= "s";
}

if ($role_filter !== "All") {
    $query_parts[] = "s.user_role = ?";
    $params[] = $role_filter;
    $types .= "s";
}

$where_clause = !empty($query_parts) ? "WHERE " . implode(" AND ", $query_parts) : "";

$sql = "SELECT s.id, s.department, s.user_role, s.title, s.description, s.date_submitted, s.status, s.anonymous, u.fullname
        FROM suggestions s
        JOIN user_accounts u ON s.user_id = u.id
        $where_clause
        ORDER BY s.date_submitted DESC";

if (!empty($params)) {
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $res = $stmt->get_result();
} else {
    $res = $conn->query($sql);
}

while ($row = $res->fetch_assoc()) {
    $suggestions[] = $row;
}

// Testimonials
$testimonials = [];
$res_test = $conn->query("SELECT * FROM testimonials ORDER BY id DESC");
if ($res_test) {
    while ($row = $res_test->fetch_assoc()) {
        $testimonials[] = $row;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IdeaLink | Admin Dashboard</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../assets/css/main.css">
    <link rel="stylesheet" href="../assets/css/admin.css">
</head>
<body>

<!-- Mobile Header -->
<div class="mobile-header">
    <i class="fas fa-bars menu-btn" id="menuToggle"></i>
</div>

<!-- Sidebar -->
<nav class="sidebar" id="sidebar">
    <div class="logo">
        <img src="../assets/images/logo.png" alt="IdeaLink Logo" class="nav-logo">
        Idea<span>Link</span>
    </div>
    <ul class="nav-links">
        <li class="active" data-section="dashboard"><i class="fas fa-chart-pie"></i> Dashboard</li>
        <li data-section="suggestions">
            <i class="fas fa-lightbulb"></i> Suggestions
            <?php if ($unread_count > 0): ?>
                <span class="nav-badge"><?= $unread_count ?></span>
            <?php endif; ?>
        </li>
        <li data-section="announcements"><i class="fas fa-bullhorn"></i> Announcements</li>
        <li data-section="testimonials"><i class="fas fa-comment-dots"></i> Testimonials</li>
    </ul>
    <div class="sidebar-logout">
        <a href="logout.php" class="btn-logout-sidebar">Logout</a>
    </div>
</nav>

<!-- Main Content -->
<main class="sidebar-layout">

    <!-- ===== DASHBOARD SECTION ===== -->
    <div id="dashboard" class="content-section active">
        <div class="content-header">
            <div class="welcome-text">
                <h1>Hello, <?= e($_SESSION['admin_name'] ?? 'Administrator') ?>!</h1>
                <p>Admin Control Panel</p>
            </div>
            <div class="admin-badge">
                <span class="pulse-icon"></span>
                System Online
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-box">
                <i class="fas fa-users"></i>
                <h2><?= $user_count ?></h2>
                <p>Total Users</p>
            </div>
            <div class="stat-box">
                <i class="fas fa-user-graduate"></i>
                <h2><?= $student_count ?></h2>
                <p>Student Submissions</p>
            </div>
            <div class="stat-box">
                <i class="fas fa-chalkboard-teacher"></i>
                <h2><?= $faculty_count ?></h2>
                <p>Faculty Staff Submissions</p>
            </div>
            <div class="stat-box">
                <i class="fas fa-file-alt"></i>
                <h2><?= $suggest_count ?></h2>
                <p>Total Suggestions</p>
            </div>
            <div class="stat-box">
                <i class="fas fa-calendar-check"></i>
                <h2><?= $month_count ?></h2>
                <p>Sent this Month</p>
            </div>
        </div>

        <div class="card">
            <h3>Recent Activity</h3>
            <ul style="list-style: none; margin-top: 1rem;">
                <?php foreach ($activities as $act): ?>
                    <li style="padding: 10px 0; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <small style="color: var(--accent); text-transform: uppercase; font-weight: 600; font-size: 0.7rem;"><?= e($act['type']) ?></small>
                            <p style="color: var(--text-secondary); font-size: 0.9rem;"><?= e($act['title']) ?></p>
                        </div>
                        <small style="color: var(--text-dim);"><?= date('M d', strtotime($act['dt'])) ?></small>
                    </li>
                <?php endforeach; ?>
                <?php if (empty($activities)): ?>
                    <li style="padding: 10px 0; color: var(--text-dim);">No recent activity.</li>
                <?php endif; ?>
            </ul>
        </div>
    </div>

    <!-- ===== SUGGESTIONS SECTION ===== -->
    <div id="suggestions" class="content-section">
        <div class="card">
            <h3>User Suggestions</h3>
            <form method="GET" class="filter-form">
                <input type="hidden" name="section" value="suggestions">
                <select name="department">
                    <option value="All" <?= $filter == 'All' ? 'selected' : '' ?>>All Departments</option>
                    <option value="Registrar" <?= $filter == 'Registrar' ? 'selected' : '' ?>>Registrar</option>
                    <option value="Accounting Office" <?= $filter == 'Accounting Office' ? 'selected' : '' ?>>Accounting Office</option>
                </select>
                <select name="user_role">
                    <option value="All" <?= $role_filter == 'All' ? 'selected' : '' ?>>All Roles</option>
                    <option value="Student" <?= $role_filter == 'Student' ? 'selected' : '' ?>>Student</option>
                    <option value="Faculty Staff" <?= $role_filter == 'Faculty Staff' ? 'selected' : '' ?>>Faculty Staff</option>
                </select>
                <button type="submit" class="btn btn-primary">Filter</button>
            </form>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Dept</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($suggestions as $s):
                            $isPending = ($s['status'] != 'Reviewed');
                            $rowClass = $isPending ? 'row-pending' : '';
                        ?>
                            <tr class="<?= $rowClass ?>">
                                <td>
                                    <?php if ($isPending): ?>
                                        <span class="unread-dot"></span>
                                    <?php endif; ?>
                                    <?= ($s['anonymous'] == 1) ? "Anonymous" : e($s['fullname']) ?>
                                </td>
                                <td><?= e($s['department']) ?></td>
                                <td>
                                    <?php if ($s['status'] == 'Reviewed'): ?>
                                        <span class="badge badge-reviewed">Reviewed</span>
                                    <?php else: ?>
                                        <span class="badge badge-pending">Pending</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <div class="action-group">
                                        <button class="icon-btn btn-view" title="View Details" onclick='openViewForm(<?= json_encode([
                                            "title" => $s["title"],
                                            "desc" => $s["description"],
                                            "user" => ($s["anonymous"] == 1) ? "Anonymous" : $s["fullname"],
                                            "dept" => $s["department"],
                                            "date" => date("M d, Y", strtotime($s["date_submitted"]))
                                        ], JSON_HEX_QUOT | JSON_HEX_APOS | JSON_HEX_TAG) ?>)'>
                                            <i class="fas fa-eye"></i>
                                        </button>

                                        <?php if ($isPending): ?>
                                            <a href="index.php?section=suggestions&mark_id=<?= $s['id'] ?>&department=<?= urlencode($filter) ?>" class="icon-btn btn-success" title="Mark as Reviewed">
                                                <i class="fas fa-check"></i>
                                            </a>
                                        <?php endif; ?>

                                        <a href="index.php?section=suggestions&feature_id=<?= $s['id'] ?>" class="icon-btn btn-feature" title="Feature as Testimonial">
                                            <i class="fas fa-star"></i>
                                        </a>

                                        <a href="#" class="icon-btn btn-delete" title="Delete" onclick="confirmAction('Are you sure you want to delete this suggestion?', 'Delete Suggestion').then(ok => { if (ok) window.location.href='index.php?section=suggestions&delete_id=<?= $s['id'] ?>&department=<?= urlencode($filter) ?>'; })">
                                            <i class="fas fa-trash"></i>
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        <?php if (empty($suggestions)): ?>
                            <tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 20px;">No suggestions found.</td></tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- ===== ANNOUNCEMENTS SECTION ===== -->
    <div id="announcements" class="content-section">
        <!-- Post New Announcement -->
        <div class="card announce-form-card">
            <h3>Post New Announcement</h3>
            <form method="POST">
                <div class="input-group">
                    <input type="text" name="announcement_title" placeholder="Announcement Title" required>
                </div>
                <div class="input-group">
                    <textarea name="announcement_message" rows="2" placeholder="Announcement message..." required></textarea>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Post Announcement</button>
                </div>
            </form>
        </div>

        <!-- Announcement History -->
        <div class="card">
            <h3>Announcement History</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Title</th>
                            <th>Message Snippet</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($announcements as $ann): ?>
                            <tr>
                                <td><?= date('M d, Y', strtotime($ann['date_posted'])) ?></td>
                                <td style="color: var(--accent);"><?= e($ann['title']) ?></td>
                                <td><?= e(substr($ann['message'], 0, 40)) ?>...</td>
                                <td>
                                    <div class="action-group">
                                        <button class="icon-btn btn-edit" title="Edit" onclick="openEditAnnModal(<?= $ann['id'] ?>, <?= htmlspecialchars(json_encode($ann['title']), ENT_QUOTES, 'UTF-8') ?>, <?= htmlspecialchars(json_encode($ann['message']), ENT_QUOTES, 'UTF-8') ?>)">
                                            <i class="fas fa-pen"></i>
                                        </button>
                                        <a href="#" class="icon-btn btn-delete" title="Delete" onclick="confirmAction('Are you sure you want to delete this announcement?', 'Delete Announcement').then(ok => { if (ok) window.location.href='index.php?section=announcements&delete_ann_id=<?= $ann['id'] ?>'; })">
                                            <i class="fas fa-trash"></i>
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        <?php if (empty($announcements)): ?>
                            <tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 20px;">No announcements yet.</td></tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- ===== TESTIMONIALS SECTION ===== -->
    <div id="testimonials" class="content-section">
        <?php
        $flash = flash('testimonial');
        if ($flash): ?>
            <div class="toast toast-<?= $flash['type'] ?>">
                <i class="fas fa-check-circle"></i>
                <span><?= e($flash['message']) ?></span>
            </div>
        <?php endif; ?>

        <div class="card">
            <h3>Testimonials</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($testimonials as $t): ?>
                            <tr>
                                <td><?= e($t['name']) ?></td>
                                <td><?= e($t['department']) ?></td>
                                <td>
                                    <?php if ($t['is_active']): ?>
                                        <span class="toggle-status toggle-active">Active</span>
                                    <?php else: ?>
                                        <span class="toggle-status toggle-hidden">Hidden</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <div class="action-group">
                                        <a href="index.php?section=testimonials&toggle_testimonial=<?= $t['id'] ?>" class="icon-btn btn-view" title="<?= $t['is_active'] ? 'Hide' : 'Show' ?>">
                                            <i class="fas <?= $t['is_active'] ? 'fa-eye-slash' : 'fa-eye' ?>"></i>
                                        </a>
                                        <a href="#" class="icon-btn btn-delete" title="Delete" onclick="confirmAction('Are you sure you want to delete this testimonial?', 'Delete Testimonial').then(ok => { if (ok) window.location.href='index.php?section=testimonials&delete_testimonial=<?= $t['id'] ?>'; })">
                                            <i class="fas fa-trash"></i>
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        <?php if (empty($testimonials)): ?>
                            <tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 20px;">No testimonials yet. Feature a suggestion to create one.</td></tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

</main>

<!-- View Suggestion Modal -->
<div id="viewModal" class="modal">
    <div class="modal-content">
        <span class="close-btn" onclick="closeModal('viewModal')">&times;</span>
        <h2 id="m-title" style="color: var(--accent); margin-bottom: 5px;"></h2>
        <p id="m-date" style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 20px;"></p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <span class="modal-label">User</span>
                <div class="modal-val" id="m-user"></div>
            </div>
            <div>
                <span class="modal-label">Department</span>
                <div class="modal-val" id="m-dept"></div>
            </div>
        </div>
        <span class="modal-label">Suggestion</span>
        <div class="modal-val" id="m-desc" style="min-height: 100px; white-space: pre-wrap;"></div>
    </div>
</div>

<!-- Edit Announcement Modal -->
<div id="editAnnModal" class="modal">
    <div class="modal-content">
        <span class="close-btn" onclick="closeModal('editAnnModal')">&times;</span>
        <h2 style="color: var(--accent); margin-bottom: 1rem;">Edit Announcement</h2>
        <form method="POST">
            <input type="hidden" name="ann_id" id="edit_ann_id">
            <span class="modal-label">Title</span>
            <input type="text" name="edit_title" id="edit_ann_title" required>
            <span class="modal-label">Message</span>
            <textarea name="edit_message" id="edit_ann_message" rows="5" required></textarea>
            <button type="submit" name="update_announcement" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Save Changes</button>
        </form>
    </div>
</div>

<script src="../assets/js/main.js"></script>
<script>
    // View suggestion modal
    function openViewForm(data) {
        document.getElementById('m-title').innerText = data.title;
        document.getElementById('m-desc').innerText = data.desc;
        document.getElementById('m-user').innerText = data.user;
        document.getElementById('m-dept').innerText = data.dept;
        document.getElementById('m-date').innerText = "Submitted: " + data.date;
        openModal('viewModal');
    }

    // Edit announcement modal
    function openEditAnnModal(id, title, message) {
        document.getElementById('edit_ann_id').value = id;
        document.getElementById('edit_ann_title').value = title;
        document.getElementById('edit_ann_message').value = message;
        openModal('editAnnModal');
    }
</script>
</body>
</html>
