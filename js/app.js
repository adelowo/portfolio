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
};

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


/**
 * Made edits to cbpAnimatedHeader.js v1.0.0 to use vanilla JS for it's class toggling functionality than use another js library it ships with
 * cbpAnimatedHeader.js is licensed under the MIT by http://www.codrops.com
 */
var cbpAnimatedHeader = (function () {

    var docElem = document.documentElement,
        header = document.querySelector('.navbar-fixed-top'),
        fixed = document.querySelector('.fixed'),
        didScroll = false,
        changeHeaderOn = 300;

    function init() {
        window.addEventListener('scroll', function (event) {
            if (!didScroll) {
                didScroll = true;
                setTimeout(scrollPage, 250);
            }
        }, false);
    }

    function scrollPage() {
        var sy = scrollY();
        if (sy >= changeHeaderOn) {


            if (!isMatch()) {
                header.className += ' shrink';
            }
        } else {

            if (isMatch()) {
                header.className = header.className.replace(' shrink', '');
            }
        }
        didScroll = false;
    }

    function scrollY() {
        return window.pageYOffset || docElem.scrollTop;
    }

    function isMatch() {
        return header.className.match(' shrink');
    }

    init();
})();

//http://stackoverflow.com/questions/4425198/markdown-target-blank

var links = document.links;

for (var i = 0, linksLength = links.length; i < linksLength; i++) {
   if (links[i].hostname != window.location.hostname) {
       links[i].target = '_blank';
   } 
}
