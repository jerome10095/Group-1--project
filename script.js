const navLinks = document.getElementsByClassName("nav")

for (let i = 0; i < navLinks.length; i++) {
    navLinks[i].addEventListener("mouseover", function() {
        this.style.backgroundColor = "lightgray";
    });

    navLinks[i].addEventListener("mouseout", function() {
        this.style.backgroundColor = "";
    });
}
