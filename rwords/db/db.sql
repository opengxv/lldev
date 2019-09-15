CREATE DATABASE `rwords` CHARACTER SET 'utf8';

CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `passwd` varchar(255) NOT NULL,
  `nickname` varchar(255) NOT NULL,
  `create_time` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_name` (`name`),
  UNIQUE KEY `idx_user_nickname` (`nickname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
