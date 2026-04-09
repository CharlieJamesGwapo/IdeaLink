<?php
$host = "localhost";
$user = "root";
$pass = "";
$db = "suggestion_db";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Connection Failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");
?>
