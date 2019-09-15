
function output_result(window, data) {
    if (!data) {
        return;
    }

    buffer = [];
    if (typeof data === 'string' || data instanceof Array) {
        window.echo(data/*, {raw: true}*/);
        return;
    }

    data = {
        type: "table",
        head: ["name", "value"],
        rows: [
            ["aaaa", "1111"],
            ["bbbbbb", "22222"]
        ]
    };

    if (typeof data === 'object') {
        outputTable(window, data);
    }
}

function outputTable(window, data) {
    /*
    var str = Object.keys(data).map(function(key) {
        return '[[b;#fff;]' + key + ']: ' + data[key];
    }).join('\n');
    window.echo(str);*/


    buffer.push("<table border=\"1\">");
    buffer.push("<tr>");
    data.head.forEach(element => {
        buffer.push("<th>" + element + "</th>");
    });
    buffer.push("</tr>");

    data.rows.forEach(row => {
        buffer.push("<tr>");
        row.forEach(col => {
            buffer.push("<th>" + col + "</th>");
        });
        buffer.push("</tr>");
    });

    buffer.push("</table>");
    window.echo(buffer.join(""), {raw: true});
}
