<?php
session_name("user_session");
session_start();
require_once __DIR__ . '/../includes/db_connect.php';
require_once __DIR__ . '/../includes/functions.php';

if (!isLoggedIn('user_id')) {
    redirect('login.php');
}

$uid = $_SESSION['user_id'];

// Pagination
$limit = 6;
$page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
if ($page < 1) $page = 1;
$offset = ($page - 1) * $limit;

$total_announcements = $conn->query("SELECT COUNT(*) as total FROM announcements")->fetch_assoc()['total'];
$total_pages = ceil($total_announcements / $limit);

// Get user's last view time
$u_stmt = $conn->prepare("SELECT last_announcement_view FROM user_accounts WHERE id = ?");
$u_stmt->bind_param("i", $uid);
$u_stmt->execute();
$last_view = $u_stmt->get_result()->fetch_assoc()['last_announcement_view'];

// Fetch announcements
$stmt_ann = $conn->prepare("SELECT * FROM announcements ORDER BY date_posted DESC LIMIT ? OFFSET ?");
$stmt_ann->bind_param("ii", $limit, $offset);
$stmt_ann->execute();
$announcements = $stmt_ann->get_result()->fetch_all(MYSQLI_ASSOC);

// Update last view time on page 1
if ($page == 1) {
    $up_stmt = $conn->prepare("UPDATE user_accounts SET last_announcement_view = NOW() WHERE id = ?");
    $up_stmt->bind_param("i", $uid);
    $up_stmt->execute();
}

// Unread count (will be 0 after visiting page 1, but needed for nav)
$unreadStmt = $conn->prepare("SELECT COUNT(*) as c FROM announcements WHERE date_posted > ?");
$unreadStmt->bind_param("s", $last_view);
$unreadStmt->execute();
$unreadCount = ($page == 1) ? 0 : $unreadStmt->get_result()->fetch_assoc()['c'];

$role = 'user';
$currentPage = 'announcements';
$base = '..';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Latest News | IdeaLink</title>
    <link rel="stylesheet" href="../assets/css/main.css">
    <link rel="stylesheet" href="../assets/css/user.css">
</head>
<body>

<?php include __DIR__ . '/../includes/header.php'; ?>

<div class="main-content">
    <section class="hero">
        <h1>Latest News</h1>
        <p>Stay informed with the latest updates from the administration.</p>
    </section>

    <div class="announcement-container">
        <?php if (empty($announcements)): ?>
            <div class="empty-state">
                <i class="fas fa-newspaper"></i>
                <p>No announcements at this time.</p>
            </div>
        <?php endif; ?>

        <?php foreach ($announcements as $a): ?>
            <?php $is_new = strtotime($a['date_posted']) > strtotime($last_view); ?>
            <div class="announcement-card">
                <div class="announcement-title">
                    <?= e($a['title']) ?>
                    <?php if ($is_new): ?>
                        <span class="badge badge-new">New</span>
                    <?php endif; ?>
                </div>
                <span class="announcement-date">
                    📅 <?= date("F d, Y | h:i A", strtotime($a['date_posted'])) ?>
                </span>
                <div class="announcement-message">
                    <?= nl2br(e($a['message'])) ?>
                </div>
            </div>
        <?php endforeach; ?>

        <?php if ($total_pages > 1): ?>
            <div class="pagination">
                <a href="?page=<?= $page - 1 ?>" class="btn-page <?= ($page <= 1) ? 'disabled' : '' ?>">
                    ← Previous
                </a>
                <span class="page-indicator">Page <?= $page ?> of <?= $total_pages ?></span>
                <a href="?page=<?= $page + 1 ?>" class="btn-page <?= ($page >= $total_pages) ? 'disabled' : '' ?>">
                    Next →
                </a>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php include __DIR__ . '/../includes/footer.php'; ?>
<script src="../assets/js/main.js"></script>
</body>
</html>
