(function ($) {
    $(document).ready(function () {
        var settings = {
            'url': 'rpc/console.php',
            'domain': document.domain || window.location.host
        };
        var profile = {'user': ''};
        var terminal;
        var no_login = typeof(__NO_LOGIN__) !== 'undefined' ? __NO_LOGIN__ : false;
        var silent_mode = false;
        banner_main = "" +
        "  _    _      _     _____                       _                " +
        "\n | |  | |    | |   /  __ \\                     | |            " +
        "\n | |  | | ___| |__ | /  \\/ ___  _ __  ___  ___ | | ___        " +
        "\n | |/\\| |/ _ \\ '_ \\| |    / _ \\| '_ \\/ __|/ _ \\| |/ _ \\ " +
        "\n \\  /\\  /  __/ |_) | \\__/\\ (_) | | | \\__ \\ (_) | |  __/  " +
        "\n  \\/  \\/ \\___|____/ \\____/\\___/|_| |_|___/\\___/|_|\\___| " +
        "";

        function show_output(output) {
            if (output) {
                output_result(terminal, output);
            }
        }

        function make_prompt() {
            return '[[b;#d33682;]' + 'user' + ']' +
                   '> ';
        }

        function update_prompt(terminal) {
            terminal.set_prompt(make_prompt());
        }

        function update_profile(terminal, data) {
            if (data) {
                $.extend(profile, data);
                update_prompt(terminal);
            }
        }

        function service(terminal, method, parameters, success, error, options) {
            options = $.extend({'pause': true}, options);
            if (options.pause) terminal.pause();

            $.jrpc(settings.url, method, parameters,
                function(json) {
                    if (options.pause) terminal.resume();

                    if (!json.error) {
                        if (success) success(json.result);
                    }
                    else if (error) {
                        error();
                    }
                    else {
                        var message = $.trim(json.error.message || '');
                        var data =  $.trim(json.error.data || '');

                        if (!message && data) {
                            message = data;
                            data = '';
                        }

                        if (json.error.error) {
                            message = message + " " + json.error.error.message;
                        }

                        terminal.error('&#91;ERROR&#93;' +
                                       ' RPC: ' + (message || 'Unknown error') +
                                       (data ? (" (" + data + ")") : ''));
                    }
                },
                function(xhr, status, error_data) {
                    if (options.pause) terminal.resume();

                    if (error) error();
                    else {
                        if (status !== 'abort') {
                            var response = $.trim(xhr.responseText || '');

                            terminal.error('&#91;ERROR&#93;' +
                                           ' AJAX: ' + (status || 'Unknown error') +
                                           (response ? ("\nServer reponse:\n" + response) : ''));
                        }
                    }
                });
        }

        function service_authenticated(terminal, method, parameters, success, error, options) {
            var token = terminal.token();
            if (token) {
                var service_parameters = [token];
                if (parameters && parameters.length)
                    service_parameters.push.apply(service_parameters, parameters);
                service(terminal, method, service_parameters, success, error, options);
            }
            else {
                // Should never happen
                terminal.error('&#91;ERROR&#93; Access denied (no authentication token found)');
            }
        }

        function interpreter(command, terminal) {
            command = $.trim(command || '');
            if (!command) return;

            var command_parsed = $.terminal.split_command(command),
                method = null, parameters = [];

            /*
            if (command_parsed.name.toLowerCase() === 'cd') {
                method = 'cd';
                parameters = [command_parsed.args.length ? command_parsed.args[0] : ''];
            }
            else {
                method = 'run';
                parameters = [command];
            }*/

            method = command_parsed.name;
            parameters = command_parsed.args;
            if (method) {
                service_authenticated(terminal, method, parameters, function(result) {
                    update_profile(terminal, result.profile);
                    show_output(result);
                });
            }
        }

        function login(user, password, callback) {
            user = $.trim(user || '');
            password = $.trim(password || '');

            if (user && password) {
                service(terminal, 'login', [user, password], function(result) {
                    if (result && result.token) {
                        profile.user = user;
                        update_profile(terminal, result.profile);
                        show_output(result.output);
                        callback(result.token);
                    }
                    else callback(null);
                },
                function() { callback(null); });
            }
            else callback(null);
        }

        function logout() {
            silent_mode = true;

            try {
                terminal.clear();
                terminal.logout();
            }
            catch (error) {}

            silent_mode = false;
        }

        terminal = $('body').terminal(interpreter, {
            login: login,
            completion: true,
            onBlur: function () { return false; },
            prompt: make_prompt(),
            exceptionHandler: function(exception) {
                if (!silent_mode) terminal.exception(exception);
            }
        });

        logout();
        $(window).unload(function() { logout(); });
        terminal.echo(banner_main);
    });
})(jQuery);
