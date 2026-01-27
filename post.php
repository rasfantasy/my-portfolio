<?
$data = file_get_contents('php://input');
file_put_contents("data/data.json", $data);
header('Status: 200');
echo $data;