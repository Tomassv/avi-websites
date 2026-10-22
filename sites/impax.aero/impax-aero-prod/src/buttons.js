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

// Global button
document.getElementById('copyGlobal').addEventListener('click', function () {
    copyUrl(this, '#global');
});

// Asia Pacific button
document.getElementById('copyAPAC').addEventListener('click', function () {
    copyUrl(this, '#apac');
});

// Europe button
document.getElementById('copyEurope').addEventListener('click', function () {
    copyUrl(this, '#europe');
});

// North America button
document.getElementById('copyNA').addEventListener('click', function () {
    copyUrl(this, '#northamerica');
});

// Middle East and Africa button
document.getElementById('copyMEA').addEventListener('click', function () {
    copyUrl(this, '#middleeastandafrica');
});

// Latin America button
document.getElementById('copyLA').addEventListener('click', function () {
    copyUrl(this, '#latinaamerica');
});

window.addEventListener('scroll', function () {
    var triggerDivs = document.querySelectorAll('.region');

    triggerDivs.forEach(function (triggerDiv, index) {
        var targetDiv = document.querySelector('.regionMenu:nth-of-type(' + (index + 1) + ')');
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

    if (prevScrollPos > currentScrollPos) {

        document.getElementById('stickyDiv').classList.add('visible');
    } else {

        document.getElementById('stickyDiv').classList.remove('visible');
    }

    prevScrollPos = currentScrollPos;
}

window.addEventListener('scroll', handleScroll);