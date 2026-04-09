<?php
session_name("user_session");
session_start();
require_once __DIR__ . '/../includes/db_connect.php';
require_once __DIR__ . '/../includes/functions.php';

if (isset($_SESSION['user_id'])) {
    redirect('index.php');
}

$error = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $fullname = trim($_POST["fullname"]);
    $email = trim($_POST["email"]);
    $password = $_POST["password"];
    $confirm = $_POST["confirm"];

    if ($password !== $confirm) {
        $error = "Passwords do not match!";
    } else {
        $stmt_check = $conn->prepare("SELECT email FROM user_accounts WHERE email = ?");
        $stmt_check->bind_param("s", $email);
        $stmt_check->execute();
        $result_check = $stmt_check->get_result();

        if ($result_check->num_rows > 0) {
            $error = "Email is already registered!";
        } else {
            $hashed = password_hash($password, PASSWORD_DEFAULT);
            $stmt_insert = $conn->prepare("INSERT INTO user_accounts (fullname, email, password) VALUES (?, ?, ?)");
            $stmt_insert->bind_param("sss", $fullname, $email, $hashed);

            if ($stmt_insert->execute()) {
                flash('login_success', 'Account created! Please log in.', 'success');
                redirect('login.php');
            } else {
                $error = "Something went wrong. Try again.";
            }
            $stmt_insert->close();
        }
        $stmt_check->close();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASCB E-Suggestion Platform | Sign Up</title>
    <link rel="stylesheet" href="../assets/css/main.css">
    <link rel="stylesheet" href="../assets/css/auth.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="auth-body signup-body">

<div class="login-wrapper">
    <div class="logo-container">
        <img src="../assets/images/school_logo.png" alt="School Logo" class="school-logo">
    </div>

    <h2>Idea<span>Link</span></h2>
    <p class="subtitle">Create your account to get started.</p>

    <?php if ($error): ?>
        <div class="error-banner"><?= e($error) ?></div>
    <?php endif; ?>

    <form method="POST" action="">
        <div class="input-group">
            <label for="fullname">Full Name</label>
            <input type="text" name="fullname" id="fullname" placeholder="Enter your full name"
                   value="<?= isset($_POST['fullname']) ? e($_POST['fullname']) : '' ?>" required>
        </div>

        <div class="input-group">
            <label for="email">Email Address</label>
            <input type="email" name="email" id="email" placeholder="Enter your email"
                   value="<?= isset($_POST['email']) ? e($_POST['email']) : '' ?>" required>
        </div>

        <div class="input-group">
            <label for="password">Password</label>
            <div class="password-container">
                <input type="password" name="password" id="password" placeholder="Enter your password" required>
                <i class="fa-solid fa-eye toggle-password" onclick="togglePasswordVisibility('password', this)"></i>
            </div>
        </div>

        <div class="input-group">
            <label for="confirm">Confirm Password</label>
            <div class="password-container">
                <input type="password" name="confirm" id="confirm" placeholder="Confirm your password" required>
                <i class="fa-solid fa-eye toggle-password" onclick="togglePasswordVisibility('confirm', this)"></i>
            </div>
        </div>

        <button class="btn-login" type="submit">Sign Up</button>

        <div class="links">
            <p>Already have an account? <a href="login.php">Login here</a></p>
        </div>
    </form>
</div>

<script src="../assets/js/main.js"></script>
</body>
</html>
