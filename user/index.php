<?php
session_name("user_session");
session_start();
require_once __DIR__ . '/../includes/db_connect.php';
require_once __DIR__ . '/../includes/functions.php';

if (!isLoggedIn('user_id')) {
    redirect('login.php');
}

$uid = $_SESSION['user_id'];
$fullname = $_SESSION['fullname'];

// Quick stats
$total = $conn->query("SELECT COUNT(*) as c FROM suggestions WHERE user_id = $uid")->fetch_assoc()['c'];
$pending = $conn->query("SELECT COUNT(*) as c FROM suggestions WHERE user_id = $uid AND (status != 'Reviewed' OR status IS NULL)")->fetch_assoc()['c'];
$reviewed = $conn->query("SELECT COUNT(*) as c FROM suggestions WHERE user_id = $uid AND status = 'Reviewed'")->fetch_assoc()['c'];

// Unread announcement count for nav badge
$u_stmt = $conn->prepare("SELECT last_announcement_view FROM user_accounts WHERE id = ?");
$u_stmt->bind_param("i", $uid);
$u_stmt->execute();
$lav = $u_stmt->get_result()->fetch_assoc()['last_announcement_view'];
$unreadStmt = $conn->prepare("SELECT COUNT(*) as c FROM announcements WHERE date_posted > ?");
$unreadStmt->bind_param("s", $lav);
$unreadStmt->execute();
$unreadCount = $unreadStmt->get_result()->fetch_assoc()['c'];

$role = 'user';
$currentPage = 'dashboard';
$base = '..';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard | IdeaLink</title>
    <link rel="stylesheet" href="../assets/css/main.css">
    <link rel="stylesheet" href="../assets/css/user.css">
</head>
<body>
<div class="main-content">
    <?php include __DIR__ . '/../includes/header.php'; ?>

    <section class="hero">
        <h1>Welcome, <?= e($fullname) ?>!</h1>
        <p>Access your dashboard to submit suggestions, view announcements, and track feedback.</p>
    </section>

    <div class="user-content">
        <div class="quick-stats">
            <div class="quick-stat">
                <div class="stat-number"><?= $total ?></div>
                <div class="stat-label">Total</div>
            </div>
            <div class="quick-stat">
                <div class="stat-number"><?= $pending ?></div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="quick-stat">
                <div class="stat-number"><?= $reviewed ?></div>
                <div class="stat-label">Reviewed</div>
            </div>
        </div>

        <section class="dashboard-cards">
            <div class="card">
                <div class="card-icon">💡</div>
                <h2>Submit Suggestion</h2>
                <p>Share your innovative ideas and help improve processes.</p>
                <a href="submit.php" class="card-btn">Submit Now</a>
            </div>
            <div class="card">
                <div class="card-icon">📢</div>
                <h2>Latest News</h2>
                <p>Stay updated with latest management news and changes.</p>
                <a href="announcements.php" class="card-btn">View News</a>
            </div>
            <div class="card">
                <div class="card-icon">📊</div>
                <h2>Previous Submissions</h2>
                <p>Check the status of your submitted suggestions.</p>
                <a href="submissions.php" class="card-btn">View All</a>
            </div>
        </section>
    </div>
</div>

<?php include __DIR__ . '/../includes/footer.php'; ?>
<script src="../assets/js/main.js"></script>
</body>
</html>
