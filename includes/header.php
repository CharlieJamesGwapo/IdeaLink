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
