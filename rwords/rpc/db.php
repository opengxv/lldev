<?php

$db_attr_fwd = array(PDO::ATTR_CURSOR => PDO::CURSOR_FWDONLY);

try {
    $db = new PDO('mysql:host=localhost;dbname=rwords', "rwords", "rwords", array(PDO::ATTR_PERSISTENT => true));
}
catch(PDOException $e) {
    die($e->getMessage());
}

$query_login_sql =
"select id, name, nickname, create_time, admin
 from rwords.user
 where name = :name and passwd = password(:passwd)";
function query_login($name, $passwd) {
    global $db, $db_attr_fwd, $query_login_sql;
    static $stmt = null;
    if (!$stmt) {
        $stmt = $db->prepare($query_login_sql, $db_attr_fwd);
    }
    $stmt->execute(array(':name' => $name, ':passwd' => $passwd));
    return $stmt->fetchAll();
}

?>
