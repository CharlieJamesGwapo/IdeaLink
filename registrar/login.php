<?php
session_name("registrar_session");
session_start();
require_once __DIR__ . '/../includes/db_connect.php';
require_once __DIR__ . '/../includes/functions.php';

if (isset($_SESSION['registrar_id'])) {
    redirect('index.php');
}

$error = "";

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = trim($_POST['username']);
    $password = trim($_POST['password']);

    $stmt = $conn->prepare("SELECT id, username, password FROM registrar_accounts WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $staff = $result->fetch_assoc();
        if (password_verify($password, $staff['password'])) {
            session_regenerate_id(true);
            $_SESSION['registrar_id'] = $staff['id'];
            $_SESSION['registrar_name'] = $staff['username'];
            redirect('index.php');
        } else {
            $error = "Incorrect password!";
        }
    } else {
        $error = "Account not found!";
    }
    $stmt->close();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASCB E-Suggestion Platform | Registrar Login</title>
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

    <h2>Registrar <span>Login</span></h2>
    <p class="subtitle">Access the Registrar Office dashboard.</p>

    <?php if ($error): ?>
        <div class="error-banner"><?= e($error) ?></div>
    <?php endif; ?>

    <form method="POST">
        <div class="input-group">
            <label for="username">Username</label>
            <input type="text" name="username" id="username" placeholder="Enter your username" required>
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
