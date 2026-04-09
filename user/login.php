<?php
session_name("user_session");
session_start();
require_once __DIR__ . '/../includes/functions.php';

if (isset($_SESSION['user_id'])) {
    redirect('index.php');
}

$flash = flash('login_error');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASCB E-Suggestion Platform | Login</title>
    <link rel="stylesheet" href="../assets/css/main.css">
    <link rel="stylesheet" href="../assets/css/auth.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="auth-body">

<div class="login-wrapper">
    <div class="logo-container">
        <a href="../index.php">
            <img src="../assets/images/logo.png" alt="IdeaLink Logo" class="school-logo">
        </a>
    </div>

    <h2>Idea<span>Link</span></h2>
    <p class="subtitle">Welcome back! Please log in to continue.</p>

    <?php if ($flash): ?>
        <div class="error-banner"><?= e($flash['message']) ?></div>
    <?php endif; ?>

    <form action="../auth/login_process.php" method="POST">
        <div class="input-group">
            <label for="email">Email Address</label>
            <input type="email" id="email" name="email" placeholder="Enter your email" required>
        </div>

        <div class="input-group">
            <label for="password">Password</label>
            <div class="password-container">
                <input type="password" id="password" name="password" placeholder="Enter your password" required>
                <i class="fa-solid fa-eye toggle-password" onclick="togglePasswordVisibility('password', this)"></i>
            </div>
        </div>

        <button class="btn-login" type="submit">Login</button>

        <div class="links">
            <p>Don't have an account? <a href="signup.php">Create one</a></p>
            <p><a href="../index.php">Back to Homepage</a></p>
        </div>
    </form>
</div>

<script src="../assets/js/main.js"></script>
</body>
</html>
