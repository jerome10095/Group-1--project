const navLinks = document.getElementsByTagName('li');

for (let i = 0; i < navLinks.length; i++) {
    navLinks[i].addEventListener('mouseover', function() {
        navLinks[i].style.color = 'grey';
    });
}

 document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const products = document.querySelectorAll(".product");

    searchInput.addEventListener("keyup", function () {
        const searchValue = searchInput.value.toLowerCase();

        products.forEach(function (product) {
            const productName = product.querySelector("h2").textContent.toLowerCase();

            if (productName.includes(searchValue)) {
                product.style.display = "block";
            } else {
                product.style.display = "none";
            }
        });
    });
});

const hamburgerBtn = document.getElementById("hamburgerBtn");
const closeBtn = document.getElementById("closeBtn");
const slideNav = document.getElementById("slideNav");
const overlay = document.getElementById("overlay");

hamburgerBtn.addEventListener("click", function () {
    slideNav.classList.add("open");
    overlay.classList.add("show");
});

closeBtn.addEventListener("click", function () {
    slideNav.classList.remove("open");
    overlay.classList.remove("show");
});

overlay.addEventListener("click", function () {
    slideNav.classList.remove("open");
    overlay.classList.remove("show");
});