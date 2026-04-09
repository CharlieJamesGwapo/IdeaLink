<?php
require_once __DIR__ . '/../includes/db_connect.php';

header('Content-Type: application/json');

$result = $conn->query("SELECT id, name, department, message FROM testimonials WHERE is_active = 1 ORDER BY created_at DESC");
$testimonials = [];
while ($row = $result->fetch_assoc()) {
    $testimonials[] = $row;
}

echo json_encode($testimonials);
?>
