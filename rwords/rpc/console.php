<?php

require 'json-rpc.php';
require_once 'db.php';

if (function_exists('xdebug_disable')) {
    xdebug_disable();
}

abstract class Command {
    protected $args_decl;

    public abstract function getopt($args);
    public abstract function execute($profile);

    public function parse_args($args) {
        if (!args_decl) {
            return count($args) == 0;
        }
    }
}

class Login extends Command {
    public function getopt($args) {

    }

    public function execute($profile) {

    }
}

class RwordsServer {
    static $login_documentation = "login to the server (return token)";
    public function login($args)
    {
        $user = $args[0];
        $passwd = $args[1];
        $info = query_login($user, $passwd);
        if (count($info) === 0) {
            throw new Exception("Wrong Password");
            return;
        }
        return array('token' => $user);
    }

    static $whoami_documentation = "return user information";
    public function whoami($args)
    {
        return array(
            "your User Agent" => $_SERVER["HTTP_USER_AGENT"],
            "your IP" => $_SERVER['REMOTE_ADDR'],
            "you acces this from" => $_SERVER["HTTP_REFERER"],
            "foo" => "<a href=http://localhost> aaa </a>",
        );
    }
}

handle_json_rpc(new RwordsServer());
