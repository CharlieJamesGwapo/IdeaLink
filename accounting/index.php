<?php
session_name("accounting_session");
session_start();
require_once __DIR__ . '/../includes/db_connect.php';
require_once __DIR__ . '/../includes/functions.php';

if (!isLoggedIn('accounting_id')) {
    redirect('login.php');
}

// --- ANALYTICS (Accounting Office only) ---
$total_records = $conn->query("SELECT COUNT(*) as total FROM suggestions WHERE department = 'Accounting Office'")->fetch_assoc()['total'];
$pending_count = $conn->query("SELECT COUNT(*) as total FROM suggestions WHERE department = 'Accounting Office' AND (status != 'Reviewed' OR status IS NULL)")->fetch_assoc()['total'];
$student_count = $conn->query("SELECT COUNT(*) as total FROM suggestions WHERE department = 'Accounting Office' AND user_role = 'Student'")->fetch_assoc()['total'];
$faculty_count = $conn->query("SELECT COUNT(*) as total FROM suggestions WHERE department = 'Accounting Office' AND user_role = 'Faculty Staff'")->fetch_assoc()['total'];

// Recent accounting activity
$activities = [];
$act_res = $conn->query("SELECT title, date_submitted as dt FROM suggestions WHERE department = 'Accounting Office' ORDER BY date_submitted DESC LIMIT 5");
if ($act_res) {
    while ($row = $act_res->fetch_assoc()) {
        $activities[] = $row;
    }
}

// --- ACTION HANDLERS ---

// Mark suggestion as reviewed (with department check)
if (isset($_GET['mark_id'])) {
    $mark_id = intval($_GET['mark_id']);
    $stmt = $conn->prepare("UPDATE suggestions SET status = 'Reviewed' WHERE id = ? AND department = 'Accounting Office'");
    $stmt->bind_param("i", $mark_id);
    $stmt->execute();
    $stmt->close();
    redirect('index.php?section=suggestions');
}

// --- FILTERS & DATA FETCHING ---
$role_filter = $_GET['user_role'] ?? 'All';

// FIXED: Use prepared statements instead of real_escape_string concatenation
$query = "SELECT s.*, u.fullname FROM suggestions s
          JOIN user_accounts u ON s.user_id = u.id
          WHERE s.department = 'Accounting Office'";
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

$suggestions = [];
while ($row = $res->fetch_assoc()) {
    $suggestions[] = $row;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IdeaLink | Accounting Dashboard</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../assets/css/main.css">
    <link rel="stylesheet" href="../assets/css/department.css">
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
        <li data-section="suggestions"><i class="fas fa-folder-open"></i> Suggestion Records</li>
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
                <h1>Accounting Dashboard</h1>
                <p>Financial & Payment Management</p>
            </div>
            <div class="admin-badge">
                <span class="pulse-icon"></span>
                Accounting Online
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-box">
                <i class="fas fa-receipt"></i>
                <h2><?= $total_records ?></h2>
                <p>Total Records</p>
            </div>
            <div class="stat-box">
                <i class="fas fa-hand-holding-usd"></i>
                <h2><?= $pending_count ?></h2>
                <p>Pending Review</p>
            </div>
            <div class="stat-box">
                <i class="fas fa-user-tag"></i>
                <h2><?= $student_count ?></h2>
                <p>Student Submissions</p>
            </div>
            <div class="stat-box">
                <i class="fas fa-briefcase"></i>
                <h2><?= $faculty_count ?></h2>
                <p>Faculty Submissions</p>
            </div>
        </div>

        <div class="card">
            <h3>Recent Accounting Activity</h3>
            <ul style="list-style: none; margin-top: 1rem;">
                <?php foreach ($activities as $act): ?>
                    <li style="padding: 10px 0; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <small style="color: var(--accent); text-transform: uppercase; font-weight: 600; font-size: 0.7rem;">suggestion</small>
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
            <h3>Financial Inquiries</h3>
            <form method="GET" class="filter-form">
                <input type="hidden" name="section" value="suggestions">
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
                            <th>Sender</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($suggestions as $s):
                            $isPending = ($s['status'] != 'Reviewed');
                        ?>
                            <tr>
                                <td><?= ($s['anonymous'] == 1) ? "Anonymous" : e($s['fullname']) ?></td>
                                <td><?= e($s['user_role'] ?? 'N/A') ?></td>
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
                                            <a href="index.php?section=suggestions&mark_id=<?= $s['id'] ?>" class="icon-btn btn-success" title="Mark as Reviewed">
                                                <i class="fas fa-check"></i>
                                            </a>
                                        <?php endif; ?>
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

<script src="../assets/js/main.js"></script>
<script>
    function openViewForm(data) {
        document.getElementById('m-title').innerText = data.title;
        document.getElementById('m-desc').innerText = data.desc;
        document.getElementById('m-user').innerText = data.user;
        document.getElementById('m-dept').innerText = data.dept;
        document.getElementById('m-date').innerText = "Submitted: " + data.date;
        openModal('viewModal');
    }
</script>
</body>
</html>
