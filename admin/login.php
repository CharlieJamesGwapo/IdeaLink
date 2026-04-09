<?php
session_name("admin_session");
session_start();
require_once __DIR__ . '/../includes/db_connect.php';
require_once __DIR__ . '/../includes/functions.php';

if (isset($_SESSION['admin_id'])) {
    redirect('index.php');
}

$error = "";

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = trim($_POST['email']);
    $password = trim($_POST['password']);

    $stmt = $conn->prepare("SELECT id, fullname, password FROM admin_accounts WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $admin = $result->fetch_assoc();
        if (password_verify($password, $admin['password'])) {
            session_regenerate_id(true);
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_name'] = $admin['fullname'];
            redirect('index.php');
        } else {
            $error = "Incorrect password!";
        }
    } else {
        $error = "Admin not found!";
    }
    $stmt->close();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASCB E-Suggestion Platform | Admin Login</title>
    <link rel="stylesheet" href="../assets/css/main.css">
    <link rel="stylesheet" href="../assets/css/auth.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
</head>
<body class="auth-body">

<div class="login-wrapper">
    <div class="logo-container">
        <img src="../assets/images/logo.png" alt="IdeaLink Logo" class="school-logo">
    </div>

    <h2>Admin <span>Login</span></h2>
    <p class="subtitle">Enter your admin credentials to access the dashboard.</p>

    <?php if ($error): ?>
        <div class="error-banner"><?= e($error) ?></div>
    <?php endif; ?>

    <form method="POST">
        <div class="input-group">
            <label for="email">Email Address</label>
            <input type="email" name="email" id="email" placeholder="Enter your email" required>
        </div>

        <div class="input-group">
            <label for="password">Password</label>
            <div class="password-container">
                <input type="password" name="password" id="password" placeholder="Enter your password" required>
                <i class="fa-solid fa-eye toggle-password" onclick="togglePasswordVisibility('password', this)"></i>
            </div>
        </div>

        <button type="submit" class="btn-login">Login</button>
    </form>

    <div class="links">
        <p><a href="../index.php">Back to Homepage</a></p>
    </div>
</div>

<script src="../assets/js/main.js"></script>
</body>
</html>
