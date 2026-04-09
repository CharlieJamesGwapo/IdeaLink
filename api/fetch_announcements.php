<?php
require_once __DIR__ . '/../includes/db_connect.php';

header('Content-Type: application/json');

$result = $conn->query("SELECT id, title, message, date_posted FROM announcements ORDER BY date_posted DESC");
$announcements = [];
while ($row = $result->fetch_assoc()) {
    $announcements[] = $row;
}

echo json_encode($announcements);
?>
