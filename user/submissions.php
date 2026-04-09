<?php
session_name("user_session");
session_start();
require_once __DIR__ . '/../includes/db_connect.php';
require_once __DIR__ . '/../includes/functions.php';

if (!isLoggedIn('user_id')) {
    redirect('login.php');
}

$uid = $_SESSION['user_id'];

// FIXED: Use prepared statement instead of direct variable interpolation
$stmt = $conn->prepare("SELECT department, title, description, date_submitted, status FROM suggestions WHERE user_id = ? ORDER BY date_submitted DESC");
$stmt->bind_param("i", $uid);
$stmt->execute();
$suggestions = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Unread count for nav
$u_stmt = $conn->prepare("SELECT last_announcement_view FROM user_accounts WHERE id = ?");
$u_stmt->bind_param("i", $uid);
$u_stmt->execute();
$lav = $u_stmt->get_result()->fetch_assoc()['last_announcement_view'];
$unreadStmt = $conn->prepare("SELECT COUNT(*) as c FROM announcements WHERE date_posted > ?");
$unreadStmt->bind_param("s", $lav);
$unreadStmt->execute();
$unreadCount = $unreadStmt->get_result()->fetch_assoc()['c'];

$role = 'user';
$currentPage = 'submissions';
$base = '..';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Submissions | IdeaLink</title>
    <link rel="stylesheet" href="../assets/css/main.css">
    <link rel="stylesheet" href="../assets/css/user.css">
</head>
<body>
<div class="main-content">
    <?php include __DIR__ . '/../includes/header.php'; ?>

    <section class="hero">
        <h1>Your Submissions</h1>
        <p>Track the status and details of your shared ideas.</p>
    </section>

    <div class="preview">
        <h3>Submission History</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Department</th>
                        <th>Suggestion Details</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($suggestions)): ?>
                        <tr>
                            <td colspan="4">
                                <div class="empty-state">
                                    <i class="fas fa-inbox"></i>
                                    <p>You haven't submitted any suggestions yet.</p>
                                </div>
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($suggestions as $s): ?>
                            <tr>
                                <td style="color: var(--accent); font-weight: 600;">
                                    <?= e($s['department']) ?>
                                </td>
                                <td>
                                    <strong><?= e($s['title']) ?></strong><br>
                                    <small style="color: var(--text-dim);">
                                        <?= e($s['description']) ?>
                                    </small>
                                </td>
                                <td>
                                    <span class="badge <?= $s['status'] === 'Reviewed' ? 'badge-reviewed' : 'badge-pending' ?>">
                                        <?= $s['status'] ?: 'Pending' ?>
                                    </span>
                                </td>
                                <td style="white-space: nowrap;">
                                    <?= date("M d, Y", strtotime($s['date_submitted'])) ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php include __DIR__ . '/../includes/footer.php'; ?>
<script src="../assets/js/main.js"></script>
</body>
</html>
