var fixcolumns = {

    highest: 0,

    init: function () {
        if (!document.getElementById || !document.createTextNode) {
            return;
        }

        fixcolumns.node = document.getElementById('recent');

        if (!fixcolumns.node) {
            return;
        }
        fixcolumns.fix('h2');
        fixcolumns.fix('p');
    },

    fix: function (elm) {
        fixcolumns.getHighest(elm);
        fixcolumns.fixElements(elm);
    },

    getHighest: function (elm) {
        fixcolumns.highest = 0;
        var temp = fixcolumns.node.getElementsByTagName(elm);
        for (var i = 0; i < temp.length; i++) {
            if (!temp[i].offsetHeight) {
                continue;
            }
            if (temp[i].offsetHeight > fixcolumns.highest) {
                fixcolumns.highest = temp[i].offsetHeight;
            }
        }
    },

    fixElements: function (elm) {
        var temp = fixcolumns.node.getElementsByTagName(elm);
        for (var i = 0; i < temp.length; i++) {
            temp[i].style.height = parseInt(fixcolumns.highest) + 'px';
        }
    }
}

var navHeader = document.querySelector('.navbar-toggle');
var collapsed = document.querySelector('.collapse');

navHeader.addEventListener("click", function () {
    if (collapsed.className.match(' collapse')) {
        collapsed.className = collapsed.className.replace(" collapse", ' ')
    } else {
        collapsed.className += ' collapse                               '
    }
});

fixcolumns.init();