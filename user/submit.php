<?php
session_name("user_session");
session_start();
require_once __DIR__ . '/../includes/db_connect.php';
require_once __DIR__ . '/../includes/functions.php';

if (!isLoggedIn('user_id')) {
    redirect('login.php');
}

$uid = $_SESSION['user_id'];

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $department = $_POST['department'];
    $user_role = $_POST['user_role'];
    $title = $_POST['title'];
    $description = $_POST['description'];
    $anonymous = isset($_POST['anonymous']) ? intval($_POST['anonymous']) : 0;

    $stmt = $conn->prepare("INSERT INTO suggestions (user_id, department, user_role, title, description, anonymous) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("issssi", $uid, $department, $user_role, $title, $description, $anonymous);

    if ($stmt->execute()) {
        flash('submit_success', 'Your suggestion has been successfully submitted!');
        redirect('submit.php');
    }
    $stmt->close();
}

$flashMsg = flash('submit_success');

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
$currentPage = 'submit';
$base = '..';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submit Suggestion | IdeaLink</title>
    <link rel="stylesheet" href="../assets/css/main.css">
    <link rel="stylesheet" href="../assets/css/user.css">
</head>
<body>
<div class="main-content">
    <?php include __DIR__ . '/../includes/header.php'; ?>

    <section class="hero">
        <h1>Submit Your Suggestion</h1>
        <p>Empower your ideas and contribute to improving our organization.</p>
    </section>

    <div class="form-container">
        <h2>Suggestion Form</h2>

        <?php if ($flashMsg): ?>
        <div class="toast-container">
            <div class="toast toast-success">
                <i class="fas fa-check-circle"></i>
                <span><?= e($flashMsg['message']) ?></span>
            </div>
        </div>
        <?php endif; ?>

        <form method="POST" id="suggestionForm">
            <div class="input-group">
                <label>Which Department To Submit</label>
                <select name="department" required>
                    <option value="" disabled selected>Select Department</option>
                    <option value="Registrar">Registrar</option>
                    <option value="Accounting Office">Accounting Office</option>
                </select>
            </div>
            <div class="input-group">
                <label>I am a...</label>
                <select name="user_role" required>
                    <option value="" disabled selected>Select your role</option>
                    <option value="Student">Student</option>
                    <option value="Faculty Staff">Faculty Staff</option>
                </select>
            </div>
            <div class="input-group">
                <label>Title</label>
                <input type="text" name="title" placeholder="Enter title" required>
            </div>
            <div class="input-group">
                <label>Description</label>
                <textarea name="description" rows="5" placeholder="Details..." required></textarea>
            </div>
            <div class="input-group">
                <label>Privacy</label>
                <select name="anonymous">
                    <option value="0">Show my name</option>
                    <option value="1">Submit anonymously</option>
                </select>
            </div>

            <div class="submission-warning">
                <span class="warning-icon">⚠️</span>
                <p class="warning-text">
                    <strong>Important:</strong> Once submitted, your suggestion cannot be edited or deleted. Review your details carefully.
                </p>
            </div>

            <button type="submit" class="btn-submit">Submit Now</button>
        </form>
    </div>
</div>

<?php include __DIR__ . '/../includes/footer.php'; ?>
<script src="../assets/js/main.js"></script>
<script>
document.getElementById('suggestionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    confirmAction('Once submitted, you cannot edit this suggestion. Are you sure?', 'Submit Suggestion')
        .then(confirmed => {
            if (confirmed) this.submit();
        });
});
</script>
</body>
</html>
