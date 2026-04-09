<?php
session_name("user_session");
session_start();
require_once __DIR__ . '/../includes/db_connect.php';
require_once __DIR__ . '/../includes/functions.php';

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $email = trim($_POST['email']);
    $password = $_POST['password'];

    $stmt = $conn->prepare("SELECT id, fullname, password FROM user_accounts WHERE email = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        flash('login_error', 'This email is not registered.', 'error');
        redirect('../user/login.php');
    }

    $user = $result->fetch_assoc();

    if (password_verify($password, $user['password'])) {
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['fullname'] = $user['fullname'];
        redirect('../user/index.php');
    } else {
        flash('login_error', 'Incorrect password.', 'error');
        redirect('../user/login.php');
    }

    $stmt->close();
}
?>
