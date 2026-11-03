function copyUrl(button, hash) {
    let url = window.location.href;
    if (url.includes('#')) {
        url = url.split('#')[0] + hash;
    } else {
        url += hash;
    }

    navigator.clipboard.writeText(url).then(() => {
        const textElement = button.querySelector('span');
        const originalText = textElement.textContent;
        textElement.textContent = 'Copied to clipboard';
        setTimeout(() => {
            textElement.textContent = originalText;
        }, 3000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// Copy-link buttons. Most report pages don't have them, so skip any that are missing
// (a missing one used to throw and stop the sticky region menu below from running).
[
    ['copyGlobal', '#global'],
    ['copyAPAC', '#apac'],
    ['copyEurope', '#europe'],
    ['copyNA', '#northamerica'],
    ['copyMEA', '#middleeastandafrica'],
    ['copyLA', '#latinaamerica']
].forEach(function (pair) {
    var button = document.getElementById(pair[0]);
    if (button) {
        button.addEventListener('click', function () {
            copyUrl(this, pair[1]);
        });
    }
});

window.addEventListener('scroll', function () {
    var triggerDivs = document.querySelectorAll('.region');

    triggerDivs.forEach(function (triggerDiv, index) {
        var targetDiv = document.querySelector('.regionMenu:nth-of-type(' + (index + 1) + ')');
        if (!targetDiv) return;
        var triggerDivRect = triggerDiv.getBoundingClientRect();

        if (triggerDivRect.top < window.innerHeight && triggerDivRect.bottom >= 0) {
            // Trigger div is in the viewport
            targetDiv.classList.add('active');
        } else {
            // Trigger div is not in the viewport
            targetDiv.classList.remove('active');
        }
    });
});

var prevScrollPos = window.pageYOffset;

function handleScroll() {
    var currentScrollPos = window.pageYOffset;
    var stickyDiv = document.getElementById('stickyDiv');
    if (!stickyDiv) return;

    if (prevScrollPos > currentScrollPos) {

        stickyDiv.classList.add('visible');
    } else {

        stickyDiv.classList.remove('visible');
    }

    prevScrollPos = currentScrollPos;
}

window.addEventListener('scroll', handleScroll);